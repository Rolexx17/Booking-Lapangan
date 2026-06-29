// Helper API terpusat untuk fetch + auto attach JWT + handling error dasar

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export function getToken() {
  return localStorage.getItem('token');
}

export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
}

export function setSession({ token, user }) {
  if (token) localStorage.setItem('token', token);
  if (user) localStorage.setItem('user', JSON.stringify(user));
  window.dispatchEvent(new Event('storage'));
}

export function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.dispatchEvent(new Event('storage'));
}

export async function apiFetch(path, options = {}) {
  const token = getToken();

  const headers = {
    ...(options.headers || {})
  };

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers
    });
  } catch {
    return {
      ok: false,
      status: 0,
      data: { success: false, message: 'Gagal menghubungi server' }
    };
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = { success: false, message: 'Respons server tidak valid' };
  }

  if (res.status === 401) {
    clearSession();
  }

  return {
    ok: res.ok,
    status: res.status,
    data
  };
}