import {
  Column,
  Model,
  Table,
  DataType,
  BeforeCreate,
  BeforeUpdate,
} from 'sequelize-typescript';
import bcrypt from 'bcrypt';
import { Optional } from 'sequelize';

export interface UserAttributes {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  verified: boolean;
}

export interface UserCreationAttributes
  extends Optional<UserAttributes, 'userId' | 'verified'> {}

@Table({ tableName: 'users', timestamps: true })
export class UserModel
  extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes
{
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
    unique: true,
  })
  declare userId: string;

  @Column({
    type: DataType.STRING,
    unique: true,
    allowNull: false,
    validate: {
      len: {
        args: [2, 20],
        msg: 'Username must be between 2 and 20 characters',
      },
      is: {
        args: /^[a-zA-Z0-9]+$/,
        msg: 'Username can only contain letters and numbers',
      },
    },
  })
  declare username: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    validate: {
      len: {
        args: [2, 30],
        msg: 'First name must be between 2 and 30 characters',
      },
      is: {
        args: /^[a-zA-ZÀ-ÖØ-öø-ÿ' -]+$/u,
        msg: 'First name can only contain letters, spaces, hyphens, and apostrophes',
      },
    },
  })
  declare firstName: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    validate: {
      len: {
        args: [2, 30],
        msg: 'Last name must be between 2 and 30 characters',
      },
      is: {
        args: /^[a-zA-ZÀ-ÖØ-öø-ÿ' -]+$/u,
        msg: 'Last name can only contain letters, spaces, hyphens, and apostrophes',
      },
    },
  })
  declare lastName: string;

  @Column({
    type: DataType.STRING,
    unique: true,
    allowNull: false,
    validate: {
      isEmail: {
        msg: 'Email must be valid',
      },
    },
  })
  declare email: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    // Optional: Add password strength validator here
  })
  declare password: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  declare verified: boolean;

  // --- Add these for full TypeScript typing support
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  async validatePassword(password: string): Promise<boolean> {
    return await bcrypt.compare(password, this.password);
  }

  @BeforeCreate
  @BeforeUpdate
  static async hashPassword(instance: UserModel) {
    if (instance.changed('password')) {
      // Uncomment for production only when debugging:
      // console.log('Password before hashing:', instance.password);
      const salt = await bcrypt.genSalt(10);
      instance.password = await bcrypt.hash(instance.password, salt);
    }
  }

  @BeforeCreate
  @BeforeUpdate
  static normalizeEmail(instance: UserModel) {
    if (instance.changed('email') && typeof instance.email === 'string') {
      instance.email = instance.email.toLowerCase();
    }
  }

  toJSON() {
    const attributes = { ...this.get() } as { [key: string]: any };
    delete attributes.password;
    return attributes;
  }
}
