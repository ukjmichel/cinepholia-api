import { body, param, query } from 'express-validator';

/**
 * @module booking.validator
 * @description
 *   Express-validator middlewares for validating booking-related fields, params, and queries.
 *   Use in your routes for request validation and security.
 */

/* -------------------------------------------------------------------------- */
/*                              BODY VALIDATORS                               */
/* -------------------------------------------------------------------------- */

/**
 * Validate fields required to create a booking.
 */
export const createBookingValidator = [
  body('userId').isUUID().withMessage('userId must be a valid UUID'),
  body('screeningId').isUUID().withMessage('screeningId must be a valid UUID'),
  body('seatsNumber')
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
 * Validate fields allowed in a booking update.
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

/* -------------------------------------------------------------------------- */
/*                             PARAM VALIDATORS                               */
/* -------------------------------------------------------------------------- */

/**
 * Validate :bookingId route param (UUID).
 */
export const bookingIdParamValidator = [
  param('bookingId').isUUID().withMessage('bookingId must be a valid UUID'),
];

/**
 * Validate :userId route param (UUID).
 */
export const userIdParamValidator = [
  param('userId').isUUID().withMessage('userId must be a valid UUID'),
];

/**
 * Validate :screeningId route param (UUID).
 */
export const screeningIdParamValidator = [
  param('screeningId').isUUID().withMessage('screeningId must be a valid UUID'),
];

/**
 * Validate :status route param (enum).
 */
export const statusParamValidator = [
  param('status')
    .isIn(['pending', 'used', 'canceled'])
    .withMessage('status must be pending, used, or canceled'),
];

/* -------------------------------------------------------------------------- */
/*                             QUERY VALIDATORS                               */
/* -------------------------------------------------------------------------- */

/**
 * Validate query parameters for /bookings/search.
 * (Add more filters as needed)
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
  // Add more query filters as needed (e.g., userId, bookingDate, q)
];

/**
 * Validate query parameters for /bookings/restrict-search.
 * - screeningDate: (YYYY-MM-DD), filters by screening date (Screening.startTime)
 * - date: (YYYY-MM-DD), filters by booking creation date (Booking.bookingDate)
 * - status: (pending, used, canceled)
 */
export const restrictSearchValidator = [
  query('screeningDate')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('screeningDate must be in format YYYY-MM-DD'),
  query('date')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('date must be in format YYYY-MM-DD'),
  query('status')
    .optional()
    .isIn(['pending', 'used', 'canceled'])
    .withMessage('status must be pending, used, or canceled'),
];
