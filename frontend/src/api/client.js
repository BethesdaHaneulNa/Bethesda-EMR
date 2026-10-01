import { setTheme, isTheme } from '../theme.js';
const BASE = '/api';

function getToken() {
  return localStorage.getItem('medconnect_token');
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;

  const opts = { method, headers };
  if (body && method !== 'GET') opts.body = JSON.stringify(body);

  const res = await fetch(BASE + path, opts);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    const preview = (text || '').slice(0, 120).replace(/\s+/g, ' ');
    throw new Error('API response was not JSON. Backend/proxy may be down. HTTP ' + res.status + ': ' + preview);
  }

  // A 401 with a token sent means the session ran out: back to the login page.
  // A 401 with no token is an answer (wrong password, inactive account) - reloading
  // the page there wiped the message before anyone could read it.
  if (res.status === 401 && token) {
    localStorage.removeItem('medconnect_token');
    localStorage.removeItem('medconnect_user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    // The message as before; the HTTP status, the server's `code` (e.g. the transfer
    // route's VISIT_BILLED) and the rest of its answer ride along for screens that pick
    // their own words by code rather than by the English sentence.
    const err = new Error((data && data.error) || 'Request failed');
    err.status = res.status;
    err.code = data && data.code;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  del: (path) => request('DELETE', path),
};

export function saveAuth(token, user) {
  localStorage.setItem('medconnect_token', token);
  localStorage.setItem('medconnect_user', JSON.stringify(user));
  // The account's own screen (dark / light) comes with the login answer: wear it now,
  // before the first screen is drawn, so the previous person's choice on this PC is
  // never shown first. The top bar still reads /api/theme afterwards.
  if (user && isTheme(user.theme)) setTheme(user.theme);
}

export function getUser() {
  try {
    const u = localStorage.getItem('medconnect_user');
    return u ? JSON.parse(u) : null;
  } catch { return null; }
}

export function logout() {
  // The consultation screen keeps a doctor's unsaved note on this computer
  // (cs_noteDraft:<account id>:<consultation id>, Consultation.jsx); signing out removes
  // this account's, so a patient's text does not stay behind on a shared PC.
  try {
    const u = getUser(), prefix = 'cs_noteDraft:' + (u ? u.id : '') + ':';
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (u && k && k.indexOf(prefix) === 0) localStorage.removeItem(k);
    }
  } catch (e) { /* storage blocked: nothing kept either */ }
  localStorage.removeItem('medconnect_token');
  localStorage.removeItem('medconnect_user');
  window.location.href = '/login';
}

export function isLoggedIn() {
  return !!getToken() && !!getUser();
}
