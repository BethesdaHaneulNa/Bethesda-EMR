// Update check: compares this build's version against the latest GitHub Release.
// Cached (6h) and resilient to offline/intermittent internet — never blocks the app.
const pkg = require('../../package.json');

const REPO = process.env.UPDATE_REPO || 'BethesdaHaneulNa/Bethesda-EMR';
// Where the one-click updater reads the newest kit from (offline/bethesda-update.ps1 reads,
// offline/pack.ps1 -Zip writes the same file). By default the latest.json asset of the
// newest GitHub Release; GitHub answers that address with a redirect, which fetch follows.
// UPDATE_LATEST_URL in .env points it elsewhere.
const LATEST_URL = process.env.UPDATE_LATEST_URL || 'https://github.com/BethesdaHaneulNa/Bethesda-EMR/releases/latest/download/latest.json';
const ENABLED = String(process.env.UPDATE_CHECK || 'true').toLowerCase() !== 'false';
const CACHE_MS = 6 * 60 * 60 * 1000; // re-check at most every 6 hours

let cache = { at: 0, data: null };

function parseSemver(v) {
  const m = String(v || '').replace(/^v/i, '').match(/^(\d+)\.(\d+)\.(\d+)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

function isNewer(latest, current) {
  const a = parseSemver(latest), b = parseSemver(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return true;
    if (a[i] < b[i]) return false;
  }
  return false;
}

async function fetchLatestRelease() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Bethesda-EMR-update-check' },
      signal: ctrl.signal,
    });
    if (r.status === 404) return { error: 'GitHub 404 (private repository or no release)' };
    if (!r.ok) return { error: `GitHub HTTP ${r.status}` };
    const j = await r.json();
    return { latest: j.tag_name, html_url: j.html_url, body: j.body || '', published_at: j.published_at, name: j.name };
  } catch (e) {
    return { error: e.message };
  } finally {
    clearTimeout(timer);
  }
}

// latest.json: { version, url, size, sha256, kit_type, images, pacs, restarts_api, published_at, notes_fr }
async function fetchLatestJson() {
  if (!LATEST_URL) return { error: 'no UPDATE_LATEST_URL' };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const r = await fetch(LATEST_URL + (LATEST_URL.indexOf('?') < 0 ? '?t=' : '&t=') + Date.now(), { signal: ctrl.signal, headers: { 'Cache-Control': 'no-cache' } });
    if (!r.ok) return { error: `latest.json HTTP ${r.status}` };
    const j = await r.json();
    if (!parseSemver(j.version)) return { error: 'latest.json without a version' };
    return { latest: 'v' + String(j.version).replace(/^v/i, ''), html_url: null, body: j.notes_fr || '', published_at: j.published_at || null, name: 'v' + j.version, source: 'latest.json' };
  } catch (e) {
    return { error: e.message };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchLatest() {
  const a = await fetchLatestJson();
  if (!a.error) return a;
  const b = await fetchLatestRelease();
  if (!b.error) return Object.assign(b, { source: 'github' });
  return { error: a.error + '; ' + b.error };
}

async function getVersionInfo(force) {
  const current = pkg.version;
  if (!ENABLED) return { current, enabled: false, updateAvailable: false };

  const now = Date.now();
  if (!force && cache.data && (now - cache.at) < CACHE_MS) {
    return Object.assign({}, cache.data, { cached: true });
  }

  const res = await fetchLatest();
  if (res.error) {
    // offline / rate-limited: fall back to the last good check, else report the error
    if (cache.data) return Object.assign({}, cache.data, { staleCache: true, error: res.error });
    return { current, enabled: true, repo: REPO, latest: null, updateAvailable: false, error: res.error, checkedAt: new Date().toISOString() };
  }

  const data = {
    current,
    enabled: true,
    repo: REPO,
    latest: res.latest || null,
    updateAvailable: res.latest ? isNewer(res.latest, current) : false,
    releaseUrl: res.html_url || null,   // null: nothing a browser at the clinic could open
    source: res.source || null,
    releaseName: res.name || res.latest || '',
    releaseNotes: res.body || '',
    publishedAt: res.published_at || null,
    error: null,
    checkedAt: new Date().toISOString(),
  };
  cache = { at: now, data };
  return data;
}

module.exports = { getVersionInfo, isNewer };
