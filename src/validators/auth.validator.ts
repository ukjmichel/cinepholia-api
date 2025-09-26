// src/validators/auth.validator.ts
import { body, cookie } from 'express-validator';

export const validateLogin = [
  body('emailOrUsername')
    .trim()
    .notEmpty()
    .withMessage('Email or username is required')
    .isLength({ max: 254 })
    .withMessage('emailOrUsername is too long'),
  body('password')
    .isString()
    .withMessage('Password must be a string')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

export const validateRefreshCookie = [
  cookie('refreshToken').notEmpty().withMessage('Missing refresh token cookie'),
];

export const validateLogout = [cookie('refreshToken').optional().isString()];
