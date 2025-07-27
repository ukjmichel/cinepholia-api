import jwt, { JwtPayload } from 'jsonwebtoken';
import ms from 'ms';
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

export class AuthService {
  private loginAttempts = new Map<
    string,
    { count: number; lastAttempt: Date }
  >();
  private blacklistedTokens = new Set<string>();

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

  generateRefreshToken(user: UserModel): string {
    return jwt.sign({ userId: user.userId }, config.jwtRefreshSecret, {
      expiresIn: config.jwtRefreshExpiresIn as ms.StringValue,
    });
  }

  generateTokens(user: UserModel): AuthTokens {
    return {
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user),
    };
  }

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

  verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      return jwt.verify(token, config.jwtRefreshSecret) as RefreshTokenPayload;
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    const decoded = this.verifyRefreshToken(refreshToken);
    const user = await userService.getUserById(decoded.userId);
    if (!user) throw new NotFoundError('User not found');
    return this.generateTokens(user);
  }

  public async logout(accessToken: string): Promise<void> {
    this.blacklistedTokens.add(accessToken);
  }

  public async isTokenBlacklisted(token: string): Promise<boolean> {
    return this.blacklistedTokens.has(token);
  }

  public clearBlacklistedTokens(): void {
    this.blacklistedTokens.clear();
  }

  public clearLoginAttempts(identifier: string): void {
    this.loginAttempts.delete(identifier);
  }

  public getLoginAttempts(
    identifier: string
  ): { count: number; lastAttempt: Date } | undefined {
    return this.loginAttempts.get(identifier);
  }
}

export const authService = new AuthService();
