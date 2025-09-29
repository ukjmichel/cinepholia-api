import { body, param, query } from 'express-validator';

export const validateSendResetToken = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email address'),
];

export const validateTokenValidation = [
  body('token')
    .notEmpty()
    .withMessage('Token is required')
    .isString()
    .withMessage('Token must be a string')
    .isLength({ min: 6, max: 256 })
    .withMessage('Token must be between 6 and 256 characters'),
];

export const validateResetPassword = [
  body('token')
    .notEmpty()
    .withMessage('Token is required')
    .isString()
    .withMessage('Token must be a string'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

export const validateUserIdParam = [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isUUID()
    .withMessage('User ID must be a valid UUID'),
];

export const validateTokenTypeParam = [
  param('type')
    .notEmpty()
    .withMessage('Token type is required')
    .isIn(['verify_email', 'reset_password', '2fa'])
    .withMessage('Token type must be verify_email, reset_password, or 2fa'),
];

export const validateListTokens = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('pageSize')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Page size must be between 1 and 100'),
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'expiresAt', 'attempts'])
    .withMessage('Sort by must be a valid field'),
  query('sortDir')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort direction must be asc or desc'),

  // Filters
  query('userId')
    .optional()
    .isUUID()
    .withMessage('User ID filter must be a valid UUID'),
  query('type')
    .optional()
    .isIn(['verify_email', 'reset_password', '2fa'])
    .withMessage('Type filter must be verify_email, reset_password, or 2fa'),
  query('expired')
    .optional()
    .isBoolean()
    .withMessage('Expired filter must be boolean'),
  query('expiresFrom')
    .optional()
    .isISO8601()
    .withMessage('Expires from must be a valid ISO 8601 date'),
  query('expiresTo')
    .optional()
    .isISO8601()
    .withMessage('Expires to must be a valid ISO 8601 date'),
  query('minAttempts')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Min attempts must be a non-negative integer'),
  query('maxAttempts')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Max attempts must be a non-negative integer'),
  query('hasLastRequest')
    .optional()
    .isBoolean()
    .withMessage('Has last request filter must be boolean'),
  query('lastRequestFrom')
    .optional()
    .isISO8601()
    .withMessage('Last request from must be a valid ISO 8601 date'),
  query('lastRequestTo')
    .optional()
    .isISO8601()
    .withMessage('Last request to must be a valid ISO 8601 date'),
];

export const validateCreateToken = [
  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isUUID()
    .withMessage('User ID must be a valid UUID'),
  body('type')
    .notEmpty()
    .withMessage('Token type is required')
    .isIn(['verify_email', 'reset_password', '2fa'])
    .withMessage('Token type must be verify_email, reset_password, or 2fa'),
  body('token')
    .notEmpty()
    .withMessage('Token is required')
    .isString()
    .withMessage('Token must be a string'),
  body('expiresAt')
    .notEmpty()
    .withMessage('Expiration date is required')
    .isISO8601()
    .withMessage('Expiration date must be a valid ISO 8601 date'),
  body('attempts')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Attempts must be a non-negative integer'),
];

export const validateUpdateToken = [
  ...validateUserIdParam,
  body('type')
    .optional()
    .isIn(['verify_email', 'reset_password', '2fa'])
    .withMessage('Token type must be verify_email, reset_password, or 2fa'),
  body('token').optional().isString().withMessage('Token must be a string'),
  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('Expiration date must be a valid ISO 8601 date'),
  body('attempts')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Attempts must be a non-negative integer'),
  body('lastRequestAt')
    .optional()
    .isISO8601()
    .withMessage('Last request at must be a valid ISO 8601 date'),
];
