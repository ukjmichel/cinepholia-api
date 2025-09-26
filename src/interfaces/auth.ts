/**
 * @module services/auth.service.interface
 * Public types and interface for the AuthService.
 */

import type { JwtPayload } from 'jsonwebtoken';
import { Role } from '../models/authorization.model';

/** Pair of JWTs returned by auth flows */
export interface AuthTokens {
  accessToken: string; // short-lived token
  refreshToken: string; // long-lived token
}

/** Minimal subject for token generation (DTO-friendly) */
export interface AuthSubject {
  userId: string;
  username?: string;
  email?: string;
  verified?: boolean;
  role?: string; // optional if you embed role in JWT
}

/** Payload stored inside the access token. Extend if you embed more claims. */
export interface AccessTokenPayload extends JwtPayload {
  userId: string;
  username?: string;
  email?: string;
  verified?: boolean;
  role?: string;
}

/** Payload stored inside the refresh token. */
export interface RefreshTokenPayload extends JwtPayload {
  userId: string;
}

/** Optional structure for debugging login attempts */
export interface LoginAttemptInfo {
  count: number;
  lastAttempt: Date;
}

/** Contract for the authentication service */
export interface IAuthService {
  // Core flows
  login(identifier: string, password: string): Promise<AuthTokens>;
  refreshTokens(refreshToken: string): Promise<AuthTokens>;
  logout(accessToken: string): Promise<void>;

  // Token helpers
  generateAccessToken(subject: AuthSubject): string;
  generateRefreshToken(subject: AuthSubject): string;
  generateTokens(subject: AuthSubject | Record<string, any>): AuthTokens;
  verifyAccessToken(token: string): Promise<AccessTokenPayload>;
  verifyRefreshToken(token: string): RefreshTokenPayload;

  // Blacklist / attempts utilities
  isTokenBlacklisted(token: string): Promise<boolean>;
  clearBlacklistedTokens(): void;
  clearLoginAttempts(identifier: string): void;
  getLoginAttempts(identifier: string): LoginAttemptInfo | undefined;
}

export interface AuthBag {
  userJwtPayload?: JwtPayload;
  userRole?: Role;
  user?: any; // optionally narrow to your UserDTO
}


/** Optional DI token if you use an IoC container */
export const AUTH_SERVICE_TOKEN = 'AuthService';
