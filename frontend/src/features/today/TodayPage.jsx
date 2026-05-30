// frontend/src/features/today/TodayPage.jsx
import React, { useCallback, useEffect, useState } from 'react';
import DayPicker from '../../components/DayPicker';
import MacroRings from '../../components/MacroRings';
import ErrorBanner from '../../components/ErrorBanner';
import MealCard from './MealCard';
import AddMealSheet from './AddMealSheet';
import {
  listMealsForDay, getDailyMacros, updateMealQuantity, deleteMeal,
} from '../../api/meals';
import { getGoal } from '../../api/profile';
import { getUserId } from '../../auth/storage';
import { formatBackendDate } from './dateFormat';
import styles from './TodayPage.module.css';

const ZERO_TOTALS = { calories: 0, protein: 0, carbs: 0, fat: 0 };
const ZERO_GOALS = { calories: 0, protein: 0, carbs: 0, fat: 0 };

export default function TodayPage() {
  const userId = getUserId();
  const [date, setDate] = useState(new Date());
  const [meals, setMeals] = useState([]);
  const [totals, setTotals] = useState(ZERO_TOTALS);
  const [goals, setGoals] = useState(ZERO_GOALS);
  const [expandedMealId, setExpandedMealId] = useState(null);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const dateStr = formatBackendDate(date);

  const loadDay = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [mealsRes, macrosRes] = await Promise.all([
        listMealsForDay(userId, dateStr),
        getDailyMacros(userId, dateStr),
      ]);
      setMeals(mealsRes);
      setTotals({
        calories: macrosRes.calories || 0,
        protein: macrosRes.protein || 0,
        carbs: macrosRes.carb || 0,
        fat: macrosRes.fat || 0,
      });
    } catch (err) {
      setError(err.message || 'Failed to load day');
    } finally {
      setLoading(false);
    }
  }, [userId, dateStr]);

  useEffect(() => { loadDay(); }, [loadDay]);

  // Goals are user-wide, not per-day — load once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const g = await getGoal(userId);
        if (!cancelled) {
          setGoals({
            calories: g.calories || 0,
            protein: g.protein || 0,
            carbs: g.carbs || 0,
            fat: g.fat || 0,
          });
        }
      } catch (_err) {
        // Goal may not be set yet — leave zeros
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const handleSaveMeal = async (mealId, newQuantity) => {
    try {
      await updateMealQuantity(userId, mealId, newQuantity);
      setExpandedMealId(null);
      await loadDay();
    } catch (err) {
      setError(err.message || 'Failed to save');
    }
  };

  const handleDeleteMeal = async (mealId) => {
    try {
      await deleteMeal(mealId);
      setExpandedMealId(null);
      await loadDay();
    } catch (err) {
      setError(err.message || 'Failed to delete');
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <DayPicker value={date} onChange={setDate} />
      </header>

      <section className={styles.macroSection}>
        <MacroRings totals={totals} goals={goals} />
      </section>

      <section className={styles.mealsSection}>
        <h2 className={styles.h2}>Meals</h2>
        <ErrorBanner message={error} onDismiss={() => setError('')} />
        {loading && meals.length === 0 && <p className={styles.muted}>Loading…</p>}
        {!loading && meals.length === 0 && (
          <p className={styles.muted}>No meals logged yet.</p>
        )}
        {meals.map((meal) => (
          <MealCard
            key={meal.mealId}
            meal={meal}
            expanded={expandedMealId === meal.mealId}
            onExpand={() =>
              setExpandedMealId((cur) => (cur === meal.mealId ? null : meal.mealId))
            }
            onSave={(newQ) => handleSaveMeal(meal.mealId, newQ)}
            onDelete={() => handleDeleteMeal(meal.mealId)}
          />
        ))}
      </section>

      <button
        className={styles.fab}
        onClick={() => setAddSheetOpen(true)}
        aria-label="Add meal"
      >+</button>

      <AddMealSheet
        isOpen={addSheetOpen}
        onClose={() => setAddSheetOpen(false)}
        onAdded={async () => { setAddSheetOpen(false); await loadDay(); }}
      />
    </div>
  );
}
