/**
 * @module controllers/user.controller
 *
 * @description
 * Express controller for managing users and their authentication/authorization data.
 *
 * @features
 * - Account creation with:
 *   - Automatic role assignment
 *   - Welcome email dispatch
 *   - Access/refresh token generation
 * - Retrieve, update, delete, and verify users (including role information)
 * - Password update with validation
 * - Paginated and filtered listing of users
 * - Flexible search by various criteria (includes role data)
 * - Credential validation for authentication
 * - Retrieve the current authenticated user's profile (with role)
 *
 * @security
 * - Enforces authentication for protected routes
 * - Restricts certain operations to admin or privileged roles
 * - Sanitizes sensitive data before returning user objects
 *
 * @dependencies
 * - `userService`: Business logic and persistence for users
 * - `authorizationService`: Manages role assignments
 * - `emailService`: Sends welcome or verification emails
 * - `authService`: Handles password hashing, token generation, and validation
 * - `BadRequestError` / `NotFoundError`: Custom error handling
 */

import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service.js';
import { authorizationService } from '../services/authorization.service.js';
import { UserAttributes, UserModel } from '../models/user.model.js';
import { BadRequestError } from '../errors/bad-request-error.js';
import { NotFoundError } from '../errors/not-found-error.js';
import { UnauthorizedError } from '../errors/unauthorized-error.js';
import { sequelize } from '../config/db.js';
import { EmailService } from '../services/email.service.js';
import { config } from '../config/env.js';
import { AuthService } from '../services/auth.service.js';
import { Role } from '../models/authorization.model.js';

export const emailService = new EmailService();
export const authService = new AuthService();

/**
 * Interface representing a public user with their associated role.
 */
export interface PublicUserWithRole extends Omit<UserAttributes, 'password'> {
  /** The user's authorization role */
  role: Role;
}

/**
 * Converts a UserModel instance to a public user object (password removed) and adds their role.
 * @param user - The Sequelize user instance.
 * @returns Promise<PublicUserWithRole|null>
 */
async function toPublicUserWithRole(
  user: UserModel | null
): Promise<PublicUserWithRole | null> {
  if (!user) return null;
  const data =
    typeof user.get === 'function' ? user.get({ plain: true }) : (user as any);
  const { password, ...publicFields } = data as UserAttributes;
  const authorization = await authorizationService.getAuthorizationByUserId(
    (user as any).userId
  );
  return {
    ...(publicFields as Omit<UserAttributes, 'password'>),
    role: (authorization?.role as Role) ?? 'utilisateur',
  };
}

/**
 * Creates a new user account with a specified role.
 * Handles user creation, role assignment, welcome email, and cookie-based tokens within a transaction.
 *
 * @param role - Role to assign to the user ('utilisateur', 'employé', etc.)
 * @returns Express middleware function
 *
 * @throws ConflictError if user already exists
 * @throws Any error from child services, rolled back if within transaction
 */
