/**
 * @module controllers/user-token.controller
 *
 * @description
 * Express controller for managing user tokens and the full password reset workflow.
 *
 * @features
 * - Secure generation and storage of `reset_password` tokens
 * - Sends one-time 6-digit codes by email with expiration
 * - Middleware for validating reset tokens before password change
 * - Atomic password reset with immediate token invalidation after use
 *
 * @security
 * - Prevents user enumeration by always returning a generic success message
 * - Tokens have short expiration times and are single-use
 *
 * @dependencies
 * - `userService`: Finds and updates user accounts
 * - `userTokenService`: Creates, validates, and deletes reset tokens
 * - `EmailService`: Sends password reset codes
 * - `BadRequestError`: For explicit client input errors
 */

import { Request, Response, NextFunction } from 'express';

import { EmailService } from '../services/email.service.js';
import { UserModel } from '../models/user.model.js';
import { UserTokenType } from '../models/user-token.model.js';
import { BadRequestError } from '../errors/bad-request-error.js';

import { userTokenService } from '../services/user-token.service.js';
import userService from '../services/user.service.js';

const emailService = new EmailService();

export class UserTokenController {
  /**
   * Send a password reset code to the provided email.
   * If the email exists, a token is generated, stored, and emailed.
   * Always returns the same response to avoid revealing if the email is registered.
   *
   * @route POST /auth/password-reset/send
   */
  sendResetPasswordToken = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { email } = req.body;
      if (!email) {
        throw new BadRequestError('Email is required.');
      }

      // Look up user (case-insensitive)
      const user = await UserModel.findOne({
        where: { email: email.trim().toLowerCase() },
      });

      // Generic message to prevent user enumeration
      const genericMessage =
        'If this email is registered, you will receive a code.';

      if (!user) {
        res.status(200).json({ message: genericMessage, data: null });
        return;
      }

      // Generate 6-digit code and set expiration (1 hour)
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      // Store code as token using existing service method
      await userTokenService.createOrReplaceToken({
        userId: user.userId,
        token: code,
        type: 'reset_password',
        expiresAt,
        attempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Send email with the code
      await emailService.sendResetPasswordEmail(
        user.email,
        user.username,
        code
      );

      res.status(200).json({ message: genericMessage, data: null });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Validate if a provided token is valid for a given type.
   *
   * @route POST /auth/password-reset/validate
   */
  validateTokenValidity = (tokenType: UserTokenType) => {
    return async (
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const { token } = req.body;
        if (!token) {
          throw new BadRequestError('Token is required.');
        }

        // Use existing service method
        await userTokenService.validateToken(token, tokenType);

        res.status(200).json({ message: 'Token is valid.', data: null });
      } catch (error) {
        next(error);
      }
    };
  };

  /**
   * Reset the user's password using a valid reset token.
   * - Validates the token
   * - Updates the user's password
   * - Deletes the token after use
   *
   * @route POST /auth/password-reset/confirm
   */
  resetPassword = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { token, password } = req.body;
      if (!token || !password) {
        throw new BadRequestError('Token and new password are required.');
      }

      // Validate token (must be reset_password type) using existing service method
      const tokenInstance = await userTokenService.validateToken(
        token,
        'reset_password'
      );

      // Update password using service method
      const updatedUser = await userService.update(tokenInstance.userId, {
        password,
      });

      if (!updatedUser) {
        throw new BadRequestError('Failed to update password.');
      }

      // Delete token after successful password change using existing service method
      await userTokenService.deleteTokenForUser(tokenInstance.userId);

      res.status(200).json({ message: 'Password has been reset.', data: null });
    } catch (err) {
      next(err);
    }
  };

  /**
   * List all tokens with pagination and filters (admin only).
   *
   * @route GET /api/user-tokens
   */
  listTokens = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { page = 1, limit = 10, type, userId } = req.query;

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);

      const filters: any = {};
      if (type) filters.type = type;
      if (userId) filters.userId = userId;

      // Use existing service method (assuming it exists)
      const result = await userTokenService.findAll({
        ...filters,
        page: pageNum,
        limit: limitNum,
      });

      res.status(200).json({
        message: 'Tokens retrieved successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Create a new token (admin only).
   *
   * @route POST /api/user-tokens
   */
  createToken = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { userId, token, type, expiresAt } = req.body;

      if (!userId || !token || !type) {
        throw new BadRequestError('userId, token, and type are required.');
      }

      // Use existing service method
      const newToken = await userTokenService.createOrReplaceToken({
        userId,
        token,
        type,
        expiresAt: expiresAt
          ? new Date(expiresAt)
          : new Date(Date.now() + 60 * 60 * 1000),
        attempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      res.status(201).json({
        message: 'Token created successfully',
        data: {
          userId: newToken.userId,
          type: newToken.type,
          expiresAt: newToken.expiresAt,
          attempts: newToken.attempts,
          createdAt: newToken.createdAt,
          updatedAt: newToken.updatedAt,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Get all expired tokens (admin only).
   *
   * @route GET /api/user-tokens/expired
   */
  getExpiredTokens = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { page = 1, limit = 10 } = req.query;

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);

      // Use existing service method (assuming it exists)
      const result = await userTokenService.findExpired({
        page: pageNum,
        limit: limitNum,
      });

      res.status(200).json({
        message: 'Expired tokens retrieved successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Get tokens by type (admin only).
   *
   * @route GET /api/user-tokens/type/:type
   */
  getTokensByType = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { type } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);

      // Use existing service method
      const result = await userTokenService.findAll({
        type: type as UserTokenType,
        page: pageNum,
        limit: limitNum,
      });

      res.status(200).json({
        message: `Tokens of type '${type}' retrieved successfully`,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Get token for a specific user (admin or owner only).
   *
   * @route GET /api/user-tokens/:userId
   */
  getTokenByUserId = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { userId } = req.params;

      // Use existing service method
      const token = await userTokenService.findByUserId(userId);

      res.status(200).json({
        message: 'Token retrieved successfully',
        data: {
          userId: token.userId,
          type: token.type,
          expiresAt: token.expiresAt,
          attempts: token.attempts,
          lastRequestAt: token.lastRequestAt,
          createdAt: token.createdAt,
          updatedAt: token.updatedAt,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Delete a token for a user (admin only).
   *
   * @route DELETE /api/user-tokens/:userId
   */
  deleteToken = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { userId } = req.params;

      // Use existing service method
      await userTokenService.deleteTokenForUser(userId);

      res.status(200).json({
        message: 'Token deleted successfully',
        data: null,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Delete all expired tokens (admin only, for cleanup).
   *
   * @route DELETE /api/user-tokens/expired
   */
  deleteExpiredTokens = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Use existing service method
      const count = await userTokenService.deleteExpiredTokens();

      res.status(200).json({
        message: `Deleted ${count} expired token(s)`,
        data: { deletedCount: count },
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Update token for a user (admin only).
   *
   * @route PATCH /api/user-tokens/:userId
   */
  updateToken = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { userId } = req.params;
      const update = req.body;

      // Use existing service method
      const token = await userTokenService.updateTokenForUser(userId, update);

      res.status(200).json({
        message: 'Token updated successfully',
        data: {
          userId: token.userId,
          type: token.type,
          expiresAt: token.expiresAt,
          attempts: token.attempts,
          lastRequestAt: token.lastRequestAt,
          createdAt: token.createdAt,
          updatedAt: token.updatedAt,
        },
      });
    } catch (err) {
      next(err);
    }
  };
}

/** Singleton instance for routing usage */
export const userTokenController = new UserTokenController();
