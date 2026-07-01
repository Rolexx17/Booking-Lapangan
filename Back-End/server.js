import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

import apiRoutes from './routes/api.js';
import { notFoundHandler, globalErrorHandler } from './middlewares/errorHandler.js';

dotenv.config();

const app = express();
app.set('trust proxy', 1);

const httpServer = http.createServer(app);

// Support single atau multiple origins (pisahkan dengan koma di env)
const allowedOrigins = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const isAllOriginsAllowed = allowedOrigins.includes('*');

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: isAllOriginsAllowed ? true : allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

app.set('io', io);

app.use(
  cors({
    origin: (origin, callback) => {
      // izinkan request tanpa origin (curl/postman/server-to-server)
      if (!origin) return callback(null, true);

      if (isAllOriginsAllowed || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('CORS blocked by server'));
    }
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static('uploads'));

app.use((req, _res, next) => {
  req.io = io;
  next();
});

app.get('/health', (_req, res) => {
  res.status(200).json({ success: true, message: 'OK', data: { uptime: process.uptime() } });
});

app.use('/api', apiRoutes);

io.on('connection', (socket) => {
  socket.on('join-role', (role) => {
    if (['admin', 'kasir', 'customer'].includes(role)) {
      socket.join(`role:${role}`);
    }
  });

  socket.on('join-user', (userId) => {
    if (userId) socket.join(`user:${userId}`);
  });

  socket.on('join-room', (roomName) => {
    if (typeof roomName === 'string' && roomName.trim()) {
      socket.join(roomName.trim());
    }
  });

  socket.on('join-matchmaking-chat', (matchmakingId) => {
    const id = Number(matchmakingId);
    if (!Number.isNaN(id) && id > 0) {
      socket.join(`matchmaking:${id}`);
    }
  });
});

app.use(notFoundHandler);
app.use(globalErrorHandler);

const PORT = Number(process.env.PORT) || 5000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server Lumina Arena berjalan di port ${PORT}`);
});