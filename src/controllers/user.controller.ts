/**
 * Contrôleur Utilisateur (User Controller)
 *
 * Fournit toutes les routes Express pour la gestion des utilisateurs :
 * - Création de compte avec gestion du rôle et envoi de mail de bienvenue.
 * - Récupération, modification, suppression, et vérification d’utilisateur.
 * - Mise à jour du mot de passe.
 * - Listing paginé et filtré des utilisateurs.
 * - Validation d’identifiants pour l’authentification.
 *
 * Gestion des erreurs :
 * - NotFoundError : utilisateur non trouvé.
 * - BadRequestError : données manquantes ou invalides.
 * - ConflictError : email ou nom d’utilisateur déjà pris.
 * - UnauthorizedError : authentification invalide.
 *
 * Toutes les opérations critiques sont transactionnelles et assurent la cohérence des rôles et droits.
 * Les réponses sont normalisées pour l’API REST.
 *
 * Dépendances :
 * - userService, authorizationService, authService, emailService
 *
 */

import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service.js';
import { UserAttributes } from '../models/user.model.js';
import { BadRequestError } from '../errors/bad-request-error.js';
import { NotFoundError } from '../errors/not-found-error.js';
import { UnauthorizedError } from '../errors/unauthorized-error.js';
import { sequelize } from '../config/db.js';
import { EmailService } from '../services/email.service.js';
import { config } from '../config/env.js';
import { AuthorizationService } from '../services/authorization.service.js';
import { Role } from '../models/authorization.model.js';
import { AuthService } from '../services/auth.service.js';

/**
 * Email service instance for sending user-related emails
 */
export const emailService = new EmailService();

/**
 * Authorization service instance for managing user roles and permissions
 */
export const authorizationService = new AuthorizationService();

/**
 * Authentication service instance for token generation and validation
 */
export const authService = new AuthService();

/**
 * Creates a new user account with specified role
 *
 * This is a higher-order function that returns an Express middleware
 * configured for a specific user role. The middleware handles user creation,
 * role assignment, welcome email sending, and token generation within a database transaction.
 *
 * @param role - The role to assign to the newly created user
 * @returns Express middleware function for handling account creation
 *
 * @example
 * // Create middleware for regular users
 * const createUserAccount = createAccount('utilisateur');
 * router.post('/users', createUserAccount);
 *
 * // Create middleware for admin users
 * const createAdminAccount = createAccount('admin');
 * router.post('/admins', createAdminAccount);
 */
export const createAccount =
  (role: Role) =>
  /**
   * Express middleware for creating a user account
   * @param req - Express request object containing user data in body
   * @param res - Express response object
   * @param next - Express next function for error handling
   */
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const transaction = await sequelize.transaction();

    try {
      const userData = req.body;

      // Create user in transaction
      const user = await userService.createUser(userData, { transaction });

      // Create authorization in transaction, with fixed role
      const authorization = await authorizationService.createAuthorization(
        { userId: user.userId, role },
        { transaction }
      );

      // Send welcome email if enabled
      if (config.sendWelcomeEmail) {
        await emailService.sendWelcomeEmail(user.email, user.firstName);
      }

      await transaction.commit();

      // If role is 'utilisateur', generate both access and refresh tokens
      let tokens = undefined;
      if (role === 'utilisateur') {
        tokens = authService.generateTokens(user);
      }

      res.status(201).json({
        message: 'User created successfully',
        data: {
          ...user.toJSON(),
          role: authorization.role,
          ...(tokens ? { tokens } : {}),
        },
      });
    } catch (error) {
      await transaction.rollback();
      next(error);
    }
  };

/**
 * Retrieves a user by their unique identifier
 *
 * @param req - Express request object with userId in params
 * @param req.params.userId - The unique identifier of the user to retrieve
 * @param res - Express response object
 * @param next - Express next function for error handling
 *
 * @throws {NotFoundError} When the user with the specified ID is not found
 *
 * @example
 * // GET /users/123e4567-e89b-12d3-a456-426614174000
 * // Returns: { message: 'User found successfully', data: { userId: '...', ... } }
 */
