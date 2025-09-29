import { Router, Request, Response, NextFunction } from 'express';
import { userTokenController } from '../controllers/user-token.controller.js';
import { validationResult } from 'express-validator';
import {
  decodeJwtToken,
  requireAdmin,
  requireAuthenticated,
  requireSelfOrAdmin,
} from '../middlewares/auth.middleware.js';
import {
  validateSendResetToken,
  validateTokenValidation,
  validateResetPassword,
  validateUserIdParam,
  validateTokenTypeParam,
  validateListTokens,
  validateCreateToken,
  validateUpdateToken,
} from '../validators/user-token.validator.js';

const userTokenRouter = Router();

// Middleware to handle validation errors

/* =============== PUBLIC ROUTES (Password Reset Flow) =============== */

/**
 * Send password reset token to email
 * @route POST /auth/password-reset/send
 * @access Public
 */
userTokenRouter.post(
  '/send-reset',
  validateSendResetToken,
  userTokenController.sendResetPasswordToken
);

/**
 * Validate a password reset token
 * @route POST /auth/password-reset/validate
 * @access Public
 */
userTokenRouter.post(
  '/validate-reset',
  validateTokenValidation,
  userTokenController.validateTokenValidity('reset_password')
);

/**
 * Reset password using token
 * @route POST /auth/password-reset/confirm
 * @access Public
 */
userTokenRouter.post(
  '/reset-password',
  validateResetPassword,
  userTokenController.resetPassword
);

/* =============== ADMIN ROUTES =============== */

/**
 * List all tokens with pagination and filters
 * @route GET /api/user-tokens
 * @access Admin
 */
userTokenRouter.get(
  '/',
  decodeJwtToken,
  requireAdmin,
  validateListTokens,
  userTokenController.listTokens
);

/**
 * Create a new token (admin only)
 * @route POST /api/user-tokens
 * @access Admin
 */
userTokenRouter.post(
  '/',
  decodeJwtToken,
  requireAdmin,
  validateCreateToken,
  userTokenController.createToken
);

/**
 * Get expired tokens
 * @route GET /api/user-tokens/expired
 * @access Admin
 */
userTokenRouter.get(
  '/expired',
  decodeJwtToken,
  requireAdmin,
  validateListTokens,
  userTokenController.getExpiredTokens
);

/**
 * Delete all expired tokens
 * @route DELETE /api/user-tokens/expired
 * @access Admin
 */
userTokenRouter.delete(
  '/expired',
  decodeJwtToken,
  requireAdmin,
  userTokenController.deleteExpiredTokens
);

/**
 * Get tokens by type
 * @route GET /api/user-tokens/type/:type
 * @access Admin
 */
userTokenRouter.get(
  '/type/:type',
  decodeJwtToken,
  requireAdmin,
  validateTokenTypeParam,
  validateListTokens,
  userTokenController.getTokensByType
);

/**
 * Get token by user ID
 * @route GET /api/user-tokens/:userId
 * @access Admin or Owner
 */
userTokenRouter.get(
  '/:userId',
  decodeJwtToken,
  requireAuthenticated,
  validateUserIdParam,
  userTokenController.getTokenByUserId
);

/**
 * Update token for a user
 * @route PATCH /api/user-tokens/:userId
 * @access Admin
 */
userTokenRouter.patch(
  '/:userId',
  decodeJwtToken,
  requireAdmin,
  validateUpdateToken,
  userTokenController.updateToken
);

/**
 * Delete token for a user
 * @route DELETE /api/user-tokens/:userId
 * @access Admin or Owner
 */
userTokenRouter.delete(
  '/:userId',
  decodeJwtToken,
  requireAuthenticated,
  validateUserIdParam,
  userTokenController.deleteToken
);

export default userTokenRouter;
