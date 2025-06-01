import { body, param, query } from 'express-validator';

export const createCommentValidation = [
  body('bookingId')
    .isUUID()
    .withMessage('bookingId must be a valid UUID')
    .notEmpty()
    .withMessage('bookingId is required'),
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
  query('q').isString().notEmpty().withMessage('Query parameter q is required'),
];
