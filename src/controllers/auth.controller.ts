/**
 * @module controllers/auth.controller
 *
 * Handles user authentication flows
 */

import { Request, Response, NextFunction, CookieOptions } from 'express';
import { authService } from '../services/auth.service.js';
import userService from '../services/user.service.js';
import { BadRequestError } from '../errors/bad-request-error.js';
import { UnauthorizedError } from '../errors/unauthorized-error.js';
import { NotFoundError } from '../errors/not-found-error.js';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { authorizationService } from '../services/authorization.service.js';
import { Role } from '../models/authorization.model.js';
import { toPublicUserWithRole } from '../utils/to-public-user-with-role.js';

class AuthController {
  private readonly isProd = process.env.NODE_ENV === 'production';
  private readonly crossSite = process.env.CROSS_SITE === '1';

  private readonly baseCookie: CookieOptions = {
    httpOnly: true,
    path: '/',
    sameSite: this.crossSite ? 'none' : 'lax',
    secure: this.crossSite ? true : this.isProd, // SameSite=None requires Secure
    // NOTE: do NOT set `domain` for localhost/127.0.0.1
  };

  private readonly ACCESS_MAX_AGE = 60 * 60 * 1000; // 1 hour
  private readonly REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

  /** Internal: find a user by email or username using the new service API */
  private findUserByIdentifier = async (emailOrUsername: string) => {
    const byEmail = emailOrUsername.includes('@');
    const search = await userService.search({
      page: 1,
      limit: 1,
      filters: byEmail
        ? { email: emailOrUsername }
        : { username: emailOrUsername },
    } as any);
    return search.items[0] ?? null;
  };

  /**
   * Logs in a user by validating credentials and issuing secure JWT cookies.
   */
  public login = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { identifier, password } = req.body;
      if (!identifier || !password) {
        throw new BadRequestError(
          'Email or username and password are required'
        );
      }

      // Verify credentials & get tokens
      const tokens = await authService.login(identifier, password);

      // Retrieve user using the new service API
      const user = await this.findUserByIdentifier(identifier);
      if (!user) {
        throw new BadRequestError('User not found');
      }

      // Ensure the user has a role; default to 'user'
      let role: Role = 'user';
      if ((user as any).userId) {
        let authorization = await authorizationService.get(
          (user as any).userId
        );
        if (!authorization) {
          authorization = await authorizationService.create({
            userId: (user as any).userId,
            role: 'user',
          });
        }
        if (authorization?.role) {
          role = authorization.role as Role;
        }
      }

      // Set cookies with environment-aware policy
      res.cookie('accessToken', tokens.accessToken, {
        ...this.baseCookie,
        maxAge: this.ACCESS_MAX_AGE,
      });

      res.cookie('refreshToken', tokens.refreshToken, {
        ...this.baseCookie,
        maxAge: this.REFRESH_MAX_AGE,
      });

      // Shape public user payload (adds role)
      const publicUser = await toPublicUserWithRole(
        { ...(user as any), role },
        undefined
      );

      res.status(200).json({
        message: 'Login successful',
        data: { user: publicUser },
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Refreshes the access and refresh JWT cookies using a valid refresh token.
   */
  public refreshToken = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const token = req.cookies?.refreshToken;
      if (!token) {
        return next(new UnauthorizedError('Missing refresh token'));
      }

      const payload = jwt.verify(token, config.jwtRefreshSecret) as any;

      const user = await userService.get(payload.userId);
      if (!user) throw new NotFoundError('User not found');

      const auth = await authorizationService.get(user.userId);
      const role = (auth?.role as Role) || 'user';

      const newAccessToken = jwt.sign(
        { userId: user.userId, role },
        config.jwtSecret,
        { expiresIn: '1h' }
      );

      const newRefreshToken = jwt.sign(
        { userId: user.userId },
        config.jwtRefreshSecret,
        { expiresIn: '7d' }
      );

      res.cookie('accessToken', newAccessToken, {
        ...this.baseCookie,
        maxAge: this.ACCESS_MAX_AGE,
      });

      res.cookie('refreshToken', newRefreshToken, {
        ...this.baseCookie,
        maxAge: this.REFRESH_MAX_AGE,
      });

      res.status(200).json({ message: 'Token refreshed successfully' });
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'name' in error &&
        ((error as any).name === 'JsonWebTokenError' ||
          (error as any).name === 'TokenExpiredError')
      ) {
        return next(new UnauthorizedError('Invalid or expired refresh token'));
      }

      next(error);
    }
  };

  /**
   * Logs out the user by clearing auth cookies (+ optionally revoking refresh token).
   */
  public logout = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const refresh = req.cookies?.refreshToken as string | undefined;

      // Optional: revoke server-side if your authService supports it
      if (
        refresh &&
        typeof (authService as any).revokeRefreshToken === 'function'
      ) {
        try {
          const payload = jwt.verify(refresh, config.jwtRefreshSecret) as any;
          await (authService as any).revokeRefreshToken(
            payload.userId,
            refresh
          );
        } catch {
          // ignore token parse/revoke errors on logout
        }
      }

      // Clear cookies using the same policy attributes as when they were set
      res.clearCookie('accessToken', { ...this.baseCookie });
      res.clearCookie('refreshToken', { ...this.baseCookie });

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}

export const authController = new AuthController();
export default AuthController;
