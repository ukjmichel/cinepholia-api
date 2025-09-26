/**
 * @module services/authorization.service
 *
 * @description
 * Manage user authorizations (roles) with conflict checks and transaction support.
 */

import {
  AuthorizationAttributes,
  AuthorizationModel,
  Role,
} from '../models/authorization.model.js';
import { UserModel } from '../models/user.model.js';
import { NotFoundError } from '../errors/not-found-error.js';
import { ConflictError } from '../errors/conflict-error.js';
import type { Transaction } from 'sequelize';

interface ServiceOptions {
  transaction?: Transaction;
}

export class AuthorizationService {
  /**
   * Create an authorization (role) for a user.
   * Throws if an authorization already exists or the user is missing.
   */
  async create(
    data: AuthorizationAttributes,
    options?: ServiceOptions
  ): Promise<AuthorizationModel> {
    const existing = await AuthorizationModel.findOne({
      where: { userId: data.userId },
      transaction: options?.transaction,
    });
    if (existing) {
      throw new ConflictError('Authorization already exists for this user');
    }

    const user = await UserModel.findByPk(data.userId, {
      transaction: options?.transaction,
    });
    if (!user) throw new NotFoundError('User not found');

    return AuthorizationModel.create(
      { userId: data.userId, role: data.role ?? 'user' },
      { transaction: options?.transaction }
    );
  }

  /**
   * Get a user's authorization by userId.
   */
  async get(
    userId: string,
    options?: ServiceOptions
  ): Promise<AuthorizationModel> {
    const auth = await AuthorizationModel.findOne({
      where: { userId },
      include: [UserModel],
      transaction: options?.transaction,
    });
    if (!auth) throw new NotFoundError('Authorization not found for this user');
    return auth;
  }

  /**
   * Update a user's role.
   * (Kept a simple signature: pass the new `role` directly.)
   */
  async update(
    userId: string,
    role: Role,
    options?: ServiceOptions
  ): Promise<AuthorizationModel> {
    const auth = await AuthorizationModel.findOne({
      where: { userId },
      transaction: options?.transaction,
    });
    if (!auth) throw new NotFoundError('Authorization not found for this user');

    auth.role = role;
    await auth.save({ transaction: options?.transaction });
    return auth;
  }

  /**
   * Remove (delete) a user's authorization.
   */
  async remove(userId: string, options?: ServiceOptions): Promise<void> {
    const deleted = await AuthorizationModel.destroy({
      where: { userId },
      transaction: options?.transaction,
    });
    if (!deleted)
      throw new NotFoundError('Authorization not found for this user');
  }

  /**
   * List authorizations with optional role filter and pagination.
   */
  async list(
    role?: Role,
    page: number = 1,
    pageSize: number = 10,
    options?: ServiceOptions
  ): Promise<{
    authorizations: AuthorizationModel[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const where = role ? { role } : undefined;
    const offset = (page - 1) * pageSize;

    const { rows: authorizations, count: total } =
      await AuthorizationModel.findAndCountAll({
        where,
        include: [UserModel],
        offset,
        limit: pageSize,
        order: [['createdAt', 'DESC']],
        transaction: options?.transaction,
      });

    return { authorizations, total, page, pageSize };
  }
}

/** Singleton instance of the authorization service, usable throughout the application. */
export const authorizationService = new AuthorizationService();
