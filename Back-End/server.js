import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import sendResponse from './utils/response.js';
import fieldController from './controllers/fieldController.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- ROUTES ---

// 1. Fields / Lapangan (Pencarian & Pagination)
app.get('/api/fields', fieldController.getFields);
app.get('/api/fields/:id', fieldController.getFieldById);

// 2. Auth / Users (Contoh Dummy Auth)
app.post('/api/auth/register', (req, res) => {
    // Logic insert into users...
    sendResponse(res, 201, "Registrasi berhasil", { user: req.body.email });
});

app.post('/api/auth/login', (req, res) => {
    // Logic verify...
    sendResponse(res, 200, "Login berhasil", { token: "dummy_token_123", user: { id: 1, name: "Rolexx17" } });
});

// 3. Bookings
app.get('/api/bookings/user/:userId', (req, res) => {
    // Select history bookings join fields
    sendResponse(res, 200, "Riwayat Booking", []);
});

app.post('/api/bookings', (req, res) => {
    // Insert new booking
    sendResponse(res, 201, "Booking berhasil dibuat", req.body);
});

// 4. Matchmaking
app.get('/api/matchmakings', (req, res) => {
    // Select all matchmakings
    sendResponse(res, 200, "Data Matchmaking", []);
});

app.post('/api/matchmakings', (req, res) => {
    sendResponse(res, 201, "Ajakan mabar berhasil dibuat", req.body);
});

// 5. Reviews
app.get('/api/fields/:fieldId/reviews', (req, res) => {
    sendResponse(res, 200, "Ulasan lapangan", []);
});

// Middleware 404
app.use((req, res) => {
    sendResponse(res, 404, "Endpoint tidak ditemukan");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server Lumina Arena berjalan di port ${PORT}`);
});