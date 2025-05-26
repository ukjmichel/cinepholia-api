import { Op } from 'sequelize';
import {
  UserTokenModel,
  UserTokenAttributes,
  UserTokenType,
} from '../models/user-token.model.js';
import { UserModel } from '../models/user.model.js';
import { NotFoundError } from '../errors/not-found-error.js';
import { UnauthorizedError } from '../errors/unauthorized-error.js';
import { BadRequestError } from '../errors/bad-request-error.js';

export class UserTokenService {
  constructor(
    private readonly userTokenModel = UserTokenModel,
    private readonly userModel = UserModel
  ) {}

  /**
   * Create a new token for a user, deleting any previous token for this user.
   * Throws NotFoundError if user does not exist.
   * Throws Error if the token was not created successfully.
   */
  async createOrReplaceToken(
    data: UserTokenAttributes
  ): Promise<UserTokenModel> {
    // 1. Check if user exists
    const user = await this.userModel.findByPk(data.userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // 2. Remove any existing token for this user (no error if nothing deleted)
    await this.userTokenModel.destroy({ where: { userId: data.userId } });

    // 3. Create the new token
    const token = await this.userTokenModel.create(data);
    if (!token) {
      throw new Error('Failed to create new user token');
    }

    return token;
  }

  /**
   * Find a token by its string value. Throws NotFoundError if not found.
   */
  async findToken(token: string): Promise<UserTokenModel> {
    const userToken = await this.userTokenModel.findOne({ where: { token } });
    if (!userToken) throw new NotFoundError('Token not found');
    return userToken;
  }

  /**
   * Find the token for a specific user. Throws NotFoundError if not found.
   */
  async findByUserId(userId: string): Promise<UserTokenModel> {
    const userToken = await this.userTokenModel.findOne({ where: { userId } });
    if (!userToken) throw new NotFoundError('Token for this user not found');
    return userToken;
  }

  /**
   * Delete the token for a user, if it exists. Throws NotFoundError if not found.
   */
  async deleteTokenForUser(userId: string): Promise<void> {
    const deleted = await this.userTokenModel.destroy({ where: { userId } });
    if (deleted === 0)
      throw new NotFoundError('No token found to delete for this user');
  }

  /**
   * Delete all expired tokens (does not throw).
   */
  async deleteExpiredTokens(): Promise<number> {
    return this.userTokenModel.destroy({
      where: {
        expiresAt: {
          [Op.lt]: new Date(),
        },
      },
    });
  }

  /**
   * Update the token for a user. Throws NotFoundError if not found.
   */
  async updateTokenForUser(
    userId: string,
    update: Partial<UserTokenAttributes>
  ): Promise<UserTokenModel> {
    const [count, rows] = await this.userTokenModel.update(update, {
      where: { userId },
      returning: true,
    });
    if (count === 0 || !rows.length)
      throw new NotFoundError('Token for this user not found');
    return rows[0];
  }

  /**
   * Finds and validates a token, optionally checking the token type.
   * @param token The token string to validate
   * @param expectedType Optional: a UserTokenType or array of allowed types
   * @returns The valid UserTokenModel instance
   * @throws NotFoundError, BadRequestError
   */
  async validateToken(
    token: string,
    expectedType?: UserTokenType | UserTokenType[]
  ): Promise<UserTokenModel> {
    // Use this.userTokenModel instead of UserTokenModel directly
    const tokenInstance = await this.userTokenModel.findOne({
      where: { token },
    });
    if (!tokenInstance) {
      throw new NotFoundError('Token not found');
    }
    if (tokenInstance.expiresAt < new Date()) {
      // Delete expired token and throw UnauthorizedError to match test expectations
      await tokenInstance.destroy();
      throw new UnauthorizedError('Token expired');
    }
    if (
      expectedType &&
      (Array.isArray(expectedType)
        ? !expectedType.includes(tokenInstance.type)
        : tokenInstance.type !== expectedType)
    ) {
      throw new BadRequestError(
        `Invalid token type. Expected ${Array.isArray(expectedType) ? expectedType.join(' or ') : expectedType}, got "${tokenInstance.type}".`
      );
    }
    return tokenInstance;
  }
}

export const userTokenService = new UserTokenService();
