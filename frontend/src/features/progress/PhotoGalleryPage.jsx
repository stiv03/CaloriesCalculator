// frontend/src/features/progress/PhotoGalleryPage.jsx
//
// Horizontal timeline of progress photos.
//
// - Each date with photo(s) becomes a dot. Dots are positioned by real date
//   distance so a 2-week gap looks twice as wide as a 1-week gap.
// - Markers (e.g. "cut start", "bulk start") render as vertical bands at their
//   date.
// - Clicking a dot opens a comparison: that photo vs the previous-date photo.
//   A "Compare against" dropdown lets you swap the comparison target to any
//   other photo by date.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button';
import Field from '../../components/Field';
import ErrorBanner from '../../components/ErrorBanner';
import { getUserId } from '../../auth/storage';
import {
  listProgressPhotos, createProgressPhoto,
} from '../../api/progressPhotos';
import {
  listProgressMarkers, createProgressMarker, deleteProgressMarker,
} from '../../api/progressMarkers';
import {
  connect as connectDrive, isConnected as isDriveConnected,
  uploadPhoto, getPhotoObjectUrl,
} from '../../integrations/googleDrive';
import styles from './PhotoGalleryPage.module.css';

const MS_PER_DAY = 86_400_000;
const MIN_DOT_GAP_PX = 56;   // minimum px between dots, no matter how close in date
const PX_PER_DAY = 14;       // base horizontal scale
const TIMELINE_PAD_PX = 48;  // left/right padding on the rail

// Marker color choices shown in the add-marker modal.
const MARKER_COLORS = [
  '#FBBF24', // amber (default)
  '#EF4444', // red
  '#22C55E', // green
  '#3B82F6', // blue
  '#A855F7', // purple
  '#EC4899', // pink
  '#94A3B8', // slate
];
const DEFAULT_MARKER_COLOR = MARKER_COLORS[0];

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const fmtShort = (iso) => {
  if (!iso) return '';
  const [, m, d] = iso.split('-');
  const month = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(m, 10) - 1];
  return `${month} ${parseInt(d, 10)}`;
};

const daysBetween = (a, b) =>
  Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / MS_PER_DAY);

/**
 * Lay items out along a horizontal axis based on their `date` (YYYY-MM-DD).
 * Returns { positions: Map<id, xPixels>, totalWidth }.
 * Items must be sorted ascending by date.
 */
function layoutByDate(items) {
  const positions = new Map();
  if (!items.length) return { positions, totalWidth: TIMELINE_PAD_PX * 2 };
  let x = TIMELINE_PAD_PX;
  positions.set(items[0].id, x);
  for (let i = 1; i < items.length; i++) {
    const dayGap = daysBetween(items[i - 1].date, items[i].date);
    const gapPx = Math.max(MIN_DOT_GAP_PX, dayGap * PX_PER_DAY);
    x += gapPx;
    positions.set(items[i].id, x);
  }
  const totalWidth = x + TIMELINE_PAD_PX;
  return { positions, totalWidth };
}

