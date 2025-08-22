/**
 * @module services/authorization.service
 *
 * @description
 * This service allows the creation, retrieval, modification, and deletion
 * of permissions (roles) associated with each user, with conflict management
 * and transactional management to ensure data consistency.
 *
 * @features
 * - Creation of authorization for a given user, handling cases where authorization already exists
 * - Retrieval of a user's authorization by their identifier
 * - Modification of the role assigned to a user
 * - Deletion of a user's authorization
 * - Paginated and filtered list of authorizations by role
 *
 * Integrates Sequelize models for data access and allows the use of transactions.
 *
 */

import {
  AuthorizationAttributes,
  AuthorizationModel,
  Role,
} from '../models/authorization.model.js';
import { UserModel } from '../models/user.model.js';
import { NotFoundError } from '../errors/not-found-error.js';
import { ConflictError } from '../errors/conflict-error.js';
import { Transaction } from 'sequelize';

interface ServiceOptions {
  transaction?: Transaction;
}

/**
 * Main authorization management service.
 * Allows managing user roles and ensuring the integrity of associations.
 */
export class AuthorizationService {
  /**
   * Creates a new authorization (role) for a user.
   * Prevents creation if an authorization already exists for the user.
   *
   * @param data - Authorization attributes (userId, role)
   * @param options - Optional options (transaction)
   * @returns {Promise<AuthorizationModel>} Created authorization
   * @throws {ConflictError} If an authorization already exists for this user
   * @throws {NotFoundError} If the user does not exist
   */
  async createAuthorization(
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
    if (!user) {
      throw new NotFoundError('User not found');
    }

    return AuthorizationModel.create(
      {
        userId: data.userId,
        role: data.role ?? 'user',
      },
      { transaction: options?.transaction }
    );
  }

  /**
   * Retrieves the authorization (role) associated with a user via their ID.
   *
   * @param userId - User identifier
   * @param options - Optional options (transaction)
   * @returns {Promise<AuthorizationModel>} Found authorization
   * @throws {NotFoundError} If no authorization is found
   */
  async getAuthorizationByUserId(
    userId: string,
    options?: ServiceOptions
  ): Promise<AuthorizationModel> {
    const auth = await AuthorizationModel.findOne({
      where: { userId },
      include: [UserModel],
      transaction: options?.transaction,
    });
    if (!auth) {
      throw new NotFoundError('Authorization not found for this user');
    }
    return auth;
  }

  /**
   * Updates the role assigned to a user.
   *
   * @param userId - User identifier
   * @param role - New role to assign
   * @param options - Optional options (transaction)
   * @returns {Promise<AuthorizationModel>} Updated authorization
   * @throws {NotFoundError} If no authorization is found
   */
  async updateAuthorizationRole(
    userId: string,
    role: Role,
    options?: ServiceOptions
  ): Promise<AuthorizationModel> {
    const auth = await AuthorizationModel.findOne({
      where: { userId },
      transaction: options?.transaction,
    });
    if (!auth) {
      throw new NotFoundError('Authorization not found for this user');
    }
    auth.role = role;
    await auth.save({ transaction: options?.transaction });
    return auth;
  }

  /**
   * Deletes the authorization associated with a user.
   *
   * @param userId - User identifier
   * @param options - Optional options (transaction)
   * @returns {Promise<void>}
   * @throws {NotFoundError} If no authorization is found
   */
  async deleteAuthorization(
    userId: string,
    options?: ServiceOptions
  ): Promise<void> {
    const deleted = await AuthorizationModel.destroy({
      where: { userId },
      transaction: options?.transaction,
    });
    if (!deleted) {
      throw new NotFoundError('Authorization not found for this user');
    }
  }

  /**
   * Lists all existing authorizations.
   * Allows filtering by role and paginating the results.
   *
   * @param role - (optional) Role to filter by
   * @param page - Page number (default: 1)
   * @param pageSize - Page size (default: 10)
   * @returns {Promise<{ authorizations: AuthorizationModel[], total: number, page: number, pageSize: number }>}
   */
  async listAuthorizations(
    role?: Role,
    page: number = 1,
    pageSize: number = 10
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
      });
    return { authorizations, total, page, pageSize };
  }
}

/**
 * Singleton instance of the authorization service.
 * To be used throughout the application.
 */
export const authorizationService = new AuthorizationService();
