import { body, param, query } from 'express-validator';

/* ----------------------------------------------------------------------
   Movie Hall Validators
---------------------------------------------------------------------- */

/**
 * Validate creation of a movie hall.
 * All fields required.
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
  body('quality')
    .exists()
    .withMessage('quality is required')
    .isIn(['2D', '3D', 'IMAX', '4DX'])
    .withMessage('quality must be one of: 2D, 3D, IMAX, 4DX'),
];

/**
 * Validate updating a movie hall.
 * At least one updatable field must be present.
 */
export const updateMovieHallValidator = [
  body().custom((_, { req }) => {
    if (
      !req.body ||
      (!req.body.seatsLayout &&
        !req.body.hallId &&
        !req.body.theaterId &&
        !req.body.quality)
    ) {
      throw new Error(
        'At least one updatable field (seatsLayout, hallId, theaterId, quality) must be provided'
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
  body('quality')
    .optional()
    .isString()
    .withMessage('quality must be a string')
    .isIn(['2D', '3D', 'IMAX', '4DX'])
    .withMessage('quality must be one of: 2D, 3D, IMAX, 4DX'),
];

/* ----------------------------------------------------------------------
   Params and Query Validators for Movie Halls
---------------------------------------------------------------------- */

/**
 * Validate both theaterId and hallId in params (e.g. /movie-halls/:theaterId/:hallId)
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
 * Validate hallId in params (e.g. /hall/:hallId)
 */
export const hallIdParamValidator = [
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
 * Validate theaterId in query (?theaterId=xxx)
 */
export const theaterIdQueryValidator = [
  query('theaterId')
    .exists()
    .withMessage('theaterId query param is required')
    .isLength({ min: 2, max: 36 })
    .withMessage('theaterId must be between 2 and 36 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      'theaterId must contain only letters, numbers, underscores, or hyphens'
    ),
];

/**
 * Validate theaterId in params (e.g. /theater/:theaterId)
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
 * Validate movie hall search query (?theaterId=...&hallId=...)
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

/**
 * Validate hallId in params and theaterId in query for hall screenings lookup (e.g. /screenings/hall/:hallId?theaterId=xxx)
 */
export const hallScreeningsValidator = [
  param('hallId')
    .exists()
    .withMessage('hallId param is required')
    .isLength({ min: 1, max: 16 })
    .withMessage('hallId must be between 1 and 16 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('hallId must contain only letters, numbers, underscores, or hyphens'),
  query('theaterId')
    .exists()
    .withMessage('theaterId query param is required')
    .isLength({ min: 2, max: 36 })
    .withMessage('theaterId must be between 2 and 36 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('theaterId must contain only letters, numbers, underscores, or hyphens'),
];
