// Konfigurasi database PostgreSQL (Supabase) menggunakan connection pool

import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function query(text, params = []) {
  return pool.query(text, params);
}

export default pool;