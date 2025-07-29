/**
 * Service for managing user tokens.
 *
 * Handles CRUD operations for tokens, ensures user existence, and manages
 * token lifecycles (creation, replacement, validation, expiration).
 * Supports enforcing single token per user, token expiration, and
 * type-checking for specialized tokens (refresh, email, etc).
 *
 * Main features:
 * - Create or replace a token for a user (removes any old token).
 * - Find a token by string value, or by user.
 * - Update or delete a token for a user.
 * - Delete all expired tokens in batch.
 * - Validate a token (existence, expiration, and optionally type).
 * - Throws NotFoundError, UnauthorizedError, BadRequestError on error conditions.
 *
 * Dependencies:
 * - UserTokenModel for DB access to tokens.
 * - UserModel for user existence validation.
 * - Uses custom application errors.
 *
 * @author Your development team
 * @version 1.0.0
 * @since 2024
 */

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
   * @param {UserTokenAttributes} data - Token attributes for creation.
   * @returns {Promise<UserTokenModel>} The created user token instance.
   * @throws {NotFoundError} If the user does not exist.
   * @throws {Error} If creation failed.
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
   * Find a token by its string value.
   * @param {string} token - Token string.
   * @returns {Promise<UserTokenModel>} The token instance.
   * @throws {NotFoundError} If not found.
   */
  async findToken(token: string): Promise<UserTokenModel> {
    const userToken = await this.userTokenModel.findOne({ where: { token } });
    if (!userToken) throw new NotFoundError('Token not found');
    return userToken;
  }

  /**
   * Find the token for a specific user.
   * @param {string} userId - User ID.
   * @returns {Promise<UserTokenModel>} The user's token.
   * @throws {NotFoundError} If no token is found for the user.
   */
  async findByUserId(userId: string): Promise<UserTokenModel> {
    const userToken = await this.userTokenModel.findOne({ where: { userId } });
    if (!userToken) throw new NotFoundError('Token for this user not found');
    return userToken;
  }

  /**
   * Delete the token for a user, if it exists.
   * @param {string} userId - User ID.
   * @returns {Promise<void>}
   * @throws {NotFoundError} If no token is found to delete for this user.
   */
  async deleteTokenForUser(userId: string): Promise<void> {
    const deleted = await this.userTokenModel.destroy({ where: { userId } });
    if (deleted === 0)
      throw new NotFoundError('No token found to delete for this user');
  }

  /**
   * Delete all expired tokens.
   * @returns {Promise<number>} Number of deleted tokens.
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
   * Update the token for a user.
   * @param {string} userId - User ID.
   * @param {Partial<UserTokenAttributes>} update - Fields to update.
   * @returns {Promise<UserTokenModel>} The updated token instance.
   * @throws {NotFoundError} If no token is found for the user.
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
   * @param {string} token - The token string to validate.
   * @param {UserTokenType | UserTokenType[]} [expectedType] - Optional: a UserTokenType or array of allowed types.
   * @returns {Promise<UserTokenModel>} The valid UserTokenModel instance.
   * @throws {NotFoundError} If the token is not found.
   * @throws {UnauthorizedError} If the token is expired.
   * @throws {BadRequestError} If the token type does not match.
   */
  async validateToken(
    token: string,
    expectedType?: UserTokenType | UserTokenType[]
  ): Promise<UserTokenModel> {
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
