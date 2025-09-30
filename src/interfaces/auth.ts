/**
 * @module interfaces/auth
 * @description Public types and interfaces for the Authentication Service.
 *
 * This module defines the contracts for authentication and authorization operations,
 * including JWT token management, user authentication flows, and session handling.
 * It provides type-safe interfaces for login, token refresh, and logout operations.
 *
 * @see {@link IAuthService} for the main service contract
 * @see {@link AuthTokens} for token pair structure
 */

import type { JwtPayload } from 'jsonwebtoken';
import { Role } from '../models/authorization.model';

/**
 * @interface AuthTokens
 * @description Pair of JWT tokens returned by authentication flows
 *
 * @property {string} accessToken - Short-lived token for API requests (typically 15-60 minutes)
 * @property {string} refreshToken - Long-lived token for obtaining new access tokens (typically 7-30 days)
 *
 * @example
 * const tokens: AuthTokens = {
 *   accessToken: 'eyJhbGciOiJIUzI1NiIs...',
 *   refreshToken: 'eyJhbGciOiJIUzI1NiIs...'
 * };
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * @interface AuthSubject
 * @description Minimal subject information for token generation (DTO-friendly)
 *
 * Used when generating JWT tokens. Contains the essential user information
 * that will be embedded in the token payload.
 *
 * @property {string} userId - Unique user identifier (required)
 * @property {string} [username] - Username (optional)
 * @property {string} [email] - Email address (optional)
 * @property {boolean} [verified] - Email verification status (optional)
 * @property {string} [role] - User role (optional, can be embedded in JWT)
 *
 * @example
 * const subject: AuthSubject = {
 *   userId: 'user-uuid-123',
 *   username: 'john_doe',
 *   email: 'john@example.com',
 *   verified: true,
 *   role: 'user'
 * };
 */
export interface AuthSubject {
  userId: string;
  username?: string;
  email?: string;
  verified?: boolean;
  role?: string;
}

/**
 * @interface AccessTokenPayload
 * @extends {JwtPayload}
 * @description Payload structure stored inside the access token
 *
 * Contains user information and JWT standard claims (iat, exp, etc.).
 * Can be extended with additional custom claims as needed.
 *
 * @property {string} userId - Unique user identifier
 * @property {string} [username] - Username
 * @property {string} [email] - Email address
 * @property {boolean} [verified] - Email verification status
 * @property {string} [role] - User role
 * @property {number} [iat] - Issued at timestamp (from JwtPayload)
 * @property {number} [exp] - Expiration timestamp (from JwtPayload)
 * @property {string} [sub] - Subject (from JwtPayload)
 *
 * @example
 * const payload: AccessTokenPayload = {
 *   userId: 'user-uuid-123',
 *   username: 'john_doe',
 *   email: 'john@example.com',
 *   verified: true,
 *   role: 'admin',
 *   iat: 1609459200,
 *   exp: 1609462800
 * };
 */
export interface AccessTokenPayload extends JwtPayload {
  userId: string;
  username?: string;
  email?: string;
  verified?: boolean;
  role?: string;
}

/**
 * @interface RefreshTokenPayload
 * @extends {JwtPayload}
 * @description Payload structure stored inside the refresh token
 *
 * Contains minimal information (only userId) to reduce token size and
 * improve security by limiting exposed data in long-lived tokens.
 *
 * @property {string} userId - Unique user identifier
 * @property {number} [iat] - Issued at timestamp (from JwtPayload)
 * @property {number} [exp] - Expiration timestamp (from JwtPayload)
 *
 * @example
 * const payload: RefreshTokenPayload = {
 *   userId: 'user-uuid-123',
 *   iat: 1609459200,
 *   exp: 1612051200
 * };
 */
export interface RefreshTokenPayload extends JwtPayload {
  userId: string;
}

/**
 * @interface LoginAttemptInfo
 * @description Structure for tracking and debugging login attempts
 *
 * Used for rate limiting and security monitoring to prevent brute-force attacks.
 *
 * @property {number} count - Number of failed login attempts
 * @property {Date} lastAttempt - Timestamp of the most recent attempt
 *
 * @example
 * const attemptInfo: LoginAttemptInfo = {
 *   count: 3,
 *   lastAttempt: new Date('2025-01-15T10:30:00Z')
 * };
 */
export interface LoginAttemptInfo {
  count: number;
  lastAttempt: Date;
}

/**
 * @interface IAuthService
 * @description Contract for the authentication service
 *
 * Defines all operations related to user authentication, token management,
 * and session control. Implementations should handle JWT generation,
 * validation, and secure storage of tokens.
 *
 * @example
 * class AuthService implements IAuthService {
 *   async login(identifier: string, password: string): Promise<AuthTokens> {
 *     // Implementation
 *   }
 *   // ... other methods
 * }
 */
export interface IAuthService {
  /**
   * @method login
   * @description Authenticate a user and generate token pair
   *
   * @param {string} identifier - Username or email address
   * @param {string} password - User's password (plaintext)
   * @returns {Promise<AuthTokens>} Token pair (access + refresh tokens)
   * @throws {Error} If credentials are invalid or user not found
   *
   * @example
   * const tokens = await authService.login('john@example.com', 'password123');
   * // Use tokens.accessToken for API requests
   * // Store tokens.refreshToken securely
   */
  login(identifier: string, password: string): Promise<AuthTokens>;

  /**
   * @method refreshTokens
   * @description Generate new token pair using a valid refresh token
   *
   * @param {string} refreshToken - Valid refresh token
   * @returns {Promise<AuthTokens>} New token pair
   * @throws {Error} If refresh token is invalid, expired, or blacklisted
   *
   * @example
   * const newTokens = await authService.refreshTokens(oldRefreshToken);
   */
  refreshTokens(refreshToken: string): Promise<AuthTokens>;

