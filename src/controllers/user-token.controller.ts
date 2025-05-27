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
 * Sends a reset password code to the user's email if the email exists.
 * Always responds with a generic message to prevent user enumeration.
 *
 * @param {Request} req - Express request object (expects { email } in body)
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<any>} Sends a JSON message about code delivery.
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

    // Find user by email (case-insensitive, trimmed)
    const user = await UserModel.findOne({
      where: { email: email.trim().toLowerCase() },
    });
    // Always send the same response, don't leak if user exists or not
    if (!user) {
      return res.status(200).json({
        message: 'If this email is registered, you will receive a code.',
      });
    }

    // Generate code and expiration
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store code as token
    await userTokenService.createOrReplaceToken({
      userId: user.userId,
      token: code,
      type: 'reset_password',
      expiresAt,
    });

    // Send email
    await emailService.sendResetPasswordEmail(user.email, user.username, code);

    return res.status(200).json({
      message: 'If this email is registered, you will receive a code.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Returns a middleware that validates the provided token (by type).
 *
 * @param {UserTokenType} tokenType - The type of token to validate
 * @returns {(req, res, next) => Promise<void>} Express middleware function
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
 *
 * @param {Request} req - Express request object (expects { token, password } in body)
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<void>} Sends a JSON message on success.
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

    // Validate token and type
    const tokenInstance = await userTokenService.validateToken(
      token,
      'reset_password'
    );

    // Update user password
    await userService.changePassword(tokenInstance.userId, password);

    // Optionally: Delete or invalidate the token after use
    await userTokenService.deleteTokenForUser(tokenInstance.userId);

    res.json({ message: 'Password has been reset.' });
  } catch (err) {
    next(err);
  }
};
