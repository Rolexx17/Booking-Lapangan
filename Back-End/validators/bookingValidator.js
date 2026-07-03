import { body, query } from 'express-validator';

export const createBookingRules = [
  body('field_id').isInt({ min: 1 }).withMessage('field_id harus angka valid'),
  body('booking_date').isDate().withMessage('booking_date harus format tanggal valid (YYYY-MM-DD)'),
  body('time_slot').trim().notEmpty().withMessage('time_slot wajib diisi'),
  body('total_price').isFloat({ min: 0 }).withMessage('total_price harus angka >= 0')
];

export const bookingQueryRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('page harus angka >= 1'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit harus 1 - 100'),
  query('status').optional().isIn(['Pending', 'Success', 'Cancelled']).withMessage('status tidak valid')
];