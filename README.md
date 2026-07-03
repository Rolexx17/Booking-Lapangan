# Lumina Arena - Aplikasi Booking Lapangan Olahraga ⚽

Lumina Arena adalah aplikasi *full-stack* berbasis web untuk pemesanan lapangan olahraga berstandar VVIP. Aplikasi ini tidak hanya menyediakan fitur *booking* lapangan, tetapi juga dilengkapi dengan fitur sosial seperti *Matchmaking* (Mabar) dan ulasan lapangan. 

Aplikasi ini dibangun menggunakan arsitektur modern **React (Frontend)** dan **Node.js + Express + MySQL (Backend)**.

Website Demo : https://booking-lapangan-nu.vercel.app

## ✨ Fitur Utama

### 🌟 Fitur Pengguna (Frontend)
- **Tema Eksklusif:** Desain UI/UX mewah dengan dukungan *Dark Mode* dan *Light Mode*.
- **Katalog Lapangan:** Lihat daftar lapangan beserta detail fasilitas, harga, dan ketersediaan jadwal.
- **Sistem Booking:** Pemesanan jadwal lapangan secara real-time dan fitur *upload* bukti pembayaran.
- **Matchmaking (Mabar):** Sistem bagi pengguna yang kekurangan pemain untuk membuat atau mencari ajakan bermain.
- **Ulasan & Rating:** Berikan *rating* bintang dan komentar terhadap lapangan yang telah disewa.
- **Dashboard Profil:** Kelola data profil dan pantau riwayat *booking* (Pending, Success, Cancelled).

### ⚙️ Fitur Sistem (Backend)
- **Autentikasi User:** Register dan Login.
- **CRUD Booking:** Validasi ketersediaan jadwal (mencegah *double booking* pada jam yang sama).
- **Kalkulasi Rating Otomatis:** *Rating* lapangan akan otomatis diperbarui setiap kali ada ulasan baru atau ulasan dihapus.
- **Manajemen Matchmaking:** Relasi data yang kompleks antara *user*, lapangan, dan status ajakan bermain.

---

## 🛠️ Teknologi yang Digunakan

### Frontend
- **React.js** (Vite)
- **Tailwind CSS** (Styling & Animasi)
- **React Router Dom** (Navigasi)
- **Lucide React** (Ikon)
- **dotenv** (Environment Variables)

### Backend & Database
- **Node.js** & **Express.js** (REST API)
- **MySQL2 / Promise** (Database Driver)
- **dotenv** (Environment Variables)
- **Cors** (Cross-Origin Resource Sharing)

---

## 🚀 Panduan Instalasi & Menjalankan Aplikasi

### 1. Persiapan Database
1. Buka MySQL Anda
2. Salin dan jalankan query berikut

```sql
CREATE DATABASE lumina_arena;
USE lumina_arena;

-- 1. Create Custom ENUM Types for Booking Statuses
DO $$ BEGIN
    CREATE TYPE booking_status_enum AS ENUM ('Pending', 'Success', 'Cancelled');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status_enum AS ENUM ('Unpaid', 'WaitingVerification', 'Verified', 'Rejected');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create Tables
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) DEFAULT NULL,
    email VARCHAR(100) UNIQUE DEFAULT NULL,
    password VARCHAR(255) DEFAULT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'customer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fields (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) DEFAULT NULL,
    type VARCHAR(50) DEFAULT NULL,
    price DECIMAL(10,2) DEFAULT NULL,
    rating REAL DEFAULT 0,
    image VARCHAR(255) DEFAULT NULL,
    description TEXT DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    field_id INT REFERENCES fields(id),
    booking_date DATE DEFAULT NULL,
    time_slot VARCHAR(20) DEFAULT NULL,
    total_price DECIMAL(10,2) DEFAULT NULL,
    payment_proof VARCHAR(255) DEFAULT NULL,
    status booking_status_enum DEFAULT 'Pending',
    payment_status payment_status_enum NOT NULL DEFAULT 'Unpaid'
);

CREATE TABLE IF NOT EXISTS matchmakings (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    field_id INT REFERENCES fields(id),
    skill_level VARCHAR(50) DEFAULT NULL,
    looking_for INT DEFAULT NULL,
    time_schedule VARCHAR(100) DEFAULT NULL,
    note TEXT DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS matchmaking_messages (
    id SERIAL PRIMARY KEY,
    matchmaking_id INT NOT NULL REFERENCES matchmakings(id) ON DELETE CASCADE,
    sender_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    field_id INT REFERENCES fields(id),
    rating INT DEFAULT NULL,
    comment TEXT DEFAULT NULL
);

-- 3. Create Performance Indexes
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_matchmakings_field_skill ON matchmakings(field_id, skill_level);
CREATE INDEX IF NOT EXISTS idx_matchmaking_id ON matchmaking_messages(matchmaking_id);
CREATE INDEX IF NOT EXISTS idx_sender_id ON matchmaking_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_reviews_field_id ON reviews(field_id);

-- 4. Create Trigger Function for Post-Delete Review Calculations
CREATE OR REPLACE FUNCTION update_field_rating_after_delete()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE fields 
    SET rating = COALESCE((SELECT AVG(rating) FROM reviews WHERE field_id = OLD.field_id), 0)
    WHERE id = OLD.field_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 5. Attach Trigger to Table
CREATE OR REPLACE TRIGGER after_review_delete
AFTER DELETE ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_field_rating_after_delete();

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  booking_id INT NULL REFERENCES bookings(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read, created_at DESC);

ALTER TABLE fields
ALTER COLUMN image TYPE TEXT;

ALTER TABLE bookings
ALTER COLUMN payment_proof TYPE TEXT;

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
```

