// Konfigurasi Rute API (API Routes)

import express from 'express';
import fieldController from '../controllers/fieldController.js';
import authController from '../controllers/authController.js';
import bookingController from '../controllers/bookingController.js';
import socialController from '../controllers/socialController.js';

import { validate } from '../middlewares/validate.js';
import { requireAuth, authorizeRoles, authorizeSelfOrRoles } from '../middlewares/auth.js';

const router = express.Router();

/* =========================
   AUTH
========================= */

// Register customer umum
router.post(
  '/auth/register',
  validate([
    { field: 'name', required: true, type: 'string', minLength: 3 },
    {
      field: 'email',
      required: true,
      type: 'string',
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      patternMessage: 'Format email tidak valid (wajib menggunakan @)'
    },
    { field: 'password', required: true, type: 'string', minLength: 8 }
  ]),
  authController.register
);

// Login
router.post(
  '/auth/login',
  validate([
    {
      field: 'email',
      required: true,
      type: 'string',
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      patternMessage: 'Format email tidak valid (wajib menggunakan @)'
    },
    { field: 'password', required: true, type: 'string', minLength: 6 }
  ]),
  authController.login
);

// Profil token aktif
router.get('/auth/me', requireAuth, authController.me);

// Register admin/kasir khusus admin
router.post(
  '/auth/register-staff',
  requireAuth,
  authorizeRoles('admin'),
  validate([
    { field: 'name', required: true, type: 'string', minLength: 3 },
    {
      field: 'email',
      required: true,
      type: 'string',
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      patternMessage: 'Format email tidak valid (wajib menggunakan @)'
    },
    { field: 'password', required: true, type: 'string', minLength: 8 },
    { field: 'role', required: true, enum: ['admin', 'kasir'] }
  ]),
  authController.register
);

/* =========================
   USERS (Admin/Kasir/Owner)
========================= */

// Hanya admin dan kasir bisa lihat daftar user
router.get('/users', requireAuth, authorizeRoles('admin', 'kasir'), authController.getAllUsers);

// Owner sendiri atau admin/kasir
router.get('/users/:id', requireAuth, authorizeSelfOrRoles('id', 'admin', 'kasir'), authController.getUserProfile);

// Owner sendiri atau admin
router.put(
  '/users/:id',
  requireAuth,
  authorizeSelfOrRoles('id', 'admin'),
  validate([
    { field: 'name', required: true, type: 'string', minLength: 3 },
    {
      field: 'email',
      required: true,
      type: 'string',
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      patternMessage: 'Format email tidak valid (wajib menggunakan @)'
    }
  ]),
  authController.updateUserProfile
);

// Hanya admin boleh hapus user
router.delete('/users/:id', requireAuth, authorizeRoles('admin'), authController.deleteUser);

/* =========================
   FIELDS (public read, staff write)
========================= */

router.get('/fields', fieldController.getFields);
router.get('/fields/:id', fieldController.getFieldById);

router.post(
  '/fields',
  requireAuth,
  authorizeRoles('admin', 'kasir'),
  validate([
    { field: 'name', required: true, type: 'string', minLength: 3 },
    { field: 'type', required: true, type: 'string', minLength: 3 },
    { field: 'price', required: true, type: 'number', min: 1 }
  ]),
  fieldController.createField
);

router.put(
  '/fields/:id',
  requireAuth,
  authorizeRoles('admin', 'kasir'),
  validate([
    { field: 'name', required: true, type: 'string', minLength: 3 },
    { field: 'type', required: true, type: 'string', minLength: 3 },
    { field: 'price', required: true, type: 'number', min: 1 }
  ]),
  fieldController.updateField
);

router.delete('/fields/:id', requireAuth, authorizeRoles('admin'), fieldController.deleteField);

/* =========================
   BOOKINGS
========================= */

// Customer membuat booking (harus login)
router.post(
  '/bookings',
  requireAuth,
  validate([
    { field: 'field_id', required: true, type: 'number', min: 1 },
    { field: 'booking_date', required: true, type: 'string' },
    { field: 'time_slot', required: true, type: 'string', minLength: 3 },
    { field: 'total_price', required: true, type: 'number', min: 1 }
  ]),
  bookingController.createBooking
);

// Admin/kasir lihat semua booking + pagination/filter
router.get('/bookings', requireAuth, authorizeRoles('admin', 'kasir'), bookingController.getAllBookings);

// User login lihat booking miliknya
router.get('/bookings/me', requireAuth, bookingController.getMyBookings);

// Update status booking (customer hanya cancel; admin/kasir bebas status valid)
router.put(
  '/bookings/:id/status',
  requireAuth,
  validate([{ field: 'status', required: true, enum: ['Pending', 'Success', 'Cancelled'] }]),
  bookingController.updateBookingStatus
);

// Hapus booking (admin/kasir bebas, customer hanya miliknya non-pending)
router.delete('/bookings/:id', requireAuth, bookingController.deleteBooking);

/* =========================
   MATCHMAKING
========================= */

router.get('/matchmakings', socialController.getMatchmakings);

router.post(
  '/matchmakings',
  requireAuth,
  validate([
    { field: 'field_id', required: true, type: 'number', min: 1 },
    { field: 'skill_level', required: true, enum: ['Beginner', 'Intermediate', 'Advanced'] },
    { field: 'looking_for', required: true, type: 'number', min: 1, max: 50 },
    { field: 'time_schedule', required: true, type: 'string', minLength: 3 }
  ]),
  socialController.createMatchmaking
);

router.put('/matchmakings/:id', requireAuth, socialController.updateMatchmaking);
router.delete('/matchmakings/:id', requireAuth, socialController.deleteMatchmaking);

/* =========================
   REVIEWS
========================= */

router.get('/fields/:fieldId/reviews', socialController.getReviewsByField);
router.post(
  '/fields/:fieldId/reviews',
  requireAuth,
  validate([
    { field: 'rating', required: true, type: 'number', min: 1, max: 5 },
    { field: 'comment', required: true, type: 'string', minLength: 3 }
  ]),
  socialController.createReview
);
router.put('/reviews/:id', requireAuth, socialController.updateReview);
router.delete('/reviews/:id', requireAuth, socialController.deleteReview);

export default router;