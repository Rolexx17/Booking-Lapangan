import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';

/*
  Script seeder untuk membuat akun awal:
  - Super Admin, Kasir, Customer Demo.
  - Mengecek eksistensi email terlebih dahulu untuk menghindari duplikasi.
  - Hash password sebelum insert.
  - Dijalankan secara manual (node scripts/seedUsers.js).
*/
async function seedUsers() {
  console.log('Mulai menjalankan seeder...');

  try {
    const users = [
      { name: 'Super Admin', email: 'admin@lumina.com', password: 'Admin123!', role: 'admin' },
      { name: 'Kasir Lumina', email: 'kasir@lumina.com', password: 'Kasir123!', role: 'kasir' },
      { name: 'Customer Demo', email: 'customer@lumina.com', password: 'Customer123!', role: 'customer' }
    ];

    for (const user of users) {
      console.log(`Memeriksa email: ${user.email}...`);

      const exists = await query('SELECT id FROM users WHERE email = $1 LIMIT 1', [user.email]);
      if (exists.rows.length > 0) {
        console.log(`Lewati ${user.email} (sudah ada)`);
        continue;
      }

      const hashed = await bcrypt.hash(user.password, 10);
      await query(
        'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)',
        [user.name, user.email, hashed, user.role]
      );
      console.log(`Berhasil seed: ${user.email}`);
    }

    console.log('Seed users selesai.');
    process.exit(0);
  } catch (error) {
    console.error('Seed users gagal:', error);
    process.exit(1);
  }
}

seedUsers();