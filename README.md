# Lumina Arena — Aplikasi Booking Lapangan Olahraga ⚽

> Aplikasi web full-stack untuk pemesanan lapangan olahraga dengan pengalaman pengguna premium.

Website demo: https://booking-lapangan-nu.vercel.app

## Ringkasan
Lumina Arena adalah proyek tugas/portofolio yang menampilkan alur booking lapangan, manajemen user, matchmaking (mabar), ulasan & rating, serta dashboard profil. Aplikasi ini dibuat dengan stack modern: React (Frontend) dan Node.js + Express + MySQL (Backend).

## Fitur Utama
- Autentikasi: register & login
- Katalog lapangan: detail fasilitas, harga, foto, rating
- Booking real-time dengan validasi ketersediaan (mencegah double booking)
- Upload bukti pembayaran & manajemen status booking (Pending / Success / Cancelled)
- Matchmaking (Mabar): buat atau cari ajakan bermain
- Ulasan & rating: rating lapangan dihitung otomatis saat ulasan ditambahkan/dihapus
- Dashboard profil: kelola profil dan lihat riwayat booking

## Teknologi
- Frontend: React (Vite), Tailwind CSS, React Router
- Backend: Node.js, Express, MySQL (mysql2/promise)
- Utilities: dotenv, cors

## Quick Start (jalankan lokal)
Prasyarat: Node.js, npm, MySQL

1) Siapkan database

Buka MySQL dan jalankan (ringkasan):

```sql
CREATE DATABASE lumina_arena;
USE lumina_arena;

-- Contoh tabel utama:
-- users, fields, bookings, matchmakings, reviews
-- Skrip lengkap tersedia di README asli atau buat dari migration jika ada.
```

2) Jalankan Backend

```bash
cd Back-End
npm install
# copy .env.example -> .env lalu sesuaikan
npm run dev
```
Server default: http://localhost:5000

3) Jalankan Frontend

```bash
cd Front-End
npm install
npm run dev
```
Frontend default: http://localhost:5173

Catatan: Jika ada file `.env.example` di repo, salin dan sesuaikan variabel DB sebelum menjalankan server.

## Struktur Direktori (singkat)
```
Booking-Lapangan/
├── Back-End/
│   ├── config/        # konfigurasi database
│   ├── controllers/   # logika bisnis (auth, booking, field, social)
│   ├── routes/        # definisi rute REST API
│   ├── utils/         # helper & response formatter
│   └── server.js      # entrypoint
└── Front-End/
    ├── src/
    │   ├── components/
    │   ├── context/
    │   ├── pages/
    │   ├── App.jsx
    │   └── main.jsx
    ├── tailwind.config.js
    └── package.json
```

## Daftar Endpoints (ringkas)
Auth & Users
- POST /api/auth/register
- POST /api/auth/login
- GET /api/users
- GET /api/users/:id
- PUT /api/users/:id
- DELETE /api/users/:id

Fields
- GET /api/fields
- GET /api/fields/:id
- POST /api/fields
- PUT /api/fields/:id
- DELETE /api/fields/:id

Bookings
- POST /api/bookings
- GET /api/bookings
- GET /api/bookings/user/:userId
- PUT /api/bookings/:id/status
- DELETE /api/bookings/:id

Matchmakings
- GET /api/matchmakings
- POST /api/matchmakings
- PUT /api/matchmakings/:id
- DELETE /api/matchmakings/:id

Reviews
- GET /api/fields/:fieldId/reviews
- POST /api/fields/:fieldId/reviews
- PUT /api/reviews/:id
- DELETE /api/reviews/:id

(Lihat implementasi lengkap pada folder `Back-End/routes`)

## Contributors
- Justin Wisely — @Rolexx17
- Cherish Evangeline — @cherriebuns
- Kelvin Kurniawan — @isthatyou-aye
- Calvin Prayogo — @calvinprayogo

## Lisensi
MIT

---

Perubahan yang saya lakukan:
- Merapikan dan menyederhanakan README agar lebih ringkas dan mudah diikuti
- Menambahkan bagian Quick Start dan ringkasan endpoints

Jika Anda mau, saya bisa:
- Menambahkan badge (build/demo/license)
- Menambahkan file `.env.example` atau SQL dump ke repo
- Memperluas dokumentasi API (contoh request/response)

Sebutkan yang Anda inginkan dan saya akan commit perubahan tambahan.