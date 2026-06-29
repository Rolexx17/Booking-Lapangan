import { io } from 'socket.io-client';
import { getCurrentUser } from './api';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const SOCKET_URL = API_BASE.replace(/\/api$/, '');

let socket;

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true
    });

    socket.on('connect', () => {
      const user = getCurrentUser();
      if (user?.role) socket.emit('join-role', user.role);
      if (user?.id) socket.emit('join-user', user.id);
    });
  }
  return socket;
}

export function joinFieldDateRoom(fieldId, date) {
  const s = getSocket();
  s.emit('join-room', `field:${fieldId}:date:${date}`);
}

export function joinMatchmakingChatRoom(matchmakingId) {
  const s = getSocket();
  s.emit('join-matchmaking-chat', Number(matchmakingId));
}

export function onRealtime(event, handler) {
  const s = getSocket();
  s.on(event, handler);
  return () => s.off(event, handler);
}