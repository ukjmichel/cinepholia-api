/**
 * @module models/user-token.model.ts
 * @description Sequelize Model for User Authentication Tokens.
 *
 *
 * This file defines the `UserTokenModel` which manages secure, single-use tokens for
 * user authentication workflows including email verification, password reset, and
 * two-factor authentication (2FA). It uses `sequelize-typescript` for entity declaration.
 *
 * - **One token per user**: `userId` serves as both primary key and foreign key, ensuring
 *   each user can have only one active token at a time, regardless of type.
 * - **Security-first design**: Tokens are stored as SHA-256 hashes, never in raw form.
 * - **Brute-force protection**: The `attempts` field tracks failed validation attempts.
 * - **Rate limiting**: The `lastRequestAt` field enables time-based request throttling.
 * - **Automatic expiration**: The `expiresAt` field defines token validity period.
 * - **Token types**: Supports three workflows: email verification, password reset, and 2FA.
 * - **Cascade deletion**: Tokens are automatically removed when their associated user is deleted.
 * - **Automatic timestamps**: `createdAt` and `updatedAt` are managed automatically.
 * - The relationship with UserModel is defined in associations.ts to prevent circular dependencies.
 */

import {
  Table,
  Model,
  Column,
  DataType,
  ForeignKey,
  PrimaryKey,
} from 'sequelize-typescript';
import { Optional } from 'sequelize';
import { UserModel } from './user.model.js';

/**
 * @typedef {('verify_email'|'reset_password'|'2fa')} UserTokenType
 * @description Enumeration of supported token types in the authentication system
 * - verify_email: Token sent to verify user's email address after registration
 * - reset_password: Token sent to allow user to reset their forgotten password
 * - 2fa: Two-factor authentication token for additional security verification
 */
export type UserTokenType = 'verify_email' | 'reset_password' | '2fa';

/**
 * @interface UserTokenAttributes
 * @description Defines the complete structure of a user token record in the database
 *
 * @property {string} userId - Unique identifier of the user (primary key and foreign key)
 * @property {UserTokenType} type - Type of authentication token (verify_email, reset_password, or 2fa)
 * @property {string} token - SHA-256 hash of the token (never store raw tokens)
 * @property {Date} expiresAt - Expiration date/time after which the token is invalid
 * @property {number} attempts - Number of failed validation attempts (for brute-force protection)
 * @property {Date} [lastRequestAt] - Timestamp of the last token request (for rate limiting)
 * @property {Date} createdAt - Timestamp when the token was created (auto-generated)
 * @property {Date} updatedAt - Timestamp when the token was last updated (auto-generated)
 */
