/**
 * @module controllers/user.controller
 *
 * Express controller for managing users and their authentication/authorization data.
 */

import { Request, Response, NextFunction } from 'express';

import { authorizationService } from '../services/authorization.service.js';

import { BadRequestError } from '../errors/bad-request-error.js';
import { NotFoundError } from '../errors/not-found-error.js';
import { sequelize } from '../config/db.js';
import { EmailService } from '../services/email.service.js';
import { config } from '../config/env.js';
import { AuthService } from '../services/auth.service.js';
import { Role } from '../models/authorization.model.js';
import { PublicUserWithRole, UserAttributes } from '../interfaces/user.js';
import userService from '../services/user.service.js'; // <-- updated import
import { toPublicUserWithRole } from '../utils/to-public-user-with-role.js';
import { getAuthUser } from '../middlewares/auth.middleware.js';

export class UserController {
  private emailService = new EmailService();
  private authService = new AuthService();

  /** Create account with role (transactional) */
  createAccount =
    (role: Role) =>
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const transaction = await sequelize.transaction();
      try {
        const userData = req.body;

        const user = await userService.create(userData, { transaction });

        await authorizationService.create(
          { userId: (user as any).userId, role },
          { transaction }
        );

        if (config.sendWelcomeEmail) {
          await this.emailService.sendWelcomeEmail(user.email, user.firstName);
        }

        // Build public user inside the transaction so the role is visible
        const publicUser = await toPublicUserWithRole(user as any, {
          transaction,
        });

        await transaction.commit();

        // Issue tokens only for basic users
        if (role === 'user') {
          const tokens = this.authService.generateTokens(user);
          res.cookie('accessToken', tokens.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 1000 * 60 * 60,
          });
          res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 1000 * 60 * 60 * 24 * 7,
          });
        }

        res.status(201).json({
          message: 'User created successfully',
          data: { user: publicUser },
        });
      } catch (error) {
        try {
          await transaction.rollback();
        } catch {
          // optionally log rollback error
        }
        next(error);
      }
    };

  /** List users (supports filters incl. role) with pagination. */
  listUsers = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const page = req.query.page
        ? parseInt(req.query.page as string, 10)
        : undefined;
      const pageSize = req.query.pageSize
        ? parseInt(req.query.pageSize as string, 10)
        : undefined;

      const filters: Record<string, any> = {
        username: req.query.username as string | undefined,
        email: req.query.email as string | undefined,
        verified:
          typeof req.query.verified !== 'undefined'
            ? req.query.verified === 'true' || req.query.verified === '1'
            : undefined,
        role: req.query.role as Role | undefined,
      };

      const result = await userService.list({ page, limit: pageSize, filters });

      const usersWithRoles: PublicUserWithRole[] = await Promise.all(
        result.items.map(
          (u) => toPublicUserWithRole(u as any) as Promise<PublicUserWithRole>
        )
      );

      res.status(200).json({
        message: 'Users found successfully',
        data: {
          users: usersWithRoles,
          total: result.totalItems,
          page: result.page,
          pageSize: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  /** Search users (supports q + filters incl. role) */
  searchUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Normalize pagination
      const pageRaw = Number(req.query.page ?? 1);
      const pageSizeRaw = Number(req.query.pageSize ?? 20);

      const pageSize =
        Number.isFinite(pageSizeRaw) && pageSizeRaw > 0
          ? Math.min(pageSizeRaw, 100)
          : 20;

      let page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

      // Build filters from query (adjust keys to your service)
      const { q, userId, username, email, firstName, lastName, verified } =
        req.query as Record<string, string | undefined>;

      let verifiedBool: boolean | undefined = undefined;
      if (verified === 'true' || verified === '1') verifiedBool = true;
      if (verified === 'false' || verified === '0') verifiedBool = false;

      const filters: Record<string, unknown> = {};
      if (userId) filters.userId = userId.trim();
      if (username) filters.username = username.trim();
      if (email) filters.email = email.trim();
      if (firstName) filters.firstName = firstName.trim();
      if (lastName) filters.lastName = lastName.trim();
      if (typeof verifiedBool === 'boolean') filters.verified = verifiedBool;

      // 1st fetch
      let result = await userService.search({
        page,
        limit: pageSize,
        q: q?.trim() || undefined,
        filters,
      } as any);

      const total = result.total ?? 0;
      let totalPages = Math.max(1, Math.ceil(total / pageSize)); // <-- never 0

      // If we asked for a page beyond the last and there are items, refetch last valid page
      if (total > 0 && page > totalPages) {
        page = totalPages;
        result = await userService.search({
          page,
          limit: pageSize,
          q: q?.trim() || undefined,
          filters,
        } as any);
      }

      // Shape response in your current format
      res.status(200).json({
        message: 'Users found successfully',
        data: {
          users: result.items ?? [],
          total,
          page,
          pageSize,
          totalPages,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  /** Get a user by ID. */
  getUserById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = await userService.get(req.params.userId);
      if (!user) throw new NotFoundError('User not found');

      const publicUser = await toPublicUserWithRole(user as any);
      res.status(200).json({
        message: 'User found successfully',
        data: { user: publicUser },
      });
    } catch (err) {
      next(err);
    }
  };

  /** Get current authenticated user. */
  getCurrentUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const auth = getAuthUser(req);
      if (!auth?.userId) {
        res.status(401).json({ message: 'Not authenticated', data: null });
        return;
      }

      const user = await userService.get(auth.userId);
      if (!user) {
        res.status(404).json({ message: 'User not found', data: null });
        return;
      }

      const publicUser = await toPublicUserWithRole(user as any);
      res.status(200).json({
        message: 'Current user found',
        data: { user: publicUser },
      });
    } catch (err) {
      next(err);
    }
  };

  /** Update user fields; returns updated user. */
  updateUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = await userService.update(
        req.params.userId,
        req.body as Partial<UserAttributes>
      );
      const publicUser = await toPublicUserWithRole(user as any);
      res.status(200).json({
        message: 'User updated successfully',
        data: { user: publicUser },
      });
    } catch (err) {
      next(err);
    }
  };

  /** Change password (uses update to trigger model hooks). */
  changePassword = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { newPassword } = req.body;
      if (!newPassword) throw new BadRequestError('Password is required');

      const user = await userService.update(req.params.userId, {
        // assumes UpdateUserDTO allows password and model hooks hash it
        password: newPassword as unknown as any,
      });

      const publicUser = await toPublicUserWithRole(user as any);
      res.status(200).json({
        message: 'Password changed successfully',
        data: { user: publicUser },
      });
    } catch (err) {
      next(err);
    }
  };

  /** Delete user. */
  deleteUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const deleted = await userService.remove(req.params.userId);
      if (deleted) {
        res.status(200).json({ message: 'User deleted', data: null });
        return;
      }
      throw new NotFoundError('User not found');
    } catch (err) {
      next(err);
    }
  };

  /** Verify user (set verified=true). */
  verifyUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = await userService.update(req.params.userId, {
        verified: true,
      } as any);
      const publicUser = await toPublicUserWithRole(user as any);
      res.status(200).json({
        message: 'User verified',
        data: { user: publicUser },
      });
    } catch (err) {
      next(err);
    }
  };
}


/** Singleton instance for routing usage */
export const userController = new UserController();
