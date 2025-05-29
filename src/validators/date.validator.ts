import { param } from 'express-validator';

export const dateParamValidator = [
  param('date')
    .exists({ checkFalsy: true })
    .withMessage('date parameter is required')
    .isISO8601({ strict: true, strictSeparator: true })
    .withMessage('date must be a valid ISO8601 date (YYYY-MM-DD)')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('date must be in YYYY-MM-DD format'),
];
