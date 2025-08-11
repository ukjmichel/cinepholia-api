/**
 * @module controllers/auth.controller
 *
 * @description
 * Handles user authentication flows
 * 
 * @features
 * - Logs in users and sets secure cookies for access/refresh tokens.
 * - Refreshes tokens using a valid refresh token from cookies.
 *
 * @security
 * - Access and refresh tokens are stored as `httpOnly` cookies to prevent XSS attacks.
 * - A default role of `"utilisateur"` is assigned if the user has no existing authorization.
 * - The `secure` cookie flag is enabled in production to enforce HTTPS-only cookies.
 *
 * @dependencies
 * - authService: Handles credential verification and token generation.
 * - userService: Retrieves user records from the database.
 * - authorizationService: Retrieves or creates user role assignments.
 * - jsonwebtoken: Signs and verifies JWT tokens.
 *
 */

import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { userService } from '../services/user.service.js';
import { BadRequestError } from '../errors/bad-request-error.js';
import { AuthorizationService } from '../services/authorization.service.js';
import * as jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { UnauthorizedError } from '../errors/unauthorized-error.js';
import { NotFoundError } from '../errors/not-found-error.js';

// Create an instance of AuthorizationService
export const authorizationService = new AuthorizationService();

/**
 * Logs in a user by validating their credentials and issuing secure JWT cookies.
 *
 * @param req - Express request object containing `emailOrUsername` and `password` in the body
 * @param res - Express response object used to set cookies and send user data
 * @param next - Express next function for error handling
 * @throws {BadRequestError} If required credentials are missing or user not found
 * @throws {UnauthorizedError} If credentials are invalid or login attempt limit is reached
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { emailOrUsername, password } = req.body;
    if (!emailOrUsername || !password) {
      throw new BadRequestError('Email or username and password are required');
    }

    const tokens = await authService.login(emailOrUsername, password);
    const user = await userService.getUserByUsernameOrEmail(emailOrUsername);

    if (!user) {
      throw new BadRequestError('User not found');
    }

    let role = 'utilisateur';
    if (user.userId) {
      let authorization = await authorizationService.getAuthorizationByUserId(
        user.userId
      );

      if (!authorization) {
        authorization = await authorizationService.createAuthorization({
          userId: user.userId,
          role: 'utilisateur',
        });
      }

      if (authorization?.role) {
        role = authorization.role;
      }
    }

    const plainUser =
      typeof user.get === 'function' ? user.get({ plain: true }) : user;
    const { userId, username, firstName, lastName, email } = plainUser;

    const isSecure = process.env.NODE_ENV === 'production';

    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60,
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    res.status(200).json({
      message: 'Login successful',
      data: {
        user: {
          userId,
          username,
          firstName,
          lastName,
          email,
          role,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Refreshes the access and refresh JWT cookies using a valid refresh token.
 *
 * @param req - Express request object containing the refresh token cookie
 * @param res - Express response object used to set new cookies
 * @param next - Express next function for error handling
 * @throws {UnauthorizedError} If refresh token is missing, invalid, or expired
 * @throws {NotFoundError} If the user from the token payload does not exist
 */
export async function refreshToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return next(new UnauthorizedError('Missing refresh token'));
    }

    const payload = jwt.verify(token, config.jwtRefreshSecret) as any;

    const user = await userService.getUserById(payload.userId);
    if (!user) throw new NotFoundError('User not found');

    const auth = await authorizationService.getAuthorizationByUserId(
      user.userId
    );
    const role = auth?.role || 'utilisateur';

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

    const isSecure = process.env.NODE_ENV === 'production';

    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60,
    });

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7,
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
}
