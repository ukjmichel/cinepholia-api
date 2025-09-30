/**
 * @module models/user.model.ts
 * @description Sequelize Model for User Authentication and Profile Management.
 *
 *
 * This file defines the `UserModel` which manages user accounts, authentication, and profiles
 * in the cinema application with comprehensive security features and email verification.
 * It uses `sequelize-typescript` for entity declaration and bcrypt for password security.
 *
 * - Each user has a unique auto-generated UUID identifier (`userId`).
 * - **Security-first design**: Passwords are automatically hashed using bcrypt (salt level 10).
 * - **Data normalization**: Email and username are automatically trimmed and lowercased to prevent duplicates.
 * - **International support**: First and last names support accents, apostrophes, and hyphens.
 * - **Email verification system**: Boolean `verified` field tracks account verification status.
 * - **Password protection**: The `toJSON()` method automatically excludes passwords from responses.
 * - **Built-in validation**: Username (alphanumeric only), email format, and name constraints.
 * - **Password validation method**: Built-in `validatePassword()` for secure authentication.
 * - **Automatic hooks**: Password hashing and field normalization happen automatically on create/update.
 * - **Automatic timestamps**: `createdAt` and `updatedAt` are managed automatically.
 * - The relationships with AuthorizationModel, UserTokenModel, BookingModel, and IncidentReportModel
 *   are defined in associations.ts to prevent circular dependencies.
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

import { UserAttributes, UserCreationAttributes } from '../interfaces/user';
import { AuthorizationModel } from './authorization.model.js';
import { UserTokenModel } from './user-token.model.js';
import { BookingModel } from './booking.model.js';

/**
 * @class UserModel
 * @extends {Model<UserAttributes, UserCreationAttributes>}
 * @implements {UserAttributes}
 * @description Sequelize model for managing user accounts, authentication, and profiles
 *
 * This model provides comprehensive user management with built-in security features including
 * automatic password hashing, data normalization, and protection against common vulnerabilities.
 * The email verification system enables secure account activation workflows.
 *
 * @example
 * // Creating a new user (password is automatically hashed)
 * const user = await UserModel.create({
 *   username: 'johndoe',
 *   firstName: 'John',
 *   lastName: 'Doe',
 *   email: 'john.doe@example.com',
 *   password: 'securePassword123!',
 *   verified: false
 * });
 * // Email and username are automatically normalized (trimmed, lowercased)
 * // Password is automatically hashed with bcrypt
 *
 * @example
 * // Authenticating a user
 * const user = await UserModel.findOne({
 *   where: { email: 'john.doe@example.com' }
 * });
 *
 * if (user && await user.validatePassword('securePassword123!')) {
 *   // Authentication successful
 *   console.log('Login successful');
 * } else {
 *   // Authentication failed
 *   console.log('Invalid credentials');
 * }
 *
 * @example
 * // Updating user profile (names are trimmed automatically)
 * await user.update({
 *   firstName: 'Jean-Pierre',
 *   lastName: "O'Connor"
 * });
 * // International characters are supported in names
 *
 * @example
 * // Changing password (automatically hashed on update)
 * user.password = 'newSecurePassword456!';
 * await user.save();
 * // New password is automatically hashed
 *
 * @example
 * // Email verification workflow
 * const user = await UserModel.findOne({
 *   where: { email: 'john.doe@example.com' }
 * });
 *
 * user.verified = true;
 * await user.save();
 * console.log('Email verified successfully');
 *
 * @example
 * // Finding all verified users
 * const verifiedUsers = await UserModel.findAll({
 *   where: { verified: true },
 *   attributes: { exclude: ['password'] } // Exclude password from results
 * });
 *
 * @example
 * // Safe JSON serialization (password automatically excluded)
 * const user = await UserModel.findByPk('user-uuid');
 * const userJson = user.toJSON(); // Password field is automatically removed
 * res.json(userJson); // Safe to send to client
 *
 * @example
 * // Finding user with all relationships
 * const user = await UserModel.findOne({
 *   where: { userId: 'user-uuid' },
 *   include: [
 *     { model: AuthorizationModel, as: 'authorization' },
 *     { model: BookingModel, as: 'bookings' },
 *     { model: UserTokenModel, as: 'token' }
 *   ]
 * });
 */
