import { body, param, ValidationChain, validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";

// Shared seat object validators
const seatObjectValidators: ValidationChain[] = [
  body("seats").isArray({ min: 1 }).withMessage("seats must be a non-empty array"),
  body("seats.*.seatRow")
    .isInt({ min: 1 })
    .withMessage("seatRow must be an integer >= 1"),
  body("seats.*.seatNumber")
    .isInt({ min: 1 })
    .withMessage("seatNumber must be an integer >= 1"),
  body("seats.*.price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("price must be a positive number"),
];

export const createBookingRules: ValidationChain[] = [
  body("userId").isUUID().withMessage("userId must be a valid UUID"),
  body("screeningId").isUUID().withMessage("screeningId must be a valid UUID"),
  body("totalPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("totalPrice must be a positive number"),
  ...seatObjectValidators,
];

export const updateBookingSeatsRules: ValidationChain[] = [
  param("id").isUUID().withMessage("id must be a valid UUID"),
  body("totalPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("totalPrice must be a positive number"),
  ...seatObjectValidators,
];

export const deleteBookingRules: ValidationChain[] = [
  param("id").isUUID().withMessage("id must be a valid UUID"),
];

export function handleValidationErrors(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  return next();
}
