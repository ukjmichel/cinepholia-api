import jwt, { JwtPayload } from 'jsonwebtoken';
import ms from 'ms';
import bcrypt from 'bcrypt'; // Optional, if you use bcrypt for manual password validation
import { userService } from './user.service.js';
import { NotFoundError } from '../errors/not-found-error.js';
import { UnauthorizedError } from '../errors/unauthorized-error.js';
import { UserModel } from '../models/user.model.js';
import { config } from '../config/env.js';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AccessTokenPayload extends JwtPayload {
  userId: string;
  username: string;
  email: string;
  verified: boolean;
}

export interface RefreshTokenPayload extends JwtPayload {
  userId: string;
}

export interface PasswordResetTokenPayload extends JwtPayload {
  userId: string;
}

export class AuthService {
  private blacklistedTokens = new Set<string>();
  private loginAttempts = new Map<
    string,
    { count: number; lastAttempt: Date }
  >();

  constructor() {
    this.validateConfig();
  }

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

    // Validate expiration format
    this.validateExpirationFormat(config.jwtExpiresIn, 'JWT_EXPIRES_IN');
    this.validateExpirationFormat(
      config.jwtRefreshExpiresIn,
      'JWT_REFRESH_EXPIRES_IN'
    );
  }

  private validateExpirationFormat(
    value: string | number,
    configName: string
  ): void {
    if (typeof value === 'number') return; // Numbers are valid

    if (typeof value === 'string') {
      // Validate common time formats: '15m', '1h', '7d', '30s', etc.
      if (!/^(\d+)(s|m|h|d|w|y|ms)$/.test(value)) {
        throw new Error(
          `Invalid ${configName} format: ${value}. Use formats like '15m', '1h', '7d' or number of seconds`
        );
      }
    } else {
      throw new Error(`${configName} must be a string or number`);
    }
  }

  // Authenticate user and return tokens
  async login(
    identifier: string,
    password: string,
    metadata?: { ip?: string; userAgent?: string }
  ): Promise<AuthTokens> {
    // Check rate limit
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
        // Track failed attempt
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

      // Clear attempts on successful login
      this.loginAttempts.delete(identifier);

      // Log successful login (in production, use proper logging service)
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

  // Generate JWT access token
  generateAccessToken(user: UserModel): string {
    const payload = {
      userId: user.userId,
      username: user.username,
      email: user.email,
      verified: user.verified,
    };

    // Validate the config value exists
    if (!config.jwtExpiresIn) {
      throw new Error('JWT_EXPIRES_IN must be defined');
    }

    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn as ms.StringValue,
    });
  }

  // Generate JWT refresh token
  generateRefreshToken(user: UserModel): string {
    const payload = { userId: user.userId };

    // Validate the config value exists
    if (!config.jwtRefreshExpiresIn) {
      throw new Error('JWT_REFRESH_EXPIRES_IN must be defined');
    }

    return jwt.sign(payload, config.jwtRefreshSecret, {
      expiresIn: config.jwtRefreshExpiresIn as ms.StringValue,
    });
  }

  generateTokens(user: UserModel): AuthTokens {
    return {
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user),
    };
  }

  // Verify access token
  verifyAccessToken(token: string): AccessTokenPayload {
    console.log('[verifyAccessToken] token received:', token); // Add this line!
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as AccessTokenPayload;
      return decoded;
    } catch (error) {
      throw new UnauthorizedError(`Invalid access token ${token}`);
    }
  }

  // Verify refresh token
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

  // Refresh tokens
  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    try {
      const decoded = this.verifyRefreshToken(refreshToken);
      const user = await userService.getUserById(decoded.userId);

      if (!user) throw new NotFoundError('User not found');

      // Optional: Check if user is still active/verified
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

  // Logout - blacklist the access token
  async logout(accessToken: string): Promise<void> {
    this.blacklistedTokens.add(accessToken);
    // In production, use Redis or database for persistence across server restarts
    // await redis.sadd('blacklisted_tokens', accessToken);
  }

  // Password reset token generation
  generatePasswordResetToken(user: UserModel): string {
    const payload = { userId: user.userId };

    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: '1h' as ms.StringValue,
    });
  }

  // Verify password reset token
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

  // Clear login attempts (useful for admin functions)
  clearLoginAttempts(identifier: string): void {
    this.loginAttempts.delete(identifier);
  }

  // Get login attempts (useful for monitoring)
  getLoginAttempts(
    identifier: string
  ): { count: number; lastAttempt: Date } | undefined {
    return this.loginAttempts.get(identifier);
  }

  // Clear blacklisted tokens (cleanup method)
  clearBlacklistedTokens(): void {
    this.blacklistedTokens.clear();
  }

  // Check if token is blacklisted
  isTokenBlacklisted(token: string): boolean {
    return this.blacklistedTokens.has(token);
  }
}

export const authService = new AuthService();
