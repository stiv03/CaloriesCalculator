// frontend/src/features/profile/tabs/ProfileTab.jsx
import React, { useState } from 'react';
import Field from '../../../components/Field';
import PasswordField from '../../../components/PasswordField';
import Button from '../../../components/Button';
import ErrorBanner from '../../../components/ErrorBanner';
import ReminderDot from '../../../components/ReminderDot';
import {
  updateWeight, updateStatus, updateActivity, setGoal as apiSetGoal, autoSetGoal,
  addMeasurement,
} from '../../../api/profile';
import { changePassword } from '../../../api/auth';
import { getUserId, clearAuth } from '../../../auth/storage';
import { needsWeightReminder, needsMeasurementReminder } from '../reminders';
import { validateChangePassword } from '../../auth/validation';
import styles from './ProfileTab.module.css';

const STATUS_OPTIONS = [
  { code: '1', label: 'Normal Bulk' }, { code: '2', label: 'Slow Bulk' },
  { code: '3', label: 'Fast Bulk' }, { code: '4', label: 'Normal Cut' },
  { code: '5', label: 'Slow Cut' }, { code: '6', label: 'Fast Cut' },
  { code: '7', label: 'Maintaining' },
];
const ACTIVITY_OPTIONS = [
  { code: '1', label: 'Minimal' }, { code: '2', label: 'Low' },
  { code: '3', label: 'Normal' }, { code: '4', label: 'High' },
  { code: '5', label: 'Very High' },
];

const EMPTY_GOAL = { calories: '', protein: '', carbs: '', fat: '' };
const EMPTY_MEAS = {
  shoulder: '', chest: '', biceps: '', waist: '', hips: '', thigh: '', calf: '',
};

