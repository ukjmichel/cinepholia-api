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
import { UserModel } from './user.model';

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
  timestamps: true,
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
