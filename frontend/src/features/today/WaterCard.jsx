import React, { useEffect, useState } from 'react';
import Button from '../../components/Button';
import { getWater, setWater } from '../../api/water';
import styles from './WaterCard.module.css';

/**
 * Water intake card for one day. Self-loads the day's total and lets the user
 * add an arbitrary ml amount. Sends the absolute new total to the backend
 * (idempotent). `goalMl` (nullable) drives the progress display.
 */
export default function WaterCard({ userId, dateIso, goalMl }) {
  const [amountMl, setAmountMl] = useState(0);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getWater(userId, dateIso)
      .then((d) => { if (!cancelled) setAmountMl(d.amountMl || 0); })
      .catch(() => { if (!cancelled) setError('Could not load water'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId, dateIso]);

  // Persist an absolute total (clamped ≥ 0).
  const commit = async (nextTotal) => {
    const total = Math.max(0, Math.round(nextTotal));
    setSaving(true);
    setError('');
    try {
      const saved = await setWater(userId, dateIso, total);
      setAmountMl(saved.amountMl);
    } catch (e) {
      setError(e.message || 'Could not save water');
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = () => {
    const add = parseInt(input, 10);
    if (Number.isNaN(add) || add === 0) return;
    commit(amountMl + add); // input may be negative to correct a mistake
    setInput('');
  };

  const pct = goalMl && goalMl > 0 ? Math.min(100, Math.round((amountMl / goalMl) * 100)) : null;

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <span className={styles.title}>
          <span role="img" aria-label="Water">💧</span> Water
        </span>
        <span className={styles.total}>
          {amountMl.toLocaleString()} ml
          {goalMl ? <span className={styles.goal}> / {goalMl.toLocaleString()} ml</span> : null}
        </span>
      </div>

      {pct !== null && (
        <div className={styles.barTrack}>
          <div className={styles.barFill} style={{ width: `${pct}%` }} />
        </div>
      )}

      <div className={styles.addRow}>
        <input
          className={styles.input}
          type="number"
          inputMode="numeric"
          placeholder="ml"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
          disabled={loading || saving}
        />
        <Button onClick={handleAdd} disabled={loading || saving || !input}>
          {saving ? '…' : 'Add'}
        </Button>
      </div>

      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
