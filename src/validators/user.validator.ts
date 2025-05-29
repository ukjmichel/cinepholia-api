import { body, param, query } from 'express-validator';

export const validateCreateUser = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 2, max: 20 })
    .withMessage('Username must be 2-20 characters')
    .matches(/^[a-zA-Z0-9]+$/)
    .withMessage('Username must be alphanumeric'),
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 2, max: 30 })
    .withMessage('First name must be 2-30 characters'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 2, max: 30 })
    .withMessage('Last name must be 2-30 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('role')
    .optional()
    .isIn(['utilisateur', 'employé', 'administrateur'])
    .withMessage('Role is invalid'),
];

export const validateUserIdParam = [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isUUID()
    .withMessage('User ID must be a valid UUID'),
];

export const validateUpdateUser = [
  ...validateUserIdParam,
  body('username').optional().isLength({ min: 2, max: 20 }),
  body('firstName').optional().isLength({ min: 2, max: 30 }),
  body('lastName').optional().isLength({ min: 2, max: 30 }),
  body('email').optional().isEmail(),
  // No password allowed here
];

export const validateChangePassword = [
  ...validateUserIdParam,
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

export const validateListUsers = [
  query('page').optional().isInt({ min: 1 }),
  query('pageSize').optional().isInt({ min: 1, max: 100 }),
  query('username').optional().isString(),
  query('email').optional().isString(),
  query('verified').optional().isBoolean().toBoolean(),
];

export const validateVerifyUser = validateUserIdParam;

export const validateDeleteUser = validateUserIdParam;

export const validateValidatePassword = [
  body('emailOrUsername')
    .notEmpty()
    .withMessage('Email or username is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const userIdParamValidator = [
  param('userId').isUUID().withMessage('userId must be a valid UUID'),
];