@Table({ tableName: 'users', timestamps: true })
export class UserModel
  extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes
{
  /**
   * @property {string} userId
   * @description Unique identifier for the user (auto-generated UUIDv4)
   * @type {string}
   * @primary
   * @unique
   * @default Auto-generated UUIDv4
   *
   * @example
   * '550e8400-e29b-41d4-a716-446655440000'
   */
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
    unique: true,
  })
  declare userId: string;

  /**
   * @property {string} username
   * @description Unique username (alphanumeric only, automatically normalized)
   * @type {string}
   * @required
   * @unique
   * @minLength 2
   * @maxLength 20
   * @pattern Alphanumeric characters only (a-z, A-Z, 0-9)
   * @normalize Automatically trimmed and converted to lowercase
   *
   * @example
   * 'johndoe'
   * 'user123'
   * 'cinephile42'
   *
   * @note Input 'JohnDoe ' is automatically normalized to 'johndoe'
   */
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

  /**
   * @property {string} firstName
   * @description User's first name with international character support
   * @type {string}
   * @required
   * @minLength 2
   * @maxLength 30
   * @pattern Letters, spaces, hyphens, apostrophes, and accented characters
   * @normalize Automatically trimmed
   *
   * @example
   * 'John'
   * 'Jean-Pierre'
   * 'François'
   * 'María'
   * "O'Connor"
   *
   * @note Supports international characters: À-Ö, Ø-ö, ø-ÿ
   */
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

  /**
   * @property {string} lastName
   * @description User's last name with international character support
   * @type {string}
   * @required
   * @minLength 2
   * @maxLength 30
   * @pattern Letters, spaces, hyphens, apostrophes, and accented characters
   * @normalize Automatically trimmed
   *
   * @example
   * 'Doe'
   * 'García'
   * 'van der Berg'
   * "O'Neill"
   * 'Müller'
   *
   * @note Supports international characters: À-Ö, Ø-ö, ø-ÿ
   */
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

  /**
   * @property {string} email
   * @description User's email address (unique, automatically normalized)
   * @type {string}
   * @required
   * @unique
   * @validate Must be a valid email format
   * @normalize Automatically trimmed and converted to lowercase
   *
   * @example
   * 'john.doe@example.com'
   * 'user@cinema.com'
   * 'contact@movietheater.co.uk'
   *
   * @note Input 'John.Doe@Example.COM ' is normalized to 'john.doe@example.com'
   */
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

  /**
   * @property {string} password
   * @description User's password (automatically hashed with bcrypt)
   * @type {string}
   * @required
   * @security CRITICAL - Never stored in plaintext; automatically hashed with bcrypt (salt: 10)
   * @hidden Automatically excluded from JSON responses via toJSON() method
   *
   * @example
   * // Setting password (stored as hash)
   * user.password = 'mySecurePassword123!';
   * await user.save(); // Automatically hashed before storage
   *
   * // Validating password
   * const isValid = await user.validatePassword('mySecurePassword123!');
   *
   * @note Password hashing occurs automatically via @BeforeCreate and @BeforeUpdate hooks
   * @note Consider adding password strength validation (min length, complexity requirements)
   */
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare password: string;

  /**
   * @property {boolean} verified
   * @description Email verification status
   * @type {boolean}
   * @required
   * @default false
   *
   * @example
   * false // User has not verified their email
   * true  // User has verified their email
   *
   * @note Used in email verification workflows:
   *       1. User registers (verified = false)
   *       2. Verification email sent with token
   *       3. User clicks link and verifies (verified = true)
   *       4. User can now access full features
   */
  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  declare verified: boolean;

  /**
   * @property {Date} createdAt
   * @description Timestamp when the user account was created
   * @type {Date}
   * @readonly
   */
  declare readonly createdAt: Date;

  /**
   * @property {Date} updatedAt
   * @description Timestamp when the user account was last updated
   * @type {Date}
   * @readonly
   */
  declare readonly updatedAt: Date;

  /**
   * @method validatePassword
   * @description Validates a plaintext password against the stored hash
   * @param {string} password - Plaintext password to verify
   * @returns {Promise<boolean>} True if the password matches, false otherwise
   *
   * @example
   * // During login
   * const user = await UserModel.findOne({ where: { email: 'user@example.com' } });
   * const isValid = await user.validatePassword('userEnteredPassword');
   *
   * if (isValid) {
   *   // Generate session token, log user in
   *   console.log('Authentication successful');
   * } else {
   *   // Return error
   *   console.log('Invalid password');
   * }
   *
   * @security Uses bcrypt.compare for secure timing-attack-resistant comparison
   */
  async validatePassword(password: string): Promise<boolean> {
    return await bcrypt.compare(password, this.password);
  }

  /**
   * @hook BeforeCreate, BeforeUpdate
   * @method hashPassword
   * @description Automatically hashes the password before saving to database
   * @static
   * @param {UserModel} instance - The user instance being saved
   *
   * @security
   * - Only hashes if password field has changed (prevents double-hashing)
   * - Uses bcrypt with salt rounds of 10 for strong security
   * - Salt is generated individually for each password
   *
   * @example
   * // Automatically triggered on user.save() or UserModel.create()
   * user.password = 'newPassword123'; // Plaintext
   * await user.save(); // Hook automatically hashes before saving
   * // user.password is now a bcrypt hash
   *
   * @note This hook is transparent to the developer - no manual hashing needed
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
   * @hook BeforeCreate, BeforeUpdate
   * @method normalizeFields
   * @description Automatically normalizes user data for consistency
   * @static
   * @param {UserModel} instance - The user instance being saved
   *
   * Normalization operations:
   * - **Email**: Trimmed and converted to lowercase to prevent duplicate accounts
   * - **Username**: Trimmed and converted to lowercase for case-insensitive matching
   * - **First/Last Names**: Trimmed to remove leading/trailing whitespace
   *
   * @example
   * // Input
   * user.email = '  John.Doe@Example.COM  ';
   * user.username = '  JohnDoe123  ';
   * user.firstName = '  Jean-Pierre  ';
   * await user.save();
   *
   * // After normalization
   * user.email // 'john.doe@example.com'
   * user.username // 'johndoe123'
   * user.firstName // 'Jean-Pierre' (no extra spaces)
   *
   * @note This prevents duplicate accounts due to case/whitespace differences
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
   * @method toJSON
   * @description Secure JSON serialization that excludes the password field
   * @returns {Object} User data without the password field
   *
   * @security Automatically removes the password hash from JSON output to prevent
   *           accidental exposure in API responses, logs, or error messages
   *
   * @example
   * // Without toJSON override
   * const user = await UserModel.findByPk('user-uuid');
   * res.json(user); // Would include password hash - SECURITY RISK
   *
   * // With toJSON override (automatic)
   * const user = await UserModel.findByPk('user-uuid');
   * res.json(user); // Password field automatically removed - SAFE
   *
   * @example
   * // Explicit usage
   * const user = await UserModel.findByPk('user-uuid');
   * const safeData = user.toJSON();
   * console.log(safeData.password); // undefined
   * console.log(safeData.email); // 'user@example.com'
   *
   * @note This method is called automatically by JSON.stringify() and most frameworks
   */
  toJSON() {
    const attributes = { ...this.get() } as { [key: string]: any };
    delete attributes.password;
    return attributes;
  }

  /**
   * ASSOCIATIONS - Defined in associations.ts
   * All relationships are centralized in associations.ts to prevent circular dependencies
   * and improve maintainability
   *
   * @property {AuthorizationModel} authorization
   * @description User's role and authorization level (one-to-one relationship)
   * @type {AuthorizationModel}
   * @relation HasOne (defined in associations.ts)
   */
  declare authorization: AuthorizationModel;

  /**
   * @property {UserTokenModel} token
   * @description User's active token for verification/reset/2FA (one-to-one relationship)
   * @type {UserTokenModel}
   * @relation HasOne (defined in associations.ts)
   * @note Only one active token per user at any time
   */
  declare token: UserTokenModel;

  /**
   * @property {BookingModel[]} bookings
   * @description All movie bookings made by this user (one-to-many relationship)
   * @type {BookingModel[]}
   * @relation HasMany (defined in associations.ts)
   */
  declare bookings: BookingModel[];
}
