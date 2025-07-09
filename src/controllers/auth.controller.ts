import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { userService } from '../services/user.service.js';
import { BadRequestError } from '../errors/bad-request-error.js';
import { AuthorizationService } from '../services/authorization.service.js';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { UnauthorizedError } from '../errors/unauthorized-error.js';
import { NotFoundError } from '../errors/not-found-error.js';

export const authorizationService = new AuthorizationService();

/**
 * Authenticates a user and returns JWT tokens as secure cookies,
 * along with the public user information.
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

    let role = 'user';
    if (user.userId) {
      const authorization = await authorizationService.getAuthorizationByUserId(
        user.userId
      );
      if (authorization?.role) {
        role = authorization.role;
      }
    }

    const plainUser =
      typeof user.get === 'function' ? user.get({ plain: true }) : user;
    const { userId, username, firstName, lastName, email } = plainUser;

    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60,
    });
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
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
 * Refreshes JWT tokens using the refresh token cookie.
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

    const payload = jwt.verify(token, config.jwtSecret) as any;

    const user = await userService.getUserById(payload.userId);
    if (!user) throw new NotFoundError('User not found');

    const auth = await authorizationService.getAuthorizationByUserId(
      user.userId
    );
    const role = auth?.role || 'utilisateur';

    const newAccessToken = jwt.sign(
      { userId: user.userId, role },
      config.jwtSecret,
      {
        expiresIn: '1h',
      }
    );

    const newRefreshToken = jwt.sign(
      { userId: user.userId },
      config.jwtSecret,
      {
        expiresIn: '7d',
      }
    );

    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60,
    });

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    res.status(200).json({ message: 'Token refreshed successfully' });
  } catch (error: unknown) {
    if (
      (error &&
        typeof error === 'object' &&
        'name' in error &&
        (error as any).name === 'JsonWebTokenError') ||
      (error as any).name === 'TokenExpiredError'
    ) {
      return next(new UnauthorizedError('Invalid or expired refresh token'));
    }
    next(error);
  }
}
