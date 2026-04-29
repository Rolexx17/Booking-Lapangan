import mysql from 'mysql2/promise';
import 'dotenv/config';

async function testConnection() {
  console.log("--- Mencoba Koneksi Database ---");
  console.log("Host:", process.env.DB_HOST);
  console.log("User:", process.env.DB_USER);
  console.log("DB Name:", process.env.DB_NAME);
  // Password sengaja tidak ditampilkan penuh untuk keamanan, hanya panjangnya
  console.log("Password Length:", process.env.DB_PASS ? process.env.DB_PASS.length : 0);

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
    });

    console.log("\n✅ KONEKSI BERHASIL!");
    console.log("Database terhubung dengan sempurna.");
    
    // Coba ambil data simpel
    const [rows] = await connection.query('SELECT 1 + 1 AS result');
    console.log("Tes Query (1+1):", rows[0].result);

    await connection.end();
  } catch (error) {
    console.error("\n❌ KONEKSI GAGAL!");
    console.error("Pesan Error:", error.message);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error("👉 Masalah: Password atau Username salah.");
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.error("👉 Masalah: Host (localhost) tidak ditemukan atau MySQL belum menyala.");
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error("👉 Masalah: Nama Database 'lumina_arena' tidak ditemukan.");
    }
  }
}

testConnection();