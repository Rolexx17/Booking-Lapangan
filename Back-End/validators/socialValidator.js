// Validator untuk matchmaking dan reviews

import { body, query, param } from 'express-validator';

export const matchmakingQueryRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('page harus angka >= 1'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit harus 1 - 100'),
  query('field_id').optional().isInt({ min: 1 }).withMessage('field_id tidak valid'),
  query('skill_level').optional().isString().withMessage('skill_level harus string')
];

export const createMatchmakingRules = [
  body('field_id').isInt({ min: 1 }).withMessage('field_id harus angka valid'),
  body('skill_level').trim().notEmpty().withMessage('skill_level wajib diisi'),
  body('looking_for').isInt({ min: 1 }).withMessage('looking_for harus angka >= 1'),
  body('time_schedule').trim().notEmpty().withMessage('time_schedule wajib diisi'),
  body('note').optional({ nullable: true }).isString().withMessage('note harus string')
];

export const updateMatchmakingRules = [
  body('skill_level').trim().notEmpty().withMessage('skill_level wajib diisi'),
  body('looking_for').isInt({ min: 1 }).withMessage('looking_for harus angka >= 1'),
  body('time_schedule').trim().notEmpty().withMessage('time_schedule wajib diisi'),
  body('note').optional({ nullable: true }).isString().withMessage('note harus string')
];

export const fieldIdParamRules = [
  param('fieldId').isInt({ min: 1 }).withMessage('fieldId tidak valid')
];

export const reviewIdParamRules = [
  param('id').isInt({ min: 1 }).withMessage('id review tidak valid')
];

export const createReviewRules = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('rating harus 1 sampai 5'),
  body('comment')
    .trim()
    .notEmpty().withMessage('comment wajib diisi')
    .isLength({ min: 3 }).withMessage('comment minimal 3 karakter')
];

export const updateReviewRules = [...createReviewRules];