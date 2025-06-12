/**
 * Sequelize Model for User Tokens (UserToken).
 *
 * This file defines a relational database model for managing tokens associated with users,
 * used for specific operations such as email verification, password reset,
 * and two-factor authentication (2FA).
 *
 * Key Points:
 * - `userId`: Unique identifier for the user, serving as the primary and foreign key for association with the user model.
 * - `type`: Type of token, which can be one of the following: 'verify_email', 'reset_password', or '2fa'.
 * - `token`: The token itself, stored as a string.
 * - `expiresAt`: Expiration date of the token, after which the token is no longer valid.
 *
 * The model is designed for use with SQL databases and includes timestamps
 * to automatically track the creation and update dates of records.
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

// Possible user token types
export type UserTokenType = 'verify_email' | 'reset_password' | '2fa';

export interface UserTokenAttributes {
  userId: string;
  type: UserTokenType;
  token: string;
  expiresAt: Date;
}

export interface UserTokenCreationAttributes
  extends Optional<UserTokenAttributes, never> {}

@Table({
  tableName: 'user_tokens',
  timestamps: true, // Includes createdAt and updatedAt fields
})
export class UserTokenModel
  extends Model<UserTokenAttributes, UserTokenCreationAttributes>
  implements UserTokenAttributes
{
  @PrimaryKey
  @ForeignKey(() => UserModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare userId: string;

  @Column({
    type: DataType.ENUM('verify_email', 'reset_password', '2fa'),
    allowNull: false,
    validate: {
      isIn: [['verify_email', 'reset_password', '2fa']],
    },
  })
  declare type: UserTokenType;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare token: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  declare expiresAt: Date;

  @BelongsTo(() => UserModel, {
    foreignKey: 'userId',
    targetKey: 'userId',
  })
  declare user: UserModel;
}
