import { body, param, query } from 'express-validator';

/** Validate start time for screenings */
const validateStartTime = (
  fieldName: string = 'startTime',
  isRequired: boolean = true
) => {
  const validator = body(fieldName);

  if (isRequired) {
    validator.notEmpty().withMessage(`${fieldName} is required`);
  } else {
    validator.optional();
  }

  return validator
    .isISO8601()
    .withMessage(`${fieldName} must be a valid ISO 8601 date`)
    .custom((value) => {
      const date = new Date(value);
      const now = new Date();

      // Allow some tolerance for past dates (30 minutes) for updates
      const timeDiff = date.getTime() - now.getTime();
      const minutesDiff = timeDiff / (1000 * 60);

      if (minutesDiff < -30) {
        throw new Error(
          `${fieldName} cannot be more than 30 minutes in the past`
        );
      }

      // Check reasonable hours (6 AM to 2 AM next day)
      const hour = date.getHours();
      if (hour < 6 && hour >= 2) {
        throw new Error(`${fieldName} must be between 6 AM and 2 AM`);
      }

      return true;
    });
};

/** Validate price field */
const validatePrice = (
  fieldName: string = 'price',
  isRequired: boolean = true
) => {
  const validator = body(fieldName);

  if (isRequired) {
    validator.notEmpty().withMessage(`${fieldName} is required`);
  } else {
    validator.optional();
  }

  return validator
    .isFloat({ min: 0, max: 1000 })
    .withMessage(`${fieldName} must be between 0 and 1000`)
    .custom((value) => {
      // Check for reasonable decimal places (max 2)
      const str = value.toString();
      if (str.includes('.') && str.split('.')[1].length > 2) {
        throw new Error(`${fieldName} cannot have more than 2 decimal places`);
      }
      return true;
    });
};

export const validateCreateScreening = [
  body('movieId')
    .trim()
    .notEmpty()
    .withMessage('Movie ID is required')
    .isUUID(4)
    .withMessage('Movie ID must be a valid UUID'),

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

  body('hallId')
    .trim()
    .notEmpty()
    .withMessage('Hall ID is required')
    .isUUID(4)
    .withMessage('Hall ID must be a valid UUID'),

  validateStartTime('startTime', true),
  validatePrice('price', true),
];

export const validateUpdateScreening = [
  body('movieId')
    .optional()
    .trim()
    .isUUID(4)
    .withMessage('Movie ID must be a valid UUID'),

  body('theaterId')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Theater ID must be between 1 and 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      'Theater ID can only contain letters, numbers, underscores, and hyphens'
    ),

  body('hallId')
    .optional()
    .trim()
    .isUUID(4)
    .withMessage('Hall ID must be a valid UUID'),

  validateStartTime('startTime', false),
  validatePrice('price', false),
];

export const validateScreeningIdParam = [
  param('screeningId')
    .trim()
    .notEmpty()
    .withMessage('Screening ID is required')
    .isUUID(4)
    .withMessage('Screening ID must be a valid UUID'),
];

export const validateMovieIdParam = [
  param('movieId')
    .trim()
    .notEmpty()
    .withMessage('Movie ID is required')
    .isUUID(4)
    .withMessage('Movie ID must be a valid UUID'),
];

