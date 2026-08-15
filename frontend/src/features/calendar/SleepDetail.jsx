// frontend/src/features/calendar/SleepDetail.jsx
// Sleep section for the calendar day drawer: a CSS stacked stage bar (from the
// per-stage totals already in the day payload) plus a time-banded hypnogram
// drawn from the raw stage segments, which are lazy-fetched when the day opens.
import React, { useEffect, useMemo, useState } from 'react';
import { getSleepDay } from '../../api/calendar';
import styles from './CalendarPage.module.css';

// Stage → colour used for both the stacked bar and the time-banded hypnogram.
const STAGES = [
  { key: 'awake', label: 'Awake', level: 4, color: 'var(--color-calories)' },
  { key: 'rem',   label: 'REM',   level: 3, color: 'var(--color-carbs)' },
  { key: 'light', label: 'Light', level: 2, color: 'var(--color-protein)' },
  { key: 'deep',  label: 'Deep',  level: 1, color: 'var(--color-fat)' },
];
const STAGE_BY_TYPE = { AWAKE: 'awake', REM: 'rem', LIGHT: 'light', DEEP: 'deep' };
const COLOR_BY_KEY = Object.fromEntries(STAGES.map((s) => [s.key, s.color]));

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
    return { blocks };
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
        </div>
      )}
    </div>
  );
}
