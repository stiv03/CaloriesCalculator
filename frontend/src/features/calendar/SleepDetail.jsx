// frontend/src/features/calendar/SleepDetail.jsx
// Sleep section for the calendar day drawer: a CSS stacked stage bar (from the
// per-stage totals already in the day payload) plus a chart.js hypnogram drawn
// from the raw stage segments, which are lazy-fetched when the day opens.
import React, { useEffect, useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, LinearScale, PointElement, LineElement, Tooltip,
} from 'chart.js';
import { getSleepDay } from '../../api/calendar';
import styles from './CalendarPage.module.css';

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip);

// Stage → vertical position on the hypnogram (higher = lighter/more awake) and
// the colour used for both the stacked bar and the timeline.
const STAGES = [
  { key: 'awake', label: 'Awake', level: 4, color: 'var(--color-calories)' },
  { key: 'rem',   label: 'REM',   level: 3, color: 'var(--color-carbs)' },
  { key: 'light', label: 'Light', level: 2, color: 'var(--color-protein)' },
  { key: 'deep',  label: 'Deep',  level: 1, color: 'var(--color-fat)' },
];
const STAGE_BY_TYPE = { AWAKE: 'awake', REM: 'rem', LIGHT: 'light', DEEP: 'deep' };
const LEVEL_BY_KEY = Object.fromEntries(STAGES.map((s) => [s.key, s.level]));
const COLOR_BY_KEY = Object.fromEntries(STAGES.map((s) => [s.key, s.color]));

function readCssVar(name) {
  if (typeof window === 'undefined') return name;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || name;
}