export const createAccount =
  (role: Role) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const transaction = await sequelize.transaction();
    try {
      const userData = req.body;
      const user = await userService.createUser(userData, { transaction });
      await authorizationService.createAuthorization(
        { userId: (user as any).userId, role },
        { transaction }
      );
      if (config.sendWelcomeEmail) {
        await emailService.sendWelcomeEmail(user.email, user.firstName);
      }
      await transaction.commit();

      if (role === 'utilisateur') {
        const tokens = authService.generateTokens(user);
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

      const publicUser = await toPublicUserWithRole(user);
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

/**
 * Retrieves a paginated list of users with optional filtering (staff only).
 * Returns role with each user.
 *
 * @example
 * // GET /users?page=1&pageSize=20&verified=true&username=john
 */
export const listUsers = async (
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
    const filters = {
      username: req.query.username as string | undefined,
      email: req.query.email as string | undefined,
      verified:
        req.query.verified !== undefined
          ? req.query.verified === 'true'
          : undefined,
    };

    const result = await userService.listUsers({ page, pageSize, filters });
    const usersWithRoles: PublicUserWithRole[] = await Promise.all(
      result.users.map(
        (u) => toPublicUserWithRole(u) as Promise<PublicUserWithRole>
      )
    );
    res.status(200).json({
      message: 'Users found successfully',
      data: {
        users: usersWithRoles,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Flexible search: find users by global or field filters, including role.
 * @example
 * // GET /users/search?q=ana&verified=true
 */
export const searchUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters: Record<string, any> = {};
    if (typeof req.query.q === 'string') filters.q = req.query.q;
    if (typeof req.query.userId === 'string') filters.userId = req.query.userId;
    if (typeof req.query.username === 'string')
      filters.username = req.query.username;
    if (typeof req.query.email === 'string') filters.email = req.query.email;
    if (typeof req.query.firstName === 'string')
      filters.firstName = req.query.firstName;
    if (typeof req.query.lastName === 'string')
      filters.lastName = req.query.lastName;
    if (typeof req.query.verified !== 'undefined') {
      filters.verified =
        req.query.verified === 'true' || req.query.verified === '1';
    }
    const users = await userService.searchUsers(filters);
    const usersWithRoles: PublicUserWithRole[] = await Promise.all(
      users.map((u) => toPublicUserWithRole(u) as Promise<PublicUserWithRole>)
    );
    res.status(200).json({
      message: 'Users found successfully',
      data: { users: usersWithRoles },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Retrieves a user by their unique ID (self or staff), including role.
 *
 * @throws NotFoundError if user does not exist
 */
export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await userService.getUserById(req.params.userId);
    if (!user) throw new NotFoundError('User not found');
    const publicUser = await toPublicUserWithRole(user);
    res.status(200).json({
      message: 'User found successfully',
      data: { user: publicUser },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Retrieves the currently authenticated user's public information, including their authorization role.
 *
 * Requires authentication middleware to populate `req.user.userId` (decoded from JWT).
 */
export const getCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.user.userId) {
      res.status(401).json({ message: 'Not authenticated', data: null });
      return;
    }
    const user = await userService.getUserById(req.user.userId);
    if (!user) {
      res.status(404).json({ message: 'User not found', data: null });
      return;
    }
    const publicUser = await toPublicUserWithRole(user);
    res.status(200).json({
      message: 'Current user found',
      data: { user: publicUser },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Updates user information (self or staff), returns updated user including role.
 *
 * @throws NotFoundError if user not found
 */
export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await userService.updateUser(
      req.params.userId,
      req.body as Partial<UserAttributes>
    );
    const publicUser = await toPublicUserWithRole(user);
    res.status(200).json({
      message: 'User updated successfully',
      data: { user: publicUser },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Changes a user's password.
 *
 * @throws BadRequestError if newPassword is missing
 */
export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { newPassword } = req.body;
    if (!newPassword) throw new BadRequestError('Password is required');
    const user = await userService.changePassword(
      req.params.userId,
      newPassword
    );
    const publicUser = await toPublicUserWithRole(user);
    res.status(200).json({
      message: 'Password changed successfully',
      data: { user: publicUser },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Deletes a user from the system.
 *
 * @throws NotFoundError if user not found
 */
export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const deleted = await userService.deleteUser(req.params.userId);
    if (deleted) {
      res.status(200).json({ message: 'User deleted', data: null });
      return;
    }
    throw new NotFoundError('User not found');
  } catch (err) {
    next(err);
  }
};

/**
 * Verifies a user (sets 'verified' flag to true).
 */
export const verifyUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await userService.verifyUser(req.params.userId);
    const publicUser = await toPublicUserWithRole(user);
    res.status(200).json({
      message: 'User verified',
      data: { user: publicUser },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Validates user credentials (username/email + password).
 *
 * @throws BadRequestError if missing fields
 * @throws UnauthorizedError if invalid credentials
 */
export const validatePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { emailOrUsername, password } = req.body;
    if (!emailOrUsername || !password) {
      throw new BadRequestError('Email or username and password are required');
    }
    const user = await userService.validatePassword(emailOrUsername, password);
    if (!user) {
      throw new UnauthorizedError('Invalid email or username or password');
    }
    const publicUser = await toPublicUserWithRole(user);
    res.status(200).json({
      message: 'User validated successfully',
      data: { user: publicUser },
    });
  } catch (err) {
    next(err);
  }
};
