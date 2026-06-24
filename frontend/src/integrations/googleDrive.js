// frontend/src/integrations/googleDrive.js
//
// Lightweight Google Drive integration using the implicit/token flow.
//
// - Uses Google Identity Services (loaded in public/index.html) to pop a
//   consent window and obtain a short-lived (~1 h) access token.
// - Token lives only in this module's memory; refreshing means re-popping the
//   consent window. We never store refresh tokens, secrets, or anything in
//   localStorage / on the backend.
// - Scope is drive.file — the app can only see files it has created.

const CLIENT_ID = '553699428495-oc7votvipc76s9ms4vhr0f2kre3hsq42.apps.googleusercontent.com';
const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_NAME = 'Flex Progress Photos';

let accessToken = null;
let tokenExpiresAt = 0;
let folderIdCache = null;

const isTokenValid = () => accessToken && Date.now() < tokenExpiresAt - 30_000;

const waitForGsi = () => new Promise((resolve, reject) => {
  if (window.google?.accounts?.oauth2) return resolve();
  const start = Date.now();
  const t = setInterval(() => {
    if (window.google?.accounts?.oauth2) { clearInterval(t); resolve(); }
    else if (Date.now() - start > 8000) { clearInterval(t); reject(new Error('Google library failed to load')); }
  }, 50);
});

/** Request a fresh access token via the OAuth popup. Resolves with the token. */
const requestToken = () => new Promise(async (resolve, reject) => {
  await waitForGsi();
  const client = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPE,
    callback: (resp) => {
      if (resp.error) return reject(new Error(resp.error_description || resp.error));
      accessToken = resp.access_token;
      // expires_in is seconds; cushion at 30s applied in isTokenValid.
      tokenExpiresAt = Date.now() + (Number(resp.expires_in) || 3600) * 1000;
      resolve(accessToken);
    },
    error_callback: (err) => reject(new Error(err.message || 'OAuth failed')),
  });
  client.requestAccessToken({ prompt: '' });
});

/** Get a usable access token, popping the OAuth window if needed. */
export const getAccessToken = async () => {
  if (isTokenValid()) return accessToken;
  return requestToken();
};

/** Force the consent popup (used by the "Connect Google Drive" button). */
export const connect = async () => requestToken();

/** True if we currently hold a non-expired token. */
export const isConnected = () => isTokenValid();

const driveFetch = async (path, init = {}) => {
  const token = await getAccessToken();
  const headers = { Authorization: `Bearer ${token}`, ...(init.headers || {}) };
  const res = await fetch(`https://www.googleapis.com/${path}`, { ...init, headers });
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

/**
 * Fetch a single photo's bytes and return an Object URL the browser can render.
 * (We can't use a public Drive URL with drive.file scope — we have to
 * authenticate the GET.) Callers should URL.revokeObjectURL() when done.
 */
export const getPhotoObjectUrl = async (fileId) => {
  const res = await driveFetch(`drive/v3/files/${fileId}?alt=media`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
};