function fmtDuration(mins) {
  if (mins == null) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function fmtClock(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function SleepDetail({ userId, date, day }) {
  const [detail, setDetail] = useState(null);

  // Per-stage minutes come with the month payload, so the bar renders instantly.
  const stages = useMemo(() => ({
    awake: day.sleepAwake ?? 0,
    rem: day.sleepRem ?? 0,
    light: day.sleepLight ?? 0,
    deep: day.sleepDeep ?? 0,
  }), [day.sleepAwake, day.sleepRem, day.sleepLight, day.sleepDeep]);

  const barTotal = stages.awake + stages.rem + stages.light + stages.deep;

  // Fetch the raw segment timeline once, for the hypnogram.
  useEffect(() => {
    let alive = true;
    getSleepDay(userId, date)
      .then((d) => { if (alive) setDetail(d); })
      .catch(() => { if (alive) setDetail(null); });
    return () => { alive = false; };
  }, [userId, date]);

  const segments = detail?.segments;
  const hypnogram = useMemo(() => {
    if (!Array.isArray(segments) || segments.length === 0) return null;
    // A stepped line: two points per segment (start, end) at that stage's level.
    const points = [];
    for (const seg of segments) {
      const key = STAGE_BY_TYPE[seg.type];
      const level = LEVEL_BY_KEY[key];
      if (level == null || !seg.start || !seg.end) continue;
      points.push({ x: new Date(seg.start).getTime(), y: level });
      points.push({ x: new Date(seg.end).getTime(), y: level });
    }
    if (points.length === 0) return null;
    const line = readCssVar('--color-text-muted');
    return {
      data: {
        datasets: [{
          data: points,
          stepped: true,
          borderColor: line,
          borderWidth: 2,
          pointRadius: 0,
          tension: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const s = STAGES.find((st) => st.level === ctx.parsed.y);
                return s ? s.label : '';
              },
              title: (items) => (items.length ? fmtClock(new Date(items[0].parsed.x).toISOString()) : ''),
            },
          },
        },
        scales: {
          x: {
            type: 'linear',
            ticks: {
              maxTicksLimit: 5,
              callback: (v) => fmtClock(new Date(v).toISOString()),
              color: line,
              font: { size: 10 },
            },
            grid: { display: false },
          },
          y: {
            min: 0.5,
            max: 4.5,
            ticks: {
              stepSize: 1,
              callback: (v) => (STAGES.find((s) => s.level === v)?.label) || '',
              color: line,
              font: { size: 10 },
            },
            grid: { color: 'color-mix(in srgb, var(--color-border) 60%, transparent)' },
          },
        },
      },
    };
  }, [segments]);

  // Time-banded hypnogram: each segment is a colored block on a real clock
  // axis, one row per stage (Awake/REM/Light/Deep, top→bottom). Positions are
  // percentages of the night span so the rows stay in lock-step. ASLEEP/RESTLESS
  // fold into Light/Awake for placement, matching the totals normalization.
  const bands = useMemo(() => {
    if (!Array.isArray(segments) || segments.length === 0) return null;
    const times = [];
    for (const seg of segments) {
      if (seg.start) times.push(new Date(seg.start).getTime());
      if (seg.end) times.push(new Date(seg.end).getTime());
    }
    if (times.length === 0) return null;
    const t0 = Math.min(...times);
    const t1 = Math.max(...times);
    const span = t1 - t0;
    if (span <= 0) return null;

    const blocks = [];
    for (const seg of segments) {
      const key = STAGE_BY_TYPE[seg.type];
      if (!key || !seg.start || !seg.end) continue;
      const s = new Date(seg.start).getTime();
      const e = new Date(seg.end).getTime();
      const left = ((s - t0) / span) * 100;
      const width = Math.max(0, ((e - s) / span) * 100);
      if (width <= 0) continue;
      blocks.push({ key, left, width, color: COLOR_BY_KEY[key], label: seg.type });
    }
    if (blocks.length === 0) return null;

    // ~4 evenly spaced clock ticks across the night (inclusive of both ends).
    const TICK_COUNT = 4;
    const ticks = [];
    for (let i = 0; i <= TICK_COUNT; i++) {
      const at = t0 + (span * i) / TICK_COUNT;
      ticks.push({ left: (i / TICK_COUNT) * 100, label: fmtClock(new Date(at).toISOString()) });
    }
    return { blocks, ticks };
  }, [segments]);

  const bed = detail?.startTime || day.sleepStart;
  const wake = detail?.endTime || day.sleepEnd;

  return (
    <div className={styles.summarySection}>
      <div className={styles.summaryLabel}>Sleep</div>
      <div className={styles.summaryRow}>
        <span className={styles.summaryVal}>{fmtDuration(day.sleepTotalMinutes)}</span>
        {(bed && wake) && (
          <span className={styles.summaryMuted}>{fmtClock(bed)} – {fmtClock(wake)}</span>
        )}
      </div>

      {barTotal > 0 && (
        <>
          <div className={styles.sleepBar} role="img" aria-label="Sleep stages">
            {STAGES.map((s) => {
              const mins = stages[s.key];
              if (!mins) return null;
              return (
                <span
                  key={s.key}
                  className={styles.sleepBarSeg}
                  style={{ width: `${(mins / barTotal) * 100}%`, background: s.color }}
                  title={`${s.label}: ${fmtDuration(mins)}`}
                />
              );
            })}
          </div>
          <div className={styles.sleepLegend}>
            {STAGES.map((s) => (
              stages[s.key] > 0 && (
                <span key={s.key} className={styles.sleepLegendItem}>
                  <span className={styles.sleepSwatch} style={{ background: COLOR_BY_KEY[s.key] }} />
                  {s.label} {fmtDuration(stages[s.key])}
                </span>
              )
            ))}
          </div>
        </>
      )}

      {hypnogram && (
        <div className={styles.sleepChart}>
          <Line data={hypnogram.data} options={hypnogram.options} />
        </div>
      )}

      {bands && (
        <div className={styles.sleepBands}>
          {STAGES.map((s) => (
            <div key={s.key} className={styles.sleepBandRow}>
              <span className={styles.sleepBandLabel}>{s.label}</span>
              <span className={styles.sleepBandTrack}>
                {bands.blocks
                  .filter((b) => b.key === s.key)
                  .map((b, i) => (
                    <span
                      key={i}
                      className={styles.sleepBandBlock}
                      style={{ left: `${b.left}%`, width: `${b.width}%`, background: s.color }}
                      title={`${s.label}`}
                    />
                  ))}
              </span>
            </div>
          ))}
          <div className={styles.sleepBandAxis}>
            {bands.ticks.map((t, i) => (
              <span key={i} className={styles.sleepBandTick} style={{ left: `${t.left}%` }}>
                {t.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
