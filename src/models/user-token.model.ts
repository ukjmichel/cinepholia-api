/**
 * Sequelize Model for User Tokens (UserToken).
 *
 * This model enforces that each user can have only **one token at a time**,
 * regardless of the token type. It is used for:
 * - Email verification
 * - Password reset
 * - Two-factor authentication (2FA)
 *
 * Features:
 * - `userId` is the primary key and foreign key → only one token per user.
 * - `token` is stored as a **hash** for security (never store raw tokens).
 * - `attempts` tracks the number of failed validations (for brute-force protection).
 * - `lastRequestAt` enforces rate limiting between token requests.
 * - `expiresAt` defines when the token becomes invalid (checked in queries).
 * - Cascade delete ensures tokens are removed when their user is deleted.
 */

import {
  Table,
  Model,
  Column,
  DataType,
  ForeignKey,
  BelongsTo,
  PrimaryKey,
} from 'sequelize-typescript';
import { Optional } from 'sequelize';
import { UserModel } from './user.model.js';

export type UserTokenType = 'verify_email' | 'reset_password' | '2fa';

export interface UserTokenAttributes {
  userId: string;
  type: UserTokenType;
  token: string; // stored as SHA-256 hash
  expiresAt: Date;
  attempts: number; // failed validation attempts
  lastRequestAt?: Date; // last time a token was requested
}

export interface UserTokenCreationAttributes
  extends Optional<UserTokenAttributes, 'attempts' | 'lastRequestAt'> {}

@Table({
  tableName: 'user_tokens',
  timestamps: true,
})
export class UserTokenModel
  extends Model<UserTokenAttributes, UserTokenCreationAttributes>
  implements UserTokenAttributes
{
  /** User ID is both primary key and foreign key → ensures one token per user */
  @PrimaryKey
  @ForeignKey(() => UserModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare userId: string;

  /** Token type (email verification, password reset, or 2FA) */
  @Column({
    type: DataType.ENUM('verify_email', 'reset_password', '2fa'),
    allowNull: false,
    validate: { isIn: [['verify_email', 'reset_password', '2fa']] },
  })
  declare type: UserTokenType;

  /**
   * Token hash (SHA-256). Raw tokens are never stored.
   * Marked as unique to prevent duplicate hashes.
   */
  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  declare token: string;

  /** Expiration date of the token */
  @Column({ type: DataType.DATE, allowNull: false })
  declare expiresAt: Date;

  /** Number of failed validation attempts */
  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare attempts: number;

  /** Timestamp of the last token request (for rate limiting) */
  @Column({ type: DataType.DATE, allowNull: true })
  declare lastRequestAt?: Date;

  /** Relation to User (cascade delete when user is removed) */
  @BelongsTo(() => UserModel, {
    foreignKey: 'userId',
    targetKey: 'userId',
    onDelete: 'CASCADE',
  })
  declare user: UserModel;
}
