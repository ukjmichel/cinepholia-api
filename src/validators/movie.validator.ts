import { body, param, query } from 'express-validator';

export const validateCreateMovie = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('Title must be between 1 and 255 characters'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 1, max: 2000 })
    .withMessage('Description must be between 1 and 2000 characters'),

  body('ageRating')
    .notEmpty()
    .withMessage('Age rating is required')
    .isIn(['G', 'PG', 'PG-13', 'R', 'NC-17', 'U', 'UA', 'A', 'Not Rated'])
    .withMessage('Age rating must be a valid rating'),

  body('genre')
    .trim()
    .notEmpty()
    .withMessage('Genre is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Genre must be between 1 and 100 characters'),

  body('releaseDate')
    .notEmpty()
    .withMessage('Release date is required')
    .isISO8601()
    .withMessage('Release date must be a valid date')
    .custom((value) => {
      const releaseDate = new Date(value);
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today
      if (releaseDate > today) {
        throw new Error('Release date cannot be in the future');
      }
      return true;
    }),

  body('director')
    .trim()
    .notEmpty()
    .withMessage('Director is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('Director must be between 1 and 255 characters'),

  body('durationMinutes')
    .notEmpty()
    .withMessage('Duration is required')
    .isInt({ min: 1, max: 1000 })
    .withMessage('Duration must be between 1 and 1000 minutes'),

  body('posterUrl')
    .optional()
    .isURL()
    .withMessage('Poster URL must be a valid URL')
    .isLength({ max: 500 })
    .withMessage('Poster URL must be less than 500 characters'),

  body('recommended')
    .optional()
    .isBoolean()
    .withMessage('Recommended must be a boolean value'),
];

export const validateMovieIdParam = [
  param('movieId')
    .notEmpty()
    .withMessage('Movie ID is required')
    .isUUID()
    .withMessage('Movie ID must be a valid UUID'),
];

export const validateUpdateMovie = [
  ...validateMovieIdParam,
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Title must be between 1 and 255 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Description must be between 1 and 2000 characters'),

  body('ageRating')
    .optional()
    .isIn(['G', 'PG', 'PG-13', 'R', 'NC-17', 'U', 'UA', 'A', 'Not Rated'])
    .withMessage('Age rating must be a valid rating'),

  body('genre')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Genre must be between 1 and 100 characters'),

  body('releaseDate')
    .optional()
    .isISO8601()
    .withMessage('Release date must be a valid date')
    .custom((value) => {
      if (value) {
        const releaseDate = new Date(value);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (releaseDate > today) {
          throw new Error('Release date cannot be in the future');
        }
      }
      return true;
    }),

  body('director')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Director must be between 1 and 255 characters'),

  body('durationMinutes')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Duration must be between 1 and 1000 minutes'),

  body('posterUrl')
    .optional()
    .custom((value) => {
      if (value === null || value === '') return true; // Allow null/empty to clear the field
      if (typeof value === 'string' && value.length > 0) {
        const urlRegex = /^(https?:\/\/)[^\s$.?#].[^\s]*$/;
        if (!urlRegex.test(value)) {
          throw new Error('Poster URL must be a valid URL');
        }
        if (value.length > 500) {
          throw new Error('Poster URL must be less than 500 characters');
        }
      }
      return true;
    }),

  body('recommended')
    .optional()
    .isBoolean()
    .withMessage('Recommended must be a boolean value'),
];

export const validateListMovies = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('pageSize')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Page size must be between 1 and 100'),
  query('title')
    .optional()
    .isString()
    .isLength({ max: 255 })
    .withMessage('Title filter too long'),
  query('genre')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage('Genre filter too long'),
  query('director')
    .optional()
    .isString()
    .isLength({ max: 255 })
    .withMessage('Director filter too long'),
  query('ageRating')
    .optional()
    .isIn(['G', 'PG', 'PG-13', 'R', 'NC-17', 'U', 'UA', 'A', 'Not Rated'])
    .withMessage('Invalid age rating filter'),
  query('recommended')
    .optional()
    .isBoolean()
    .toBoolean()
    .withMessage('Recommended must be boolean'),
];

export const validateSearchMovies = [
  // Free-text search query
  query('q')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .trim()
    .escape()
    .withMessage('Search query too long'),

  // Movie ID filter
  query('movieId')
    .optional()
    .isUUID()
    .withMessage('Movie ID must be a valid UUID'),

  // String filters
  query('title')
    .optional()
    .isString()
    .isLength({ max: 255 })
    .trim()
    .escape()
    .withMessage('Title filter invalid'),
  query('genre')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .trim()
    .escape()
    .withMessage('Genre filter invalid'),
  query('director')
    .optional()
    .isString()
    .isLength({ max: 255 })
    .trim()
    .escape()
    .withMessage('Director filter invalid'),
  query('ageRating')
    .optional()
    .isIn(['G', 'PG', 'PG-13', 'R', 'NC-17', 'U', 'UA', 'A', 'Not Rated'])
    .withMessage('Invalid age rating'),

  // Boolean filter
  query('recommended')
    .optional()
    .custom((value) => {
      if (
        value === 'true' ||
        value === 'false' ||
        value === '1' ||
        value === '0'
      ) {
        return true;
      }
      throw new Error('Recommended must be boolean');
    }),

  // Duration filters
  query('minDuration')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Minimum duration must be a positive integer'),
  query('maxDuration')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Maximum duration must be a positive integer'),

  // Date filters
  query('releasedAfter')
    .optional()
    .isISO8601()
    .withMessage('Released after must be a valid date'),
  query('releasedBefore')
    .optional()
    .isISO8601()
    .withMessage('Released before must be a valid date'),
  query('createdFrom')
    .optional()
    .isISO8601()
    .withMessage('Created from must be a valid date'),
  query('createdTo')
    .optional()
    .isISO8601()
    .withMessage('Created to must be a valid date'),
  query('updatedFrom')
    .optional()
    .isISO8601()
    .withMessage('Updated from must be a valid date'),
  query('updatedTo')
    .optional()
    .isISO8601()
    .withMessage('Updated to must be a valid date'),

  // Pagination
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('pageSize')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Page size must be between 1 and 100'),

  // Sorting
  query('sortBy')
    .optional()
    .isIn([
      'createdAt',
      'updatedAt',
      'title',
      'releaseDate',
      'director',
      'genre',
      'durationMinutes',
      'ageRating',
    ])
    .withMessage('Invalid sort field'),
  query('sortDir')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort direction must be asc or desc'),
];
