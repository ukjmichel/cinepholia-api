/**
 * Authentication service and JWT token management.
 *
 * This service handles complete user authentication, generation
 * and validation of JWT tokens (access and refresh), protection against
 * brute force attacks, and management of revoked tokens.
 *
 * Main features:
 * - User authentication with attempt limiting
 * - Generation of secure JWT tokens (access + refresh)
 * - Validation and verification of tokens
 * - Blacklist system for token revocation
 * - Management of password reset tokens
 * - Protection against brute force attacks
 * - Logging of connections for security
 *
 */

import jwt, { JwtPayload } from 'jsonwebtoken';
import ms from 'ms';
import { userService } from './user.service.js';
import { NotFoundError } from '../errors/not-found-error.js';
import { UnauthorizedError } from '../errors/unauthorized-error.js';
import { UserModel } from '../models/user.model.js';
import { config } from '../config/env.js';

/**
 * Interface for authentication tokens.
 * Contains access and refresh tokens.
 */
export interface AuthTokens {
  /** JWT access token for request authentication */
  accessToken: string;
  /** Refresh token to generate new access tokens */
  refreshToken: string;
}

/**
 * Payload of the JWT access token.
 * Contains user information necessary for authorization.
 */
export interface AccessTokenPayload extends JwtPayload {
  /** Unique user identifier */
  userId: string;
  /** Username */
  username: string;
  /** User's email address */
  email: string;
  /** Account verification status */
  verified: boolean;
}

/**
 * Payload of the JWT refresh token.
 * Contains only the user identifier for security.
 */
export interface RefreshTokenPayload extends JwtPayload {
  /** Unique user identifier */
  userId: string;
}

/**
 * Payload of the password reset token.
 * Used to secure the reset process.
 */
export interface PasswordResetTokenPayload extends JwtPayload {
  /** Unique user identifier */
  userId: string;
}

/**
 * Login metadata for logging and security.
 */
interface LoginMetadata {
  /** Connection IP address */
  ip?: string;
  /** Browser User-Agent */
  userAgent?: string;
}

/**
 * Main authentication service.
 * Manages all aspects of JWT authentication and connection security.
 */
export class AuthService {
  /** Set of revoked tokens (blacklist) */
  private blacklistedTokens = new Set<string>();

  /** Map of login attempts for brute force protection */
  private loginAttempts = new Map<
    string,
    { count: number; lastAttempt: Date }
  >();

  /**
   * Constructor of the authentication service.
   * Validates JWT configuration at startup.
   */
  constructor() {
    this.validateConfig();
  }

  /**
   * Validates the required JWT configuration.
   * Checks that all JWT parameters are correctly defined.
   *
   * @throws {Error} If the JWT configuration is invalid
   * @private
   */
  private validateConfig(): void {
    if (!config.jwtSecret || typeof config.jwtSecret !== 'string') {
      throw new Error('JWT_SECRET must be a non-empty string');
    }
    if (
      !config.jwtRefreshSecret ||
      typeof config.jwtRefreshSecret !== 'string'
    ) {
      throw new Error('JWT_REFRESH_SECRET must be a non-empty string');
    }
    if (!config.jwtExpiresIn) {
      throw new Error('JWT_EXPIRES_IN must be defined');
    }
    if (!config.jwtRefreshExpiresIn) {
      throw new Error('JWT_REFRESH_EXPIRES_IN must be defined');
    }

    // Validation of expiration formats
    this.validateExpirationFormat(config.jwtExpiresIn, 'JWT_EXPIRES_IN');
    this.validateExpirationFormat(
      config.jwtRefreshExpiresIn,
      'JWT_REFRESH_EXPIRES_IN'
    );
  }

  /**
   * Validates the format of JWT expiration durations.
   * Accepts formats like '15m', '1h', '7d' or numbers of seconds.
   *
   * @param value - Value to validate
   * @param configName - Name of the configuration parameter
   * @throws {Error} If the format is invalid
   * @private
   */
  private validateExpirationFormat(
    value: string | number,
    configName: string
  ): void {
    if (typeof value === 'number') return; // Numbers are valid

    if (typeof value === 'string') {
      // Validation of common time formats: '15m', '1h', '7d', '30s', etc.
      if (!/^(\d+)(s|m|h|d|w|y|ms)$/.test(value)) {
        throw new Error(
          `Invalid ${configName} format: ${value}. Use formats like '15m', '1h', '7d' or number of seconds`
        );
      }
    } else {
      throw new Error(`${configName} must be a string or number`);
    }
  }

