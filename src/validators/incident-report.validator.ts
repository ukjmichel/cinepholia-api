import { body, param, query } from 'express-validator';

/**
 * Validator for creating a new incident report
 */
export const createIncidentReportValidator = [
  body('theaterId')
    .notEmpty()
    .withMessage('Theater ID is required')
    .isString()
    .withMessage('Theater ID must be a string')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Theater ID must be between 1 and 50 characters'),

  body('hallId')
    .notEmpty()
    .withMessage('Hall ID is required')
    .isString()
    .withMessage('Hall ID must be a string')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Hall ID must be between 1 and 50 characters'),

  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isString()
    .withMessage('Title must be a string')
    .trim()
    .isLength({ min: 3, max: 255 })
    .withMessage('Title must be between 3 and 255 characters')
    .matches(/^[^<>]*$/)
    .withMessage('Title cannot contain HTML tags'),

  body('description')
    .notEmpty()
    .withMessage('Description is required')
    .isString()
    .withMessage('Description must be a string')
    .trim()
    .isLength({ min: 5, max: 2000 })
    .withMessage('Description must be between 5 and 2000 characters')
    .matches(/^[^<>]*$/)
    .withMessage('Description cannot contain HTML tags'),

  body('status')
    .optional()
    .isIn(['pending', 'in_progress', 'fulfilled'])
    .withMessage('Status must be one of: pending, in_progress, fulfilled'),

  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be a valid ISO 8601 date')
    .custom((value) => {
      const date = new Date(value);
      const now = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      if (date > now) {
        throw new Error('Incident date cannot be in the future');
      }
      if (date < oneYearAgo) {
        throw new Error('Incident date cannot be more than one year ago');
      }
      return true;
    }),

  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isUUID(4)
    .withMessage('User ID must be a valid UUID'),
];

/**
 * Validator for updating an incident report
 */
export const updateIncidentReportValidator = [
  body('title')
    .optional()
    .isString()
    .withMessage('Title must be a string')
    .trim()
    .isLength({ min: 3, max: 255 })
    .withMessage('Title must be between 3 and 255 characters')
    .matches(/^[^<>]*$/)
    .withMessage('Title cannot contain HTML tags'),

  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string')
    .trim()
    .isLength({ min: 5, max: 2000 })
    .withMessage('Description must be between 5 and 2000 characters')
    .matches(/^[^<>]*$/)
    .withMessage('Description cannot contain HTML tags'),

  body('status')
    .optional()
    .isIn(['pending', 'in_progress', 'fulfilled'])
    .withMessage('Status must be one of: pending, in_progress, fulfilled'),

  body('theaterId')
    .optional()
    .isString()
    .withMessage('Theater ID must be a string')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Theater ID must be between 1 and 50 characters'),

  body('hallId')
    .optional()
    .isString()
    .withMessage('Hall ID must be a string')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Hall ID must be between 1 and 50 characters'),

  body('userId')
    .optional()
    .isUUID(4)
    .withMessage('User ID must be a valid UUID'),
];

/**
 * Validator for incident report ID parameter
 */
export const incidentReportIdParamValidator = [
  param('incidentId')
    .notEmpty()
    .withMessage('Incident ID is required')
    .isUUID(4)
    .withMessage('Incident ID must be a valid UUID'),
];

/**
 * Validator for theater ID parameter
 */
export const theaterIdParamValidator = [
  param('theaterId')
    .notEmpty()
    .withMessage('Theater ID is required')
    .isString()
    .withMessage('Theater ID must be a string')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Theater ID must be between 1 and 50 characters'),
];

/**
 * Validator for hall ID parameter
 */
export const hallIdParamValidator = [
  param('hallId')
    .notEmpty()
    .withMessage('Hall ID is required')
    .isString()
    .withMessage('Hall ID must be a string')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Hall ID must be between 1 and 50 characters'),
];

/**
 * Validator for incident report status parameter
 */
export const incidentReportStatusParamValidator = [
  param('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['pending', 'in_progress', 'fulfilled'])
    .withMessage('Status must be one of: pending, in_progress, fulfilled'),
];

/**
 * Validator for updating incident report status
 */
export const updateIncidentReportStatusValidator = [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['pending', 'in_progress', 'fulfilled'])
    .withMessage('Status must be one of: pending, in_progress, fulfilled'),
];

/**
 * Validator for searching incident reports
 */
export const searchIncidentReportValidator = [
  query('title')
    .optional()
    .isString()
    .withMessage('Title must be a string')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Title search term must be between 1 and 255 characters'),

  query('description')
    .optional()
    .isString()
    .withMessage('Description must be a string')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage(
      'Description search term must be between 1 and 255 characters'
    ),

  query('status')
    .optional()
    .isIn(['pending', 'in_progress', 'fulfilled'])
    .withMessage('Status must be one of: pending, in_progress, fulfilled'),

  query('theaterId')
    .optional()
    .isString()
    .withMessage('Theater ID must be a string')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Theater ID must be between 1 and 50 characters'),

  query('hallId')
    .optional()
    .isString()
    .withMessage('Hall ID must be a string')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Hall ID must be between 1 and 50 characters'),

  query('userId')
    .optional()
    .isUUID(4)
    .withMessage('User ID must be a valid UUID'),

  query('dateFrom')
    .optional()
    .isISO8601()
    .withMessage('Date from must be a valid ISO 8601 date'),

  query('dateTo')
    .optional()
    .isISO8601()
    .withMessage('Date to must be a valid ISO 8601 date'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be an integer between 1 and 100'),

  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer'),

  // Custom validation to ensure at least one search parameter is provided
  query().custom((value, { req }) => {
    const {
      title,
      description,
      status,
      theaterId,
      hallId,
      userId,
      dateFrom,
      dateTo,
    } = (req.query || {}) as Record<string, any>;

    const hasSearchParam =
      title ||
      description ||
      status ||
      theaterId ||
      hallId ||
      userId ||
      dateFrom ||
      dateTo;

    if (!hasSearchParam) {
      throw new Error('At least one search parameter is required');
    }

    return true;
  }),

  // Custom validation for date range
  query('dateTo')
    .optional()
    .custom((value, { req }) => {
      const { dateFrom } = (req.query || {}) as Record<string, any>;
      if (dateFrom && value) {
        const fromDate = new Date(dateFrom as string);
        const toDate = new Date(value);

        if (toDate < fromDate) {
          throw new Error('Date to must be after date from');
        }
      }
      return true;
    }),
];

/**
 * Validator for pagination query parameters
 */
export const paginationValidator = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be an integer between 1 and 100'),

  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer'),
];

/**
 * Validator for statistics query parameters
 */
export const statisticsValidator = [
  query('theaterId')
    .optional()
    .isString()
    .withMessage('Theater ID must be a string')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Theater ID must be between 1 and 50 characters'),
];
