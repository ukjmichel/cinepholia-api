import { body } from 'express-validator';

// Requesting a reset token
export const validateSendResetPasswordToken = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required.')
    .isEmail()
    .withMessage('Invalid email address.'),
];

// Checking the token validity
export const validateCheckResetPasswordToken = [
  body('token')
    .notEmpty()
    .withMessage('Token is required.')
    .isString()
    .withMessage('Token must be a string.'),
];

// Confirming the password reset
export const validateConfirmResetPassword = [
  body('token')
    .notEmpty()
    .withMessage('Token is required.')
    .isString()
    .withMessage('Token must be a string.'),
  body('password')
    .notEmpty()
    .withMessage('Password is required.')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long.'),
  // You can add more password rules (uppercase, numbers, etc.)
];