export interface UserTokenAttributes {
  userId: string;
  type: UserTokenType;
  token: string;
  expiresAt: Date;
  attempts: number;
  lastRequestAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * @interface UserTokenCreationAttributes
 * @description Attributes required for creating a new user token record
 * @extends {UserTokenAttributes}
 * @description Makes attempts, lastRequestAt, createdAt, and updatedAt optional as they have defaults
 */
export interface UserTokenCreationAttributes
  extends Optional<
    UserTokenAttributes,
    'attempts' | 'lastRequestAt' | 'createdAt' | 'updatedAt'
  > {}

/**
 * @class UserTokenModel
 * @extends {Model<UserTokenAttributes, UserTokenCreationAttributes>}
 * @implements {UserTokenAttributes}
 * @description Sequelize model for managing secure user authentication tokens
 *
 * This model implements a secure token management system with built-in protection against
 * common attacks. The one-token-per-user constraint ensures that requesting a new token
 * automatically invalidates any existing token, preventing token accumulation and reducing
 * attack surface. All tokens are hashed before storage for maximum security.
 *
 * @example
 * // Creating a new email verification token
 * import crypto from 'crypto';
 *
 * const rawToken = crypto.randomBytes(32).toString('hex');
 * const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
 * const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
 *
 * await UserTokenModel.create({
 *   userId: 'user-uuid',
 *   type: 'verify_email',
 *   token: hashedToken,
 *   expiresAt: expiresAt
 * });
 * // Send rawToken to user via email (never store it!)
 *
 * @example
 * // Validating a token and checking expiration
 * import crypto from 'crypto';
 *
 * const rawTokenFromUser = req.params.token;
 * const hashedToken = crypto.createHash('sha256').update(rawTokenFromUser).digest('hex');
 *
 * const tokenRecord = await UserTokenModel.findOne({
 *   where: {
 *     token: hashedToken,
 *     type: 'verify_email',
 *     expiresAt: { [Op.gt]: new Date() } // Check not expired
 *   }
 * });
 *
 * if (!tokenRecord) {
 *   throw new Error('Invalid or expired token');
 * }
 *
 * // Token is valid - proceed with verification
 * await tokenRecord.destroy(); // Remove token after successful use
 *
 * @example
 * // Creating a password reset token with rate limiting check
 * const existingToken = await UserTokenModel.findOne({
 *   where: { userId: 'user-uuid' }
 * });
 *
 * if (existingToken?.lastRequestAt) {
 *   const timeSinceLastRequest = Date.now() - existingToken.lastRequestAt.getTime();
 *   const minInterval = 5 * 60 * 1000; // 5 minutes
 *
 *   if (timeSinceLastRequest < minInterval) {
 *     throw new Error('Please wait before requesting another token');
 *   }
 * }
 *
 * // Generate new token (this replaces any existing token due to primary key)
 * await UserTokenModel.upsert({
 *   userId: 'user-uuid',
 *   type: 'reset_password',
 *   token: hashedToken,
 *   expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour
 *   lastRequestAt: new Date()
 * });
 *
 * @example
 * // Tracking failed validation attempts
 * const tokenRecord = await UserTokenModel.findOne({
 *   where: { token: hashedToken }
 * });
 *
 * if (!tokenRecord || !validateToken(rawToken)) {
 *   if (tokenRecord) {
 *     tokenRecord.attempts += 1;
 *     await tokenRecord.save();
 *
 *     // Lock account or invalidate token after too many attempts
 *     if (tokenRecord.attempts >= 5) {
 *       await tokenRecord.destroy();
 *       throw new Error('Too many failed attempts. Token invalidated.');
 *     }
 *   }
 *   throw new Error('Invalid token');
 * }
 *
 * // Valid token - reset attempts and proceed
 * tokenRecord.attempts = 0;
 * await tokenRecord.save();
 *
 * @example
 * // Creating a 2FA token with short expiration
 * await UserTokenModel.create({
 *   userId: 'user-uuid',
 *   type: '2fa',
 *   token: hashedToken,
 *   expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes for 2FA
 * });
 *
 * @example
 * // Cleaning up expired tokens (background job)
 * await UserTokenModel.destroy({
 *   where: {
 *     expiresAt: { [Op.lt]: new Date() }
 *   }
 * });
 *
 * @example
 * // Finding a user's current active token
 * const activeToken = await UserTokenModel.findOne({
 *   where: {
 *     userId: 'user-uuid',
 *     expiresAt: { [Op.gt]: new Date() }
 *   },
 *   include: [{ model: UserModel, as: 'user' }]
 * });
 */
@Table({
  tableName: 'user_tokens',
  timestamps: true,
})
export class UserTokenModel
  extends Model<UserTokenAttributes, UserTokenCreationAttributes>
  implements UserTokenAttributes
{
  /**
   * @property {string} userId
   * @description User identifier (primary key and foreign key to UserModel)
   * @type {string}
   * @primary
   * @foreignKey References UserModel.userId
   * @unique Ensures only one token per user at any time
   *
   * @note Being both primary key and foreign key enforces the one-token-per-user constraint.
   *       When a new token is created for a user, it automatically replaces any existing token.
   *
   * @example
   * '550e8400-e29b-41d4-a716-446655440000'
   */
  @PrimaryKey
  @ForeignKey(() => UserModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare userId: string;

  /**
   * @property {UserTokenType} type
   * @description Type of authentication token determining its purpose
   * @type {UserTokenType}
   * @required
   * @enum ['verify_email', 'reset_password', '2fa']
   * @validate Must be one of the three supported token types
   *
   * @example
   * 'verify_email' // For email address verification after registration
   * 'reset_password' // For password reset workflow
   * '2fa' // For two-factor authentication
   */
  @Column({
    type: DataType.ENUM('verify_email', 'reset_password', '2fa'),
    allowNull: false,
    validate: { isIn: [['verify_email', 'reset_password', '2fa']] },
  })
  declare type: UserTokenType;

  /**
   * @property {string} token
   * @description SHA-256 hash of the token
   * @type {string}
   * @required
   * @unique Prevents duplicate token hashes across all users
   * @security CRITICAL - This field stores the HASHED token, never the raw token value
   *
   * @example
   * // Storing a token (hashed)
   * const rawToken = crypto.randomBytes(32).toString('hex');
   * const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
   * // Store: hashedToken
   * // Send to user: rawToken
   *
   * '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8'
   *
   * @note Raw tokens should:
   *       - Be cryptographically random (use crypto.randomBytes)
   *       - Have sufficient entropy (at least 32 bytes)
   *       - Be sent to the user only once
   *       - Never be logged or stored in plain text
   */
  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  declare token: string;

  /**
   * @property {Date} expiresAt
   * @description Expiration date/time after which the token becomes invalid
   * @type {Date}
   * @required
   *
   * @example
   * // Email verification: 24 hours
   * new Date(Date.now() + 24 * 60 * 60 * 1000)
   *
   * // Password reset: 1 hour
   * new Date(Date.now() + 1 * 60 * 60 * 1000)
   *
   * // 2FA: 10 minutes
   * new Date(Date.now() + 10 * 60 * 1000)
   *
   * @note Always check token expiration before validation:
   *       WHERE expiresAt > NOW()
   */
  @Column({ type: DataType.DATE, allowNull: false })
  declare expiresAt: Date;

  /**
   * @property {number} attempts
   * @description Number of failed validation attempts
   * @type {number}
   * @required
   * @default 0
   *
   * @security Used for brute-force protection. Increment on each failed validation.
   *           Consider invalidating the token after 3-5 failed attempts.
   *
   * @example
   * // Increment on failed validation
   * token.attempts += 1;
   * await token.save();
   *
   * if (token.attempts >= 5) {
   *   await token.destroy(); // Invalidate after too many attempts
   *   throw new Error('Token invalidated due to too many failed attempts');
   * }
   */
  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare attempts: number;

  /**
   * @property {Date} lastRequestAt
   * @description Timestamp of the last token request (optional, for rate limiting)
   * @type {Date}
   * @optional
   *
   * @example
   * // Check rate limiting before creating new token
   * if (existingToken?.lastRequestAt) {
   *   const timeSince = Date.now() - existingToken.lastRequestAt.getTime();
   *   const minInterval = 5 * 60 * 1000; // 5 minutes
   *
   *   if (timeSince < minInterval) {
   *     throw new Error('Please wait 5 minutes before requesting another token');
   *   }
   * }
   *
   * // Update when creating new token
   * await UserTokenModel.upsert({
   *   userId: 'user-uuid',
   *   lastRequestAt: new Date(),
   *   // ... other fields
   * });
   *
   * @note Common rate limiting intervals:
   *       - Email verification: 5-10 minutes
   *       - Password reset: 5 minutes
   *       - 2FA: 1 minute
   */
  @Column({ type: DataType.DATE, allowNull: true })
  declare lastRequestAt?: Date;

  /**
   * @property {Date} createdAt
   * @description Timestamp when the token record was created
   * @type {Date}
   * @readonly
   */
  declare readonly createdAt: Date;

  /**
   * @property {Date} updatedAt
   * @description Timestamp when the token record was last updated
   * @type {Date}
   * @readonly
   */
  declare readonly updatedAt: Date;

  /**
   * ASSOCIATIONS - Defined in associations.ts
   * All relationships are centralized in associations.ts to prevent circular dependencies
   * and improve maintainability
   *
   * @property {UserModel} user
   * @description The user associated with this token
   * @type {UserModel}
   * @relation BelongsTo (defined in associations.ts)
   * @onDelete CASCADE - Token is automatically deleted when user is deleted
   */
  declare user: UserModel;
}
