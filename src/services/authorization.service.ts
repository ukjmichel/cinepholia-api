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

export class AuthorizationService {
  // Create a new authorization entry
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
        role: data.role ?? 'utilisateur',
      },
      { transaction: options?.transaction }
    );
  }

  // Get authorization by user ID
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

  // Update authorization role
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

  // Delete authorization for a user
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

  // List all authorizations, optionally filtered by role and paginated
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

export const authorizationService = new AuthorizationService();
