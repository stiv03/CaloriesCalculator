// frontend/src/features/profile/tabs/ProgressPhotosCard.jsx
//
// Self-contained card that shows progress photos stored in the user's Google Drive.
// Backend stores only metadata (drive file id + date + weight + notes).
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Button from '../../../components/Button';
import Field from '../../../components/Field';
import ErrorBanner from '../../../components/ErrorBanner';
import { getUserId } from '../../../auth/storage';
import {
  listProgressPhotos, createProgressPhoto, deleteProgressPhoto,
} from '../../../api/progressPhotos';
import {
  connect as connectDrive, isConnected as isDriveConnected,
  uploadPhoto, deletePhoto as deleteDrivePhoto, getPhotoObjectUrl,
} from '../../../integrations/googleDrive';
import styles from './ProgressPhotosCard.module.css';

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function ProgressPhotosCard() {
  const userId = getUserId();
  const [photos, setPhotos] = useState([]);
  const [thumbs, setThumbs] = useState({}); // { [photoId]: objectURL }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(isDriveConnected());
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ date: todayIso(), weight: '', notes: '' });
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null); // photo object being viewed full-size
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileRef = useRef(null);
  const objectUrlsRef = useRef([]);

  const releaseObjectUrls = () => {
    objectUrlsRef.current.forEach(u => URL.revokeObjectURL(u));
    objectUrlsRef.current = [];
  };

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listProgressPhotos(userId);
      setPhotos(list);
    } catch (e) {
      setError(e.message || 'Could not load photos.');
    } finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { loadList(); }, [loadList]);

  // Free object URLs on unmount.
  useEffect(() => () => releaseObjectUrls(), []);

  // Lazy-load thumbnails when connected. Only fetches photos we haven't loaded.
  useEffect(() => {
    if (!connected || !photos.length) return;
    let cancelled = false;
    (async () => {
      for (const p of photos) {
        if (cancelled) break;
        if (thumbs[p.id]) continue;
        try {
          const url = await getPhotoObjectUrl(p.driveFileId);
          if (cancelled) { URL.revokeObjectURL(url); return; }
          objectUrlsRef.current.push(url);
          setThumbs(prev => ({ ...prev, [p.id]: url }));
        } catch (_) { /* show placeholder for this photo */ }
      }
    })();
    return () => { cancelled = true; };
  }, [connected, photos, thumbs]);

  const handleConnect = async () => {
    setError('');
    try {
      await connectDrive();
      setConnected(true);
    } catch (e) { setError(e.message || 'Could not connect Google Drive.'); }
  };

  const handlePickFile = () => fileRef.current?.click();

  const handleFileChosen = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file later
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      if (!isDriveConnected()) {
        await connectDrive();
        setConnected(true);
      }
      const driveFile = await uploadPhoto(file, `${form.date}_${file.name}`);
      const saved = await createProgressPhoto(userId, {
        driveFileId: driveFile.id,
        date: form.date,
        weight: form.weight ? parseFloat(form.weight) : null,
        notes: form.notes || null,
      });
      setPhotos(prev => [saved, ...prev]);
      setForm({ date: todayIso(), weight: '', notes: '' });
      setShowAdd(false);
    } catch (e) {
      setError(e.message || 'Upload failed.');
    } finally { setUploading(false); }
  };

  const handleDelete = async (photo) => {
    if (!window.confirm('Delete this progress photo? It will be removed from your Google Drive as well.')) return;
    try {
      try { await deleteDrivePhoto(photo.driveFileId); }
      catch (_) { /* If Drive delete fails (e.g. user already removed it), still drop the metadata. */ }
      await deleteProgressPhoto(userId, photo.id);
      setPhotos(prev => prev.filter(p => p.id !== photo.id));
      const u = thumbs[photo.id];
      if (u) {
        URL.revokeObjectURL(u);
        setThumbs(prev => { const n = { ...prev }; delete n[photo.id]; return n; });
      }
      if (preview?.id === photo.id) closePreview();
    } catch (e) {
      setError(e.message || 'Delete failed.');
    }
  };

  const openPreview = async (photo) => {
    setPreview(photo);
    setPreviewUrl(thumbs[photo.id] || null);
    if (!thumbs[photo.id]) {
      try {
        const url = await getPhotoObjectUrl(photo.driveFileId);
        objectUrlsRef.current.push(url);
        setPreviewUrl(url);
      } catch (_) {}
    }
  };

  const closePreview = () => {
    setPreview(null);
    setPreviewUrl(null);
  };

  return (
    <div className={styles.card}>
      <ErrorBanner message={error} onDismiss={() => setError('')} />

      <div className={styles.headerRow}>
        <h3 className={styles.h3}>Progress photos</h3>
        {connected && (
          <button
            type="button"
            className={styles.addLink}
            onClick={() => setShowAdd((s) => !s)}
          >
            {showAdd ? 'Cancel' : '+ Add photo'}
          </button>
        )}
      </div>

      {!connected && (
        <div className={styles.connectPrompt}>
          <Button onClick={handleConnect}>Connect Google Drive</Button>
        </div>
      )}

      {connected && showAdd && (
        <div className={styles.addForm}>
          <Field label="Date" type="date" value={form.date}
                 onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <Field label="Weight (kg, optional)" type="number" step="0.1" min="0" value={form.weight}
                 onChange={(e) => setForm({ ...form, weight: e.target.value })} />
          <Field label="Notes (optional)" type="text" value={form.notes}
                 onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChosen}
          />
          <Button block onClick={handlePickFile} disabled={uploading}>
            {uploading ? 'Uploading…' : 'Choose photo'}
          </Button>
        </div>
      )}

      {connected && (
        <>
          {loading && <p className={styles.muted}>Loading…</p>}
          {!loading && photos.length === 0 && (
            <p className={styles.muted}>No progress photos yet.</p>
          )}
          {photos.length > 0 && (
            <div className={styles.grid}>
              {photos.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={styles.tile}
                  onClick={() => openPreview(p)}
                >
                  {thumbs[p.id] ? (
                    <img src={thumbs[p.id]} alt={p.date} className={styles.thumb} />
                  ) : (
                    <div className={styles.thumbPlaceholder}>…</div>
                  )}
                  <div className={styles.tileMeta}>
                    <span className={styles.tileDate}>{p.date}</span>
                    {p.weight != null && <span className={styles.tileWeight}>{p.weight} kg</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {preview && (
        <div className={styles.previewOverlay} onClick={closePreview}>
          <div className={styles.previewBox} onClick={(e) => e.stopPropagation()}>
            <button className={styles.previewClose} onClick={closePreview}>✕</button>
            {previewUrl
              ? <img src={previewUrl} alt={preview.date} className={styles.previewImage} />
              : <p className={styles.muted}>Loading…</p>}
            <div className={styles.previewMeta}>
              <div><strong>{preview.date}</strong></div>
              {preview.weight != null && <div>{preview.weight} kg</div>}
              {preview.notes && <div className={styles.muted}>{preview.notes}</div>}
            </div>
            <Button variant="secondary" onClick={() => handleDelete(preview)}>Delete</Button>
          </div>
        </div>
      )}
    </div>
  );
}
