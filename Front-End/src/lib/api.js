/**
 * Modul API Utama
 * Menyediakan fungsi-fungsi untuk mengelola komunikasi HTTP dengan server backend,
 * termasuk autentikasi JWT, manajemen sesi, dan penanganan error terpusat
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/**
 * Mengambil JWT token dari localStorage
 * @returns {string|null} Token JWT atau null jika tidak ada
 */
export function getToken() {
  return localStorage.getItem('token');
}

/**
 * Mengambil data user yang sedang login dari localStorage
 * @returns {Object|null} Data user atau null jika tidak ada/format invalid
 */
export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
}

/**
 * Menyimpan token dan data user ke localStorage dan mengeluarkan event storage
 * untuk sinkronisasi antar tab
 * @param {Object} param0 - Objek berisi token dan user
 * @param {string} param0.token - JWT token
 * @param {Object} param0.user - Data user
 */
export function setSession({ token, user }) {
  if (token) localStorage.setItem('token', token);
  if (user) localStorage.setItem('user', JSON.stringify(user));
  window.dispatchEvent(new Event('storage'));
}

/**
 * Menghapus token dan data user dari localStorage serta mengeluarkan event storage
 */
export function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.dispatchEvent(new Event('storage'));
}

/**
 * Fungsi fetch terpusat dengan autentikasi JWT dan error handling
 * Otomatis menambahkan Authorization header jika token tersedia
 * @param {string} path - Path endpoint relatif (misal: /fields, /bookings)
 * @param {Object} options - Opsi fetch standar (method, body, headers, dll)
 * @returns {Promise<Object>} Objek response dengan struktur {ok, status, data}
 */
export async function apiFetch(path, options = {}) {
  const token = getToken();

  const headers = {
    ...(options.headers || {})
  };

  /**
   * Set Content-Type ke JSON kecuali jika body adalah FormData
   * FormData akan otomatis set Content-Type dengan boundary
   */
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  /**
   * Tambahkan Authorization header dengan Bearer token
   */
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
    /**
     * Jika gagal menghubungi server (network error, timeout, dll)
     */
    return {
      ok: false,
      status: 0,
      data: { success: false, message: 'Gagal menghubungi server' }
    };
  }

  /**
   * Parse response body sebagai JSON
   * Jika gagal, kembalikan error message
   */
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = { success: false, message: 'Respons server tidak valid' };
  }

  /**
   * Jika mendapat status 401 (Unauthorized), hapus sesi user
   * Berarti token expired atau tidak valid
   */
  if (res.status === 401) {
    clearSession();
  }

  return {
    ok: res.ok,
    status: res.status,
    data
  };
}
