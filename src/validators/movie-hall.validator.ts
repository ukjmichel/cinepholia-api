import { body, param, query } from 'express-validator';

/**
 * Validate creation of a movie hall
 */
export const createMovieHallValidator = [
  body('theaterId')
    .exists()
    .withMessage('theaterId is required')
    .isLength({ min: 2, max: 36 })
    .withMessage('theaterId must be between 2 and 36 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      'theaterId must contain only letters, numbers, underscores, or hyphens'
    ),
  body('hallId')
    .exists()
    .withMessage('hallId is required')
    .isLength({ min: 1, max: 16 })
    .withMessage('hallId must be between 1 and 16 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      'hallId must contain only letters, numbers, underscores, or hyphens'
    ),
  body('seatsLayout')
    .exists()
    .withMessage('seatsLayout is required')
    .isArray({ min: 1 })
    .withMessage('seatsLayout must be a non-empty 2D array')
    .custom((value) => {
      if (
        !Array.isArray(value) ||
        value.length === 0 ||
        !value.every(
          (row) =>
            Array.isArray(row) &&
            row.length > 0 &&
            row.every(
              (seat) =>
                (typeof seat === 'string' && seat.length > 0) ||
                (typeof seat === 'number' && Number.isFinite(seat) && seat >= 0)
            )
        )
      ) {
        throw new Error(
          'seatsLayout must be a 2D array of non-empty rows, each seat a non-empty string or a non-negative number'
        );
      }
      return true;
    }),
];

/**
 * Validate updating a movie hall (at least one field must be present)
 */
export const updateMovieHallValidator = [
  body().custom((value, { req }) => {
    if (
      !req.body ||
      (!req.body.seatsLayout && !req.body.hallId && !req.body.theaterId)
    ) {
      throw new Error(
        'At least one updatable field (seatsLayout, hallId, theaterId) must be provided'
      );
    }
    return true;
  }),
  body('hallId')
    .optional()
    .isLength({ min: 1, max: 16 })
    .withMessage('hallId must be between 1 and 16 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      'hallId must contain only letters, numbers, underscores, or hyphens'
    ),
  body('theaterId')
    .optional()
    .isLength({ min: 2, max: 36 })
    .withMessage('theaterId must be between 2 and 36 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      'theaterId must contain only letters, numbers, underscores, or hyphens'
    ),
  body('seatsLayout')
    .optional()
    .isArray({ min: 1 })
    .withMessage('seatsLayout must be a non-empty 2D array')
    .custom((value) => {
      if (
        !Array.isArray(value) ||
        value.length === 0 ||
        !value.every(
          (row) =>
            Array.isArray(row) &&
            row.length > 0 &&
            row.every(
              (seat) =>
                (typeof seat === 'string' && seat.length > 0) ||
                (typeof seat === 'number' && Number.isFinite(seat) && seat >= 0)
            )
        )
      ) {
        throw new Error(
          'seatsLayout must be a 2D array of non-empty rows, each seat a non-empty string or a non-negative number'
        );
      }
      return true;
    }),
];

/**
 * Validate hall route params (theaterId & hallId)
 */
export const movieHallIdParamsValidator = [
  param('theaterId')
    .exists()
    .withMessage('theaterId param is required')
    .isLength({ min: 2, max: 36 })
    .withMessage('theaterId must be between 2 and 36 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      'theaterId must contain only letters, numbers, underscores, or hyphens'
    ),
  param('hallId')
    .exists()
    .withMessage('hallId param is required')
    .isLength({ min: 1, max: 16 })
    .withMessage('hallId must be between 1 and 16 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      'hallId must contain only letters, numbers, underscores, or hyphens'
    ),
];

/**
 * Validate theaterId param only (for /theater/:theaterId)
 */
export const theaterIdParamValidator = [
  param('theaterId')
    .exists()
    .withMessage('theaterId param is required')
    .isLength({ min: 2, max: 36 })
    .withMessage('theaterId must be between 2 and 36 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      'theaterId must contain only letters, numbers, underscores, or hyphens'
    ),
];

/**
 * Validate hall search query
 */
export const searchMovieHallValidator = [
  query('theaterId')
    .optional()
    .isLength({ min: 2, max: 36 })
    .withMessage('theaterId must be between 2 and 36 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      'theaterId must contain only letters, numbers, underscores, or hyphens'
    ),
  query('hallId')
    .optional()
    .isLength({ min: 1, max: 16 })
    .withMessage('hallId must be between 1 and 16 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      'hallId must contain only letters, numbers, underscores, or hyphens'
    ),
];
