import React, { useEffect, useState } from 'react';
import Button from '../../components/Button';
import { getWater, setWater } from '../../api/water';
import styles from './WaterCard.module.css';

/**
 * Water intake control for one day, rendered as a small drop-icon button that
 * opens a dropdown for logging. Self-loads the day's total and lets the user
 * add an arbitrary ml amount. Sends the absolute new total to the backend
 * (idempotent). `goalMl` (nullable) drives the progress display.
 */
export default function WaterCard({ userId, dateIso, goalMl }) {
  const [amountMl, setAmountMl] = useState(0);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getWater(userId, dateIso)
      .then((d) => { if (!cancelled) setAmountMl(d.amountMl || 0); })
      .catch(() => { if (!cancelled) setError('Could not load water'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId, dateIso]);

  // Close the modal on Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

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
    <div className={styles.wrap}>
      <button
        type="button"
        className={[styles.dropBtn, open ? styles.dropBtnOpen : ''].join(' ')}
        onClick={() => setOpen((v) => !v)}
        title="Log water"
        aria-label="Log water"
        aria-expanded={open}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2.5S5.5 9.5 5.5 14.5a6.5 6.5 0 0 0 13 0C18.5 9.5 12 2.5 12 2.5z"/>
        </svg>
      </button>

      {open && (
        <div className={styles.overlay} onClick={() => setOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.title}>
                <svg className={styles.titleIcon} width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2.5S5.5 9.5 5.5 14.5a6.5 6.5 0 0 0 13 0C18.5 9.5 12 2.5 12 2.5z"/>
                </svg>
                Water
              </span>
              <button type="button" className={styles.close} onClick={() => setOpen(false)} aria-label="Close">✕</button>
            </div>

            <div className={styles.head}>
              <span className={styles.total}>
                {amountMl.toLocaleString()} ml
                {goalMl ? <span className={styles.goal}> / {goalMl.toLocaleString()} ml</span> : null}
              </span>
              {pct !== null && <span className={styles.pct}>{pct}%</span>}
            </div>

            {pct !== null && (
              <div className={styles.barTrack}>
                <div className={styles.barFill} style={{ width: `${pct}%` }} />
              </div>
            )}

            <div className={styles.quickRow}>
              {[250, 500, 750].map((ml) => (
                <button
                  key={ml}
                  type="button"
                  className={styles.quickBtn}
                  onClick={() => commit(amountMl + ml)}
                  disabled={loading || saving}
                >
                  +{ml}
                </button>
              ))}
            </div>

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
        </div>
      )}
    </div>
  );
}
