// Titik masuk (entry point) utama untuk server
// Upgrade RTC: Socket.IO realtime multi-room + static uploads

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

import apiRoutes from './routes/api.js';
import { notFoundHandler, globalErrorHandler } from './middlewares/errorHandler.js';

dotenv.config();

const app = express();
const httpServer = http.createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

app.set('io', io);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*'
  }
)
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// serve upload files
app.use('/uploads', express.static('uploads'));

// inject io ke req agar controller bisa emit event
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'OK', data: { uptime: process.uptime() } });
});

app.use('/api', apiRoutes);

// socket connection + rooms
io.on('connection', (socket) => {
  // Room berdasarkan role pengguna
  socket.on('join-role', (role) => {
    if (['admin', 'kasir', 'customer'].includes(role)) {
      socket.join(`role:${role}`);
    }
  });

  // Room personal pengguna
  socket.on('join-user', (userId) => {
    if (userId) socket.join(`user:${userId}`);
  });

  // Dynamic room (field/date, dll)
  socket.on('join-room', (roomName) => {
    if (typeof roomName === 'string' && roomName.trim()) {
      socket.join(roomName.trim());
    }
  });

  // Room khusus chat matchmaking (pencocokan lawan)
  socket.on('join-matchmaking-chat', (matchmakingId) => {
    const id = Number(matchmakingId);
    if (!Number.isNaN(id) && id > 0) {
      socket.join(`matchmaking:${id}`);
    }
  });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(globalErrorHandler);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server Lumina Arena berjalan di port ${PORT}`);
});