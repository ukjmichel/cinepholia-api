/**
 * Controller for password reset tokens management.
 *
 * Provides the following Express endpoints:
 * - Send a password reset code to the user's email (user enumeration safe).
 * - Middleware to validate a reset token.
 * - Reset password using a valid token.
 *
 * Main features:
 * - Secure generation and storage of 'reset_password' tokens.
 * - Sending one-time codes by email, with expiration.
 * - Verifying user-provided code/token.
 * - Atomic password reset and token invalidation after use.
 *
 * Error handling:
 * - Throws BadRequestError for missing or invalid input.
 * - Delegates other errors to Express error middleware.
 *
 * Security:
 * - Never reveals if an email exists in the database (prevents enumeration).
 *
 * Dependencies:
 * - UserModel, UserTokenService, EmailService, UserService.
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
 * Controller for sending a reset password code to user's email.
 * If the email exists, a code is generated, stored, and sent.
 * Always responds with the same message to prevent user enumeration.
 *
 * @param {Request} req - Express request object (body: { email })
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express middleware
 * @returns {Promise<any>} Message indicating code delivery if the email exists
 */
export const sendResetPasswordToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    // Look up user (case-insensitive)
    const user = await UserModel.findOne({
      where: { email: email.trim().toLowerCase() },
    });

    // Always return same response to prevent user enumeration
    const genericMessage =
      'If this email is registered, you will receive a code.';
    if (!user) {
      return res.status(200).json({
        message: genericMessage,
      });
    }

    // Generate code and expiration
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store code as a token
    await userTokenService.createOrReplaceToken({
      userId: user.userId,
      token: code,
      type: 'reset_password',
      expiresAt,
    });

    // Send email
    await emailService.sendResetPasswordEmail(user.email, user.username, code);

    return res.status(200).json({
      message: genericMessage,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Middleware to validate the provided token (configurable type).
 * Checks if the token in the request body is valid for the expected type.
 *
 * @param {UserTokenType} tokenType - The type of token to validate ('reset_password', etc.)
 * @returns {(req, res, next) => Promise<void>} Express middleware
 */
export const validateTokenValidity =
  (tokenType: UserTokenType) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.body;
      if (!token) {
        return next(new BadRequestError('Token is required.'));
      }
      await userTokenService.validateToken(token, tokenType);

      res.json({ message: 'Token is valid.' });
    } catch (error) {
      next(error);
    }
  };

/**
 * Resets the user's password using a valid reset token.
 * Validates the token, updates the password, and invalidates the token.
 *
 * @param {Request} req - Express request object (body: { token, password })
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express middleware
 * @returns {Promise<void>} Success message or error
 */
export const resetPasswordController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return next(new BadRequestError('Token and new password are required.'));
    }

    // Validate token (must be 'reset_password' type)
    const tokenInstance = await userTokenService.validateToken(
      token,
      'reset_password'
    );

    // Update user password
    await userService.changePassword(tokenInstance.userId, password);

    // Invalidate/delete token after use
    await userTokenService.deleteTokenForUser(tokenInstance.userId);

    res.json({ message: 'Password has been reset.' });
  } catch (err) {
    next(err);
  }
};
