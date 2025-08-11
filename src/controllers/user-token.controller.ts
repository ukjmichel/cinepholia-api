/**
 * @module controllers/password-reset.controller
 *
 * Controller for managing password reset tokens and password reset flow.
 *
 * Features:
 * - Secure generation and storage of `reset_password` tokens.
 * - Sending one-time 6-digit codes by email with expiration.
 * - Token validation middleware.
 * - Atomic password reset with token invalidation after use.
 *
 * Security:
 * - Prevents user enumeration by returning a generic success message whether or not the email exists.
 *
 * Error Handling:
 * - Throws `BadRequestError` for missing or invalid input.
 * - Forwards other errors to Express error middleware.
 */

import { Request, Response, NextFunction } from 'express';
import { UserTokenService } from '../services/user-token.service.js';
import { EmailService } from '../services/email.service.js';
import { UserModel } from '../models/user.model.js';
import { UserTokenType } from '../models/user-token.model.js';
import { BadRequestError } from '../errors/bad-request-error.js';
import { UserService } from '../services/user.service.js';

const emailService = new EmailService();
const userTokenService = new UserTokenService();
const userService = new UserService();

/**
 * Send a password reset code to the provided email.
 * If the email exists, a token is generated, stored, and emailed.
 * Always returns the same response to avoid revealing if the email is registered.
 *
 * @route POST /auth/password-reset/send
 * @param {Request} req - Express request (body: `{ email }`)
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express error handler
 * @returns {200 OK} `{ message, data: null }` Generic success message
 */
export const sendResetPasswordToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { email } = req.body;
    if (!email) {
      return next(new BadRequestError('Email is required.'));
    }

    // Look up user (case-insensitive)
    const user = await UserModel.findOne({
      where: { email: email.trim().toLowerCase() },
    });

    // Generic message to prevent user enumeration
    const genericMessage =
      'If this email is registered, you will receive a code.';

    if (!user) {
      return res.status(200).json({ message: genericMessage, data: null });
    }

    // Generate 6-digit code and set expiration (1 hour)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Store code as token
    await userTokenService.createOrReplaceToken({
      userId: user.userId,
      token: code,
      type: 'reset_password',
      expiresAt,
    });

    // Send email with the code
    await emailService.sendResetPasswordEmail(user.email, user.username, code);

    return res.status(200).json({ message: genericMessage, data: null });
  } catch (err) {
    next(err);
  }
};

/**
 * Middleware to validate if a provided token is valid for a given type.
 *
 * @param {UserTokenType} tokenType - Token type to validate (e.g. `reset_password`)
 * @returns {Function} Express middleware function
 *
 * @example
 * router.post('/auth/password-reset/validate', validateTokenValidity('reset_password'));
 */
export const validateTokenValidity =
  (tokenType: UserTokenType) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token } = req.body;
      if (!token) {
        return next(new BadRequestError('Token is required.'));
      }

      await userTokenService.validateToken(token, tokenType);

      res.status(200).json({ message: 'Token is valid.', data: null });
    } catch (error) {
      next(error);
    }
  };

/**
 * Reset the user's password using a valid reset token.
 * - Validates the token
 * - Updates the user's password
 * - Deletes the token after use
 *
 * @route POST /auth/password-reset/confirm
 * @param {Request} req - Express request (body: `{ token, password }`)
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express error handler
 * @returns {200 OK} `{ message, data: null }`
 */
export const resetPasswordController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return next(new BadRequestError('Token and new password are required.'));
    }

    // Validate token (must be reset_password type)
    const tokenInstance = await userTokenService.validateToken(
      token,
      'reset_password'
    );

    // Update password
    await userService.changePassword(tokenInstance.userId, password);

    // Delete token after successful password change
    await userTokenService.deleteTokenForUser(tokenInstance.userId);

    res.status(200).json({ message: 'Password has been reset.', data: null });
  } catch (err) {
    next(err);
  }
};
