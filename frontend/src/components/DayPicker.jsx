import React, { useRef } from 'react';
import { addDays, formatHumanDate, isToday, isFuture } from '../features/today/dateFormat';
import styles from './DayPicker.module.css';

/**
 * Header day picker. Caller owns the selected date and the change handler.
 *
 *   ‹  Sat, May 30  ›   [Today]
 *
 * - Left arrow → previous day
 * - Right arrow → next day (disabled if would be in future)
 * - Tap centre date → opens hidden <input type=date> picker
 * - "Today" pill appears when not on today
 */
export default function DayPicker({ value, onChange }) {
  const inputRef = useRef(null);

  const goPrev = () => onChange(addDays(value, -1));
  const goNext = () => { const next = addDays(value, 1); if (!isFuture(next)) onChange(next); };
  const goToday = () => onChange(new Date());

  const handlePickerChange = (e) => {
    const v = e.target.value; // YYYY-MM-DD
    if (!v) return;
    const [y, m, d] = v.split('-').map(Number);
    onChange(new Date(y, m - 1, d));
  };

  const isoValue = `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`;
  const today = isToday(value);
  const nextDisabled = isFuture(addDays(value, 1));

  return (
    <div className={styles.bar}>
      <button onClick={goPrev} className={styles.arrow} aria-label="Previous day">‹</button>
      <button
        className={styles.dateBtn}
        onClick={() => inputRef.current?.showPicker?.() || inputRef.current?.click()}
      >
        <span className={styles.date}>{formatHumanDate(value)}</span>
        {today && <span className={styles.todayLabel}>Today</span>}
        <input
          ref={inputRef}
          type="date"
          value={isoValue}
          onChange={handlePickerChange}
          className={styles.hiddenInput}
          aria-label="Pick a date"
        />
      </button>
      <button
        onClick={goNext}
        className={styles.arrow}
        disabled={nextDisabled}
        aria-label="Next day"
      >›</button>
      {!today && (
        <button className={styles.pill} onClick={goToday}>Today</button>
      )}
    </div>
  );
}
