// src/services/user.service.ts

import { ConflictError } from '../errors/conflict-error.js';
import { NotFoundError } from '../errors/not-found-error.js';
import {
  UserModel,
  UserCreationAttributes,
  UserAttributes,
} from '../models/user.model.js';
import { Op, Transaction, WhereOptions } from 'sequelize';

// Interfaces
export interface ListUsersFilters {
  username?: string;
  email?: string;
  verified?: boolean;
}

export interface ListUsersOptions {
  page?: number;
  pageSize?: number;
  filters?: ListUsersFilters;
}

export interface ListUsersResult {
  users: UserModel[];
  total: number;
  page: number;
  pageSize: number;
}

interface ServiceOptions {
  transaction?: Transaction;
}

export class UserService {
  // Create a new user
  async createUser(
    data: UserCreationAttributes,
    options?: ServiceOptions // <- added
  ): Promise<UserModel> {
    const existingUser = await UserModel.findOne({
      where: {
        [Op.or]: [
          { email: data.email.toLowerCase() },
          { username: data.username.toLowerCase() },
        ],
      },
      transaction: options?.transaction, // <- pass transaction
    });

    if (existingUser) {
      throw new ConflictError(
        'A user with this email or username already exists'
      );
    }

    const user = await UserModel.create(data, {
      transaction: options?.transaction, // <- pass transaction
    });

    return user;
  }

  // Find a user by ID
  async getUserById(userId: string): Promise<UserModel | null> {
    return UserModel.findByPk(userId);
  }

  // Find a user by username or email
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

  // Update user info (not password)
  async updateUser(
    userId: string,
    updates: Partial<UserAttributes>,
    options?: ServiceOptions // <- added
  ): Promise<UserModel> {
    const user = await UserModel.findByPk(userId, {
      transaction: options?.transaction, // <- pass transaction
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
        transaction: options?.transaction, // <- pass transaction
      });
      if (conflictUser) {
        throw new ConflictError(
          'A user with this email or username already exists'
        );
      }
    }

    await user.update(updates, { transaction: options?.transaction }); // <- pass transaction
    return user;
  }

  // Change password (with hash automatically handled by model hook)
  async changePassword(
    userId: string,
    newPassword: string,
    options?: ServiceOptions // <- added
  ): Promise<UserModel> {
    const user = await UserModel.findByPk(userId, {
      transaction: options?.transaction, // <- pass transaction
    });
    if (!user) {
      throw new NotFoundError('User not found');
    }
    user.password = newPassword;
    await user.save({ transaction: options?.transaction }); // <- pass transaction
    return user;
  }

  // Verify user (set verified: true)
  async verifyUser(
    userId: string,
    options?: ServiceOptions // <- added
  ): Promise<UserModel> {
    const user = await UserModel.findByPk(userId, {
      transaction: options?.transaction, // <- pass transaction
    });
    if (!user) {
      throw new NotFoundError('User not found');
    }
    user.verified = true;
    await user.save({ transaction: options?.transaction }); // <- pass transaction
    return user;
  }

  // Delete user
  async deleteUser(
    userId: string,
    options?: ServiceOptions // <- added
  ): Promise<boolean> {
    const user = await UserModel.findByPk(userId, {
      transaction: options?.transaction, // <- pass transaction
    });
    if (!user) {
      throw new NotFoundError('User not found');
    }
    const deleted = await UserModel.destroy({
      where: { userId },
      transaction: options?.transaction, // <- pass transaction
    });
    return deleted > 0;
  }

  // List users with pagination and filters
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

  // Check password for login
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

// Singleton export (optional)
export const userService = new UserService();
