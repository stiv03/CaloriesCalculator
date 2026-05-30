// frontend/src/features/profile/tabs/BodyTab.jsx
import React from 'react';
import MeasurementChart from '../MeasurementChart';
import styles from './BodyTab.module.css';

const PARTS = ['shoulder', 'chest', 'biceps', 'waist', 'hips', 'thigh', 'calf'];

export default function BodyTab({ measurements, latestMeasurement }) {
  return (
    <div className={styles.tab}>
      <div className={styles.card}>
        <h3 className={styles.h3}>
          Latest measurement
          {latestMeasurement?.date && (
            <span className={styles.muted}>
              {' '}— {new Date(latestMeasurement.date).toLocaleDateString()}
            </span>
          )}
        </h3>
        {!latestMeasurement && <p className={styles.muted}>No measurements yet.</p>}
        {latestMeasurement && (
          <ul className={styles.list}>
            {PARTS.map((p) => (
              <li key={p} className={styles.row}>
                <span>{p[0].toUpperCase() + p.slice(1)}</span>
                <strong>{latestMeasurement[p]} cm</strong>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.card}>
        <h3 className={styles.h3}>Body measurements over time</h3>
        <MeasurementChart measurementRecords={measurements} />
      </div>

      <div className={styles.card}>
        <h3 className={styles.h3}>Records</h3>
        {measurements.length === 0 && <p className={styles.muted}>No records yet.</p>}
        {measurements.length > 0 && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  {PARTS.map((p) => (<th key={p}>{p[0].toUpperCase() + p.slice(1, 3)}</th>))}
                </tr>
              </thead>
              <tbody>
                {measurements.map((r, i) => (
                  <tr key={`${r.date}-${i}`}>
                    <td>{new Date(r.date).toLocaleDateString()}</td>
                    {PARTS.map((p) => (<td key={p}>{r[p]}</td>))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
