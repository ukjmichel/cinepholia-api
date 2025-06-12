/**
 * Service for managing users.
 *
 * Provides CRUD operations, uniqueness checks (email and username),
 * authentication management, password handling, user verification,
 * and paginated listing functionality.
 *
 * Main features:
 * - Create, retrieve, update, and delete users.
 * - Ensure uniqueness for usernames and emails.
 * - Secure password changes.
 * - User verification.
 * - Advanced user listing with pagination and filters.
 *
 * Explicit errors:
 * - NotFoundError: User does not exist.
 * - ConflictError: Duplicate username or email.
 *
 * Dependencies:
 * - UserModel for database interaction.
 * - Sequelize for querying and transactions.
 *
 */

import { ConflictError } from '../errors/conflict-error.js';
import { NotFoundError } from '../errors/not-found-error.js';
import {
  UserModel,
  UserCreationAttributes,
  UserAttributes,
} from '../models/user.model.js';
import { Op, Transaction, WhereOptions } from 'sequelize';

/**
 * Filters for listing users
 */
export interface ListUsersFilters {
  /** Filter by username (partial match, case-insensitive) */
  username?: string;
  /** Filter by email (partial match, case-insensitive) */
  email?: string;
  /** Filter by verification status */
  verified?: boolean;
}

/**
 * Options for listing users with pagination and filtering
 */
export interface ListUsersOptions {
  /** Page number (1-based, defaults to 1) */
  page?: number;
  /** Number of items per page (max 100, defaults to 10) */
  pageSize?: number;
  /** Filters to apply to the user list */
  filters?: ListUsersFilters;
}

/**
 * Result object for paginated user listing
 */
export interface ListUsersResult {
  /** Array of user models matching the criteria */
  users: UserModel[];
  /** Total number of users matching the filters */
  total: number;
  /** Current page number */
  page: number;
  /** Number of items per page */
  pageSize: number;
}

/**
 * Service options for database operations
 */
interface ServiceOptions {
  /** Database transaction to use for the operation */
  transaction?: Transaction;
}

/**
 * Service class for managing user-related operations
 * Provides CRUD operations and business logic for user management
 */
export class UserService {
  /**
   * Creates a new user in the database
   * @param data - User creation data including email, username, and password
   * @param options - Optional service options including database transaction
   * @returns Promise resolving to the created user model
   * @throws {ConflictError} When a user with the same email or username already exists
   */
  async createUser(
    data: UserCreationAttributes,
    options?: ServiceOptions
  ): Promise<UserModel> {
    const existingUser = await UserModel.findOne({
      where: {
        [Op.or]: [
          { email: data.email.toLowerCase() },
          { username: data.username.toLowerCase() },
        ],
      },
      transaction: options?.transaction,
    });

    if (existingUser) {
      throw new ConflictError(
        'A user with this email or username already exists'
      );
    }

    const user = await UserModel.create(data, {
      transaction: options?.transaction,
    });

    return user;
  }

  /**
   * Retrieves a user by their unique ID
   * @param userId - The unique identifier of the user
   * @returns Promise resolving to the user model or null if not found
   */
  async getUserById(userId: string): Promise<UserModel | null> {
    return UserModel.findByPk(userId);
  }

  /**
   * Finds a user by their username or email address
   * @param identifier - Username or email to search for (case-insensitive)
   * @returns Promise resolving to the user model or null if not found
   */
  async getUserByUsernameOrEmail(
    identifier: string
  ): Promise<UserModel | null> {
    return UserModel.findOne({
      where: {
        [Op.or]: [
          { username: identifier.toLowerCase() },
          { email: identifier.toLowerCase() },
        ],
      },
    });
  }

  /**
   * Updates user information (excluding password)
   * @param userId - The unique identifier of the user to update
   * @param updates - Partial user attributes to update
   * @param options - Optional service options including database transaction
   * @returns Promise resolving to the updated user model
   * @throws {NotFoundError} When the user is not found
   * @throws {ConflictError} When updated email/username conflicts with existing user
   */
  async updateUser(
    userId: string,
    updates: Partial<UserAttributes>,
    options?: ServiceOptions
  ): Promise<UserModel> {
    const user = await UserModel.findByPk(userId, {
      transaction: options?.transaction,
    });
    if (!user) {
      throw new NotFoundError('User not found');
    }
    // Do not allow password update via this method
    if (updates.password) delete updates.password;

    // Check for uniqueness if updating email or username
    const orConditions: WhereOptions<UserAttributes>[] = [];
    if (updates.email)
      orConditions.push({ email: updates.email.toLowerCase() });
    if (updates.username)
      orConditions.push({ username: updates.username.toLowerCase() });

    if (orConditions.length > 0) {
      const conflictUser = await UserModel.findOne({
        where: {
          [Op.or]: orConditions,
          userId: { [Op.ne]: userId }, // exclude self
        },
        transaction: options?.transaction,
      });
      if (conflictUser) {
        throw new ConflictError(
          'A user with this email or username already exists'
        );
      }
    }

    await user.update(updates, { transaction: options?.transaction });
    return user;
  }

