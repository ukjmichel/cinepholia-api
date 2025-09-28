import { body, param, query } from 'express-validator';

const VALID_QUALITIES = ['2D', '3D', 'IMAX', '4DX'];

/** Validate seats layout structure */
const validateSeatsLayout = () => {
  return body('seatsLayout')
    .notEmpty()
    .withMessage('Seats layout is required')
    .isArray({ min: 1 })
    .withMessage('Seats layout must be a non-empty array')
    .custom((layout) => {
      if (!Array.isArray(layout)) {
        throw new Error('Seats layout must be an array');
      }

      if (layout.length === 0) {
        throw new Error('Seats layout cannot be empty');
      }

      layout.forEach((row, rowIndex) => {
        if (!Array.isArray(row)) {
          throw new Error(`Row ${rowIndex} must be an array`);
        }
        if (row.length === 0) {
          throw new Error(`Row ${rowIndex} cannot be empty`);
        }

        row.forEach((seat, seatIndex) => {
          if (typeof seat !== 'string' && typeof seat !== 'number') {
            throw new Error(
              `Seat at row ${rowIndex}, position ${seatIndex} must be a string or number`
            );
          }
          if (typeof seat === 'string' && seat.length === 0) {
            throw new Error(
              `Seat at row ${rowIndex}, position ${seatIndex} cannot be an empty string`
            );
          }
          if (
            typeof seat === 'number' &&
            (!Number.isFinite(seat) || seat < 0)
          ) {
            throw new Error(
              `Seat at row ${rowIndex}, position ${seatIndex} must be a non-negative finite number`
            );
          }
        });
      });

      return true;
    });
};

/** Validate optional seats layout for updates */
const validateOptionalSeatsLayout = () => {
  return body('seatsLayout')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Seats layout must be a non-empty array')
    .custom((layout) => {
      if (!layout) return true; // Optional, so undefined is ok

      if (!Array.isArray(layout)) {
        throw new Error('Seats layout must be an array');
      }

      if (layout.length === 0) {
        throw new Error('Seats layout cannot be empty');
      }

      layout.forEach((row, rowIndex) => {
        if (!Array.isArray(row)) {
          throw new Error(`Row ${rowIndex} must be an array`);
        }
        if (row.length === 0) {
          throw new Error(`Row ${rowIndex} cannot be empty`);
        }

        row.forEach((seat, seatIndex) => {
          if (typeof seat !== 'string' && typeof seat !== 'number') {
            throw new Error(
              `Seat at row ${rowIndex}, position ${seatIndex} must be a string or number`
            );
          }
          if (typeof seat === 'string' && seat.length === 0) {
            throw new Error(
              `Seat at row ${rowIndex}, position ${seatIndex} cannot be an empty string`
            );
          }
          if (
            typeof seat === 'number' &&
            (!Number.isFinite(seat) || seat < 0)
          ) {
            throw new Error(
              `Seat at row ${rowIndex}, position ${seatIndex} must be a non-negative finite number`
            );
          }
        });
      });

      return true;
    });
};

export const validateCreateMovieHall = [
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
    .isLength({ min: 1, max: 50 })
    .withMessage('Hall ID must be between 1 and 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      'Hall ID can only contain letters, numbers, underscores, and hyphens'
    ),

  validateSeatsLayout(),

  body('quality')
    .notEmpty()
    .withMessage('Hall quality is required')
    .isIn(VALID_QUALITIES)
    .withMessage(`Quality must be one of: ${VALID_QUALITIES.join(', ')}`),
];

export const validateMovieHallParams = [
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
    .isLength({ min: 1, max: 50 })
    .withMessage('Hall ID must be between 1 and 50 characters'),
];

export const validateTheaterIdParam = [
  param('theaterId')
    .trim()
    .notEmpty()
    .withMessage('Theater ID is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('Theater ID must be between 1 and 50 characters'),
];

export const validateQualityParam = [
  param('quality')
    .notEmpty()
    .withMessage('Quality is required')
    .isIn(VALID_QUALITIES)
    .withMessage(`Quality must be one of: ${VALID_QUALITIES.join(', ')}`),
];

export const validateUpdateMovieHall = [
  ...validateMovieHallParams,

  validateOptionalSeatsLayout(),

  body('quality')
    .optional()
    .isIn(VALID_QUALITIES)
    .withMessage(`Quality must be one of: ${VALID_QUALITIES.join(', ')}`),
];

export const validateListMovieHalls = [
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

  // Theater ID filter
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

  // Hall ID filter
  query('hallId')
    .optional()
    .custom((value) => {
      if (Array.isArray(value)) {
        if (value.length === 0) {
          throw new Error('Hall ID array cannot be empty');
        }
        value.forEach((id: string) => {
          if (!id || id.length > 50) {
            throw new Error('Each hall ID must be between 1 and 50 characters');
          }
        });
      } else if (typeof value === 'string') {
        if (value.length === 0 || value.length > 50) {
          throw new Error('Hall ID must be between 1 and 50 characters');
        }
      }
      return true;
    }),

  // Quality filter
  query('quality')
    .optional()
    .custom((value) => {
      if (Array.isArray(value)) {
        if (value.length === 0) {
          throw new Error('Quality array cannot be empty');
        }
        value.forEach((quality: string) => {
          if (!VALID_QUALITIES.includes(quality)) {
            throw new Error(
              `Each quality must be one of: ${VALID_QUALITIES.join(', ')}`
            );
          }
        });
      } else if (typeof value === 'string') {
        if (!VALID_QUALITIES.includes(value)) {
          throw new Error(
            `Quality must be one of: ${VALID_QUALITIES.join(', ')}`
          );
        }
      }
      return true;
    }),

  // Capacity filters
  query('minCapacity')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Minimum capacity must be between 1 and 10,000'),

  query('maxCapacity')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Maximum capacity must be between 1 and 10,000')
    .custom((value, { req }) => {
      const minCapacity = req.query?.minCapacity;
      if (minCapacity && parseInt(value) < parseInt(minCapacity as string)) {
        throw new Error(
          'Maximum capacity must be greater than minimum capacity'
        );
      }
      return true;
    }),

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
    .isIn(['createdAt', 'updatedAt', 'theaterId', 'hallId', 'quality'])
    .withMessage('Invalid sort field'),

  query('sortDir')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort direction must be asc or desc'),
];

export const validateSearchMovieHalls = [
  // Free-text search query
  query('q')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .trim()
    .escape()
    .withMessage('Search query too long'),

  // All the same validations as list halls
  ...validateListMovieHalls,
];

export const validateMultipleHalls = [
  body('halls')
    .notEmpty()
    .withMessage('Halls array is required')
    .isArray({ min: 1 })
    .withMessage('Halls must be a non-empty array'),

  body('halls.*.theaterId')
    .trim()
    .notEmpty()
    .withMessage('Theater ID is required for each hall')
    .isLength({ min: 1, max: 50 })
    .withMessage('Theater ID must be between 1 and 50 characters'),

  body('halls.*.hallId')
    .trim()
    .notEmpty()
    .withMessage('Hall ID is required for each hall')
    .isLength({ min: 1, max: 50 })
    .withMessage('Hall ID must be between 1 and 50 characters'),
];

export const validateHallQualities = [
  body('qualities')
    .notEmpty()
    .withMessage('Qualities array is required')
    .isArray({ min: 1 })
    .withMessage('Qualities must be a non-empty array'),

  body('qualities.*')
    .isIn(VALID_QUALITIES)
    .withMessage(`Each quality must be one of: ${VALID_QUALITIES.join(', ')}`),
];

export const validateHallLayout = [validateSeatsLayout()];
