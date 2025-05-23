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
  @ForeignKey(() => UserModel)
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    unique: true,
    allowNull: false,
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


