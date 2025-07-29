import { Router } from 'express';
import {
  sendResetPasswordToken,
  validateTokenValidity,
  resetPasswordController,
} from '../controllers/user-token.controller.js';
import {
  validateSendResetPasswordToken,
  validateCheckResetPasswordToken,
  validateConfirmResetPassword,
} from '../validators/user-token.validator.js';
import { validate } from '../middlewares/validate.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Password Reset
 *   description: Endpoints for requesting, validating, and confirming password resets.
 */

/**
 * @swagger
 * /auth/password-reset/request:
 *   post:
 *     summary: Request a password reset code
 *     tags: [Password Reset]
 *     description: |
 *       Generates and sends a 6-digit password reset code to the user's email.
 *       - Always returns a generic message to prevent user enumeration.
 *       - Enforces a **rate limit** (e.g., one request every 2 minutes per user).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Generic success message (even if the user does not exist).
 *       429:
 *         description: Too many requests (rate limit enforced).
 */
router.post(
  '/password-reset/request',
  validateSendResetPasswordToken,
  validate,
  sendResetPasswordToken
);

/**
 * @swagger
 * /auth/password-reset/validate:
 *   post:
 *     summary: Validate a password reset token
 *     tags: [Password Reset]
 *     description: |
 *       Validates a provided 6-digit code.
 *       - Increments failed attempts counter on invalid codes.
 *       - Blocks validation if the max attempts (5) is reached.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Token is valid.
 *       400:
 *         description: Invalid or expired token.
 *       429:
 *         description: Too many invalid attempts, request a new code.
 */
router.post(
  '/password-reset/validate',
  validateCheckResetPasswordToken,
  validate,
  validateTokenValidity()
);

/**
 * @swagger
 * /auth/password-reset/confirm:
 *   post:
 *     summary: Confirm password reset using a valid token
 *     tags: [Password Reset]
 *     description: |
 *       Resets the user's password if the provided token is valid.
 *       - Deletes the token after successful password reset.
 *       - Returns an error if token is invalid, expired, or max attempts exceeded.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *                 example: "123456"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: StrongPass123!
 *     responses:
 *       200:
 *         description: Password has been successfully reset.
 *       400:
 *         description: Invalid or expired token, or missing fields.
 *       429:
 *         description: Too many invalid attempts, request a new code.
 */
router.post(
  '/password-reset/confirm',
  validateConfirmResetPassword,
  validate,
  resetPasswordController
);

export default router;