  /**
   * Authenticates a user and returns JWT tokens.
   * Includes protection against brute force attacks.
   *
   * @param identifier - Username or email
   * @param password - Plain text password
   * @param metadata - Login metadata (IP, User-Agent)
   * @returns {Promise<AuthTokens>} Access and refresh tokens
   * @throws {UnauthorizedError} If credentials are invalid or too many attempts
   * @throws {NotFoundError} If the user does not exist
   */
   async login(
    identifier: string,
    password: string,
    metadata?: LoginMetadata
  ): Promise<AuthTokens> {
    // Check login attempt limitation
    const attempts = this.loginAttempts.get(identifier);
    if (
      attempts &&
      attempts.count >= 5 &&
      Date.now() - attempts.lastAttempt.getTime() < 15 * 60 * 1000
    ) {
      throw new UnauthorizedError(
        'Too many login attempts. Please try again later.'
      );
    }

    try {
      const user = await userService.getUserByUsernameOrEmail(identifier);
      if (!user) throw new NotFoundError('User not found');

      const valid = await user.validatePassword(password);
      if (!valid) {
        // Record failed attempt
        const current = this.loginAttempts.get(identifier) || {
          count: 0,
          lastAttempt: new Date(),
        };
        this.loginAttempts.set(identifier, {
          count: current.count + 1,
          lastAttempt: new Date(),
        });
        throw new UnauthorizedError('Invalid credentials');
      }

      // Remove attempts on successful login
      this.loginAttempts.delete(identifier);

      // Log successful login (in production, use a logging service)
      if (metadata?.ip) {
        console.log(
          `User ${user.userId} logged in from ${metadata.ip} at ${new Date().toISOString()}`
        );
      }

      const accessToken = this.generateAccessToken(user);
      const refreshToken = this.generateRefreshToken(user);

      return { accessToken, refreshToken };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generates an access JWT token for a user.
   * Contains user information necessary for authorization.
   *
   * @param user - User model
   * @returns {string} Signed JWT access token
   * @throws {Error} If the JWT configuration is invalid
   */
  generateAccessToken(user: UserModel): string {
    const payload = {
      userId: user.userId,
      username: user.username,
      email: user.email,
      verified: user.verified,
    };

    // Validate the existence of the configuration
    if (!config.jwtExpiresIn) {
      throw new Error('JWT_EXPIRES_IN must be defined');
    }

    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn as ms.StringValue,
    });
  }

  /**
   * Generates a refresh JWT token for a user.
   * Contains only the user ID for security.
   *
   * @param user - User model
   * @returns {string} Signed JWT refresh token
   * @throws {Error} If the JWT configuration is invalid
   */
  generateRefreshToken(user: UserModel): string {
    const payload = { userId: user.userId };

    // Validate the existence of the configuration
    if (!config.jwtRefreshExpiresIn) {
      throw new Error('JWT_REFRESH_EXPIRES_IN must be defined');
    }

    return jwt.sign(payload, config.jwtRefreshSecret, {
      expiresIn: config.jwtRefreshExpiresIn as ms.StringValue,
    });
  }

