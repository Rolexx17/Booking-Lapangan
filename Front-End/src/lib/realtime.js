/**
 * Modul Realtime Communication
 * Mengelola koneksi WebSocket menggunakan Socket.IO untuk fitur realtime
 * seperti live booking updates dan notifikasi
 */

import { io } from 'socket.io-client';
import { getCurrentUser } from './api';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/**
 * Mengubah URL API menjadi URL socket (hapus /api dari akhir)
 * Contoh: 'http://localhost:5000/api' → 'http://localhost:5000'
 */
const SOCKET_URL = API_BASE.replace(/\/api$/, '');

let socket;

/**
 * Mendapatkan atau menginisialisasi socket connection
 * Socket akan terhubung otomatis dan mengirim informasi user saat connect
 * @returns {Object} Instance socket.io untuk komunikasi realtime
 */
export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true
    });

    /**
     * Event handler ketika socket berhasil connect ke server
     * Emit data user role dan id untuk keperluan room management
     */
    socket.on('connect', () => {
      const user = getCurrentUser();
      if (user?.role) socket.emit('join-role', user.role);
      if (user?.id) socket.emit('join-user', user.id);
    });
  }
  return socket;
}

/**
 * Bergabung ke room field pada tanggal tertentu
 * Untuk menerima update real-time tentang ketersediaan lapangan
 * @param {number|string} fieldId - ID lapangan
 * @param {string} date - Tanggal dalam format string (misal: '2026-07-03')
 */
export function joinFieldDateRoom(fieldId, date) {
  const s = getSocket();
  s.emit('join-room', `field:${fieldId}:date:${date}`);
}

/**
 * Bergabung ke room chat matchmaking
 * Untuk menerima pesan dan notifikasi dalam sesi matchmaking tertentu
 * @param {number|string} matchmakingId - ID sesi matchmaking
 */
export function joinMatchmakingChatRoom(matchmakingId) {
  const s = getSocket();
  s.emit('join-matchmaking-chat', Number(matchmakingId));
}

/**
 * Subscribe ke event realtime tertentu
 * Mengembalikan fungsi cleanup untuk unsubscribe
 * @param {string} event - Nama event yang ingin di-listen
 * @param {Function} handler - Callback function saat event terpicu
 * @returns {Function} Fungsi untuk membatalkan subscription event
 */
export function onRealtime(event, handler) {
  const s = getSocket();
  s.on(event, handler);
  return () => s.off(event, handler);
}
