// frontend/src/features/supplements/SupplementsPage.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Field from '../../components/Field';
import Button from '../../components/Button';
import ErrorBanner from '../../components/ErrorBanner';
import { getUserId } from '../../auth/storage';
import {
  listSupplements, createSupplement, updateSupplement, deleteSupplement,
  listIntakes, setIntake, reorderSupplements,
} from '../../api/supplements';
import styles from './SupplementsPage.module.css';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Current week Mon–Sun. */
function currentWeekMonToSun() {
  const out = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // getDay(): 0=Sun,1=Mon,...,6=Sat — shift so Mon=0
  const dow = (today.getDay() + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - dow);
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    out.push(d);
  }
  return out;
}

const isoKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const sameDay = (a, b) => isoKey(a) === isoKey(b);

export default function SupplementsPage() {
  const userId = getUserId();
  const [supplements, setSupplements] = useState([]);
  const [intakes, setIntakes] = useState([]); // [{supplementId, date: 'YYYY-MM-DD', taken}]
  const [error, setError] = useState('');
  const [showManage, setShowManage] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDosage, setNewDosage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDosage, setEditDosage] = useState('');

  const week = useMemo(currentWeekMonToSun, []);
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);

  const refresh = useCallback(async () => {
    try {
      const [sups, ints] = await Promise.all([
        listSupplements(userId),
        listIntakes(userId, week[0], week[6]),
      ]);
      setSupplements(sups);
      setIntakes(ints);
    } catch (e) { setError(e.message || 'Failed to load supplements'); }
  // week is stable for the session — refresh once on mount, not on each render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => { refresh(); }, [refresh]);

  /** Quick lookup: { `${supplementId}|${YYYY-MM-DD}`: boolean } */
  const intakeMap = useMemo(() => {
    const m = new Map();
    for (const i of intakes) m.set(`${i.supplementId}|${i.date}`, i.taken);
    return m;
  }, [intakes]);

  const isTaken = (supplementId, date) => intakeMap.get(`${supplementId}|${isoKey(date)}`) === true;

  const handleToggleToday = async (supplementId, currentValue) => {
    try {
      await setIntake(userId, supplementId, today, !currentValue);
      // Optimistic-ish update: re-fetch the week so the grid reflects truth.
      await refresh();
    } catch (e) { setError(e.message || 'Failed to update intake'); }
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      await createSupplement(userId, { name: newName.trim(), dosage: newDosage.trim() || null });
      setNewName(''); setNewDosage('');
      await refresh();
    } catch (e) { setError(e.message || 'Failed to add supplement'); }
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      await updateSupplement(userId, editingId, { name: editName.trim(), dosage: editDosage.trim() || null });
      setEditingId(null);
      await refresh();
    } catch (e) { setError(e.message || 'Failed to update supplement'); }
  };

  const handleDelete = async (supplementId) => {
    if (!window.confirm('Delete this supplement and all its history?')) return;
    try {
      await deleteSupplement(userId, supplementId);
      await refresh();
    } catch (e) { setError(e.message || 'Failed to delete supplement'); }
  };

  const handleMove = async (index, direction) => {
    const newList = [...supplements];
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= newList.length) return;
    [newList[index], newList[swapIndex]] = [newList[swapIndex], newList[index]];
    setSupplements(newList);
    try {
      await reorderSupplements(userId, newList.map((s) => s.id));
    } catch (e) { setError(e.message || 'Failed to reorder'); await refresh(); }
  };

  const startEdit = (s) => {
    setEditingId(s.id);
    setEditName(s.name);
    setEditDosage(s.dosage || '');
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Supplements</h1>
      </header>

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      {/* Today's checklist */}
      <section className={styles.card}>
        <h2 className={styles.h2}>Today</h2>
        {supplements.length === 0 ? (
          <p className={styles.muted}>
            No supplements yet. Add some in <button type="button" className={styles.linkBtn} onClick={() => setShowManage(true)}>Manage list</button>.
          </p>
        ) : (
          <ul className={styles.checklist}>
            {supplements.map((s) => {
              const taken = isTaken(s.id, today);
              return (
                <li key={s.id} className={styles.checkRow}>
                  <label className={styles.checkLabel}>
                    <input
                      type="checkbox"
                      checked={taken}
                      onChange={() => handleToggleToday(s.id, taken)}
                      className={styles.checkbox}
                    />
                    <span className={styles.checkName}>{s.name}</span>
                    {s.dosage && <span className={styles.checkDosage}>{s.dosage}</span>}
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Weekly grid */}
      {supplements.length > 0 && (
        <section className={styles.card}>
          <h2 className={styles.h2}>
            This week
            <span className={styles.weekRange}>
              {` ${String(week[0].getDate()).padStart(2,'0')}.${String(week[0].getMonth()+1).padStart(2,'0')}–${String(week[6].getDate()).padStart(2,'0')}.${String(week[6].getMonth()+1).padStart(2,'0')}`}
            </span>
          </h2>
          <div className={styles.gridWrap}>
            <table className={styles.grid}>
              <thead>
                <tr>
                  <th></th>
                  {week.map((d) => (
                    <th key={isoKey(d)}>
                      <div className={[styles.dayName, sameDay(d, today) ? styles.dayToday : ''].join(' ')}>
                        {DAY_NAMES[(d.getDay() + 6) % 7]}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {supplements.map((s) => (
                  <tr key={s.id}>
                    <th className={styles.rowLabel}>
                      <span>{s.name}</span>
                      {s.dosage && <span className={styles.rowDosage}>{s.dosage}</span>}
                    </th>
                    {week.map((d) => {
                      const taken = isTaken(s.id, d);
                      const isToday = sameDay(d, today);
                      return (
                        <td key={isoKey(d)}>
                          <div
                            className={[
                              styles.dot,
                              taken ? styles.dotTaken : '',
                              isToday ? styles.dotToday : '',
                            ].filter(Boolean).join(' ')}
                            aria-label={taken ? 'Taken' : 'Not taken'}
                          >
                            {taken ? '✓' : ''}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Manage list */}
      <section className={styles.card}>
        <button
          type="button"
          className={styles.toggleBtn}
          onClick={() => setShowManage((v) => !v)}
          aria-expanded={showManage}
        >
          <span>Manage list ({supplements.length})</span>
          <span className={styles.chev}>{showManage ? '⌃' : '⌄'}</span>
        </button>

        {showManage && (
          <div className={styles.manageBody}>
            {/* Add new */}
            <div className={styles.addRow}>
              <Field
                placeholder="Name (e.g. Vitamin D)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <Field
                placeholder="Dosage (e.g. 5000 IU)"
                value={newDosage}
                onChange={(e) => setNewDosage(e.target.value)}
              />
              <Button onClick={handleAdd} disabled={!newName.trim()}>Add</Button>
            </div>

            {/* Existing list */}
            {supplements.length === 0 && (
              <p className={styles.muted}>No supplements yet.</p>
            )}
            <ul className={styles.editList}>
              {supplements.map((s, index) => (
                <li key={s.id} className={styles.editRow}>
                  {editingId === s.id ? (
                    <>
                      <Field value={editName} onChange={(e) => setEditName(e.target.value)} />
                      <Field value={editDosage} onChange={(e) => setEditDosage(e.target.value)} />
                      <Button onClick={handleSaveEdit}>Save</Button>
                      <Button variant="secondary" onClick={() => setEditingId(null)}>Cancel</Button>
                    </>
                  ) : (
                    <>
                      <div className={styles.moveButtons}>
                        <button className={styles.moveBtn} onClick={() => handleMove(index, -1)} disabled={index === 0}>▲</button>
                        <button className={styles.moveBtn} onClick={() => handleMove(index, 1)} disabled={index === supplements.length - 1}>▼</button>
                      </div>
                      <div className={styles.editName}>
                        <strong>{s.name}</strong>
                        {s.dosage && <span className={styles.editDosage}>{s.dosage}</span>}
                      </div>
                      <Button variant="secondary" onClick={() => startEdit(s)}>Edit</Button>
                      <Button variant="danger" onClick={() => handleDelete(s.id)}>Delete</Button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
