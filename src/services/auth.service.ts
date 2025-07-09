import jwt, { JwtPayload } from 'jsonwebtoken';
import ms from 'ms';
import { userService } from './user.service.js';
import { NotFoundError } from '../errors/not-found-error.js';
import { UnauthorizedError } from '../errors/unauthorized-error.js';
import { UserModel } from '../models/user.model.js';
import { config } from '../config/env.js';

/**
 * Interface for authentication tokens.
 */
export interface AuthTokens {
  /** JWT access token for request authentication */
  accessToken: string;
  /** Refresh token to generate new access tokens */
  refreshToken: string;
}

/**
 * Payload of the JWT access token.
 */
export interface AccessTokenPayload extends JwtPayload {
  userId: string;
  username: string;
  email: string;
  verified: boolean;
}

/**
 * Payload of the JWT refresh token.
 */
export interface RefreshTokenPayload extends JwtPayload {
  userId: string;
}

/**
 * Authentication and JWT management service.
 * Provides methods for login, refresh, brute force tracking, and blacklisting.
 */
export class AuthService {
  /** Tracks failed login attempts for brute force protection */
  private loginAttempts = new Map<
    string,
    { count: number; lastAttempt: Date }
  >();

  /** Blacklist for revoked JWT tokens (in-memory; use Redis for production) */
  private blacklistedTokens = new Set<string>();

  /**
   * Authenticates a user and returns signed access/refresh tokens.
   * Tracks failed login attempts for brute force protection.
   * @param identifier Username or email.
   * @param password Plain text password.
   * @returns {Promise<AuthTokens>} Access/refresh tokens.
   * @throws {UnauthorizedError|NotFoundError}
   */
  async login(identifier: string, password: string): Promise<AuthTokens> {
    // Brute force protection: max 5 attempts within 15min
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
      // Update attempt tracking
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
    // Reset attempts on success
    this.loginAttempts.delete(identifier);
    return this.generateTokens(user);
  }

  /**
   * Generates a signed access JWT token for a user.
   * @param user User model.
   * @returns {string} Signed JWT access token.
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
   * Generates a signed refresh JWT token for a user.
   * @param user User model.
   * @returns {string} Signed JWT refresh token.
   */
  generateRefreshToken(user: UserModel): string {
    const payload: RefreshTokenPayload = {
      userId: user.userId,
    };
    return jwt.sign(payload, config.jwtRefreshSecret, {
      expiresIn: config.jwtRefreshExpiresIn as ms.StringValue,
    });
  }

  /**
   * Generates both access and refresh tokens for a user.
   * @param user User model.
   * @returns {AuthTokens}
   */
  generateTokens(user: UserModel): AuthTokens {
    return {
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user),
    };
  }

  /**
   * Verifies and decodes an access JWT token.
   * @param token Access token.
   * @returns {AccessTokenPayload} Decoded payload.
   * @throws {UnauthorizedError} If invalid or expired.
   */
  verifyAccessToken(token: string): AccessTokenPayload {
    if (this.isTokenBlacklisted(token)) {
      throw new UnauthorizedError('Token has been revoked.');
    }
    try {
      return jwt.verify(token, config.jwtSecret) as AccessTokenPayload;
    } catch (error) {
      throw new UnauthorizedError('Invalid access token');
    }
  }

  /**
   * Verifies and decodes a refresh JWT token.
   * @param token Refresh token.
   * @returns {RefreshTokenPayload} Decoded payload.
   * @throws {UnauthorizedError} If invalid or expired.
   */
  verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      return jwt.verify(token, config.jwtRefreshSecret) as RefreshTokenPayload;
    } catch (error) {
      throw new UnauthorizedError('Invalid refresh token');
    }
  }

  /**
   * Uses a refresh token to generate new tokens for the user.
   * @param refreshToken The refresh token from cookies.
   * @returns {Promise<AuthTokens>} New tokens.
   * @throws {UnauthorizedError|NotFoundError}
   */
  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    const decoded = this.verifyRefreshToken(refreshToken);
    const user = await userService.getUserById(decoded.userId);
    if (!user) throw new NotFoundError('User not found');
    return this.generateTokens(user);
  }

  /**
   * Blacklists (revokes) a JWT access token.
   * Use when logging out.
   * @param accessToken The access token to blacklist.
   */
  public async logout(accessToken: string): Promise<void> {
    this.blacklistedTokens.add(accessToken);
  }

  /**
   * Checks if an access token is blacklisted (revoked).
   * @param token The JWT access token.
   * @returns True if revoked, false otherwise.
   */
  public isTokenBlacklisted(token: string): boolean {
    return this.blacklistedTokens.has(token);
  }

  /**
   * Clears all tokens from the blacklist.
   * Useful for tests or admin maintenance.
   */
  public clearBlacklistedTokens(): void {
    this.blacklistedTokens.clear();
  }

  /**
   * Clears login attempts for a given identifier (username or email).
   * @param identifier Username or email.
   */
  public clearLoginAttempts(identifier: string): void {
    this.loginAttempts.delete(identifier);
  }

  /**
   * Gets the login attempts info for a given identifier.
   * @param identifier Username or email.
   * @returns The attempts info, or undefined.
   */
  public getLoginAttempts(
    identifier: string
  ): { count: number; lastAttempt: Date } | undefined {
    return this.loginAttempts.get(identifier);
  }
}

/**
 * Singleton instance for the AuthService.
 */
export const authService = new AuthService();