### 2. Setup Backend
1. Buka terminal, masuk ke folder `Back-End`:
   ```bash
   cd Back-End
   ```
2. Install semua dependencies:
   ```bash
   npm install
   ```
3. Buat file `.env` di dalam folder `Back-End` dan sesuaikan dengan konfigurasi database Anda:
   ```env
    PORT=5000
    NODE_ENV=development
    DATABASE_URL=postgresql://postgres.cxpinmsvlpdylqdultgy:YOUR_DATABASE_PASSWORD_HERE@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres

    JWT_SECRET=YOUR_SUPER_SECRET_JWT_KEY_HERE
    JWT_EXPIRES_IN=1d
    CORS_ORIGIN=http://localhost:5173
   ```
4. Jalankan server Backend:
   ```bash
   npm run dev
   ```
   *Server akan berjalan di `http://localhost:5000`*

### 3. Setup Frontend
1. Buka terminal baru, masuk ke folder `Front-End`:
   ```bash
   cd Front-End
   ```
2. Install semua dependencies:
   ```bash
   npm install
   ```
3. Buat file `.env` di dalam folder `Front-End` dan sesuaikan dengan konfigurasi database Anda:
   ```env
   VITE_API_BASE_URL=http://localhost:5000/api
   ```
   
4. Jalankan server Frontend:
   ```bash
   npm run dev
   ```
   *Aplikasi akan terbuka di browser, biasanya di `http://localhost:5173`*

---

## 📡 Daftar API Endpoints

Aplikasi ini memiliki REST API terstruktur :

### 🔐 Auth & Users
- `POST /api/auth/register` - Mendaftarkan user baru (customer)
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Mengambil profil user yang sedang login
- `POST /api/auth/register-staff` - Mendaftarkan staff baru (admin/kasir, khusus admin)

- `GET /api/users` - Mengambil daftar semua user (admin/kasir)
- `GET /api/users/:id` - Mengambil data profil user spesifik (owner/admin/kasir)
- `PUT /api/users/:id` - Memperbarui profil user (owner/admin)
- `DELETE /api/users/:id` - Menghapus akun user (khusus admin)

### 🏟️ Fields (Lapangan)
- `GET /api/fields` - Mengambil daftar lapangan (mendukung paginasi & pencarian)
- `GET /api/fields/:id` - Mengambil detail satu lapangan
- `POST /api/fields` - Menambahkan data lapangan baru (admin/kasir)
- `PUT /api/fields/:id` - Memperbarui data lapangan (admin/kasir)
- `DELETE /api/fields/:id` - Menghapus data lapangan (khusus admin)

