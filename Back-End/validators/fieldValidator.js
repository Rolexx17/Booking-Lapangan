// Validator untuk resource fields

import { body, query, param } from 'express-validator';

export const fieldQueryRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('page harus angka >= 1'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit harus 1 - 100'),
  query('q').optional().isString().withMessage('q harus string'),
  query('type').optional().isString().withMessage('type harus string'),
  query('minPrice').optional().isFloat({ min: 0 }).withMessage('minPrice harus angka >= 0'),
  query('maxPrice').optional().isFloat({ min: 0 }).withMessage('maxPrice harus angka >= 0')
];

export const fieldIdParamRules = [
  param('id').isInt({ min: 1 }).withMessage('id lapangan tidak valid')
];

export const createFieldRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('name wajib diisi')
    .isLength({ min: 3 }).withMessage('name minimal 3 karakter'),
  body('type')
    .trim()
    .notEmpty().withMessage('type wajib diisi'),
  body('price')
    .isFloat({ min: 0 }).withMessage('price harus angka >= 0'),
  body('image')
    .optional({ nullable: true })
    .isString().withMessage('image harus string url/path'),
  body('description')
    .optional({ nullable: true })
    .isString().withMessage('description harus string')
];

export const updateFieldRules = [...createFieldRules];