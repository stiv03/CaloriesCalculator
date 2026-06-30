// frontend/src/integrations/googleDrive.js
//
// Lightweight Google Drive integration using the implicit/token flow.
//
// - Uses Google Identity Services (loaded in public/index.html) to mint a
//   short-lived (~1 h) access token.
// - The token + its expiry is cached in localStorage so a page reload doesn't
//   force a new popup. When it expires we try a silent refresh first
//   (prompt: 'none'); only if that fails do we pop the visible consent window.
// - Scope is drive.file — the app can only see files it has created.

const CLIENT_ID = '553699428495-oc7votvipc76s9ms4vhr0f2kre3hsq42.apps.googleusercontent.com';
const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_NAME = 'Flex Progress Photos';
const STORAGE_KEY = 'drive_token_v1';

let accessToken = null;
let tokenExpiresAt = 0;
let folderIdCache = null;

const isTokenValid = () => accessToken && Date.now() < tokenExpiresAt - 30_000;

// Restore from localStorage on module load.
(() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed?.token && typeof parsed.expiresAt === 'number') {
      accessToken = parsed.token;
      tokenExpiresAt = parsed.expiresAt;
    }
  } catch (_) { /* ignore */ }
})();

const persistToken = () => {
  try {
    if (accessToken) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        token: accessToken,
        expiresAt: tokenExpiresAt,
      }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (_) { /* ignore */ }
};

const clearToken = () => {
  accessToken = null;
  tokenExpiresAt = 0;
  persistToken();
};

const waitForGsi = () => new Promise((resolve, reject) => {
  if (window.google?.accounts?.oauth2) return resolve();
  const start = Date.now();
  const t = setInterval(() => {
    if (window.google?.accounts?.oauth2) { clearInterval(t); resolve(); }
    else if (Date.now() - start > 8000) { clearInterval(t); reject(new Error('Google library failed to load')); }
  }, 50);
});

/**
 * Request a fresh access token.
 *  silent=true tries `prompt: 'none'` first — succeeds without UI if the user
 *  already has a Google session in this browser and previously consented.
 *  silent=false always pops the visible consent window.
 */
const requestToken = (silent) => new Promise(async (resolve, reject) => {
  await waitForGsi();
  const client = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPE,
    callback: (resp) => {
      if (resp.error) return reject(new Error(resp.error_description || resp.error));
      accessToken = resp.access_token;
      tokenExpiresAt = Date.now() + (Number(resp.expires_in) || 3600) * 1000;
      persistToken();
      resolve(accessToken);
    },
    error_callback: (err) => reject(new Error(err.message || 'OAuth failed')),
  });
  client.requestAccessToken({ prompt: silent ? 'none' : '' });
});

/** Get a usable access token, refreshing silently or popping the window. */
export const getAccessToken = async () => {
  if (isTokenValid()) return accessToken;
  // Try silent first — works if the user is still signed into Google here.
  try {
    return await requestToken(true);
  } catch (_) {
    // Fall through to the visible popup.
  }
  return requestToken(false);
};

/** Explicit "Connect Google Drive" click — always shows the consent UI. */
export const connect = async () => requestToken(false);

/** Drop the cached token (useful if you ever add a "Disconnect" UI). */
export const disconnect = () => clearToken();

/** True if we currently hold a non-expired token. */
export const isConnected = () => isTokenValid();

const driveFetch = async (path, init = {}) => {
  const doFetch = async (token) => {
    const headers = { Authorization: `Bearer ${token}`, ...(init.headers || {}) };
    return fetch(`https://www.googleapis.com/${path}`, { ...init, headers });
  };
  let token = await getAccessToken();
  let res = await doFetch(token);
  if (res.status === 401) {
    // Token was revoked/invalidated server-side. Drop cache, re-auth, retry.
    clearToken();
    token = await getAccessToken();
    res = await doFetch(token);
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Drive API ${res.status}: ${body}`);
  }
  return res;
};

/** Find or create the app folder in the user's Drive root. */
const ensureFolder = async () => {
  if (folderIdCache) return folderIdCache;
  // List folders the app has created with our folder name.
  const q = encodeURIComponent(`name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const listRes = await driveFetch(`drive/v3/files?q=${q}&spaces=drive&fields=files(id,name)`);
  const listJson = await listRes.json();
  if (listJson.files?.length) {
    folderIdCache = listJson.files[0].id;
    return folderIdCache;
  }
  // Create it.
  const createRes = await driveFetch('drive/v3/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' }),
  });
  const createJson = await createRes.json();
  folderIdCache = createJson.id;
  return folderIdCache;
};

