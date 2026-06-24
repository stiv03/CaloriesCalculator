// frontend/src/features/profile/ProgressPage.jsx
import React, { useCallback, useEffect, useState } from 'react';
import Tabs from '../../components/Tabs';
import ErrorBanner from '../../components/ErrorBanner';
import {
  getUser, getWeightRecords, getMeasurements, getLatestMeasurement,
} from '../../api/profile';
import { getAllMacros } from '../../api/meals';
import { getUserId } from '../../auth/storage';
import WeightTab from './tabs/WeightTab';
import BodyTab from './tabs/BodyTab';
import styles from './ProfilePage.module.css';

const TABS = [
  { id: 'weight', label: 'Weight' },
  { id: 'body', label: 'Body' },
];

export default function ProgressPage() {
  const userId = getUserId();
  const [activeTab, setActiveTab] = useState('weight');

  const [user, setUser] = useState(null);
  const [weightRecords, setWeightRecords] = useState([]);
  const [allMacros, setAllMacros] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [latestMeasurement, setLatestMeasurement] = useState(null);
  const [error, setError] = useState('');

  const refreshUser = useCallback(async () => {
    try { setUser(await getUser(userId)); }
    catch (e) { setError(e.message); }
  }, [userId]);

  const refreshWeights = useCallback(async () => {
    try {
      const r = await getWeightRecords(userId);
      setWeightRecords([...r].sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (e) { setError(e.message); }
  }, [userId]);

  const refreshMacros = useCallback(async () => {
    try {
      const m = await getAllMacros(userId);
      setAllMacros([...m].sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (_e) { /* empty list shows */ }
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
    refreshWeights();
    refreshMacros();
    refreshMeasurements();
  }, [refreshUser, refreshWeights, refreshMacros, refreshMeasurements]);

  return (
    <div className={styles.page}>
      <header className={styles.summary}>
        <h1 className={styles.name}>Progress of {user?.name || '…'}</h1>
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
        {activeTab === 'weight' && (
          <WeightTab
            user={user}
            weightRecords={weightRecords}
            allMacros={allMacros}
            onRefreshUser={refreshUser}
            onRefreshWeights={refreshWeights}
          />
        )}
        {activeTab === 'body' && (
          <BodyTab
            measurements={measurements}
            latestMeasurement={latestMeasurement}
            weightRecords={weightRecords}
            onRefreshMeasurements={refreshMeasurements}
          />
        )}
      </section>
    </div>
  );
}