export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await userService.getUserById(req.params.userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    res.status(200).json({
      message: 'User found successfully',
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Updates user information
 *
 * Updates the specified user with the provided data. Password updates
 * are not allowed through this endpoint and will be ignored.
 *
 * @param req - Express request object with userId in params and update data in body
 * @param req.params.userId - The unique identifier of the user to update
 * @param req.body - Partial user attributes to update
 * @param res - Express response object
 * @param next - Express next function for error handling
 *
 * @throws {NotFoundError} When the user with the specified ID is not found
 * @throws {ConflictError} When updated email/username conflicts with existing user
 *
 * @example
 * // PUT /users/123e4567-e89b-12d3-a456-426614174000
 * // Body: { "firstName": "John", "email": "john@example.com" }
 * // Returns: { message: 'User updated successfully', data: { userId: '...', ... } }
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
    res.status(200).json({
      message: 'User updated successfully',
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Changes a user's password
 *
 * Updates the password for the specified user. The new password will be
 * automatically hashed before storage.
 *
 * @param req - Express request object with userId in params and newPassword in body
 * @param req.params.userId - The unique identifier of the user
 * @param req.body.newPassword - The new password for the user
 * @param res - Express response object
 * @param next - Express next function for error handling
 *
 * @throws {BadRequestError} When newPassword is not provided
 * @throws {NotFoundError} When the user with the specified ID is not found
 *
 * @example
 * // PUT /users/123e4567-e89b-12d3-a456-426614174000/password
 * // Body: { "newPassword": "newSecurePassword123" }
 * // Returns: { message: 'Password changed successfully', data: { userId: '...', ... } }
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
    res.status(200).json({
      message: 'Password changed successfully',
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Marks a user as verified
 *
 * Sets the verified status of the specified user to true. This is typically
 * used after email verification or administrative approval.
 *
 * @param req - Express request object with userId in params
 * @param req.params.userId - The unique identifier of the user to verify
 * @param res - Express response object
 * @param next - Express next function for error handling
 *
 * @throws {NotFoundError} When the user with the specified ID is not found
 *
 * @example
 * // PUT /users/123e4567-e89b-12d3-a456-426614174000/verify
 * // Returns: { message: 'User verified', data: { userId: '...', verified: true, ... } }
 */
export const verifyUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await userService.verifyUser(req.params.userId);
    res.status(200).json({
      message: 'User verified',
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Deletes a user from the system
 *
 * Permanently removes the specified user from the database. This action
 * cannot be undone.
 *
 * @param req - Express request object with userId in params
 * @param req.params.userId - The unique identifier of the user to delete
 * @param res - Express response object
 * @param next - Express next function for error handling
 *
 * @throws {NotFoundError} When the user with the specified ID is not found
 *
 * @example
 * // DELETE /users/123e4567-e89b-12d3-a456-426614174000
 * // Returns: { message: 'User deleted', data: null }
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
    } else {
      throw new NotFoundError('User not found');
    }
  } catch (err) {
    next(err);
  }
};

/**
 * Retrieves a paginated list of users with optional filtering
 *
 * Returns users based on query parameters for pagination and filtering.
 * Supports filtering by username, email, and verification status.
 *
 * @param req - Express request object with query parameters
 * @param req.query.page - Page number (1-based, defaults to 1)
 * @param req.query.pageSize - Number of items per page (max 100, defaults to 10)
 * @param req.query.username - Filter by username (partial match, case-insensitive)
 * @param req.query.email - Filter by email (partial match, case-insensitive)
 * @param req.query.verified - Filter by verification status ('true' or 'false')
 * @param res - Express response object
 * @param next - Express next function for error handling
 *
 * @example
 * // GET /users?page=1&pageSize=20&verified=true&username=john
 * // Returns: {
 * //   message: 'Users found successfully',
 * //   data: {
 * //     users: [...],
 * //     total: 150,
 * //     page: 1,
 * //     pageSize: 20
 * //   }
 * // }
 */
export const listUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Parse pagination and filters from query
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
    res.status(200).json({
      message: 'Users found successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Validates user credentials for authentication
 *
 * Verifies the provided email/username and password combination.
 * Returns the user data if credentials are valid.
 *
 * @param req - Express request object with credentials in body
 * @param req.body.emailOrUsername - Email address or username to authenticate
 * @param req.body.password - Password to validate
 * @param res - Express response object
 * @param next - Express next function for error handling
 * @returns Promise that resolves when validation is complete
 *
 * @throws {BadRequestError} When email/username or password is missing
 * @throws {NotFoundError} When the user is not found
 * @throws {UnauthorizedError} When the password is invalid
 *
 * @example
 * // POST /users/validate-password
 * // Body: { "emailOrUsername": "john@example.com", "password": "myPassword123" }
 * // Returns: { message: 'User validated successfully', data: { userId: '...', ... } }
 */
export const validatePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { emailOrUsername, password } = req.body;
    if (!emailOrUsername || !password) {
      throw new BadRequestError('Email or username and password are required');
    }
    const user = await userService.validatePassword(emailOrUsername, password);
    if (!user) {
      throw new UnauthorizedError('Invalid email or username or password');
    }
    res.status(200).json({
      message: 'User validated successfully',
      data: user,
    });
  } catch (err) {
    next(err);
  }
};
