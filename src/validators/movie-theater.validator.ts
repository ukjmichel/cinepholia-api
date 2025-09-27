import { body, param, query } from 'express-validator';

export const validateCreateMovieTheater = [
  body('theaterId')
    .trim()
    .notEmpty()
    .withMessage('Theater ID is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('Theater ID must be between 1 and 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      'Theater ID can only contain letters, numbers, underscores, and hyphens'
    ),

  body('name')
    .trim()
    .notEmpty()
    .withMessage('Theater name is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('Theater name must be between 1 and 255 characters'),

  body('address')
    .trim()
    .notEmpty()
    .withMessage('Address is required')
    .isLength({ min: 1, max: 500 })
    .withMessage('Address must be between 1 and 500 characters'),

  body('city')
    .trim()
    .notEmpty()
    .withMessage('City is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('City must be between 1 and 100 characters'),

  body('postalCode')
    .trim()
    .notEmpty()
    .withMessage('Postal code is required')
    .isLength({ min: 3, max: 20 })
    .withMessage('Postal code must be between 3 and 20 characters'),

  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .isMobilePhone('any')
    .withMessage('Phone number must be a valid format'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Email must be a valid email address')
    .normalizeEmail(),

  body('capacity')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Capacity must be between 1 and 10,000'),

  body('numberOfScreens')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Number of screens must be between 1 and 50'),

  body('facilities')
    .optional()
    .isArray()
    .withMessage('Facilities must be an array'),

  body('facilities.*')
    .optional()
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Each facility must be between 1 and 100 characters'),
];

export const validateMovieTheaterIdParam = [
  param('theaterId')
    .trim()
    .notEmpty()
    .withMessage('Theater ID is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('Theater ID must be between 1 and 50 characters'),
];

export const validateUpdateMovieTheater = [
  ...validateMovieTheaterIdParam,

  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Theater name must be between 1 and 255 characters'),

  body('address')
    .optional()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Address must be between 1 and 500 characters'),

  body('city')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('City must be between 1 and 100 characters'),

  body('postalCode')
    .optional()
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Postal code must be between 3 and 20 characters'),

  body('phone')
    .optional()
    .trim()
    .isMobilePhone('any')
    .withMessage('Phone number must be a valid format'),

  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Email must be a valid email address')
    .normalizeEmail(),

  body('capacity')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Capacity must be between 1 and 10,000'),

  body('numberOfScreens')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Number of screens must be between 1 and 50'),

  body('facilities')
    .optional()
    .isArray()
    .withMessage('Facilities must be an array'),

  body('facilities.*')
    .optional()
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Each facility must be between 1 and 100 characters'),
];

export const validateListMovieTheaters = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('pageSize')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Page size must be between 1 and 100'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('theaterId')
    .optional()
    .custom((value) => {
      if (Array.isArray(value)) {
        // Multiple theater IDs
        if (value.length === 0) {
          throw new Error('Theater ID array cannot be empty');
        }
        value.forEach((id: string) => {
          if (!id || id.length > 50) {
            throw new Error(
              'Each theater ID must be between 1 and 50 characters'
            );
          }
        });
      } else if (typeof value === 'string') {
        // Single theater ID
        if (value.length === 0 || value.length > 50) {
          throw new Error('Theater ID must be between 1 and 50 characters');
        }
      }
      return true;
    }),

  query('name')
    .optional()
    .isString()
    .isLength({ max: 255 })
    .withMessage('Name filter too long'),

  query('city')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage('City filter too long'),

  query('postalCode')
    .optional()
    .isString()
    .isLength({ max: 20 })
    .withMessage('Postal code filter too long'),

  query('address')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Address filter too long'),

  query('phone')
    .optional()
    .isString()
    .isLength({ max: 20 })
    .withMessage('Phone filter too long'),

  query('email')
    .optional()
    .isEmail()
    .withMessage('Email filter must be a valid email'),

  // Date range filters
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

  // Sorting
  query('sortBy')
    .optional()
    .isIn([
      'createdAt',
      'updatedAt',
      'theaterId',
      'name',
      'city',
      'postalCode',
      'capacity',
      'numberOfScreens',
    ])
    .withMessage('Invalid sort field'),

  query('sortDir')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort direction must be asc or desc'),
];

export const validateSearchMovieTheaters = [
  // Free-text search query
  query('q')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .trim()
    .escape()
    .withMessage('Search query too long'),

  // All the same validations as list theaters
  ...validateListMovieTheaters,
];
