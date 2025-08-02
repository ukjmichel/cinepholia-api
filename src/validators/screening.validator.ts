// src/validators/screening.validator.ts

import { body, param, query } from 'express-validator';

/**
 * Allowed projection qualities (must match MovieHallModel)
 */
const allowedQualities = ['2D', '3D', 'IMAX', '4DX'];

/* ----------------------------------------------------------------------
   Param Validators
---------------------------------------------------------------------- */

/**
 * Validate :screeningId param as a UUID v4
 */
export const screeningIdParamValidator = [
  param('screeningId')
    .isUUID(4)
    .withMessage('screeningId must be a valid UUID'),
];

/* ----------------------------------------------------------------------
   Create Screening Validator
---------------------------------------------------------------------- */

/**
 * Validate request body for creating a new screening
 * All fields required except screeningId (auto-generated)
 */
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
  // Optional quality field for advanced API use (screenings normally inherit hall's quality)
  body('quality')
    .optional()
    .isIn(allowedQualities)
    .withMessage(`quality must be one of: ${allowedQualities.join(', ')}`),
];

/* ----------------------------------------------------------------------
   Update Screening Validator (PATCH)
---------------------------------------------------------------------- */

/**
 * Validate request body for partial update of a screening
 * All fields optional
 */
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
    .isIn(allowedQualities)
    .withMessage(`quality must be one of: ${allowedQualities.join(', ')}`),
];

/* ----------------------------------------------------------------------
   Search & Filter Validator for GET /screenings/search
---------------------------------------------------------------------- */

/**
 * Validate query params for searching or filtering screenings
 */
export const searchScreeningValidator = [
  query('q')
    .optional()
    .isString()
    .withMessage('Search query must be a string')
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be 1-100 chars'),
  query('quality')
    .optional()
    .isIn(allowedQualities)
    .withMessage(`quality must be one of: ${allowedQualities.join(', ')}`),
  query('date')
    .optional()
    .isISO8601({ strict: true })
    .withMessage('date must be a valid ISO8601 date (YYYY-MM-DD)'),
  query('theaterId')
    .optional()
    .isString()
    .withMessage('theaterId must be a string')
    .isLength({ min: 1, max: 100 })
    .withMessage('theaterId must be 1-100 characters'),
  query('hallId')
    .optional()
    .isString()
    .withMessage('hallId must be a string')
    .isLength({ min: 1, max: 100 })
    .withMessage('hallId must be 1-100 characters'),
  query('movieId')
    .optional()
    .isUUID(4)
    .withMessage('movieId must be a valid UUID'),
];