export default function PhotoGalleryPage() {
  const userId = getUserId();
  const navigate = useNavigate();

  const [photos, setPhotos] = useState([]);
  const [markers, setMarkers] = useState([]);
  const [thumbs, setThumbs] = useState({}); // { [photoId]: objectURL }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(isDriveConnected());

  // Selection — drives the comparison panel.
  const [selectedId, setSelectedId] = useState(null);
  const [compareId, setCompareId] = useState(null);
  const userPickedCompare = useRef(false); // sticky if user explicitly picked

  // Modal states
  const [showAddPhoto, setShowAddPhoto] = useState(false);
  const [photoForm, setPhotoForm] = useState({ date: todayIso(), weight: '', notes: '' });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const [showAddMarker, setShowAddMarker] = useState(false);
  const [markerForm, setMarkerForm] = useState({ date: todayIso(), label: '', color: DEFAULT_MARKER_COLOR });
  const [savingMarker, setSavingMarker] = useState(false);

  // Whether the "all photos" list section is expanded.
  const [showAll, setShowAll] = useState(false);

  // Object URLs we've created and need to release on unmount.
  const objectUrlsRef = useRef([]);
  const timelineRef = useRef(null);

  const releaseObjectUrls = () => {
    objectUrlsRef.current.forEach(u => URL.revokeObjectURL(u));
    objectUrlsRef.current = [];
  };

  /** Photos sorted ascending by date (timeline order: oldest → newest). */
  const photosAsc = useMemo(
    () => [...photos].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id),
    [photos]
  );

  /** Photos newest first — what the "all photos" panel shows. */
  const photosDesc = useMemo(
    () => [...photos].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id),
    [photos]
  );

  const layout = useMemo(() => layoutByDate(photosAsc), [photosAsc]);

  // Initial load.
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ph, mk] = await Promise.all([
        listProgressPhotos(userId),
        listProgressMarkers(userId),
      ]);
      setPhotos(ph);
      setMarkers(mk);
    } catch (e) {
      setError(e.message || 'Could not load.');
    } finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => () => releaseObjectUrls(), []);

  // Default selection = newest photo. Default compare = the one before it.
  useEffect(() => {
    if (!photosAsc.length) {
      setSelectedId(null);
      setCompareId(null);
      userPickedCompare.current = false;
      return;
    }
    if (selectedId == null) {
      setSelectedId(photosAsc[photosAsc.length - 1].id);
    }
  }, [photosAsc, selectedId]);

  // Auto-track compare unless user explicitly picked one.
  useEffect(() => {
    if (selectedId == null || userPickedCompare.current) return;
    const idx = photosAsc.findIndex(p => p.id === selectedId);
    if (idx <= 0) { setCompareId(null); return; }
    setCompareId(photosAsc[idx - 1].id);
  }, [selectedId, photosAsc]);

  // Lazy-load thumbnails when connected.
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
        } catch (_) { /* placeholder */ }
      }
    })();
    return () => { cancelled = true; };
  }, [connected, photos, thumbs]);

  // Scroll the selected dot into the centre of the timeline rail.
  // First time we land on a selection, jump instantly so the rail opens
  // already showing the latest photo. Subsequent selections smooth-scroll.
  const firstScrollDoneRef = useRef(false);
  useEffect(() => {
    if (selectedId == null || !timelineRef.current) return;
    const x = layout.positions.get(selectedId);
    if (x == null) return;
    const el = timelineRef.current;
    const doScroll = () => {
      const target = x - el.clientWidth / 2;
      el.scrollTo({
        left: Math.max(0, target),
        behavior: firstScrollDoneRef.current ? 'smooth' : 'auto',
      });
      firstScrollDoneRef.current = true;
    };
    // Defer one frame so the rail's width (and the inner total width) is
    // measured by the browser before we ask it to scroll.
    requestAnimationFrame(doScroll);
  }, [selectedId, layout]);

  const handleConnect = async () => {
    setError('');
    try {
      await connectDrive();
      setConnected(true);
    } catch (e) { setError(e.message || 'Could not connect Google Drive.'); }
  };

  // ── Add photo ────────────────────────────────────────────────────────
  const handlePickFile = () => fileRef.current?.click();

  /**
   * Convert HEIC/HEIF to JPEG client-side so the file lands in Drive as a
   * browser-renderable format. Lazy-imports heic2any so the ~150 KB lib is
   * only loaded when actually needed.
   */
  const convertHeicIfNeeded = async (file) => {
    const name = (file.name || '').toLowerCase();
    const type = (file.type || '').toLowerCase();
    const isHeic = type === 'image/heic' || type === 'image/heif'
      || name.endsWith('.heic') || name.endsWith('.heif');
    if (!isHeic) return file;
    const { default: heic2any } = await import('heic2any');
    const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
    const out = Array.isArray(converted) ? converted[0] : converted;
    // Drop the .heic extension and add .jpg.
    const baseName = (file.name || 'photo').replace(/\.[^.]+$/, '');
    return new File([out], `${baseName}.jpg`, { type: 'image/jpeg' });
  };

  const handleFileChosen = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      if (!isDriveConnected()) {
        await connectDrive();
        setConnected(true);
      }
      const ready = await convertHeicIfNeeded(file);
      const ext = (ready.name.match(/\.[^.]+$/)?.[0] || '.jpg').toLowerCase();
      const sameDayCount = photos.filter(p => p.date === photoForm.date).length;
      const filename = sameDayCount === 0
        ? `${photoForm.date}${ext}`
        : `${photoForm.date}-${sameDayCount + 1}${ext}`;
      const driveFile = await uploadPhoto(ready, filename);
      const saved = await createProgressPhoto(userId, {
        driveFileId: driveFile.id,
        date: photoForm.date,
        weight: photoForm.weight ? parseFloat(photoForm.weight) : null,
        notes: photoForm.notes || null,
      });
      setPhotos(prev => [...prev, saved]);
      setSelectedId(saved.id);
      userPickedCompare.current = false;
      setPhotoForm({ date: todayIso(), weight: '', notes: '' });
      setShowAddPhoto(false);
    } catch (e) {
      setError(e.message || 'Upload failed.');
    } finally { setUploading(false); }
  };

  // ── Markers ──────────────────────────────────────────────────────────
  const handleAddMarker = async () => {
    if (!markerForm.label.trim()) {
      setError('Marker label is required.');
      return;
    }
    setSavingMarker(true);
    try {
      const saved = await createProgressMarker(userId, {
        date: markerForm.date,
        label: markerForm.label.trim(),
        color: markerForm.color || DEFAULT_MARKER_COLOR,
      });
      setMarkers(prev => [...prev, saved].sort((a, b) => a.date.localeCompare(b.date)));
      setMarkerForm({ date: todayIso(), label: '', color: DEFAULT_MARKER_COLOR });
      setShowAddMarker(false);
    } catch (e) {
      setError(e.message || 'Could not save marker.');
    } finally { setSavingMarker(false); }
  };

  const handleDeleteMarker = async (marker) => {
    if (!window.confirm(`Delete marker "${marker.label}"?`)) return;
    try {
      await deleteProgressMarker(userId, marker.id);
      setMarkers(prev => prev.filter(m => m.id !== marker.id));
    } catch (e) {
      setError(e.message || 'Could not delete marker.');
    }
  };

  // ── Marker positioning along the photo timeline ──────────────────────
  // We position markers by date relative to the photo dots, so a marker
  // between two photo dates lands proportionally between them.
  const todayStr = todayIso();

  // Compute the x for any date. If the date is past the last photo we extend
  // off the right edge using the same PX_PER_DAY scale so "today" doesn't pile
  // on top of the newest dot when the user hasn't taken a photo yet today.
  const xForDate = (date) => {
    if (!photosAsc.length) return TIMELINE_PAD_PX;
    const first = photosAsc[0].date;
    const last = photosAsc[photosAsc.length - 1].date;
    if (date <= first) return TIMELINE_PAD_PX;
    if (date >= last) {
      const lastX = layout.positions.get(photosAsc[photosAsc.length - 1].id);
      const extra = daysBetween(last, date) * PX_PER_DAY;
      return lastX + extra;
    }
    for (let i = 1; i < photosAsc.length; i++) {
      if (photosAsc[i].date >= date) {
        const a = photosAsc[i - 1];
        const b = photosAsc[i];
        const span = daysBetween(a.date, b.date) || 1;
        const t = daysBetween(a.date, date) / span;
        const ax = layout.positions.get(a.id);
        const bx = layout.positions.get(b.id);
        return ax + (bx - ax) * t;
      }
    }
    return TIMELINE_PAD_PX;
  };

  const markerPositions = useMemo(() => {
    if (!photosAsc.length) return [];
    return markers.map(m => ({ marker: m, x: xForDate(m.date) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, photosAsc, layout]);

  const todayX = photosAsc.length ? xForDate(todayStr) : null;

  // Total width of the timeline inner — extend if anything (today or a
  // future-dated marker) sits past the latest photo.
  const innerWidth = useMemo(() => {
    if (!photosAsc.length) return layout.totalWidth;
    let max = layout.totalWidth;
    if (todayX != null) max = Math.max(max, todayX + TIMELINE_PAD_PX);
    for (const { x } of markerPositions) {
      if (x != null) max = Math.max(max, x + TIMELINE_PAD_PX);
    }
    return max;
  }, [layout, photosAsc, todayX, markerPositions]);

  // ── Dot grouping per date (multiple photos same day) ─────────────────
  const sameDayCount = (photoDate) => photos.filter(p => p.date === photoDate).length;
  const sameDayIndex = (photo) =>
    photosAsc.filter(p => p.date === photo.date).findIndex(p => p.id === photo.id);

  const selected = useMemo(
    () => photosAsc.find(p => p.id === selectedId) || null,
    [selectedId, photosAsc]
  );
  const compare = useMemo(
    () => photosAsc.find(p => p.id === compareId) || null,
    [compareId, photosAsc]
  );

  const scrollRail = (delta) => {
    if (!timelineRef.current) return;
    timelineRef.current.scrollBy({ left: delta, behavior: 'smooth' });
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={() => navigate(-1)} aria-label="Back">‹</button>
        <h1 className={styles.title}>Photos</h1>
        {connected && (
          <>
            <button type="button" className={styles.markerBtn} onClick={() => setShowAddMarker(true)}>
              + Marker
            </button>
            <button type="button" className={styles.addBtn} onClick={() => setShowAddPhoto(true)}>
              + Photo
            </button>
          </>
        )}
      </header>

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      {!connected && (
        <div className={styles.connectCard}>
          <p className={styles.muted}>Connect Google Drive to view and add progress photos.</p>
          <Button onClick={handleConnect}>Connect Google Drive</Button>
        </div>
      )}

      {connected && (
        <>
          {loading && <p className={styles.muted}>Loading…</p>}

          {!loading && photosAsc.length === 0 && (
            <p className={styles.muted}>No progress photos yet. Tap “+ Photo” to add one.</p>
          )}

          {photosAsc.length > 0 && (
            <div className={styles.timelineRow}>
              <button
                type="button"
                className={styles.scrollBtn}
                onClick={() => scrollRail(-280)}
                aria-label="Scroll left"
              >‹</button>

              <div className={styles.timelineRail} ref={timelineRef}>
                <div
                  className={styles.timelineInner}
                  style={{ width: `${innerWidth}px` }}
                >
                  {/* "Today" vertical line */}
                  {todayX != null && (
                    <div
                      className={styles.todayBand}
                      style={{ left: `${todayX}px` }}
                      title={`Today · ${todayStr}`}
                    >
                      <span className={styles.todayLabel}>Today</span>
                    </div>
                  )}
                  {/* Vertical marker bands behind everything */}
                  {markerPositions.map(({ marker, x }) => {
                    const color = marker.color || DEFAULT_MARKER_COLOR;
                    return (
                      <div
                        key={marker.id}
                        className={styles.markerBand}
                        style={{ left: `${x}px`, background: color }}
                        onClick={() => handleDeleteMarker(marker)}
                        title={`${marker.label} · ${marker.date} (click to delete)`}
                      >
                        <span
                          className={styles.markerLabel}
                          style={{ color, borderColor: color }}
                        >
                          {marker.label}
                        </span>
                      </div>
                    );
                  })}

                  {/* The line itself */}
                  <div className={styles.line} />

                  {/* Photo dots */}
                  {photosAsc.map(p => {
                    const x = layout.positions.get(p.id);
                    const count = sameDayCount(p.date);
                    const idx = sameDayIndex(p);
                    // Only render one dot per date — let it represent the
                    // earliest same-day photo; later same-day photos appear
                    // in the dropdown.
                    if (idx !== 0) return null;
                    const isSelected = selected && selected.date === p.date;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        className={[
                          styles.dot,
                          isSelected ? styles.dotSelected : '',
                        ].join(' ')}
                        style={{ left: `${x}px` }}
                        onClick={() => {
                          // Select the newest photo for this date so the panel
                          // shows the most recent shot.
                          const sameDay = photosAsc.filter(q => q.date === p.date);
                          setSelectedId(sameDay[sameDay.length - 1].id);
                          userPickedCompare.current = false;
                        }}
                        title={`${p.date}${count > 1 ? ` (${count} photos)` : ''}`}
                      >
                        <span className={styles.dotDate}>{fmtShort(p.date)}</span>
                        {count > 1 && <span className={styles.dotBadge}>+{count - 1}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                className={styles.scrollBtn}
                onClick={() => scrollRail(280)}
                aria-label="Scroll right"
              >›</button>
            </div>
          )}

          {/* ── Comparison panel ──────────────────────────────────────── */}
          {selected && (
            <div className={styles.comparePanel}>
              <div className={styles.compareHeader}>
                {compare
                  ? <span>Comparing <strong>{fmtShort(selected.date)}</strong> vs <strong>{fmtShort(compare.date)}</strong></span>
                  : <span>Selected: <strong>{fmtShort(selected.date)}</strong></span>}
              </div>

              <div className={styles.compareSlots}>
                <PhotoPane photo={selected} url={thumbs[selected.id]} />
                {compare
                  ? <PhotoPane photo={compare} url={thumbs[compare.id]} />
                  : <div className={styles.slotEmpty}>Add another photo to compare</div>}
              </div>

              <div className={styles.compareControls}>
                <label className={styles.controlLabel}>Compare against:</label>
                <select
                  className={styles.controlSelect}
                  value={compareId ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCompareId(v ? Number(v) : null);
                    userPickedCompare.current = v !== '';
                  }}
                >
                  <option value="">— none —</option>
                  {photosAsc
                    .filter(p => p.id !== selectedId)
                    .slice()
                    .reverse()
                    .map(p => {
                      const sameDay = photosAsc.filter(q => q.date === p.date);
                      const idx = sameDay.findIndex(q => q.id === p.id);
                      const suffix = sameDay.length > 1 ? ` (${idx + 1})` : '';
                      return (
                        <option key={p.id} value={p.id}>
                          {fmtShort(p.date)}{suffix}
                        </option>
                      );
                    })}
                </select>
              </div>
            </div>
          )}

          {/* ── Show all photos ──────────────────────────────────────── */}
          {photosDesc.length > 0 && (
            <div className={styles.allPhotosSection}>
              <button
                type="button"
                className={styles.showAllBtn}
                onClick={() => setShowAll(s => !s)}
              >
                {showAll ? 'Hide all photos' : `Show all photos (${photosDesc.length})`}
              </button>

              {showAll && (
                <div className={styles.allPhotosList}>
                  {photosDesc.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      className={[
                        styles.allPhotoRow,
                        selectedId === p.id ? styles.allPhotoRowActive : '',
                      ].join(' ')}
                      onClick={() => {
                        setSelectedId(p.id);
                        userPickedCompare.current = false;
                      }}
                    >
                      {thumbs[p.id]
                        ? <img src={thumbs[p.id]} alt={p.date} className={styles.allPhotoThumb} />
                        : <div className={styles.allPhotoThumbPlaceholder}>…</div>}
                      <div className={styles.allPhotoMeta}>
                        <div className={styles.allPhotoDate}>{p.date}</div>
                        <div className={styles.allPhotoSub}>
                          {p.weight != null ? `${p.weight} kg` : '—'}
                        </div>
                        {p.notes && <div className={styles.allPhotoNotes}>{p.notes}</div>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Add photo modal ─────────────────────────────────────────────── */}
      {showAddPhoto && (
        <div className={styles.modalOverlay} onClick={() => !uploading && setShowAddPhoto(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Add photo</h2>
              <button className={styles.modalClose} onClick={() => !uploading && setShowAddPhoto(false)}>✕</button>
            </div>
            <Field label="Date" type="date" value={photoForm.date}
                   onChange={(e) => setPhotoForm({ ...photoForm, date: e.target.value })} />
            <Field label="Weight (kg, optional)" type="number" step="0.1" min="0" value={photoForm.weight}
                   onChange={(e) => setPhotoForm({ ...photoForm, weight: e.target.value })} />
            <Field label="Notes (optional)" type="text" value={photoForm.notes}
                   onChange={(e) => setPhotoForm({ ...photoForm, notes: e.target.value })} />
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChosen} />
            <Button block onClick={handlePickFile} disabled={uploading}>
              {uploading ? 'Uploading…' : 'Choose photo'}
            </Button>
          </div>
        </div>
      )}

      {/* ── Add marker modal ────────────────────────────────────────────── */}
      {showAddMarker && (
        <div className={styles.modalOverlay} onClick={() => !savingMarker && setShowAddMarker(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Add marker</h2>
              <button className={styles.modalClose} onClick={() => !savingMarker && setShowAddMarker(false)}>✕</button>
            </div>
            <Field label="Date" type="date" value={markerForm.date}
                   onChange={(e) => setMarkerForm({ ...markerForm, date: e.target.value })} />
            <Field label='Label (e.g. "cut start")' type="text" value={markerForm.label}
                   maxLength={64}
                   onChange={(e) => setMarkerForm({ ...markerForm, label: e.target.value })} />
            <div className={styles.colorRow}>
              <div className={styles.colorRowLabel}>Color</div>
              <div className={styles.colorSwatches}>
                {MARKER_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Use color ${c}`}
                    className={[
                      styles.colorSwatch,
                      markerForm.color === c ? styles.colorSwatchActive : '',
                    ].join(' ')}
                    style={{ background: c }}
                    onClick={() => setMarkerForm({ ...markerForm, color: c })}
                  />
                ))}
              </div>
            </div>
            <Button block onClick={handleAddMarker} disabled={savingMarker}>
              {savingMarker ? 'Saving…' : 'Save marker'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function PhotoPane({ photo, url }) {
  return (
    <div className={styles.slot}>
      {url
        ? <img src={url} alt={photo.date} className={styles.slotImage} />
        : <div className={styles.slotPlaceholder}>Loading…</div>}
      <div className={styles.slotMeta}>
        <span className={styles.slotDate}>{photo.date}</span>
        {photo.weight != null && <span className={styles.slotWeight}>{photo.weight} kg</span>}
      </div>
      {photo.notes && <div className={styles.slotNotes}>{photo.notes}</div>}
    </div>
  );
}