  /**
   * Changes a user's password
   * Password hashing is automatically handled by the model hook
   * @param userId - The unique identifier of the user
   * @param newPassword - The new password (will be hashed automatically)
   * @param options - Optional service options including database transaction
   * @returns Promise resolving to the updated user model
   * @throws {NotFoundError} When the user is not found
   */
  async changePassword(
    userId: string,
    newPassword: string,
    options?: ServiceOptions
  ): Promise<UserModel> {
    const user = await UserModel.findByPk(userId, {
      transaction: options?.transaction,
    });
    if (!user) {
      throw new NotFoundError('User not found');
    }
    user.password = newPassword;
    await user.save({ transaction: options?.transaction });
    return user;
  }

  /**
   * Marks a user as verified
   * @param userId - The unique identifier of the user to verify
   * @param options - Optional service options including database transaction
   * @returns Promise resolving to the updated user model
   * @throws {NotFoundError} When the user is not found
   */
  async verifyUser(
    userId: string,
    options?: ServiceOptions
  ): Promise<UserModel> {
    const user = await UserModel.findByPk(userId, {
      transaction: options?.transaction,
    });
    if (!user) {
      throw new NotFoundError('User not found');
    }
    user.verified = true;
    await user.save({ transaction: options?.transaction });
    return user;
  }

  /**
   * Deletes a user from the database
   * @param userId - The unique identifier of the user to delete
   * @param options - Optional service options including database transaction
   * @returns Promise resolving to true if user was deleted, false otherwise
   * @throws {NotFoundError} When the user is not found
   */
  async deleteUser(userId: string, options?: ServiceOptions): Promise<boolean> {
    const user = await UserModel.findByPk(userId, {
      transaction: options?.transaction,
    });
    if (!user) {
      throw new NotFoundError('User not found');
    }
    const deleted = await UserModel.destroy({
      where: { userId },
      transaction: options?.transaction,
    });
    return deleted > 0;
  }

  /**
   * Retrieves a paginated list of users with optional filtering
   * @param options - Pagination and filtering options
   * @returns Promise resolving to paginated user results
   */
  async listUsers({
    page = 1,
    pageSize = 10,
    filters = {},
  }: ListUsersOptions = {}): Promise<ListUsersResult> {
    // Always ensure positive integers for page and pageSize
    const MAX_PAGE_SIZE = 100;
    const _page = Number.isInteger(page) && page > 0 ? page : 1;
    const _pageSize =
      Number.isInteger(pageSize) && pageSize > 0
        ? Math.min(pageSize, MAX_PAGE_SIZE)
        : 10;

    const where: WhereOptions<UserAttributes> = {};

    if (filters.username) {
      where.username = {
        [Op.like]: `%${filters.username.trim().toLowerCase()}%`,
      };
    }
    if (filters.email) {
      where.email = { [Op.like]: `%${filters.email.trim().toLowerCase()}%` };
    }
    if (filters.verified !== undefined) {
      where.verified = filters.verified;
    }

    const { rows: users, count: total } = await UserModel.findAndCountAll({
      where,
      offset: (_page - 1) * _pageSize,
      limit: _pageSize,
      order: [['createdAt', 'DESC']],
    });

    return {
      users,
      total,
      page: _page,
      pageSize: _pageSize,
    };
  }

  /**
   * Validates a user's password for authentication
   * @param emailOrUsername - Email address or username to authenticate
   * @param password - Password to validate
   * @returns Promise resolving to the user model if valid, null if invalid password
   * @throws {NotFoundError} When the user is not found
   */
  async validatePassword(
    emailOrUsername: string,
    password: string
  ): Promise<UserModel | null> {
    const user = await this.getUserByUsernameOrEmail(emailOrUsername);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    const isValid = await user.validatePassword(password);
    return isValid ? user : null;
  }
}

/**
 * Singleton instance of UserService for convenient access
 * @example
 * import { userService } from './services/user.service.js';
 * const user = await userService.createUser(userData);
 */
export const userService = new UserService();
