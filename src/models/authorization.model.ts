/**
 * @module models/authorization.model.ts
 * @description Sequelize Authorization Model for Managing User Roles.
 *
 *
 * This file defines the `AuthorizationModel` which associates a user (`UserModel`) with a specific role
 * in the application (among "user", "staff", "admin").
 * It uses `sequelize-typescript` for entity declaration and relationship management.
 *
 * - Each authorization references a user via a foreign key (`userId`).
 * - Deletion or modification of a user is propagated (CASCADE).
 * - The role is stored as a SQL enumeration (`ENUM`).
 * - The relationship to UserModel is NOW established in associations.ts
 */

import {
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { UserModel } from './user.model.js';

/**
 * @typedef {('user'|'staff'|'admin')} Role
 * @description Enumeration of available user roles in the system
 */
export type Role = 'user' | 'staff' | 'admin';

/**
 * @interface AuthorizationAttributes
 * @description Defines the structure of an authorization record
 *
 * @property {string} userId - Unique identifier of the user (primary and foreign key)
 * @property {Role} role - Role assigned to the user in the application
 */
export interface AuthorizationAttributes {
  userId: string;
  role: Role;
}

/**
 * @class AuthorizationModel
 * @extends {Model<AuthorizationAttributes>}
 * @implements {AuthorizationAttributes}
 * @description Sequelize model for user authorization and role management
 *
 * @example
 * // Checking access rights based on role
 * const auth = await AuthorizationModel.findOne({ where: { userId: 'user-uuid' } });
 * if (auth.role === 'admin') {
 *   // Grant admin access
 * }
 *
 * @example
 * // Assigning and updating user roles
 * await AuthorizationModel.create({
 *   userId: 'user-uuid',
 *   role: 'staff'
 * });
 */
@Table({ tableName: 'authorization', timestamps: true })
export class AuthorizationModel
  extends Model<AuthorizationAttributes>
  implements AuthorizationAttributes
{
  /**
   * @property {string} userId
   * @description User identifier (primary key and foreign key to UserModel)
   * @type {string}
   * @primary
   * @unique
   * @required
   */
  @ForeignKey(() => UserModel)
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    unique: true,
    allowNull: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  declare userId: string;

  /**
   * @property {Role} role
   * @description Role assigned to the user (user, staff, or admin)
   * @type {Role}
   * @default 'user'
   * @required
   */
  @Column({
    type: DataType.ENUM('user', 'staff', 'admin'),
    allowNull: false,
    defaultValue: 'user',
  })
  declare role: Role;
  declare user: UserModel;
}
