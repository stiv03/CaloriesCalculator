// frontend/src/integrations/googleHealth.js
//
// Google Health API integration — reads the user's body weight (synced from
// Fitbit / Pixel Watch / etc. into Google Health) and lets the app import it.
//
// Mirrors googleDrive.js: uses Google Identity Services (loaded in
// public/index.html) to mint a short-lived (~1 h) access token via the browser
// token flow, cached in localStorage. Separate cache key + scope from Drive.
//
// Scope is health_metrics_and_measurements.readonly — read-only, weight/body
// metrics only. We never write to Google Health.
//
// NOTE: the exact JSON shape of a weight data point (WeightRollupValue) was not
// fully documented at build time, so parseWeightPoints() is defensive and the
// raw response is logged on first use — inspect the console to confirm/adjust.

const CLIENT_ID = '553699428495-oc7votvipc76s9ms4vhr0f2kre3hsq42.apps.googleusercontent.com';
const SCOPE = 'https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly';
const STORAGE_KEY = 'health_token_v1';
const HEALTH_BASE = 'https://health.googleapis.com/v4';

let accessToken = null;
let tokenExpiresAt = 0;

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
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: accessToken, expiresAt: tokenExpiresAt }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (_) { /* ignore */ }
};

const clearToken = () => { accessToken = null; tokenExpiresAt = 0; persistToken(); };

const waitForGsi = () => new Promise((resolve, reject) => {
  if (window.google?.accounts?.oauth2) return resolve();
  const start = Date.now();
  const t = setInterval(() => {
    if (window.google?.accounts?.oauth2) { clearInterval(t); resolve(); }
    else if (Date.now() - start > 8000) { clearInterval(t); reject(new Error('Google library failed to load')); }
  }, 50);
});

const requestToken = (silent) => new Promise(async (resolve, reject) => {
  await waitForGsi();
  const client = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPE,
    // Do NOT fold in previously-granted scopes (e.g. Drive). The Health API
    // rejects any token carrying scopes it doesn't recognize (drive_resource),
    // so this token must be Health-scope-only.
    include_granted_scopes: false,
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

const getAccessToken = async () => {
  if (isTokenValid()) return accessToken;
  try { return await requestToken(true); } catch (_) { /* fall through */ }
  return requestToken(false);
};

/** Explicit "Connect Google Health" click — always shows the consent UI. */
export const connect = async () => requestToken(false);
export const disconnect = () => clearToken();
export const isConnected = () => isTokenValid();

const healthFetch = async (path) => {
  const doFetch = async (token) =>
    fetch(`${HEALTH_BASE}/${path}`, { headers: { Authorization: `Bearer ${token}` } });
  let token = await getAccessToken();
  let res = await doFetch(token);
  // 401 (expired/revoked) or 403 DISALLOWED_OAUTH_SCOPES (token carried a stale
  // Drive scope from a pre-fix grant) → drop the cached token and re-consent
  // fresh (visible prompt) so we get a clean Health-only token, then retry once.
  if (res.status === 401 || res.status === 403) {
    clearToken();
    token = await requestToken(false); // force visible consent, not silent
    res = await doFetch(token);
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Health API ${res.status}: ${body}`);
  }
  return res.json();
};

/** RFC-3339 timestamp for `daysAgo` days before now (UTC). */
const isoDaysAgo = (daysAgo) => {
  const d = new Date(Date.now() - daysAgo * 86400_000);
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
};

/**
 * Fetch weight data points from the last `days` days. Returns the raw dataPoints
 * array (parse with parseWeightPoints). Logs the raw response once so we can
 * confirm the exact field shape.
 */
export const fetchWeightPoints = async (days = 30) => {
  const from = isoDaysAgo(days);
  const to = isoDaysAgo(0);
  const filter = `weight.sample_time.physical_time >= "${from}" AND weight.sample_time.physical_time < "${to}"`;
  const path = `users/me/dataTypes/weight/dataPoints?filter=${encodeURIComponent(filter)}`;
  const json = await healthFetch(path);
  return json.dataPoints || [];
};

/**
 * Extract {kg, at} from Google Health weight data points. Real shape (verified
 * against a live response):
 *   p.weight.weightGrams                    → grams (÷1000 = kg)
 *   p.weight.sampleTime.physicalTime         → RFC-3339 timestamp
 */
export function parseWeightPoints(points) {
  const out = [];
  for (const p of points || []) {
    const grams = p?.weight?.weightGrams;
    const at = p?.weight?.sampleTime?.physicalTime;
    if (typeof grams === 'number' && !Number.isNaN(grams) && at) {
      out.push({ kg: Math.round((grams / 1000) * 10) / 10, at });
    }
  }
  // Sort ascending by time so the last element is the most recent.
  out.sort((a, b) => new Date(a.at) - new Date(b.at));
  return out;
}

/** Convenience: the most recent weight reading, or null. */
export async function getLatestWeight(days = 30) {
  const parsed = parseWeightPoints(await fetchWeightPoints(days));
  return parsed.length ? parsed[parsed.length - 1] : null;
}
