/**
 * Sequelize Model for Users (UserModel).
 *
 * This file defines the data model for users in the cinema application.
 * It manages authentication, user profiles, and account security with an integrated email verification system.
 * Implementation done with sequelize-typescript for strict typing and advanced password security management.
 *
 * Main Features:
 *  - Each user has a unique auto-generated UUID identifier.
 *  - Secure authentication system with bcrypt password hashing.
 *  - Strict validation of usernames (alphanumeric only).
 *  - Support for international characters in first and last names.
 *  - Automatic data normalization (trim, lowercase for email/username).
 *  - Email verification system with a boolean status.
 *  - Protection against password exposure via overridden toJSON().
 *  - Automatic hooks for password hashing and data normalization.
 *  - Built-in method for password validation.
 *  - Timestamps (createdAt, updatedAt) are automatically added thanks to the timestamps option.
 *
 * Associated Interfaces:
 *   - UserAttributes: complete structure of a user in the database.
 *   - UserCreationAttributes: optional fields during creation (auto-managed userId, verified).
 *
 * Security:
 *   - Automatic password hashing with bcrypt and a salt level of 10.
 *   - Normalization of emails and usernames to prevent duplicates.
 *   - Automatic exclusion of the password during JSON serialization.
 *   - Validation of standard email formats.
 *
 * Uses:
 *   - Creation and management of user accounts.
 *   - Authentication and validation of logins.
 *   - Management of profiles and personal information.
 *   - Basis for relationships with bookings and histories.
 *   - Email verification system for account security.
 */

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

// Complete structure of a user
export interface UserAttributes {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  verified: boolean;
}

// Optional fields during creation (auto-generated userId, default verified as false)
export interface UserCreationAttributes
  extends Optional<UserAttributes, 'userId' | 'verified'> {}

// Definition of the UserModel
@Table({ tableName: 'users', timestamps: true })
export class UserModel
  extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes
{
  // Unique identifier for the user (auto-generated UUID, primary key)
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
    unique: true,
  })
  declare userId: string;

  // Unique username (alphanumeric only, 2-20 characters)
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

  // First name (support for international characters and accents)
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

  // Last name (support for international characters and accents)
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

  // Unique email address (standard format validation)
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

  // Password (stored hashed via bcrypt, never in plaintext)
  @Column({
    type: DataType.STRING,
    allowNull: false,
    // Optional: Add password strength validation here
  })
  declare password: string;

  // Email verification status (default: false)
  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  declare verified: boolean;

  // Automatic timestamps (creation and update)
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  /**
   * Method for password validation.
   * Compares the plaintext password with the stored hash.
   *
   * @param password - Plaintext password to verify
   * @returns Promise<boolean> - true if the password matches
   */
  async validatePassword(password: string): Promise<boolean> {
    return await bcrypt.compare(password, this.password);
  }

  /**
   * Automatic hook for password hashing.
   * Executed before creation and update if the password has changed.
   * Uses bcrypt with a salt level of 10 for security.
   */
  @BeforeCreate
  @BeforeUpdate
  static async hashPassword(instance: UserModel) {
    if (instance.changed('password')) {
      const salt = await bcrypt.genSalt(10);
      instance.password = await bcrypt.hash(instance.password, salt);
    }
  }

  /**
   * Automatic hook for field normalization.
   * Executed before creation and update to standardize data.
   * - Email and username: trim + lowercase to prevent duplicates
   * - Names: trim to remove extra spaces
   */
  @BeforeCreate
  @BeforeUpdate
  static normalizeFields(instance: UserModel) {
    if (instance.changed('email') && typeof instance.email === 'string') {
      instance.email = instance.email.trim().toLowerCase();
    }
    if (instance.changed('username') && typeof instance.username === 'string') {
      instance.username = instance.username.trim().toLowerCase();
    }
    if (
      instance.changed('firstName') &&
      typeof instance.firstName === 'string'
    ) {
      instance.firstName = instance.firstName.trim();
    }
    if (instance.changed('lastName') && typeof instance.lastName === 'string') {
      instance.lastName = instance.lastName.trim();
    }
  }

  /**
   * Secure JSON serialization.
   * Automatically excludes the hashed password from JSON responses
   * to prevent accidental exposure of sensitive data.
   *
   * @returns Object - User data without the password
   */
  toJSON() {
    const attributes = { ...this.get() } as { [key: string]: any };
    delete attributes.password;
    return attributes;
  }
}
