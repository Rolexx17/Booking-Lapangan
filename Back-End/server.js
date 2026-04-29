import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.js';
import sendResponse from './utils/response.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', apiRoutes);

app.use((req, res) => {
    sendResponse(res, 404, "Endpoint tidak ditemukan");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server Lumina Arena berjalan di port ${PORT}`);
});