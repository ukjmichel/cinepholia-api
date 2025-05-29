// src/validators/screening.validator.ts
import { body, param, query } from 'express-validator';

const allowedQualities = ['Standard', '3D', 'IMAX', 'Dolby Atmos'];

// --- Basic param validator for UUID
export const screeningIdParamValidator = [
  param('screeningId')
    .isUUID(4)
    .withMessage('screeningId must be a valid UUID'),
];

// --- Create Screening Validator
export const createScreeningValidator = [
  body('screeningId')
    .optional()
    .isUUID(4)
    .withMessage('screeningId must be a valid UUID'),
  body('movieId')
    .notEmpty()
    .withMessage('movieId is required')
    .isUUID(4)
    .withMessage('movieId must be a valid UUID'),
  body('theaterId')
    .notEmpty()
    .withMessage('theaterId is required')
    .isString()
    .withMessage('theaterId must be a string'),
  body('hallId')
    .notEmpty()
    .withMessage('hallId is required')
    .isString()
    .withMessage('hallId must be a string'),
  body('startTime')
    .notEmpty()
    .withMessage('startTime is required')
    .isISO8601()
    .withMessage('startTime must be a valid ISO date'),
  body('price')
    .notEmpty()
    .withMessage('price is required')
    .isFloat({ min: 0 })
    .withMessage('price must be a positive number'),
  body('quality')
    .optional()
    .isIn(['Standard', '3D', 'IMAX', 'Dolby Atmos'])
    .withMessage('quality must be one of Standard, 3D, IMAX, Dolby Atmos'),
];

// --- Update Screening Validator (Partial)
export const updateScreeningValidator = [
  body('movieId')
    .optional()
    .isUUID(4)
    .withMessage('movieId must be a valid UUID'),
  body('theaterId')
    .optional()
    .isString()
    .withMessage('theaterId must be a string'),
  body('hallId').optional().isString().withMessage('hallId must be a string'),
  body('startTime')
    .optional()
    .isISO8601()
    .withMessage('startTime must be a valid ISO date'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('price must be a positive number'),
  body('quality')
    .optional()
    .isIn(['Standard', '3D', 'IMAX', 'Dolby Atmos'])
    .withMessage('quality must be one of Standard, 3D, IMAX, Dolby Atmos'),
];

// --- Advanced Filter/Query Validator
export const searchScreeningValidator = [
  // General query string
  query('q')
    .optional()
    .isString()
    .withMessage('Search query must be a string')
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be 1-100 chars'),

  // Filter by quality
  query('quality')
    .optional()
    .isIn(allowedQualities)
    .withMessage(`quality must be one of: ${allowedQualities.join(', ')}`),

  // Filter by date (YYYY-MM-DD)
  query('date')
    .optional()
    .isISO8601({ strict: true })
    .withMessage('date must be a valid ISO8601 date (YYYY-MM-DD)'),

  // Filter by theaterId
  query('theaterId')
    .optional()
    .isString()
    .withMessage('theaterId must be a string')
    .isLength({ min: 1, max: 100 })
    .withMessage('theaterId must be 1-100 characters'),

  // Filter by hallId
  query('hallId')
    .optional()
    .isString()
    .withMessage('hallId must be a string')
    .isLength({ min: 1, max: 100 })
    .withMessage('hallId must be 1-100 characters'),

  // Filter by movieId
  query('movieId')
    .optional()
    .isUUID(4)
    .withMessage('movieId must be a valid UUID'),
];