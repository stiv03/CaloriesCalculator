import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import styles from './BarcodeScanner.module.css';

// EAN/UPC formats — what food barcodes actually use.
const FORMATS = ['EAN_13', 'EAN_8', 'UPC_A', 'UPC_E'];

/**
 * Camera barcode scanner overlay. Calls onDetected(code) once on the first
 * successful read, then stops the camera. Calls onClose when dismissed.
 * On camera failure (denied/unavailable) shows a message and a Close button;
 * the caller's manual-entry field remains the fallback.
 */
export default function BarcodeScanner({ onDetected, onClose }) {
  const regionId = 'barcode-reader-region';
  const scannerRef = useRef(null);
  const handledRef = useRef(false); // guard against double-fire
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const html5 = new Html5Qrcode(regionId, { formatsToSupport: mapFormats() });
    scannerRef.current = html5;

    html5
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          if (handledRef.current) return;
          handledRef.current = true;
          onDetected(decodedText);
        },
        () => { /* per-frame decode misses are normal — ignore */ }
      )
      .catch((err) => {
        if (!cancelled) {
          setError(
            'Camera unavailable. Grant camera permission, or type the barcode number below.'
          );
          // eslint-disable-next-line no-console
          console.warn('Barcode scanner start failed:', err);
        }
      });

    return () => {
      cancelled = true;
      const s = scannerRef.current;
      if (s) {
        // stop() rejects if never started; swallow it.
        s.stop().then(() => s.clear()).catch(() => {});
      }
    };
  }, [onDetected]);

  return (
    <div className={styles.overlay}>
      <div className={styles.frame}>
        <div id={regionId} className={styles.region} />
        {error ? <p className={styles.error}>{error}</p> : <p className={styles.hint}>Point the camera at the barcode</p>}
        <button type="button" className={styles.close} onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

// html5-qrcode exposes formats as a numeric enum; resolve lazily so a version
// change that renames them degrades to "all formats" rather than crashing.
function mapFormats() {
  try {
    // eslint-disable-next-line global-require
    const { Html5QrcodeSupportedFormats } = require('html5-qrcode');
    return FORMATS.map((f) => Html5QrcodeSupportedFormats[f]).filter((v) => v != null);
  } catch {
    return undefined; // undefined → library scans all supported formats
  }
}
