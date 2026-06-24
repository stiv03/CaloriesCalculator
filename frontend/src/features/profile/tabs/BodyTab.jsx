// frontend/src/features/profile/tabs/BodyTab.jsx
import React, { useMemo, useState } from 'react';
import { formatHumanDate } from '../../today/dateFormat';
import { addMeasurement } from '../../../api/profile';
import { getUserId } from '../../../auth/storage';
import { needsMeasurementReminder } from '../reminders';
import Field from '../../../components/Field';
import Button from '../../../components/Button';
import ReminderDot from '../../../components/ReminderDot';
import ErrorBanner from '../../../components/ErrorBanner';
import ProgressPhotosCard from './ProgressPhotosCard';
import styles from './BodyTab.module.css';

const PARTS = ['shoulder', 'chest', 'biceps', 'waist', 'hips', 'thigh', 'calf'];
const EMPTY_MEAS = {
  shoulder: '', chest: '', biceps: '', waist: '', hips: '', thigh: '', calf: '',
};

/** Format date as DD/MM/YYYY (zero-padded). */
function formatNumericDate(d) {
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${dt.getFullYear()}`;
}

/** Compute average weight for the ISO week containing the given date. */
function weeklyAvgForDate(weightsAsc, dateStr) {
  if (!weightsAsc.length) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  const dow = d.getDay() || 7;
  const monday = new Date(d); monday.setDate(d.getDate() - (dow - 1));
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
  const inWeek = weightsAsc.filter((w) => {
    const t = new Date(`${w.date}T00:00:00`);
    return t >= monday && t <= sunday;
  });
  if (!inWeek.length) return null;
  const avg = inWeek.reduce((s, w) => s + parseFloat(w.weight), 0) / inWeek.length;
  return avg;
}

export default function BodyTab({
  measurements, latestMeasurement, weightRecords = [], onRefreshMeasurements,
}) {
  const userId = getUserId();
  const [measForm, setMeasForm] = useState(EMPTY_MEAS);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState('');
  const showMeasReminder = needsMeasurementReminder(latestMeasurement?.date);

  // Sort weights ascending once so findWeightOnOrBefore can short-circuit.
  const weightsAsc = useMemo(() => (
    [...weightRecords].sort((a, b) => new Date(a.date) - new Date(b.date))
  ), [weightRecords]);

  const handleMeasSubmit = async () => {
    const payload = Object.fromEntries(
      Object.entries(measForm).map(([k, v]) => [k, parseFloat(v) || 0])
    );
    try {
      await addMeasurement(userId, payload);
      setMeasForm(EMPTY_MEAS);
      await onRefreshMeasurements?.();
    } catch (e) { setError(e.message); }
  };

  return (
    <div className={styles.tab}>
      <ErrorBanner message={error} onDismiss={() => setError('')} />

      <div className={styles.card}>
        <button
          className={styles.toggleBtn}
          onClick={() => setShowAdd((s) => !s)}
          aria-expanded={showAdd}
          style={{ position: 'relative' }}
        >
          <span>Add measurements</span>
          <span className={styles.chev}>{showAdd ? '⌃' : '⌄'}</span>
          <ReminderDot visible={showMeasReminder} label="No recent measurements" />
        </button>
        {showAdd && (
          <>
            <div className={styles.grid2}>
              {PARTS.map((k) => (
                <Field key={k}
                       label={`${k[0].toUpperCase() + k.slice(1)} (cm)`}
                       type="number" step="0.1" min="0"
                       value={measForm[k]}
                       onChange={(e) => setMeasForm({ ...measForm, [k]: e.target.value })} />
              ))}
            </div>
            <Button block onClick={handleMeasSubmit}>Save measurements</Button>
          </>
        )}
      </div>

      <div className={styles.card}>
        <h3 className={styles.h3}>
          Latest measurement
          {latestMeasurement?.date && (
            <span className={styles.muted}>
              {' '}— {formatHumanDate(new Date(latestMeasurement.date))}
            </span>
          )}
        </h3>
        {!latestMeasurement && <p className={styles.muted}>No measurements yet.</p>}
        {latestMeasurement && (
          <div className={styles.bodyCanvas}>
            <img src="/body-image.png" alt="" className={styles.bodyImage} />
            <span className={[styles.bodyLabel, styles.posShoulders].join(' ')}>
              <span className={styles.pill}>{latestMeasurement.shoulder} cm</span>
              <span className={styles.pillLabel}>Shoulders</span>
            </span>
            <span className={[styles.bodyLabel, styles.posChest].join(' ')}>
              <span className={styles.pill}>{latestMeasurement.chest} cm</span>
              <span className={styles.pillLabel}>Chest</span>
            </span>
            <span className={[styles.bodyLabel, styles.posBiceps].join(' ')}>
              <span className={styles.pill}>{latestMeasurement.biceps} cm</span>
              <span className={styles.pillLabel}>Biceps</span>
            </span>
            <span className={[styles.bodyLabel, styles.posWaist].join(' ')}>
              <span className={styles.pill}>{latestMeasurement.waist} cm</span>
              <span className={styles.pillLabel}>Waist</span>
            </span>
            <span className={[styles.bodyLabel, styles.posHips].join(' ')}>
              <span className={styles.pill}>{latestMeasurement.hips} cm</span>
              <span className={styles.pillLabel}>Hips</span>
            </span>
            <span className={[styles.bodyLabel, styles.posThighs].join(' ')}>
              <span className={styles.pill}>{latestMeasurement.thigh} cm</span>
              <span className={styles.pillLabel}>Thighs</span>
            </span>
            <span className={[styles.bodyLabel, styles.posCalves].join(' ')}>
              <span className={styles.pill}>{latestMeasurement.calf} cm</span>
              <span className={styles.pillLabel}>Calves</span>
            </span>
          </div>
        )}
      </div>

      <ProgressPhotosCard />

      <div className={styles.card}>
        <h3 className={styles.h3}>Records</h3>
        {measurements.length === 0 && <p className={styles.muted}>No records yet.</p>}
        {measurements.length > 0 && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th className={styles.weightCol}>Weight</th>
                  {PARTS.map((p) => (<th key={p}>{p[0].toUpperCase() + p.slice(1)}</th>))}
                </tr>
              </thead>
              <tbody>
                {measurements.map((r, i) => {
                  const avg = weeklyAvgForDate(weightsAsc, r.date);
                  return (
                    <tr key={`${r.date}-${i}`}>
                      <td>{formatNumericDate(r.date)}</td>
                      <td className={styles.weightCol}>{avg != null ? `${avg.toFixed(1)} kg` : '—'}</td>
                      {PARTS.map((p) => (<td key={p}>{r[p]} cm</td>))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
