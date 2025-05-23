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
    // Vérifier s'il existe déjà une autorisation pour cet utilisateur
    const existing = await AuthorizationModel.findOne({
      where: { userId: data.userId },
      transaction: options?.transaction,
    });
    if (existing) {
      throw new ConflictError('Authorization already exists for this user');
    }

    // Vérifier que l'utilisateur existe
    const user = await UserModel.findByPk(data.userId, {
      transaction: options?.transaction,
    });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Créer l'autorisation dans la transaction
    return AuthorizationModel.create(
      {
        userId: data.userId,
        role: data.role ?? 'utilisateur',
      },
      { transaction: options?.transaction }
    );
  }

  // Get authorization by user ID
  async getAuthorizationByUserId(userId: string): Promise<AuthorizationModel> {
    const auth = await AuthorizationModel.findOne({
      where: { userId },
      include: [UserModel],
    });
    if (!auth) {
      throw new NotFoundError('Authorization not found for this user');
    }
    return auth;
  }

  // Update authorization role
  async updateAuthorizationRole(
    userId: string,
    role: Role
  ): Promise<AuthorizationModel> {
    const auth = await AuthorizationModel.findOne({ where: { userId } });
    if (!auth) {
      throw new NotFoundError('Authorization not found for this user');
    }
    auth.role = role;
    await auth.save();
    return auth;
  }

  // Delete authorization for a user
  async deleteAuthorization(userId: string): Promise<void> {
    const deleted = await AuthorizationModel.destroy({ where: { userId } });
    if (!deleted) {
      throw new NotFoundError('Authorization not found for this user');
    }
  }

  // List all authorizations, optionally filtered by role
  async listAuthorizations(role?: Role): Promise<AuthorizationModel[]> {
    const where = role ? { role } : undefined;
    return AuthorizationModel.findAll({ where, include: [UserModel] });
  }
}

// Singleton export
export const authorizationService = new AuthorizationService();