export const validateTheaterIdParam = [
  param('theaterId')
    .trim()
    .notEmpty()
    .withMessage('Theater ID is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('Theater ID must be between 1 and 50 characters'),
];

export const validateHallIdParams = [
  param('theaterId')
    .trim()
    .notEmpty()
    .withMessage('Theater ID is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('Theater ID must be between 1 and 50 characters'),

  param('hallId')
    .trim()
    .notEmpty()
    .withMessage('Hall ID is required')
    .isUUID(4)
    .withMessage('Hall ID must be a valid UUID'),
];

export const validateDateParam = [
  param('date')
    .notEmpty()
    .withMessage('Date is required')
    .isISO8601()
    .withMessage('Date must be a valid ISO 8601 date')
    .custom((value) => {
      const date = new Date(value);
      const now = new Date();
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(now.getFullYear() + 1);

      if (date < new Date(now.getFullYear() - 1, 0, 1)) {
        throw new Error('Date cannot be more than 1 year in the past');
      }

      if (date > oneYearFromNow) {
        throw new Error('Date cannot be more than 1 year in the future');
      }

      return true;
    }),
];

export const validateListScreenings = [
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

  // Entity filters
  query('movieId')
    .optional()
    .custom((value) => {
      if (Array.isArray(value)) {
        if (value.length === 0) {
          throw new Error('Movie ID array cannot be empty');
        }
        value.forEach((id: string) => {
          if (
            !id ||
            !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
              id
            )
          ) {
            throw new Error('Each movie ID must be a valid UUID');
          }
        });
      } else if (typeof value === 'string') {
        if (
          !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            value
          )
        ) {
          throw new Error('Movie ID must be a valid UUID');
        }
      }
      return true;
    }),

  query('theaterId')
    .optional()
    .custom((value) => {
      if (Array.isArray(value)) {
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
        if (value.length === 0 || value.length > 50) {
          throw new Error('Theater ID must be between 1 and 50 characters');
        }
      }
      return true;
    }),

  query('hallId')
    .optional()
    .custom((value) => {
      if (Array.isArray(value)) {
        if (value.length === 0) {
          throw new Error('Hall ID array cannot be empty');
        }
        value.forEach((id: string) => {
          if (
            !id ||
            !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
              id
            )
          ) {
            throw new Error('Each hall ID must be a valid UUID');
          }
        });
      } else if (typeof value === 'string') {
        if (
          !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            value
          )
        ) {
          throw new Error('Hall ID must be a valid UUID');
        }
      }
      return true;
    }),

  // Price filters
  query('minPrice')
    .optional()
    .isFloat({ min: 0, max: 1000 })
    .withMessage('Minimum price must be between 0 and 1000'),

  query('maxPrice')
    .optional()
    .isFloat({ min: 0, max: 1000 })
    .withMessage('Maximum price must be between 0 and 1000')
    .custom((value, { req }) => {
      const minPrice = req.query?.minPrice;
      if (minPrice && parseFloat(value) < parseFloat(minPrice as string)) {
        throw new Error('Maximum price must be greater than minimum price');
      }
      return true;
    }),

  // Time filters
  query('startTimeFrom')
    .optional()
    .isISO8601()
    .withMessage('Start time from must be a valid date'),

  query('startTimeTo')
    .optional()
    .isISO8601()
    .withMessage('Start time to must be a valid date'),

  // Date filters
  query('screeningDate')
    .optional()
    .isISO8601()
    .withMessage('Screening date must be a valid date'),

  query('dateFrom')
    .optional()
    .isISO8601()
    .withMessage('Date from must be a valid date'),

  query('dateTo')
    .optional()
    .isISO8601()
    .withMessage('Date to must be a valid date'),

  // Time-of-day filters
  query('timeFrom')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Time from must be in HH:MM format'),

  query('timeTo')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Time to must be in HH:MM format'),

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
      'startTime',
      'price',
      'movieId',
      'theaterId',
      'hallId',
      'screeningId',
    ])
    .withMessage('Invalid sort field'),

  query('sortDir')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort direction must be asc or desc'),

  // Additional query parameters for upcoming/past screenings
  query('from')
    .optional()
    .isISO8601()
    .withMessage('From time must be a valid date'),

  query('before')
    .optional()
    .isISO8601()
    .withMessage('Before time must be a valid date'),
];

export const validateSearchScreenings = [
  // Free-text search query
  query('q')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .trim()
    .escape()
    .withMessage('Search query too long'),

  // All the same validations as list screenings
  ...validateListScreenings,
];

export const validateMultipleScreenings = [
  body('screeningIds')
    .notEmpty()
    .withMessage('Screening IDs array is required')
    .isArray({ min: 1 })
    .withMessage('Screening IDs must be a non-empty array'),

  body('screeningIds.*')
    .trim()
    .isUUID(4)
    .withMessage('Each screening ID must be a valid UUID'),
];

export const validateSchedulingConflict = [
  body('startTime')
    .notEmpty()
    .withMessage('Start time is required')
    .isISO8601()
    .withMessage('Start time must be a valid ISO 8601 date'),

  body('excludeScreeningId')
    .optional()
    .trim()
    .isUUID(4)
    .withMessage('Exclude screening ID must be a valid UUID'),

  body('duration')
    .optional()
    .isInt({ min: 30, max: 300 })
    .withMessage('Duration must be between 30 and 300 minutes'),
];

