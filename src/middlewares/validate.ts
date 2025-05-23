import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

export const validate = (
  req: Request,
  res: Response,
  next: NextFunction
): any => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation error',
      errors: errors.array(),
      data: null,
    });
  }
  next();
};
