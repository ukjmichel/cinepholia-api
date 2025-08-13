/**
 * @module services/auth.service
 *
 * @description
 * Provides user authentication and authorization token management using JWT.
 *
 * @features
 * - User login with brute-force attempt tracking and lockout
 * - Generation of short-lived access tokens and long-lived refresh tokens
 * - Refresh token verification and issuance of new token pairs
 * - Token blacklisting to handle logout
 * - Utility methods for clearing blacklists and login attempts
 *
 * @security
 * - Limits login attempts to prevent brute-force attacks
 * - Blacklisted tokens are denied access even if they are not expired
 * - Uses separate secrets and expirations for access and refresh tokens
 *
 * @dependencies
 * - jsonwebtoken: for token signing and verification
 * - ms: for parsing expiration times
 * - userService: for user retrieval and password validation
 * - NotFoundError / UnauthorizedError: for consistent error handling
 * - Sequelize UserModel for user data representation
 */
import jwt, { JwtPayload } from 'jsonwebtoken';
import ms from 'ms';
import { userService } from './user.service.js';
import { NotFoundError } from '../errors/not-found-error.js';
import { UnauthorizedError } from '../errors/unauthorized-error.js';
import { UserModel } from '../models/user.model.js';
import { config } from '../config/env.js';

/**
 * Represents a pair of JWT tokens used for authentication.
 */
export interface AuthTokens {
  /** Short-lived token for accessing protected routes */
  accessToken: string;
  /** Long-lived token for refreshing the access token */
  refreshToken: string;
}

/**
 * Payload stored inside the access token.
 */
export interface AccessTokenPayload extends JwtPayload {
  /** Unique ID of the authenticated user */
  userId: string;
  /** Username of the authenticated user */
  username: string;
  /** Email of the authenticated user */
  email: string;
  /** Whether the user has verified their account */
  verified: boolean;
}

/**
 * Payload stored inside the refresh token.
 */
export interface RefreshTokenPayload extends JwtPayload {
  /** Unique ID of the authenticated user */
  userId: string;
}

/**
 * Authentication service responsible for:
 * - User login and login attempt throttling
 * - Generating, verifying, and refreshing JWT tokens
 * - Token blacklisting for logout
 */
export class AuthService {
  /** Tracks failed login attempts for throttling */
  private loginAttempts = new Map<
    string,
    { count: number; lastAttempt: Date }
  >();

  /** Stores blacklisted access tokens after logout */
  private blacklistedTokens = new Set<string>();

  /**
   * Attempts to log in a user with a username/email and password.
   * Tracks failed attempts to prevent brute-force attacks.
   *
   * @param identifier - Username or email of the user.
   * @param password - Plain-text password.
   * @returns Newly generated access and refresh tokens.
   * @throws {UnauthorizedError} Too many login attempts or invalid credentials.
   * @throws {NotFoundError} User not found.
   */
  async login(identifier: string, password: string): Promise<AuthTokens> {
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

    const user = await userService.getUserByUsernameOrEmail(identifier);
    if (!user) throw new NotFoundError('User not found');

    const valid = await user.validatePassword(password);
    if (!valid) {
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

    this.loginAttempts.delete(identifier);
    return this.generateTokens(user);
  }

  /**
   * Generates a short-lived access token for the given user.
   *
   * @param user - Sequelize user model instance.
   * @returns Signed JWT access token.
   */
  generateAccessToken(user: UserModel): string {
    const payload: AccessTokenPayload = {
      userId: user.userId,
      username: user.username,
      email: user.email,
      verified: user.verified,
    };
    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn as ms.StringValue,
    });
  }

  /**
   * Generates a long-lived refresh token for the given user.
   *
   * @param user - Sequelize user model instance.
   * @returns Signed JWT refresh token.
   */
  generateRefreshToken(user: UserModel): string {
    return jwt.sign({ userId: user.userId }, config.jwtRefreshSecret, {
      expiresIn: config.jwtRefreshExpiresIn as ms.StringValue,
    });
  }

  /**
   * Generates both access and refresh tokens for the given user.
   *
   * @param user - Sequelize user model instance.
   * @returns Object containing `accessToken` and `refreshToken`.
   */
  generateTokens(user: UserModel): AuthTokens {
    return {
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user),
    };
  }

  /**
   * Verifies the validity of an access token and checks if it is blacklisted.
   *
   * @param token - JWT access token.
   * @returns Decoded access token payload.
   * @throws {UnauthorizedError} Token is invalid or revoked.
   */
  public async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    if (await this.isTokenBlacklisted(token)) {
      throw new UnauthorizedError('Token has been revoked.');
    }
    try {
      return jwt.verify(token, config.jwtSecret) as AccessTokenPayload;
    } catch {
      throw new UnauthorizedError('Invalid access token');
    }
  }

  /**
   * Verifies the validity of a refresh token.
   *
   * @param token - JWT refresh token.
   * @returns Decoded refresh token payload.
   * @throws {UnauthorizedError} Token is invalid.
   */
  verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      return jwt.verify(token, config.jwtRefreshSecret) as RefreshTokenPayload;
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }
  }

  /**
   * Generates a new pair of tokens from a valid refresh token.
   *
   * @param refreshToken - Refresh token to verify.
   * @returns New access and refresh tokens.
   * @throws {NotFoundError} User not found.
   * @throws {UnauthorizedError} Invalid refresh token.
   */
  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    const decoded = this.verifyRefreshToken(refreshToken);
    const user = await userService.getUserById(decoded.userId);
    if (!user) throw new NotFoundError('User not found');
    return this.generateTokens(user);
  }

  /**
   * Logs out the user by blacklisting their access token.
   *
   * @param accessToken - Token to blacklist.
   */
  public async logout(accessToken: string): Promise<void> {
    this.blacklistedTokens.add(accessToken);
  }

  /**
   * Checks whether a token is in the blacklist.
   *
   * @param token - Token to check.
   * @returns True if token is blacklisted, false otherwise.
   */
  public async isTokenBlacklisted(token: string): Promise<boolean> {
    return this.blacklistedTokens.has(token);
  }

  /**
   * Clears all blacklisted tokens.
   * Intended for testing or administrative use.
   */
  public clearBlacklistedTokens(): void {
    this.blacklistedTokens.clear();
  }

  /**
   * Clears recorded login attempts for a given identifier.
   *
   * @param identifier - Username or email to reset attempts for.
   */
  public clearLoginAttempts(identifier: string): void {
    this.loginAttempts.delete(identifier);
  }

  /**
   * Retrieves login attempt information for a given identifier.
   *
   * @param identifier - Username or email to check.
   * @returns Object with count and lastAttempt date, or undefined if no attempts.
   */
  public getLoginAttempts(
    identifier: string
  ): { count: number; lastAttempt: Date } | undefined {
    return this.loginAttempts.get(identifier);
  }
}

export const authService = new AuthService();
