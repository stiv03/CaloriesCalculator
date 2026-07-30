// frontend/src/features/profile/ProfilePage.jsx
import React, { useCallback, useEffect, useState } from 'react';
import Field from '../../components/Field';
import PasswordField from '../../components/PasswordField';
import Button from '../../components/Button';
import ErrorBanner from '../../components/ErrorBanner';
import {
  getUser, getGoal,
  updateStatus, updateActivity, setGoal as apiSetGoal, autoSetGoal, updateGoalWeight, updateStartWeight, updateWaterGoal,
  updateWeight,
} from '../../api/profile';
import * as googleHealth from '../../integrations/googleHealth';
import { changePassword } from '../../api/auth';
import { getAllNotes } from '../../api/notes';
import { getTheme, setTheme } from '../../utils/theme';
import { getUserId, clearAuth } from '../../auth/storage';
import { validateChangePassword } from '../auth/validation';
import styles from './tabs/ProfileTab.module.css';

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

export default function ProfilePage() {
  const userId = getUserId();
  const [user, setUser] = useState(null);
  const [goal, setGoal] = useState(null);
  const [error, setError] = useState('');

  const [goalForm, setGoalForm] = useState(EMPTY_GOAL);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [goalWeightOpen, setGoalWeightOpen] = useState(false);
  const [goalWeight, setGoalWeight] = useState('');
  const [startWeight, setStartWeight] = useState('');
  const [waterGoalOpen, setWaterGoalOpen] = useState(false);
  const [waterGoal, setWaterGoal] = useState('');

  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState([]);
  const [theme, setThemeState] = useState(() => getTheme() || 'system');

  const [healthConnected, setHealthConnected] = useState(() => googleHealth.isConnected());
  const [healthBusy, setHealthBusy] = useState(false);
  const [healthMsg, setHealthMsg] = useState('');

  const [pwOpen, setPwOpen] = useState(false);
  const [pwForm, setPwForm] = useState({ newPassword: '', confirm: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [pwSuccess, setPwSuccess] = useState('');

  const refreshUser = useCallback(async () => {
    try { setUser(await getUser(userId)); }
    catch (e) { setError(e.message); }
  }, [userId]);

  const refreshGoal = useCallback(async () => {
    try { setGoal(await getGoal(userId)); }
    catch (_e) { /* may not be set */ }
  }, [userId]);

  useEffect(() => { refreshUser(); refreshGoal(); }, [refreshUser, refreshGoal]);

  const handleNotesToggle = async () => {
    const opening = !notesOpen;
    setNotesOpen(opening);
    if (opening && notes.length === 0) {
      try { setNotes(await getAllNotes(userId)); }
      catch (_e) { /* silent */ }
    }
  };

  useEffect(() => {
    if (goal) setGoalForm({
      calories: goal.calories || '', protein: goal.protein || '',
      carbs: goal.carbs || '', fat: goal.fat || '',
    });
  }, [goal]);

  useEffect(() => {
    setGoalWeight(user?.goalWeight != null ? String(user.goalWeight) : '');
    // Default the starting weight to the user's current weight when it hasn't
    // been set yet (e.g. accounts created before this field existed).
    const start = user?.startWeight != null ? user.startWeight : user?.weight;
    setStartWeight(start != null ? String(start) : '');
    setWaterGoal(user?.waterGoalMl != null ? String(user.waterGoalMl) : '');
  }, [user]);

  const handleGoalWeight = async () => {
    const trimmed = goalWeight.trim();
    const value = trimmed === '' ? null : Number(trimmed);
    if (value != null && (Number.isNaN(value) || value <= 0)) {
      setError('Enter a valid goal weight, or leave it empty to clear.');
      return;
    }
    try { await updateGoalWeight(userId, value); await refreshUser(); }
    catch (e) { setError(e.message); }
  };

  const handleStartWeight = async () => {
    const trimmed = startWeight.trim();
    const value = trimmed === '' ? null : Number(trimmed);
    if (value != null && (Number.isNaN(value) || value <= 0)) {
      setError('Enter a valid starting weight, or leave it empty to clear.');
      return;
    }
    try { await updateStartWeight(userId, value); await refreshUser(); }
    catch (e) { setError(e.message); }
  };

  const handleWaterGoal = async () => {
    const trimmed = waterGoal.trim();
    const value = trimmed === '' ? null : Math.round(Number(trimmed));
    if (value != null && (Number.isNaN(value) || value <= 0)) {
      setError('Enter a valid water goal in ml, or leave it empty to clear.');
      return;
    }
    try { await updateWaterGoal(userId, value); await refreshUser(); }
    catch (e) { setError(e.message); }
  };

  const handleHealthConnect = async () => {
    setError(''); setHealthMsg(''); setHealthBusy(true);
    try {
      await googleHealth.connect();
      setHealthConnected(true);
      setHealthMsg('Connected to Google Health.');
    } catch (e) {
      setError(e.message || 'Could not connect to Google Health');
    } finally { setHealthBusy(false); }
  };

  const handleHealthDisconnect = () => {
    googleHealth.disconnect();
    setHealthConnected(false);
    setHealthMsg('Disconnected.');
  };

  const handleHealthSyncWeight = async () => {
    setError(''); setHealthMsg(''); setHealthBusy(true);
    try {
      const latest = await googleHealth.getLatestWeight(30);
      setHealthConnected(googleHealth.isConnected());
      if (!latest) { setHealthMsg('No weight readings found in the last 30 days.'); return; }
      await updateWeight(userId, latest.kg, null);
      await refreshUser();
      setHealthMsg(`Synced ${latest.kg} kg from Google Health.`);
    } catch (e) {
      setError(e.message || 'Google Health sync failed');
    } finally { setHealthBusy(false); }
  };

  const handleStatus = async (e) => {
    const code = e.target.value;
    if (!code) return;
    try { await updateStatus(userId, parseInt(code, 10)); await refreshUser(); }
    catch (err) { setError(err.message); }
  };

  const handleActivity = async (e) => {
    const code = e.target.value;
    if (!code) return;
    try { await updateActivity(userId, parseInt(code, 10)); await refreshUser(); }
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
      await refreshGoal();
    } catch (e) { setError(e.message); }
  };

  const handleAuto = async () => {
    try { await autoSetGoal(userId); await refreshGoal(); }
    catch (e) { setError(e.message); }
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

  return (
    <div className={styles.tab} style={{ maxWidth: 720, margin: '0 auto', padding: 'var(--space-5) var(--space-4)' }}>
      <h1 style={{ fontSize: 22, marginBottom: 'var(--space-4)' }}>Profile</h1>

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      <Section title="Appearance">
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {[
            { value: 'light', label: 'Light' },
            { value: 'system', label: 'System' },
            { value: 'dark',  label: 'Dark' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setThemeState(opt.value);
                setTheme(opt.value === 'system' ? null : opt.value);
              }}
              style={{
                flex: 1,
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-md)',
                border: '2px solid',
                borderColor: theme === opt.value ? 'var(--color-accent)' : 'var(--color-border)',
                background: theme === opt.value ? 'color-mix(in srgb, var(--color-accent) 12%, var(--color-surface))' : 'var(--color-surface-2)',
                color: theme === opt.value ? 'var(--color-accent)' : 'var(--color-text-muted)',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              {opt.label}
            </button>
          ))}
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

      <Section title="Goal weight" expandable open={goalWeightOpen} onToggle={() => setGoalWeightOpen((o) => !o)}>
        <div className={styles.grid2}>
          <Field
            label="Starting weight (kg)"
            type="number" min="0" step="0.1"
            value={startWeight}
            placeholder="e.g. 80"
            onChange={(e) => setStartWeight(e.target.value)}
          />
          <Field
            label="Target weight (kg)"
            type="number" min="0" step="0.1"
            value={goalWeight}
            placeholder="e.g. 90"
            onChange={(e) => setGoalWeight(e.target.value)}
          />
        </div>
        <div className={styles.actions}>
          <Button block onClick={async () => { await handleStartWeight(); await handleGoalWeight(); }}>
            Save
          </Button>
        </div>
      </Section>

      <Section title="Water goal" expandable open={waterGoalOpen} onToggle={() => setWaterGoalOpen((o) => !o)}>
        <Field
          label="Daily water goal (ml)"
          type="number" min="0" step="50"
          value={waterGoal}
          placeholder="e.g. 2500"
          onChange={(e) => setWaterGoal(e.target.value)}
        />
        <div className={styles.actions}>
          <Button block onClick={handleWaterGoal}>Save</Button>
        </div>
      </Section>

      <Section title="Google Health">
        {healthConnected ? (
          <>
            <p className={styles.muted} style={{ marginTop: 0 }}>
              Connected (this session). Import data synced from Fitbit / Google Health.
            </p>
            <div className={styles.actions}>
              <Button block onClick={handleHealthSyncWeight} disabled={healthBusy}>
                {healthBusy ? 'Syncing…' : 'Sync weight now'}
              </Button>
              <Button block variant="secondary" onClick={handleHealthDisconnect} disabled={healthBusy}>
                Disconnect
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className={styles.muted} style={{ marginTop: 0 }}>
              Connect your Google Health account to import weight (and later steps &amp; activity)
              synced from your Fitbit.
            </p>
            <div className={styles.actions}>
              <Button block onClick={handleHealthConnect} disabled={healthBusy}>
                {healthBusy ? 'Connecting…' : 'Connect Google Health'}
              </Button>
            </div>
          </>
        )}
        {healthMsg && <p className={styles.muted}>{healthMsg}</p>}
      </Section>

      <Section title="Status">
        <Field as="select" value="" onChange={handleStatus} className={styles.currentSelect}>
          <option value="">
            {user?.status ? `Current: ${user.status.replace('_', ' ').toLowerCase()}` : 'Select status'}
          </option>
          {STATUS_OPTIONS.map((s) => (<option key={s.code} value={s.code}>{s.label}</option>))}
        </Field>
      </Section>

      <Section title="Activity">
        <Field as="select" value="" onChange={handleActivity} className={styles.currentSelect}>
          <option value="">
            {user?.activity ? `Current: ${user.activity.toLowerCase()}` : 'Select activity'}
          </option>
          {ACTIVITY_OPTIONS.map((a) => (<option key={a.code} value={a.code}>{a.label}</option>))}
        </Field>
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

      <Section title="Daily notes" expandable open={notesOpen} onToggle={handleNotesToggle}>
        {notes.length === 0 && <p className={styles.muted}>No notes yet.</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', maxHeight: 420, overflowY: 'auto' }}>
          {notes.map((n) => (
            <div key={n.date} style={{
              background: 'var(--color-surface-2)',
              borderRadius: 'var(--radius-sm)',
              padding: 'var(--space-3)',
            }}>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)', fontWeight: 600 }}>
                {n.date}
              </div>
              <p style={{ margin: 0, fontSize: 14, whiteSpace: 'pre-wrap', color: 'var(--color-text)' }}>{n.content}</p>
            </div>
          ))}
        </div>
      </Section>

      <div className={styles.mobileLogout}>
        <Button variant="danger" block onClick={() => { clearAuth(); window.location.href = '/login'; }}>
          Logout
        </Button>
      </div>
    </div>
  );
}

function Section({ title, expandable = false, open = true, onToggle, children }) {
  return (
    <section className={styles.section}>
      {title && (
        expandable
          ? (
            <button className={styles.sectionHead} onClick={onToggle}>
              <span>{title}</span>
              <span className={styles.chev}>{open ? '⌃' : '⌄'}</span>
            </button>
          )
          : <h3 className={styles.sectionTitle}>{title}</h3>
      )}
      {(!expandable || open) && <div className={styles.sectionBody}>{children}</div>}
    </section>
  );
}
