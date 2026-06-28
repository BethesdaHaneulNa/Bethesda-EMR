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

  if (res.status === 401) {
    localStorage.removeItem('medconnect_token');
    localStorage.removeItem('medconnect_user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) throw new Error((data && data.error) || 'Request failed');
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
}

export function getUser() {
  try {
    const u = localStorage.getItem('medconnect_user');
    return u ? JSON.parse(u) : null;
  } catch { return null; }
}

export function logout() {
  localStorage.removeItem('medconnect_token');
  localStorage.removeItem('medconnect_user');
  window.location.href = '/login';
}

export function isLoggedIn() {
  return !!getToken() && !!getUser();
}