export const validateSlotAvailability = [
  body('startTime')
    .notEmpty()
    .withMessage('Start time is required')
    .isISO8601()
    .withMessage('Start time must be a valid ISO 8601 date'),

  body('excludeScreeningId')
    .optional()
    .trim()
    .isUUID(4)
    .withMessage('Exclude screening ID must be a valid UUID'),

  body('duration')
    .optional()
    .isInt({ min: 30, max: 300 })
    .withMessage('Duration must be between 30 and 300 minutes'),
];

export const validateAvailableSlots = [
  query('date')
    .notEmpty()
    .withMessage('Date is required')
    .isISO8601()
    .withMessage('Date must be a valid ISO 8601 date')
    .custom((value) => {
      const date = new Date(value);
      const now = new Date();
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(now.getFullYear() + 1);

      if (date < now) {
        throw new Error('Date cannot be in the past');
      }

      if (date > oneYearFromNow) {
        throw new Error('Date cannot be more than 1 year in the future');
      }

      return true;
    }),

  query('duration')
    .optional()
    .isInt({ min: 30, max: 300 })
    .withMessage('Duration must be between 30 and 300 minutes'),
];

export const validateTheaterSchedule = [
  // Date param is already validated by validateDateParam
];

export const validateInitializeDatabase = [
  body('year')
    .optional()
    .isInt({
      min: new Date().getFullYear() - 1,
      max: new Date().getFullYear() + 2,
    })
    .withMessage('Year must be within reasonable range'),

  body('month')
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage('Month must be between 1 and 12'),

  body('screeningsPerDay')
    .optional()
    .isInt({ min: 1, max: 8 })
    .withMessage('Screenings per day must be between 1 and 8'),

  body('startHour')
    .optional()
    .isInt({ min: 6, max: 20 })
    .withMessage('Start hour must be between 6 and 20'),

  body('basePrice')
    .optional()
    .isFloat({ min: 0, max: 1000 })
    .withMessage('Base price must be between 0 and 1000'),

  body('clearExisting')
    .optional()
    .isBoolean()
    .withMessage('Clear existing must be a boolean value'),
];

export const validateGenerateMonthlySchedule = [
  body('year')
    .notEmpty()
    .withMessage('Year is required')
    .isInt({
      min: new Date().getFullYear() - 1,
      max: new Date().getFullYear() + 2,
    })
    .withMessage('Year must be within reasonable range'),

  body('month')
    .notEmpty()
    .withMessage('Month is required')
    .isInt({ min: 1, max: 12 })
    .withMessage('Month must be between 1 and 12'),

  body('screeningsPerDay')
    .optional()
    .isInt({ min: 1, max: 8 })
    .withMessage('Screenings per day must be between 1 and 8'),

  body('startHour')
    .optional()
    .isInt({ min: 6, max: 20 })
    .withMessage('Start hour must be between 6 and 20'),

  body('movieIds')
    .optional()
    .isArray()
    .withMessage('Movie IDs must be an array'),

  body('movieIds.*')
    .optional()
    .isUUID(4)
    .withMessage('Each movie ID must be a valid UUID'),

  body('basePrice')
    .optional()
    .isFloat({ min: 0, max: 1000 })
    .withMessage('Base price must be between 0 and 1000'),
];

export const validateClearMonthlySchedule = [
  body('year')
    .notEmpty()
    .withMessage('Year is required')
    .isInt({
      min: new Date().getFullYear() - 1,
      max: new Date().getFullYear() + 2,
    })
    .withMessage('Year must be within reasonable range'),

  body('month')
    .notEmpty()
    .withMessage('Month is required')
    .isInt({ min: 1, max: 12 })
    .withMessage('Month must be between 1 and 12'),
];

export const validateMovieShowtimes = [
  query('dateFrom')
    .optional()
    .isISO8601()
    .withMessage('Date from must be a valid date'),

  query('dateTo')
    .optional()
    .isISO8601()
    .withMessage('Date to must be a valid date')
    .custom((value, { req }) => {
      const dateFrom = req.query?.dateFrom;
      if (dateFrom) {
        const from = new Date(dateFrom as string);
        const to = new Date(value);
        if (to <= from) {
          throw new Error('Date to must be after date from');
        }

        // Limit the range to prevent overly large queries
        const daysDiff =
          (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
        if (daysDiff > 365) {
          throw new Error('Date range cannot exceed 365 days');
        }
      }
      return true;
    }),
];