/**
 * Upload a file (Blob/File) into the app folder.
 * Uses the multipart upload endpoint so we can set metadata + content in one round-trip.
 * Returns { id, name } from Drive.
 */
export const uploadPhoto = async (file, filename) => {
  const token = await getAccessToken();
  const folderId = await ensureFolder();
  const metadata = {
    name: filename || file.name || `photo-${Date.now()}.jpg`,
    parents: [folderId],
  };
  const boundary = `flexboundary${Math.floor(Math.random() * 1e9)}`;
  const body = await buildMultipartBody(metadata, file, boundary);
  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Drive upload failed (${res.status}): ${errText}`);
  }
  return res.json();
};

const buildMultipartBody = async (metadata, file, boundary) => {
  const enc = new TextEncoder();
  const head = enc.encode(
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify(metadata) + `\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${file.type || 'image/jpeg'}\r\n\r\n`
  );
  const tail = enc.encode(`\r\n--${boundary}--`);
  const fileBuf = await file.arrayBuffer();
  const out = new Uint8Array(head.length + fileBuf.byteLength + tail.length);
  out.set(head, 0);
  out.set(new Uint8Array(fileBuf), head.length);
  out.set(tail, head.length + fileBuf.byteLength);
  return out;
};

/** Delete a file from the user's Drive. */
export const deletePhoto = async (fileId) => {
  await driveFetch(`drive/v3/files/${fileId}`, { method: 'DELETE' });
};

/** Set of MIME types every browser can render natively. */
const BROWSER_RENDERABLE = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/svg+xml',
  'image/avif',
]);

/**
 * Fetch a photo's bytes and return an Object URL the browser can render.
 *
 * For browser-renderable formats we stream the original bytes. For HEIC and
 * other non-renderable formats we fall back to Drive's auto-generated JPEG
 * thumbnail (up to 1600 px wide), which renders everywhere.
 *
 * Callers should URL.revokeObjectURL() when done.
 */
export const getPhotoObjectUrl = async (fileId) => {
  // First ask Drive what the file is and whether it has a usable thumbnail.
  const metaRes = await driveFetch(`drive/v3/files/${fileId}?fields=mimeType,thumbnailLink`);
  const meta = await metaRes.json();
  const renderable = BROWSER_RENDERABLE.has((meta.mimeType || '').toLowerCase());

  if (renderable) {
    const res = await driveFetch(`drive/v3/files/${fileId}?alt=media`);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  }

  // Non-renderable (HEIC etc.) — use Drive's JPEG thumbnail, bumped to a
  // larger size than the default 220 px. Drive's thumbnailLink encodes a
  // signed token; we still need our access token on the request because the
  // file is in a private scope.
  if (meta.thumbnailLink) {
    const big = meta.thumbnailLink.replace(/=s\d+$/, '=s1600');
    const token = await getAccessToken();
    const res = await fetch(big, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      // Fall through to raw bytes if the thumbnail URL fails — the browser
      // probably can't render it, but at least the download will be valid.
      const fallback = await driveFetch(`drive/v3/files/${fileId}?alt=media`);
      const blob = await fallback.blob();
      return URL.createObjectURL(blob);
    }
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  }

  // No thumbnail available — return raw bytes so the user at least sees the
  // broken-image icon rather than nothing.
  const res = await driveFetch(`drive/v3/files/${fileId}?alt=media`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
};
