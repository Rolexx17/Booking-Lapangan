# Lumina Arena - Aplikasi Booking Lapangan Olahraga ⚽

Lumina Arena adalah aplikasi *full-stack* berbasis web untuk pemesanan lapangan olahraga berstandar VVIP. Aplikasi ini tidak hanya menyediakan fitur *booking* lapangan, tetapi juga dilengkapi dengan fitur sosial seperti *Matchmaking* (Mabar) dan ulasan lapangan. 

Aplikasi ini dibangun menggunakan arsitektur modern **React (Frontend)** dan **Node.js + Express + MySQL (Backend)**.

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

### Backend & Database
- **Node.js** & **Express.js** (REST API)
- **MySQL2 / Promise** (Database Driver)
- **dotenv** (Environment Variables)
- **Cors** (Cross-Origin Resource Sharing)

---

## 🚀 Panduan Instalasi & Menjalankan Aplikasi

### 1. Persiapan Database
1. Buka MySQL / phpMyAdmin Anda.
2. Buat database baru, misalnya `lumina_arena`.
3. Jalankan query SQL (skema tabel) yang terdapat pada file konfigurasi database untuk membuat tabel `users`, `fields`, `bookings`, `matchmakings`, dan `reviews` beserta data dummy lapangan.

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
   DB_HOST=localhost
   DB_USER=root
   DB_PASS=
   DB_NAME=lumina_arena
   ```
4. Jalankan server Backend:
   ```bash
   npm start
   # atau
   node server.js
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
3. Jalankan server Frontend:
   ```bash
   npm run dev
   ```
   *Aplikasi akan terbuka di browser, biasanya di `http://localhost:5173`*

---

## 📡 Daftar API Endpoints

Aplikasi ini memiliki REST API terstruktur :

### 🔐 Auth & Users
- `POST /api/auth/register` - Mendaftarkan user baru
- `POST /api/auth/login` - Login user
- `GET /api/users` - Mengambil daftar semua user
- `GET /api/users/:id` - Mengambil data profil user spesifik
- `PUT /api/users/:id` - Memperbarui profil user
- `DELETE /api/users/:id` - Menghapus akun user

### 🏟️ Fields (Lapangan)
- `GET /api/fields` - Mengambil daftar lapangan (mendukung paginasi & pencarian)
- `GET /api/fields/:id` - Mengambil detail satu lapangan
- `POST /api/fields` - Menambahkan data lapangan baru
- `PUT /api/fields/:id` - Memperbarui data lapangan
- `DELETE /api/fields/:id` - Menghapus data lapangan

### 📅 Bookings (Pemesanan)
- `POST /api/bookings` - Membuat pesanan/booking baru
- `GET /api/bookings` - Mengambil semua data booking di sistem
- `GET /api/bookings/user/:userId` - Mengambil riwayat booking milik user tertentu
- `PUT /api/bookings/:id/status` - Memperbarui status booking (Pending/Success/Cancelled)
- `DELETE /api/bookings/:id` - Menghapus riwayat booking

### 🤝 Matchmakings (Mabar)
- `GET /api/matchmakings` - Mengambil semua postingan ajakan mabar
- `POST /api/matchmakings` - Membuat ajakan mabar baru
- `PUT /api/matchmakings/:id` - Memperbarui data mabar
- `DELETE /api/matchmakings/:id` - Menghapus ajakan mabar

### ⭐ Reviews (Ulasan)
- `GET /api/fields/:fieldId/reviews` - Mengambil semua ulasan untuk lapangan tertentu
- `POST /api/fields/:fieldId/reviews` - Menambahkan ulasan baru ke lapangan
- `PUT /api/reviews/:id` - Memperbarui isi ulasan
- `DELETE /api/reviews/:id` - Menghapus ulasan

---

## 📂 Struktur Direktori

```text
Booking-Lapangan/
├── Back-End/
│   ├── config/          # Konfigurasi koneksi Database MySQL
│   ├── controllers/     # Logika bisnis (Auth, Booking, Field, Social)
│   ├── routes/          # Definisi rute REST API
│   ├── utils/           # BaseController & response formatter
│   ├── .env             # Environment variables (JANGAN DI-COMMIT)
│   └── server.js        # Entry point backend Express
│
└── Front-End/
    ├── src/
    │   ├── components/  # Komponen UI (Layout, Notifikasi)
    │   ├── context/     # React Context (ThemeContext)
    │   ├── pages/       # Halaman utama (Home, Dashboard, Matchmaking, dll.)
    │   ├── App.jsx      # Konfigurasi Routing (React Router)
    │   └── main.jsx     # Entry point React
    ├── tailwind.config.js
    └── package.json
```

---

## 👨‍💻 Author