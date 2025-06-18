import { body } from 'express-validator';

export const contactMessageValidator = [
  body('theaterId')
    .notEmpty()
    .withMessage('Theater ID is required.')
    .isString()
    .withMessage('Theater ID must be a string.'),
  body('email')
    .notEmpty()
    .withMessage('Email is required.')
    .isEmail()
    .withMessage('Email must be a valid email address.'),
  body('message')
    .notEmpty()
    .withMessage('Message is required.')
    .isString()
    .withMessage('Message must be a string.'),
];
