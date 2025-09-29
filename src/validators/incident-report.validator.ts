import { body, param, query } from 'express-validator';

// Valid incident status values
const VALID_STATUSES = [
  'open',
  'acknowledged',
  'in_progress',
  'resolved',
  'closed',
];

// Regex for theater/hall IDs (alphanumeric, underscores, hyphens)
const ID_REGEX = /^[a-zA-Z0-9_-]+$/;

export const validateCreateIncident = [
  body('incidentId')
    .optional()
    .isUUID()
    .withMessage('Incident ID must be a valid UUID'),

  body('theaterId')
    .trim()
    .notEmpty()
    .withMessage('Theater ID is required')
    .isLength({ min: 2, max: 36 })
    .withMessage('Theater ID must be between 2 and 36 characters')
    .matches(ID_REGEX)
    .withMessage(
      'Theater ID must contain only letters, numbers, underscores, or hyphens'
    ),

  body('hallId')
    .trim()
    .notEmpty()
    .withMessage('Hall ID is required')
    .isLength({ min: 1, max: 16 })
    .withMessage('Hall ID must be between 1 and 16 characters')
    .matches(ID_REGEX)
    .withMessage(
      'Hall ID must contain only letters, numbers, underscores, or hyphens'
    ),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 1, max: 5000 })
    .withMessage('Description must be between 1 and 5000 characters'),

  body('status')
    .optional()
    .isIn(VALID_STATUSES)
    .withMessage(`Status must be one of: ${VALID_STATUSES.join(', ')}`),

  body('createdBy')
    .notEmpty()
    .withMessage('Created by is required')
    .isUUID()
    .withMessage('Created by must be a valid UUID'),
];

export const validateIncidentIdParam = [
  param('incidentId')
    .notEmpty()
    .withMessage('Incident ID is required')
    .isUUID()
    .withMessage('Incident ID must be a valid UUID'),
];

export const validateStatusParam = [
  param('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(VALID_STATUSES)
    .withMessage(`Status must be one of: ${VALID_STATUSES.join(', ')}`),
];

export const validateUpdateIncident = [
  ...validateIncidentIdParam,

  body('incidentId')
    .not()
    .exists()
    .withMessage('Incident ID cannot be updated (immutable field)'),

  body('theaterId')
    .optional()
    .trim()
    .isLength({ min: 2, max: 36 })
    .withMessage('Theater ID must be between 2 and 36 characters')
    .matches(ID_REGEX)
    .withMessage(
      'Theater ID must contain only letters, numbers, underscores, or hyphens'
    ),

  body('hallId')
    .optional()
    .trim()
    .isLength({ min: 1, max: 16 })
    .withMessage('Hall ID must be between 1 and 16 characters')
    .matches(ID_REGEX)
    .withMessage(
      'Hall ID must contain only letters, numbers, underscores, or hyphens'
    ),

  body('description')
    .optional()
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Description must be between 1 and 5000 characters'),

  body('status')
    .optional()
    .isIn(VALID_STATUSES)
    .withMessage(`Status must be one of: ${VALID_STATUSES.join(', ')}`),

  body('createdBy')
    .not()
    .exists()
    .withMessage('Created by cannot be updated (immutable field)'),
];

export const validateListIncidents = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('pageSize')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Page size must be between 1 and 100'),

  query('incidentId')
    .optional()
    .isUUID()
    .withMessage('Incident ID must be a valid UUID'),

  query('status')
    .optional()
    .isIn(VALID_STATUSES)
    .withMessage(`Status must be one of: ${VALID_STATUSES.join(', ')}`),

  query('theaterId')
    .optional()
    .trim()
    .isLength({ min: 2, max: 36 })
    .withMessage('Theater ID must be between 2 and 36 characters')
    .matches(ID_REGEX)
    .withMessage(
      'Theater ID must contain only letters, numbers, underscores, or hyphens'
    ),

  query('hallId')
    .optional()
    .trim()
    .isLength({ min: 1, max: 16 })
    .withMessage('Hall ID must be between 1 and 16 characters')
    .matches(ID_REGEX)
    .withMessage(
      'Hall ID must contain only letters, numbers, underscores, or hyphens'
    ),

  query('createdBy')
    .optional()
    .isUUID()
    .withMessage('Created by must be a valid UUID'),

  query('createdAtFrom')
    .optional()
    .isISO8601()
    .withMessage('Created from must be a valid date'),

  query('createdAtTo')
    .optional()
    .isISO8601()
    .withMessage('Created to must be a valid date'),

  query('updatedAtFrom')
    .optional()
    .isISO8601()
    .withMessage('Updated from must be a valid date'),

  query('updatedAtTo')
    .optional()
    .isISO8601()
    .withMessage('Updated to must be a valid date'),

  query('sortBy')
    .optional()
    .isIn([
      'createdAt',
      'updatedAt',
      'status',
      'theaterId',
      'hallId',
      'incidentId',
    ])
    .withMessage('Invalid sort field'),

  query('sortDir')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort direction must be asc or desc'),
];

export const validateSearchIncidents = [
  // Free-text search query
  query('q')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .trim()
    .escape()
    .withMessage('Search query too long'),

  // Include all list validation rules
  ...validateListIncidents,
];
