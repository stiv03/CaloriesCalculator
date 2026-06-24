// frontend/src/features/profile/tabs/WeightTab.jsx
import React, { useMemo, useState } from 'react';
import WeightChart from '../WeightChart';
import { computeWeeklyAverages } from '../weeklyAverages';
import { updateWeight } from '../../../api/profile';
import { getUserId } from '../../../auth/storage';
import { needsWeightReminder } from '../reminders';
import Field from '../../../components/Field';
import Button from '../../../components/Button';
import ReminderDot from '../../../components/ReminderDot';
import ErrorBanner from '../../../components/ErrorBanner';
import styles from './WeightTab.module.css';

export default function WeightTab({
  user, weightRecords, allMacros,
  onRefreshUser, onRefreshWeights,
}) {
  const userId = getUserId();
  const weekly = useMemo(() => computeWeeklyAverages(weightRecords), [weightRecords]);

  // Group records by ISO week and compute per-week averages for the list.
  const groupedByWeek = useMemo(() => {
    if (!weightRecords.length) return [];
    const pad = (n) => String(n).padStart(2, '0');
    const toMidnight = (s) => { const d = new Date(`${s}T00:00:00`); d.setHours(0,0,0,0); return d; };
    const localKey = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    const weekKey = (s) => {
      const d = toMidnight(s);
      const day = d.getDay() || 7;
      d.setDate(d.getDate() - (day - 1));
      return localKey(d);
    };
    const map = new Map();
    for (const r of weightRecords) {
      const k = weekKey(r.date);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(r);
    }
    const groups = [...map.entries()].map(([weekStart, recs]) => {
      const avg = recs.reduce((s, r) => s + parseFloat(r.weight), 0) / recs.length;
      const d = new Date(`${weekStart}T00:00:00`);
      const end = new Date(d); end.setDate(d.getDate() + 6);
      const label = `${pad(d.getDate())}.${pad(d.getMonth()+1)}–${pad(end.getDate())}.${pad(end.getMonth()+1)}`;
      return { weekStart, label, avg, records: recs };
    });

    const status = (user?.status || '').toUpperCase();
    const isBulk = status.includes('BULK');
    const isCut = status.includes('CUT');
    return groups.map((g, i) => {
      const prev = groups[i + 1]; // newest-first order
      if (!prev || (!isBulk && !isCut)) return { ...g, tone: 'neutral', diff: null };
      const diff = g.avg - prev.avg;
      const gained = diff > 0;
      const tone = isBulk ? (gained ? 'good' : 'bad') : (gained ? 'bad' : 'good');
      return { ...g, tone, diff };
    });
  }, [weightRecords, user]);
  const [weightsOpen, setWeightsOpen] = useState(false);
  const [macrosOpen, setMacrosOpen] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [measureTime, setMeasureTime] = useState('');
  const [error, setError] = useState('');

  const showWeightReminder = needsWeightReminder(weightRecords[0]?.date);
  const trendIcon = weekly.diff == null ? '—' : weekly.diff > 0 ? '▲' : weekly.diff < 0 ? '▼' : '—';

  /** "good" if the weekly trend matches the user's intent (gain on bulk,
   *  loss on cut, flat on maintain), "bad" if it works against it,
   *  "neutral" when we have no diff yet or no status set. */
  const trendTone = (() => {
    if (weekly.diff == null) return 'neutral';
    const status = (user?.status || '').toUpperCase();
    const isBulk = status.includes('BULK');
    const isCut = status.includes('CUT');
    const gained = weekly.diff > 0;
    const lost = weekly.diff < 0;
    if (isBulk) return gained ? 'good' : lost ? 'bad' : 'neutral';
    if (isCut) return lost ? 'good' : gained ? 'bad' : 'neutral';
    // Maintaining (or unknown status): treat any movement as neutral.
    return 'neutral';
  })();

  const handleWeight = async () => {
    const n = parseFloat(newWeight);
    if (Number.isNaN(n) || n <= 0) { setError('Enter a valid weight'); return; }
    try {
      await updateWeight(userId, n, measureTime || null);
      setNewWeight('');
      setMeasureTime('');
      await Promise.all([onRefreshUser?.(), onRefreshWeights?.()]);
    } catch (e) { setError(e.message); }
  };

  return (
    <div className={styles.tab}>
      <ErrorBanner message={error} onDismiss={() => setError('')} />

      <div className={styles.card}>
        <h3 className={styles.h3}>Update weight</h3>
        <div className={styles.logRow} style={{ position: 'relative' }}>
          <Field
            type="number" min="1" step="0.1"
            value={newWeight}
            onChange={(e) => setNewWeight(e.target.value)}
            placeholder={user?.weight ? `Current: ${user.weight} kg` : 'New weight (kg)'}
            className={styles.weightField}
          />
          <input
            type="time"
            value={measureTime}
            onChange={(e) => setMeasureTime(e.target.value)}
            className={styles.timeInput}
          />
          <div className={styles.logBtn} style={{ position: 'relative' }}>
            <Button onClick={handleWeight}>Save</Button>
            <ReminderDot visible={showWeightReminder} label="No weight logged today" />
          </div>
        </div>
      </div>

      <div className={styles.weeklyCard}>
        <div className={styles.weeklyHeader}>
          <span
            className={[
              styles.weeklyDelta,
              trendTone === 'good' ? styles.weeklyDeltaGood : '',
              trendTone === 'bad' ? styles.weeklyDeltaBad : '',
            ].join(' ')}
          >
            {weekly.diff == null ? '—' : `${trendIcon} ${Math.abs(weekly.diff).toFixed(2)} kg`}
          </span>
        </div>
        <div className={styles.weeklyGrid}>
          <div>
            <div className={styles.weeklyLabel}>This week</div>
            <div className={styles.weeklyValue}>
              {weekly.thisWeek != null ? `${weekly.thisWeek.toFixed(2)} kg` : 'n/a'}
            </div>
            <div className={styles.weeklyRange}>{weekly.rangeThis || '–'}</div>
          </div>
          <div>
            <div className={styles.weeklyLabel}>Last week</div>
            <div className={styles.weeklyValue}>
              {weekly.lastWeek != null ? `${weekly.lastWeek.toFixed(2)} kg` : 'n/a'}
            </div>
            <div className={styles.weeklyRange}>{weekly.rangeLast || '–'}</div>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <WeightChart weightRecords={weightRecords} />
      </div>

      <div className={styles.card}>
        <button type="button" className={styles.toggleBtn} onClick={() => setWeightsOpen((o) => !o)}>
          <span>Weight records ({weightRecords.length})</span>
          <span className={styles.chev}>{weightsOpen ? '⌃' : '⌄'}</span>
        </button>
        {weightsOpen && (
          weightRecords.length === 0
            ? <p className={styles.muted}>No records yet.</p>
            : (
              <div className={styles.scrollBox}>
                <ul className={styles.list}>
                  {groupedByWeek.map((g) => (
                    <React.Fragment key={g.weekStart}>
                      <li className={[
                        styles.weekAvgRow,
                        g.tone === 'good' ? styles.weekAvgGood : '',
                        g.tone === 'bad' ? styles.weekAvgBad : '',
                      ].join(' ')}>
                        <span className={styles.weekAvgLabel}>⌀ {g.label}</span>
                        <strong className={styles.weekAvgValue}>
                          {g.diff != null ? (g.diff > 0 ? '▲' : '▼') + ' ' : ''}
                          {g.avg.toFixed(2)} kg
                        </strong>
                      </li>
                      {g.records.map((r, i) => (
                        <li key={`${r.date}-${i}`} className={styles.row}>
                          <span>
                            {r.date}
                            {r.measureTime && (
                              <span className={styles.recordTime}> · {r.measureTime.slice(0, 5)}</span>
                            )}
                          </span>
                          <strong>{r.weight} kg</strong>
                        </li>
                      ))}
                    </React.Fragment>
                  ))}
                </ul>
              </div>
            )
        )}
      </div>

      <div className={styles.card}>
        <button type="button" className={styles.toggleBtn} onClick={() => setMacrosOpen((o) => !o)}>
          <span>Macro history ({allMacros.length} days)</span>
          <span className={styles.chev}>{macrosOpen ? '⌃' : '⌄'}</span>
        </button>
        {macrosOpen && (
          allMacros.length === 0
            ? <p className={styles.muted}>No macros logged yet.</p>
            : (
              <div className={styles.scrollBox}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Cal</th>
                      <th className={styles.colP}>P</th>
                      <th className={styles.colC}>C</th>
                      <th className={styles.colF}>F</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allMacros.map((m, i) => (
                      <tr key={`${m.date}-${i}`}>
                        <td>{m.date}</td>
                        <td>{Math.round(m.calories || 0)}</td>
                        <td className={styles.colP}>{(m.protein || 0).toFixed(1)}</td>
                        <td className={styles.colC}>{(m.carb || 0).toFixed(1)}</td>
                        <td className={styles.colF}>{(m.fat || 0).toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        )}
      </div>
    </div>
  );
}
