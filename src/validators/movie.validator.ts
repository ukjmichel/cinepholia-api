import { body, param, query } from 'express-validator';

// For POST /movies
export const createMovieValidator = [
  body('movieId')
    .optional()
    .isString()
    .withMessage('movieId must be a string')
    .isLength({ min: 1, max: 36 })
    .withMessage('movieId must be between 1 and 36 characters'),
  body('title')
    .notEmpty()
    .withMessage('title is required')
    .isString()
    .withMessage('title must be a string')
    .isLength({ min: 1, max: 255 })
    .withMessage('title must be between 1 and 255 characters'),
  body('description')
    .notEmpty()
    .withMessage('description is required')
    .isString()
    .withMessage('description must be a string')
    .isLength({ min: 1, max: 2000 })
    .withMessage('description must be between 1 and 2000 characters'),
  body('ageRating')
    .notEmpty()
    .withMessage('ageRating is required')
    .isIn(['G', 'PG', 'PG-13', 'R', 'NC-17', 'U', 'UA', 'A', 'Not Rated'])
    .withMessage('Invalid age rating'),
  body('genre')
    .notEmpty()
    .withMessage('genre is required')
    .isString()
    .withMessage('genre must be a string')
    .isLength({ min: 1, max: 100 })
    .withMessage('genre must be between 1 and 100 characters'),
  body('releaseDate')
    .notEmpty()
    .withMessage('releaseDate is required')
    .isISO8601()
    .withMessage('releaseDate must be a valid date')
    .toDate(),
  body('director')
    .notEmpty()
    .withMessage('director is required')
    .isString()
    .withMessage('director must be a string')
    .isLength({ min: 1, max: 255 })
    .withMessage('director must be between 1 and 255 characters'),
  body('durationMinutes')
    .notEmpty()
    .withMessage('durationMinutes is required')
    .isInt({ min: 1, max: 1000 })
    .withMessage('durationMinutes must be an integer between 1 and 1000'),
  body('posterUrl')
    .optional()
    .isString()
    .withMessage('posterUrl must be a string')
    .isLength({ max: 500 })
    .withMessage('posterUrl must be less than 500 characters')
    .matches(/^(https?:\/\/)[^\s$.?#].[^\s]*$/)
    .withMessage('posterUrl must be a valid URL'),
  body('recommended')
    .optional()
    .isBoolean()
    .withMessage('recommended must be boolean')
    .toBoolean(),
];

// For PUT /movies/:movieId
export const updateMovieValidator = [
  body('title')
    .optional()
    .isString()
    .withMessage('title must be a string')
    .isLength({ min: 1, max: 255 })
    .withMessage('title must be between 1 and 255 characters'),
  body('description')
    .optional()
    .isString()
    .withMessage('description must be a string')
    .isLength({ min: 1, max: 2000 })
    .withMessage('description must be between 1 and 2000 characters'),
  body('ageRating')
    .optional()
    .isIn(['G', 'PG', 'PG-13', 'R', 'NC-17', 'U', 'UA', 'A', 'Not Rated'])
    .withMessage('Invalid age rating'),
  body('genre')
    .optional()
    .isString()
    .withMessage('genre must be a string')
    .isLength({ min: 1, max: 100 })
    .withMessage('genre must be between 1 and 100 characters'),
  body('releaseDate')
    .optional()
    .isISO8601()
    .withMessage('releaseDate must be a valid date')
    .toDate(),
  body('director')
    .optional()
    .isString()
    .withMessage('director must be a string')
    .isLength({ min: 1, max: 255 })
    .withMessage('director must be between 1 and 255 characters'),
  body('durationMinutes')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('durationMinutes must be an integer between 1 and 1000'),
  body('posterUrl')
    .optional()
    .isString()
    .withMessage('posterUrl must be a string')
    .isLength({ max: 500 })
    .withMessage('posterUrl must be less than 500 characters')
    .matches(/^(https?:\/\/)[^\s$.?#].[^\s]*$/)
    .withMessage('posterUrl must be a valid URL'),
  body('recommended')
    .optional()
    .isBoolean()
    .withMessage('recommended must be boolean')
    .toBoolean(),
];

// For GET /movies/search
export const searchMovieValidator = [
  query('q')
    .exists({ checkNull: true, checkFalsy: true })
    .withMessage('Search query (q) is required')
    .isString()
    .withMessage('Search query must be a string')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Search query cannot be empty'),
];

// For all :movieId params
export const movieIdParamValidator = [
  param('movieId')
    .exists()
    .isString()
    .withMessage('movieId must be provided and must be a string')
    .isLength({ min: 1, max: 36 })
    .withMessage('movieId must be between 1 and 36 characters'),
];