  /**
   * @method logout
   * @description Invalidate access token and terminate user session
   *
   * @param {string} accessToken - Access token to invalidate
   * @returns {Promise<void>}
   *
   * @example
   * await authService.logout(userAccessToken);
   * // Token is now blacklisted and cannot be used
   */
  logout(accessToken: string): Promise<void>;

  /**
   * @method generateAccessToken
   * @description Generate a short-lived access token
   *
   * @param {AuthSubject} subject - User information to embed in token
   * @returns {string} Signed JWT access token
   *
   * @example
   * const accessToken = authService.generateAccessToken({
   *   userId: 'user-123',
   *   email: 'user@example.com',
   *   role: 'admin'
   * });
   */
  generateAccessToken(subject: AuthSubject): string;

  /**
   * @method generateRefreshToken
   * @description Generate a long-lived refresh token
   *
   * @param {AuthSubject} subject - User information to embed in token
   * @returns {string} Signed JWT refresh token
   *
   * @example
   * const refreshToken = authService.generateRefreshToken({
   *   userId: 'user-123'
   * });
   */
  generateRefreshToken(subject: AuthSubject): string;

  /**
   * @method generateTokens
   * @description Generate both access and refresh tokens simultaneously
   *
   * @param {AuthSubject | Record<string, any>} subject - User information
   * @returns {AuthTokens} Token pair
   *
   * @example
   * const tokens = authService.generateTokens({
   *   userId: 'user-123',
   *   username: 'john_doe',
   *   role: 'staff'
   * });
   */
  generateTokens(subject: AuthSubject | Record<string, any>): AuthTokens;

  /**
   * @method verifyAccessToken
   * @description Verify and decode an access token
   *
   * @param {string} token - Access token to verify
   * @returns {Promise<AccessTokenPayload>} Decoded token payload
   * @throws {Error} If token is invalid, expired, or blacklisted
   *
   * @example
   * try {
   *   const payload = await authService.verifyAccessToken(token);
   *   console.log(`User ID: ${payload.userId}`);
   * } catch (error) {
   *   console.error('Invalid token');
   * }
   */
  verifyAccessToken(token: string): Promise<AccessTokenPayload>;

  /**
   * @method verifyRefreshToken
   * @description Verify and decode a refresh token
   *
   * @param {string} token - Refresh token to verify
   * @returns {RefreshTokenPayload} Decoded token payload
   * @throws {Error} If token is invalid or expired
   *
   * @example
   * const payload = authService.verifyRefreshToken(refreshToken);
   * console.log(`User ID: ${payload.userId}`);
   */
  verifyRefreshToken(token: string): RefreshTokenPayload;

  /**
   * @method isTokenBlacklisted
   * @description Check if a token has been blacklisted (invalidated)
   *
   * @param {string} token - Token to check
   * @returns {Promise<boolean>} True if token is blacklisted
   *
   * @example
   * if (await authService.isTokenBlacklisted(token)) {
   *   throw new Error('Token has been revoked');
   * }
   */
  isTokenBlacklisted(token: string): Promise<boolean>;

  /**
   * @method clearBlacklistedTokens
   * @description Remove expired tokens from the blacklist
   *
   * Should be called periodically to prevent memory/storage bloat.
   *
   * @returns {void}
   *
   * @example
   * // Run cleanup daily
   * setInterval(() => {
   *   authService.clearBlacklistedTokens();
   * }, 24 * 60 * 60 * 1000);
   */
  clearBlacklistedTokens(): void;

  /**
   * @method clearLoginAttempts
   * @description Reset failed login attempt counter for a user
   *
   * Should be called after successful login.
   *
   * @param {string} identifier - Username or email
   * @returns {void}
   *
   * @example
   * authService.clearLoginAttempts('john@example.com');
   */
  clearLoginAttempts(identifier: string): void;

  /**
   * @method getLoginAttempts
   * @description Retrieve login attempt information for a user
   *
   * @param {string} identifier - Username or email
   * @returns {LoginAttemptInfo | undefined} Attempt info or undefined if none
   *
   * @example
   * const attempts = authService.getLoginAttempts('john@example.com');
   * if (attempts && attempts.count > 5) {
   *   throw new Error('Account temporarily locked');
   * }
   */
  getLoginAttempts(identifier: string): LoginAttemptInfo | undefined;
}

/**
 * @interface AuthBag
 * @description Authentication context bag for request handling
 *
 * Typically attached to HTTP requests after authentication middleware
 * runs. Contains decoded JWT payload and user information.
 *
 * @property {JwtPayload} [userJwtPayload] - Decoded JWT payload
 * @property {Role} [userRole] - User's role from authorization system
 * @property {any} [user] - Full user object (can be narrowed to UserDTO)
 *
 * @example
 * // In middleware
 * req.auth = {
 *   userJwtPayload: decodedToken,
 *   userRole: 'admin',
 *   user: userDto
 * };
 *
 * @example
 * // In route handler
 * const authBag: AuthBag = req.auth;
 * if (authBag.userRole === 'admin') {
 *   // Allow access
 * }
 */
export interface AuthBag {
  userJwtPayload?: JwtPayload;
  userRole?: Role;
  user?: any; // optionally narrow to your UserDTO
}

/**
 * @constant AUTH_SERVICE_TOKEN
 * @description DI token for authentication service (if using IoC container)
 *
 * @type {string}
 *
 * @example
 * // With dependency injection
 * container.bind(AUTH_SERVICE_TOKEN).to(AuthService);
 *
 * @example
 * // Resolving service
 * const authService = container.get<IAuthService>(AUTH_SERVICE_TOKEN);
 */
export const AUTH_SERVICE_TOKEN = 'AuthService';
