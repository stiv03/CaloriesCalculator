// frontend/src/features/today/MealCard.jsx
import React, { useState } from 'react';
import Button from '../../components/Button';
import ConfirmDialog from '../../components/ConfirmDialog';
import styles from './MealCard.module.css';

/**
 * Renders one meal as a card. Tapping the card opens an inline editor
 * with grams input and Save/Delete buttons. Only one card on the page
 * is expanded at a time — the parent enforces this via `expanded`.
 */
export default function MealCard({ meal, expanded, onExpand, onSave, onDelete }) {
  const [grams, setGrams] = useState(String(meal.quantity));
  const [confirming, setConfirming] = useState(false);

  // Reset grams when collapsing or when the meal changes
  React.useEffect(() => {
    if (!expanded) setGrams(String(meal.quantity));
  }, [expanded, meal.quantity]);

  const p = meal.product;
  const factor = (Number(grams) || meal.quantity) / 100;
  const kcal = p.caloriesPer100Grams * (meal.quantity / 100);
  const protein = p.proteinPer100Grams * (meal.quantity / 100);
  const carbs = p.carbsPer100Grams * (meal.quantity / 100);
  const fat = p.fatPer100Grams * (meal.quantity / 100);

  const handleSave = async () => {
    const n = parseFloat(grams);
    if (Number.isNaN(n) || n <= 0) return;
    await onSave(n);
  };

  const previewKcal = Math.round(p.caloriesPer100Grams * factor);

  return (
    <div className={[styles.card, expanded ? styles.expanded : ''].join(' ')}>
      <button className={styles.summary} onClick={onExpand}>
        <div className={styles.left}>
          <div className={styles.name}>{p.name}</div>
          <div className={styles.sub}>{meal.quantity}g · {Math.round(kcal)} kcal</div>
        </div>
        <div className={styles.right}>
          <div className={styles.macros}>
            <span className={styles.macroP}>{protein.toFixed(1)}</span>
            <span className={styles.macroSep}> · </span>
            <span className={styles.macroC}>{carbs.toFixed(1)}</span>
            <span className={styles.macroSep}> · </span>
            <span className={styles.macroF}>{fat.toFixed(1)}</span>
          </div>
        </div>
      </button>
      {expanded && (
        <div className={styles.editor}>
          <label className={styles.editorLabel}>Quantity (grams)</label>
          <input
            type="number"
            value={grams}
            min="1"
            step="any"
            onChange={(e) => setGrams(e.target.value)}
            className={styles.editorInput}
            autoFocus
          />
          {Number(grams) > 0 && (
            <p className={styles.editorPreview}>
              ≈ {previewKcal} kcal at {grams}g
            </p>
          )}
          <div className={styles.editorActions}>
            <Button variant="primary" block onClick={handleSave}>Save</Button>
            <Button variant="secondary" block onClick={() => setConfirming(true)}>Delete</Button>
          </div>
        </div>
      )}
      <ConfirmDialog
        isOpen={confirming}
        title="Delete this meal?"
        message={`Remove ${p.name} (${meal.quantity}g) from today?`}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => { setConfirming(false); await onDelete(); }}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
