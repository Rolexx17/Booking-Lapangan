import 'dotenv/config';
import bcrypt from 'bcryptjs';
import db from '../config/db.js';

async function seedUsers() {
  // Tambahkan log ini untuk memastikan fungsi berjalan
  console.log('Mulai menjalankan seeder...'); 

  try {
    const users = [
      { name: 'Super Admin', email: 'admin@lumina.com', password: 'Admin123!', role: 'admin' },
      { name: 'Kasir Lumina', email: 'kasir@lumina.com', password: 'Kasir123!', role: 'kasir' },
      { name: 'Customer Demo', email: 'customer@lumina.com', password: 'Customer123!', role: 'customer' }
    ];

    for (const user of users) {
      console.log(`Memeriksa email: ${user.email}...`); // Log tambahan untuk tracing
      
      const [exists] = await db.query('SELECT id FROM users WHERE email = ?', [user.email]);
      if (exists.length > 0) {
        console.log(`Lewati ${user.email} (sudah ada)`);
        continue;
      }

      const hashed = await bcrypt.hash(user.password, 10);
      await db.query(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
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