/**
 * Controller for password reset token management.
 *
 * Endpoints:
 * - Send a password reset token to a user's email.
 * - Validate a provided reset token.
 * - Reset a user's password using a valid token.
 *
 * Security:
 * - Responses are user enumeration safe.
 * - Tokens are hashed in DB, single-use, and deleted after password reset.
 */

import { Request, Response, NextFunction } from 'express';
import { UserTokenService } from '../services/user-token.service.js';
import { EmailService } from '../services/email.service.js';
import { UserModel } from '../models/user.model.js';
import { BadRequestError } from '../errors/bad-request-error.js';
import { UserService } from '../services/user.service.js';

const emailService = new EmailService();
const userService = new UserService();

/**
 * Sends a password reset code to the user's email.
 *
 * - Always responds with a generic message, whether the user exists or not.
 * - Uses `UserTokenService` to enforce rate limiting and hashing.
 * - Sends the raw 6-digit code by email to the user.
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

    const user = await UserModel.findOne({
      where: { email: email.trim().toLowerCase() },
    });

    const genericMessage =
      'If this email is registered, you will receive a reset code.';

    // If user not found → respond with generic message
    if (!user) {
      return res.status(200).json({ message: genericMessage });
    }

    try {
      // ✅ Service generates + hashes token and enforces rate limit
      const code = await UserTokenService.createPasswordResetToken(
        user.userId,
        60 // token expires in 60 minutes
      );

      // ✅ Send raw code via email
      await emailService.sendResetPasswordEmail(
        user.email,
        user.username,
        code
      );
    } catch (err: any) {
      // ✅ Handle rate limit error gracefully
      if (err.message.includes('wait')) {
        return res.status(429).json({ message: err.message });
      }
      throw err;
    }

    return res.status(200).json({ message: genericMessage });
  } catch (err) {
    next(err);
  }
};

/**
 * Middleware to validate a password reset token.
 *
 * - Validates that the token exists, is not expired, and has not exceeded max attempts.
 * - Increments attempt counter on failures.
 */
export const validateTokenValidity =
  () =>
  async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
      const { token } = req.body;
      if (!token) {
        return next(new BadRequestError('Token is required.'));
      }

      try {
        const record = await UserTokenService.validatePasswordResetToken(token);
        if (!record) {
          return next(new BadRequestError('Invalid or expired token.'));
        }
        return res.json({ message: 'Token is valid.' });
      } catch (err: any) {
        // ✅ Handle max attempts exceeded
        if (err.message.includes('Too many invalid attempts')) {
          return res.status(429).json({ message: err.message });
        }
        throw err;
      }
    } catch (error) {
      next(error);
    }
  };

/**
 * Resets the user's password using a valid reset token.
 *
 * - Validates the token with attempt tracking.
 * - Updates the user's password via `UserService`.
 * - Deletes the token after successful password reset.
 */
export const resetPasswordController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return next(new BadRequestError('Token and new password are required.'));
    }

    let tokenRecord;
    try {
      tokenRecord = await UserTokenService.validatePasswordResetToken(token);
      if (!tokenRecord) {
        return next(new BadRequestError('Invalid or expired token.'));
      }
    } catch (err: any) {
      if (err.message.includes('Too many invalid attempts')) {
        return res.status(429).json({ message: err.message });
      }
      throw err;
    }

    // ✅ Update password
    await userService.changePassword(tokenRecord.userId, password);

    // ✅ Consume (delete) token
    await UserTokenService.consumePasswordResetToken(tokenRecord.userId);

    return res.json({ message: 'Password has been reset.' });
  } catch (err) {
    next(err);
  }
};
