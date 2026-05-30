// frontend/src/features/profile/ProfilePage.jsx
import React, { useCallback, useEffect, useState } from 'react';
import Tabs from '../../components/Tabs';
import ErrorBanner from '../../components/ErrorBanner';
import {
  getUser, getGoal, getWeightRecords, getMeasurements, getLatestMeasurement,
} from '../../api/profile';
import { getAllMacros } from '../../api/meals';
import { getUserId } from '../../auth/storage';
import ProfileTab from './tabs/ProfileTab';
import WeightTab from './tabs/WeightTab';
import BodyTab from './tabs/BodyTab';
import styles from './ProfilePage.module.css';

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'weight', label: 'Weight' },
  { id: 'body', label: 'Body' },
];

export default function ProfilePage() {
  const userId = getUserId();
  const [activeTab, setActiveTab] = useState('profile');

  const [user, setUser] = useState(null);
  const [goal, setGoal] = useState(null);
  const [weightRecords, setWeightRecords] = useState([]);
  const [allMacros, setAllMacros] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [latestMeasurement, setLatestMeasurement] = useState(null);
  const [error, setError] = useState('');

  const refreshUser = useCallback(async () => {
    try { setUser(await getUser(userId)); }
    catch (e) { setError(e.message); }
  }, [userId]);

  const refreshGoal = useCallback(async () => {
    try { setGoal(await getGoal(userId)); }
    catch (_e) { /* may not be set */ }
  }, [userId]);

  const refreshWeights = useCallback(async () => {
    try {
      const r = await getWeightRecords(userId);
      // Latest first for the records list; weeklyAverages uses the data either way
      setWeightRecords([...r].sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (e) { setError(e.message); }
  }, [userId]);

  const refreshMacros = useCallback(async () => {
    try {
      const m = await getAllMacros(userId);
      setAllMacros([...m].sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (_e) { /* ignore — empty list shows */ }
  }, [userId]);

  const refreshMeasurements = useCallback(async () => {
    try {
      const list = await getMeasurements(userId);
      setMeasurements([...list].sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (e) { setError(e.message); }
    try { setLatestMeasurement(await getLatestMeasurement(userId)); }
    catch (_e) { setLatestMeasurement(null); }
  }, [userId]);

  useEffect(() => {
    refreshUser();
    refreshGoal();
    refreshWeights();
    refreshMacros();
    refreshMeasurements();
  }, [refreshUser, refreshGoal, refreshWeights, refreshMacros, refreshMeasurements]);

  return (
    <div className={styles.page}>
      <header className={styles.summary}>
        <div className={styles.avatar}>{user?.name ? user.name[0].toUpperCase() : '·'}</div>
        <h1 className={styles.name}>{user?.name || 'Profile'}</h1>
        <p className={styles.subtitle}>
          {user
            ? `${(user.status || 'maintaining').toLowerCase().replace('_', ' ')} · ${(user.activity || 'normal').toLowerCase().replace('_', ' ')} activity`
            : ' '}
        </p>
      </header>

      <div className={styles.tabsBar}>
        <Tabs tabs={TABS} activeId={activeTab} onChange={setActiveTab} />
      </div>

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      <section className={styles.content}>
        {activeTab === 'profile' && (
          <ProfileTab
            user={user}
            goal={goal}
            weightRecords={weightRecords}
            latestMeasurement={latestMeasurement}
            onRefreshUser={refreshUser}
            onRefreshGoal={refreshGoal}
            onRefreshWeights={refreshWeights}
            onRefreshMeasurements={refreshMeasurements}
          />
        )}
        {activeTab === 'weight' && (
          <WeightTab weightRecords={weightRecords} allMacros={allMacros} />
        )}
        {activeTab === 'body' && (
          <BodyTab measurements={measurements} latestMeasurement={latestMeasurement} />
        )}
      </section>
    </div>
  );
}
