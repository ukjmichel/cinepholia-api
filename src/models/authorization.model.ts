/**
 * Sequelize Authorization Model for Managing User Roles.
 *
 * This file defines the `AuthorizationModel` which associates a user (`UserModel`) with a specific role
 * in the application (among "user", "employee", "administrator").
 * It uses `sequelize-typescript` for entity declaration and relationship management.
 *
 * - Each authorization references a user via a foreign key (`userId`).
 * - Deletion or modification of a user is propagated (CASCADE).
 * - The role is stored as a SQL enumeration (`ENUM`).
 * - The relationship is established via `@BelongsTo` to allow navigation to the associated user.
 *
 * Attributes:
 *   - userId: Unique identifier of the user (primary and foreign key).
 *   - role: Role assigned to the user in the application.
 *
 * Relations:
 *   - An authorization record belongs to a user (UserModel).
 *
 * SQL Table: 'authorization'
 * Timestamps: enabled (automatic creation/update)
 *
 * Example Usage:
 *   - Checking access rights based on role.
 *   - Assigning and updating user roles.
 */

import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { UserModel } from './user.model.js';

export type Role = 'utilisateur' | 'employé' | 'administrateur';

export interface AuthorizationAttributes {
  userId: string;
  role: Role;
}

@Table({ tableName: 'authorization', timestamps: true })
export class AuthorizationModel
  extends Model<AuthorizationAttributes>
  implements AuthorizationAttributes
{
  // Identifiant utilisateur (clé primaire et clé étrangère vers UserModel)
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

 
  @Column({
    type: DataType.ENUM('utilisateur', 'employé', 'administrateur'),
    allowNull: false,
    defaultValue: 'utilisateur',
  })
  declare role: Role;


  @BelongsTo(() => UserModel, {
    foreignKey: 'userId',
    targetKey: 'userId',
  })
  declare user: UserModel;
}