### 📅 Bookings (Pemesanan)
- `POST /api/bookings` - Membuat pesanan/booking baru
- `GET /api/bookings` - Mengambil semua data booking di sistem (admin/kasir)
- `GET /api/bookings/me` - Mengambil riwayat booking milik user yang sedang login
- `GET /api/bookings/me/notifications` - Mengambil notifikasi booking milik user yang sedang login
- `GET /api/fields/:fieldId/booked-slots?date=YYYY-MM-DD` - Mengambil slot yang sudah terisi berdasarkan lapangan & tanggal
- `PUT /api/bookings/:id/status` - Memperbarui status booking (Pending/Success/Cancelled)
- `PUT /api/bookings/:id/payment-status` - Verifikasi status pembayaran (Verified/Rejected, admin/kasir)
- `POST /api/bookings/:id/payment-proof` - Upload bukti pembayaran (multipart/form-data, field: `payment_proof`)
- `DELETE /api/bookings/:id` - Menghapus riwayat booking

### 🤝 Matchmakings (Mabar)
- `GET /api/matchmakings` - Mengambil semua postingan ajakan mabar
- `POST /api/matchmakings` - Membuat ajakan mabar baru
- `PUT /api/matchmakings/:id` - Memperbarui data mabar (owner/admin)
- `DELETE /api/matchmakings/:id` - Menghapus ajakan mabar (owner/admin)

### 💬 Chat Matchmaking
- `GET /api/matchmakings/:id/messages` - Mengambil daftar pesan pada matchmaking tertentu
- `POST /api/matchmakings/:id/messages` - Mengirim pesan pada matchmaking tertentu

### ⭐ Reviews (Ulasan)
- `GET /api/fields/:fieldId/reviews` - Mengambil semua ulasan untuk lapangan tertentu
- `POST /api/fields/:fieldId/reviews` - Menambahkan ulasan baru ke lapangan
- `PUT /api/reviews/:id` - Memperbarui isi ulasan (owner/admin)
- `DELETE /api/reviews/:id` - Menghapus ulasan (owner/admin)

---

## 📂 Struktur Direktori

```text
Booking-Lapangan/
├── Back-End/
│   ├── config/
│   ├── controllers/
│   ├── middlewares/
│   ├── node_modules/
│   ├── routes/
│   ├── scripts/
│   ├── uploads/
│   ├── utils/
│   ├── validators/
│   ├── .env.example
│   ├── package-lock.json
│   ├── package.json
│   ├── server.js
│   └── test-db.js
│
└── Front-End/
    ├── public/
    ├── src/
    ├── .env.example
    ├── .gitignore
    ├── README.md
    ├── eslint.config.js
    ├── index.html
    ├── package-lock.json
    ├── package.json
    ├── postcss.config.js
    ├── tailwind.config.js
    └── vite.config.js
```

---

## 👥 Authors

<table border="0" cellspacing="10" cellpadding="5">
  <tr>
    <td align="center" style="border: 1px solid #555; padding: 10px;">
      <a href="https://github.com/Rolexx17">
        <img src="https://github.com/Rolexx17.png" width="100" height="100" alt="Jess2Jes" style="border-radius: 50%;"/>
      </a>
      <br/>
      <a href="https://github.com/Rolexx17">Justin Wisely (241110868)</a>
    </td>
    <td align="center" style="border: 1px solid #555; padding: 10px;">
      <a href="https://github.com/cherriebuns">
        <img src="https://github.com/cherriebuns.png" width="100" height="100" alt="Hans 展豪" style="border-radius: 50%;"/>
      </a>
      <br/>
      <a href="https://github.com/cherriebuns">Cherish Evangeline (241110597)</a>
    </td>
    <td align="center" style="border: 1px solid #555; padding: 10px;">
      <a href="https://github.com/isthatyou-aye">
        <img src="https://github.com/isthatyou-aye.png" width="100" height="100" alt="isthatyou-aye" style="border-radius: 50%;"/>
      </a>
      <br/>
      <a href="https://github.com/isthatyou-aye">Kelvin Kurniawan (241112232)</a>
    </td>
    <td align="center" style="border: 1px solid #555; padding: 10px;">
      <a href="https://github.com/calvinprayogo">
        <img src="https://github.com/calvinprayogo.png" width="100" height="100" alt="Hans 展豪" style="border-radius: 50%;"/>
      </a>
      <br/>
      <a href="https://github.com/calvinprayogo">Calvin Prayogo (241112730)</a>
    </td>
  </tr>
</table>