  /**
   * Generates a complete set of tokens for a user.
   * Utility method that combines the generation of access and refresh tokens.
   *
   * @param user - User model
   * @returns {AuthTokens} Pair of tokens (access + refresh)
   */
  generateTokens(user: UserModel): AuthTokens {
    return {
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user),
    };
  }

  /**
   * Verifies and decodes an access JWT token.
   * Validates the signature and validity of the token.
   *
   * @param token - Access token to verify
   * @returns {AccessTokenPayload} Decoded token payload
   * @throws {UnauthorizedError} If the token is invalid or expired
   */
  verifyAccessToken(token: string): AccessTokenPayload {
    console.log('[verifyAccessToken] token received:', token); // Log for debugging
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as AccessTokenPayload;
      return decoded;
    } catch (error) {
      throw new UnauthorizedError(`Invalid access token ${token}`);
    }
  }

  /**
   * Verifies and decodes a refresh JWT token.
   * Validates the signature and validity of the refresh token.
   *
   * @param token - Refresh token to verify
   * @returns {RefreshTokenPayload} Decoded token payload
   * @throws {UnauthorizedError} If the token is invalid or expired
   */
  verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      const decoded = jwt.verify(
        token,
        config.jwtRefreshSecret
      ) as RefreshTokenPayload;
      return decoded;
    } catch (error) {
      throw new UnauthorizedError('Invalid refresh token');
    }
  }

  /**
   * Refreshes a pair of tokens from a refresh token.
   * Generates new access and refresh tokens.
   *
   * @param refreshToken - Valid refresh token
   * @returns {Promise<AuthTokens>} New access and refresh tokens
   * @throws {UnauthorizedError} If the refresh token is invalid
   * @throws {NotFoundError} If the user no longer exists
   */
  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    try {
      const decoded = this.verifyRefreshToken(refreshToken);
      const user = await userService.getUserById(decoded.userId);

      if (!user) throw new NotFoundError('User not found');

      // Optional: Check if the user is still active/verified
      // if (!user.isActive) throw new UnauthorizedError('User account is deactivated');

      return {
        accessToken: this.generateAccessToken(user),
        refreshToken: this.generateRefreshToken(user),
      };
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new UnauthorizedError('Invalid refresh token');
    }
  }

  /**
   * Logs out a user by adding their token to the blacklist.
   * The token becomes immediately invalid.
   *
   * @param accessToken - Access token to revoke
   * @returns {Promise<void>}
   * @note In production, use Redis or a database for persistence
   */
  async logout(accessToken: string): Promise<void> {
    this.blacklistedTokens.add(accessToken);
    // In production, use Redis or a database for persistence
    // await redis.sadd('blacklisted_tokens', accessToken);
  }

  /**
   * Generates a password reset token.
   * Limited duration token (1h) to secure the reset process.
   *
   * @param user - User for whom to generate the token
   * @returns {string} Signed reset token
   */
  generatePasswordResetToken(user: UserModel): string {
    const payload = { userId: user.userId };

    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: '1h' as ms.StringValue,
    });
  }

  /**
   * Verifies a password reset token.
   * Validates the signature and temporal validity of the token.
   *
   * @param token - Reset token to verify
   * @returns {PasswordResetTokenPayload} Decoded token payload
   * @throws {UnauthorizedError} If the token is invalid or expired
   */
  verifyPasswordResetToken(token: string): PasswordResetTokenPayload {
    try {
      const decoded = jwt.verify(
        token,
        config.jwtSecret
      ) as PasswordResetTokenPayload;
      return decoded;
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired password reset token');
    }
  }

  /**
   * Clears login attempts for a given identifier.
   * Utility function for administrators.
   *
   * @param identifier - Username or email
   */
  clearLoginAttempts(identifier: string): void {
    this.loginAttempts.delete(identifier);
  }

  /**
   * Retrieves information about login attempts.
   * Useful for monitoring and security alerts.
   *
   * @param identifier - Username or email
   * @returns {object|undefined} Information about attempts or undefined
   */
  getLoginAttempts(
    identifier: string
  ): { count: number; lastAttempt: Date } | undefined {
    return this.loginAttempts.get(identifier);
  }

  /**
   * Clears all tokens from the blacklist.
   * Cleanup method for maintenance.
   */
  clearBlacklistedTokens(): void {
    this.blacklistedTokens.clear();
  }

  /**
   * Checks if a token is in the blacklist.
   * Used by authentication middlewares.
   *
   * @param token - Token to check
   * @returns {boolean} true if the token is revoked
   */
  isTokenBlacklisted(token: string): boolean {
    return this.blacklistedTokens.has(token);
  }
}

/**
 * Singleton instance of the authentication service.
 * Used throughout the application to maintain consistency.
 */
export const authService = new AuthService();
