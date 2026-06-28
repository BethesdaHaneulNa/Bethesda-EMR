// Update check: compares this build's version against the latest GitHub Release.
// Cached (6h) and resilient to offline/intermittent internet — never blocks the app.
const pkg = require('../../package.json');

const REPO = process.env.UPDATE_REPO || 'BethesdaHaneulNa/Bethesda-EMR';
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
    if (r.status === 404) return { latest: null }; // no releases published yet
    if (!r.ok) return { error: `GitHub HTTP ${r.status}` };
    const j = await r.json();
    return { latest: j.tag_name, html_url: j.html_url, body: j.body || '', published_at: j.published_at, name: j.name };
  } catch (e) {
    return { error: e.message };
  } finally {
    clearTimeout(timer);
  }
}

async function getVersionInfo(force) {
  const current = pkg.version;
  if (!ENABLED) return { current, enabled: false, updateAvailable: false };

  const now = Date.now();
  if (!force && cache.data && (now - cache.at) < CACHE_MS) {
    return Object.assign({}, cache.data, { cached: true });
  }

  const res = await fetchLatestRelease();
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
    releaseUrl: res.html_url || `https://github.com/${REPO}/releases`,
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
