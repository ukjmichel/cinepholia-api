import { body, param, query } from 'express-validator';

export const createCommentValidation = [
  body('comment')
    .isString()
    .withMessage('comment must be a string')
    .isLength({ min: 1, max: 1000 })
    .withMessage('comment must be 1-1000 characters'),
  body('rating')
    .isInt({ min: 0, max: 5 })
    .withMessage('rating must be an integer between 0 and 5'),
  body('status')
    .optional()
    .isIn(['pending', 'confirmed'])
    .withMessage('status must be "pending" or "confirmed"'),
];

export const updateCommentValidation = [
  param('bookingId').isUUID().withMessage('bookingId must be a valid UUID'),
  body('comment')
    .optional()
    .isString()
    .withMessage('comment must be a string')
    .isLength({ min: 1, max: 1000 })
    .withMessage('comment must be 1-1000 characters'),
  body('rating')
    .optional()
    .isInt({ min: 0, max: 5 })
    .withMessage('rating must be an integer between 0 and 5'),
  body('status')
    .optional()
    .isIn(['pending', 'confirmed'])
    .withMessage('status must be "pending" or "confirmed"'),
];

export const bookingIdParamValidation = [
  param('bookingId').isUUID().withMessage('bookingId must be a valid UUID'),
];

export const statusParamValidation = [
  param('status').isIn(['pending', 'confirmed']).withMessage('Invalid status'),
];

export const movieIdParamValidation = [
  param('movieId').isString().notEmpty().withMessage('movieId is required'), // adjust if UUID
];

export const searchQueryValidation = [
  // q: optional, non-empty string if present
  query('q')
    .optional()
    .isString()
    .notEmpty()
    .withMessage('If provided, q must be a non-empty string'),

  // status: optional, must be 'pending' or 'confirmed' if present
  query('status')
    .optional()
    .isIn(['pending', 'confirmed'])
    .withMessage('status must be either "pending" or "confirmed"'),

  // bookingId: optional, must be a valid UUID if present
  query('bookingId')
    .optional()
    .isUUID()
    .withMessage('If provided, bookingId must be a valid UUID'),

  // movieId: optional, must be a valid UUID if present
  query('movieId')
    .optional()
    .isUUID()
    .withMessage('If provided, movieId must be a valid UUID'),

  // rating: optional, must be a number between 1 and 5 (adjust if needed)
  query('rating')
    .optional()
    .isFloat({ min: 1, max: 5 })
    .withMessage('If provided, rating must be a number between 1 and 5'),

  // createdAt: optional, must be a valid ISO8601 date string if present
  query('createdAt')
    .optional()
    .isISO8601()
    .withMessage('If provided, createdAt must be a valid ISO8601 date'),
];