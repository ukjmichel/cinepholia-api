import { body, param, query } from 'express-validator';

/**
 * Validation rules for creating a movie theater.
 */
export const createMovieTheaterValidator = [
  body('theaterId')
    .isString()
    .isLength({ min: 2, max: 36 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('theaterId must be 2-36 chars, only letters, numbers, _ or -'),
  body('address').isString().isLength({ min: 5, max: 100 }),
  body('postalCode')
    .isString()
    .matches(/^[0-9]{4,10}$/)
    .withMessage('postalCode must be 4 to 10 digits'),
  body('city')
    .isString()
    .isLength({ min: 2, max: 50 })
    .matches(/^[a-zA-ZÀ-ÖØ-öø-ÿ' -]+$/u)
    .withMessage(
      'city can only contain letters, spaces, hyphens, and apostrophes'
    ),
  body('phone')
    .isString()
    .isLength({ min: 6, max: 20 })
    .matches(/^(\+?\d{1,3})?[-. ]?(\d{2,4}[-. ]?){2,5}\d{2,4}$/)
    .withMessage('Invalid phone number format'),
  body('email').isEmail(),
];

/**
 * Validation rules for updating a movie theater.
 */
export const updateMovieTheaterValidator = [
  param('id').isString().isLength({ min: 2, max: 36 }),
  body('address').optional().isString().isLength({ min: 5, max: 100 }),
  body('postalCode')
    .optional()
    .isString()
    .matches(/^[0-9]{4,10}$/),
  body('city')
    .optional()
    .isString()
    .isLength({ min: 2, max: 50 })
    .matches(/^[a-zA-ZÀ-ÖØ-öø-ÿ' -]+$/u),
  body('phone')
    .optional()
    .isString()
    .isLength({ min: 6, max: 20 })
    .matches(/^(\+?\d{1,3})?[-. ]?(\d{2,4}[-. ]?){2,5}\d{2,4}$/),
  body('email').optional().isEmail(),
];

/**
 * Validation rules for searching movie theaters.
 */
export const searchMovieTheaterValidator = [
  query('city').optional().isString().isLength({ min: 2 }),
  query('address').optional().isString().isLength({ min: 2 }),
  query('postalCode').optional().isString().isLength({ min: 4 }),
  query('theaterId').optional().isString().isLength({ min: 2 }),
];

/**
 * Validation rules for route params.
 */
export const movieTheaterIdParamValidator = [
  param('id').isString().isLength({ min: 2, max: 36 }),
];
