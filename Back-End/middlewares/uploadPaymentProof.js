import multer from 'multer';
import fs from 'fs';
import path from 'path';

const uploadDir = path.join(process.cwd(), 'uploads', 'payment-proofs');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

/*
  Konfigurasi multer untuk menyimpan file bukti pembayaran:
  - destination: folder uploads/payment-proofs di root proyek.
  - filename: beri nama unik dengan timestamp + random agar tidak bentrok.
  - fileFilter: batasi jenis file yang diterima (jpg/png/webp/pdf).
  - limits: batasi ukuran file max 5MB.
  Middleware export: uploadPaymentProof, gunakan .single('payment_proof') di route.
*/
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}-${file.originalname.replace(/\s+/g, '_')}`);
  }
});

function fileFilter(_req, file, cb) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  return cb(new Error('File bukti pembayaran hanya boleh JPG/PNG/WEBP/PDF'));
}

export const uploadPaymentProof = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});