export default function ProfileTab({
  user, goal, weightRecords, latestMeasurement,
  onRefreshUser, onRefreshGoal, onRefreshWeights, onRefreshMeasurements,
}) {
  const userId = getUserId();
  const [error, setError] = useState('');

  // Weight
  const [newWeight, setNewWeight] = useState('');
  const showWeightReminder = needsWeightReminder(weightRecords[0]?.date);

  // Goals
  const [goalForm, setGoalForm] = useState(EMPTY_GOAL);
  const [goalsOpen, setGoalsOpen] = useState(false);
  React.useEffect(() => {
    if (goal) setGoalForm({
      calories: goal.calories || '', protein: goal.protein || '',
      carbs: goal.carbs || '', fat: goal.fat || '',
    });
  }, [goal]);

  // Measurements
  const [measOpen, setMeasOpen] = useState(false);
  const [measForm, setMeasForm] = useState(EMPTY_MEAS);
  const showMeasReminder = needsMeasurementReminder(latestMeasurement?.date);

  // Change password
  const [pwOpen, setPwOpen] = useState(false);
  const [pwForm, setPwForm] = useState({ newPassword: '', confirm: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [pwSuccess, setPwSuccess] = useState('');

  const handleWeight = async () => {
    const n = parseFloat(newWeight);
    if (Number.isNaN(n) || n <= 0) { setError('Enter a valid weight'); return; }
    try {
      await updateWeight(userId, n);
      setNewWeight('');
      await Promise.all([onRefreshUser(), onRefreshWeights()]);
    } catch (e) { setError(e.message); }
  };

  const handleStatus = async (e) => {
    const code = e.target.value;
    if (!code) return;
    try { await updateStatus(userId, parseInt(code, 10)); await onRefreshUser(); }
    catch (err) { setError(err.message); }
  };

  const handleActivity = async (e) => {
    const code = e.target.value;
    if (!code) return;
    try { await updateActivity(userId, parseInt(code, 10)); await onRefreshUser(); }
    catch (err) { setError(err.message); }
  };

  const handleGoalSubmit = async () => {
    try {
      await apiSetGoal(userId, {
        calories: Number(goalForm.calories) || 0,
        protein: Number(goalForm.protein) || 0,
        carbs: Number(goalForm.carbs) || 0,
        fat: Number(goalForm.fat) || 0,
      });
      await onRefreshGoal();
    } catch (e) { setError(e.message); }
  };

  const handleAuto = async () => {
    try { await autoSetGoal(userId); await onRefreshGoal(); }
    catch (e) { setError(e.message); }
  };

  const handleMeasSubmit = async () => {
    const payload = Object.fromEntries(
      Object.entries(measForm).map(([k, v]) => [k, parseFloat(v) || 0])
    );
    try {
      await addMeasurement(userId, payload);
      setMeasForm(EMPTY_MEAS);
      await onRefreshMeasurements();
    } catch (e) { setError(e.message); }
  };

  const handlePwSubmit = async () => {
    setPwSuccess('');
    const v = validateChangePassword(pwForm);
    setPwErrors(v);
    if (Object.keys(v).length > 0) return;
    try {
      await changePassword(userId, pwForm.newPassword);
      setPwForm({ newPassword: '', confirm: '' });
      setPwSuccess('Password updated');
    } catch (e) { setError(e.message); }
  };

  const handleLogout = () => {
    clearAuth();
    window.location.href = '/login';
  };

  return (
    <div className={styles.tab}>
      <ErrorBanner message={error} onDismiss={() => setError('')} />

      <Section title="Update weight">
        <div className={styles.weightRow} style={{ position: 'relative' }}>
          <Field
            type="number" min="1" step="0.1"
            value={newWeight}
            onChange={(e) => setNewWeight(e.target.value)}
            placeholder={user?.weight ? `Current: ${user.weight} kg` : 'New weight (kg)'}
          />
          <div className={styles.weightBtn} style={{ position: 'relative' }}>
            <Button onClick={handleWeight}>Save</Button>
            <ReminderDot visible={showWeightReminder} label="No weight logged today" />
          </div>
        </div>
      </Section>

      <Section title="Goals" expandable open={goalsOpen} onToggle={() => setGoalsOpen((o) => !o)}>
        <div className={styles.grid2}>
          <Field label="Calories" type="number" min="0" value={goalForm.calories}
                 onChange={(e) => setGoalForm({ ...goalForm, calories: e.target.value })} />
          <Field label="Protein (g)" type="number" min="0" value={goalForm.protein}
                 onChange={(e) => setGoalForm({ ...goalForm, protein: e.target.value })} />
          <Field label="Carbs (g)" type="number" min="0" value={goalForm.carbs}
                 onChange={(e) => setGoalForm({ ...goalForm, carbs: e.target.value })} />
          <Field label="Fat (g)" type="number" min="0" value={goalForm.fat}
                 onChange={(e) => setGoalForm({ ...goalForm, fat: e.target.value })} />
        </div>
        <div className={styles.actions}>
          <Button block onClick={handleGoalSubmit}>Save goals</Button>
          <Button variant="secondary" block onClick={handleAuto}>Auto-calculate</Button>
        </div>
      </Section>

      <Section title="Status">
        <Field as="select" value="" onChange={handleStatus}>
          <option value="">
            {user?.status ? `Current: ${user.status.replace('_', ' ').toLowerCase()}` : 'Select status'}
          </option>
          {STATUS_OPTIONS.map((s) => (<option key={s.code} value={s.code}>{s.label}</option>))}
        </Field>
      </Section>

      <Section title="Activity">
        <Field as="select" value="" onChange={handleActivity}>
          <option value="">
            {user?.activity ? `Current: ${user.activity.toLowerCase()}` : 'Select activity'}
          </option>
          {ACTIVITY_OPTIONS.map((a) => (<option key={a.code} value={a.code}>{a.label}</option>))}
        </Field>
      </Section>

      <Section title="Add measurements" expandable open={measOpen}
               onToggle={() => setMeasOpen((o) => !o)}
               headerExtra={<ReminderDot visible={showMeasReminder} label="No recent measurements" />}>
        <div className={styles.grid2}>
          {Object.keys(EMPTY_MEAS).map((k) => (
            <Field key={k}
                   label={`${k[0].toUpperCase() + k.slice(1)} (cm)`}
                   type="number" step="0.1" min="0"
                   value={measForm[k]}
                   onChange={(e) => setMeasForm({ ...measForm, [k]: e.target.value })} />
          ))}
        </div>
        <Button block onClick={handleMeasSubmit}>Save measurements</Button>
      </Section>

      <Section title="Change password" expandable open={pwOpen} onToggle={() => setPwOpen((o) => !o)}>
        {pwSuccess && <p className={styles.success}>{pwSuccess}</p>}
        <PasswordField label="New password" value={pwForm.newPassword}
                       onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                       error={pwErrors.newPassword} autoComplete="new-password" />
        <PasswordField label="Confirm new password" value={pwForm.confirm}
                       onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                       error={pwErrors.confirm} autoComplete="new-password" />
        <Button block onClick={handlePwSubmit}>Update password</Button>
      </Section>

      <Section title="">
        <Button variant="danger" block onClick={handleLogout}>Logout</Button>
      </Section>
    </div>
  );
}

function Section({ title, expandable = false, open = true, onToggle, headerExtra, children }) {
  return (
    <section className={styles.section}>
      {title && (
        expandable
          ? (
            <button className={styles.sectionHead} onClick={onToggle} style={{ position: 'relative' }}>
              <span>{title}</span>
              <span className={styles.chev}>{open ? '⌃' : '⌄'}</span>
              {headerExtra}
            </button>
          )
          : <h3 className={styles.sectionTitle}>{title}</h3>
      )}
      {(!expandable || open) && <div className={styles.sectionBody}>{children}</div>}
    </section>
  );
}
