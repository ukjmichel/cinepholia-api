import { body, param, query } from 'express-validator';

/**
 * Validate booking creation fields.
 */
export const createBookingValidator = [
  body('userId').isUUID().withMessage('userId must be a valid UUID'),
  body('screeningId').isUUID().withMessage('screeningId must be a valid UUID'),
  body('seatsNumber')
    .isInt({ min: 1 })
    .withMessage('seatsNumber must be a positive integer'),
  // Optional, will default in model/service
  body('status')
    .optional()
    .isIn(['pending', 'used', 'canceled'])
    .withMessage('status must be pending, used, or canceled'),
  body('bookingDate')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('bookingDate must be a valid ISO date'),
];

/**
 * Validate booking update fields.
 */
export const updateBookingValidator = [
  body('seatsNumber')
    .optional()
    .isInt({ min: 1 })
    .withMessage('seatsNumber must be a positive integer'),
  body('status')
    .optional()
    .isIn(['pending', 'used', 'canceled'])
    .withMessage('status must be pending, used, or canceled'),
  body('bookingDate')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('bookingDate must be a valid ISO date'),
];

/**
 * Validate bookingId param.
 */
export const bookingIdParamValidator = [
  param('bookingId').isUUID().withMessage('bookingId must be a valid UUID'),
];

/**
 * Validate userId param.
 */
export const userIdParamValidator = [
  param('userId').isUUID().withMessage('userId must be a valid UUID'),
];

/**
 * Validate screeningId param.
 */
export const screeningIdParamValidator = [
  param('screeningId').isUUID().withMessage('screeningId must be a valid UUID'),
];

/**
 * Validate status param.
 */
export const statusParamValidator = [
  param('status')
    .isIn(['pending', 'used', 'canceled'])
    .withMessage('status must be pending, used, or canceled'),
];

/**
 * Validate search query (?q=...)
 */
export const searchBookingValidator = [
  query('screeningId')
    .optional()
    .isUUID()
    .withMessage('screeningId must be a valid UUID'),
  query('status')
    .optional()
    .isIn(['pending', 'used', 'canceled'])
    .withMessage('status must be pending, used, or canceled'),
  // add more as needed
];
