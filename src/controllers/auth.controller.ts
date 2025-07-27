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
 * Authenticates a user and returns JWT tokens as secure cookies,
 * along with the public user information.
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get credentials from request body
    const { emailOrUsername, password } = req.body;
    if (!emailOrUsername || !password) {
      throw new BadRequestError('Email or username and password are required');
    }

    // Attempt to authenticate and generate tokens
    const tokens = await authService.login(emailOrUsername, password);
    // Retrieve user info by username or email
    const user = await userService.getUserByUsernameOrEmail(emailOrUsername);

    if (!user) {
      throw new BadRequestError('User not found');
    }

    // Default role
    let role = 'utilisateur';
    if (user.userId) {
      // Try to fetch authorization (role) for the user
      let authorization = await authorizationService.getAuthorizationByUserId(
        user.userId
      );

      // Create default authorization if it doesn't exist
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

    // Convert Sequelize user instance to plain object if needed
    const plainUser =
      typeof user.get === 'function' ? user.get({ plain: true }) : user;
    const { userId, username, firstName, lastName, email } = plainUser;

    // Set the accessToken cookie (for API, httpOnly & sameSite are good defaults)
    const isSecure = process.env.NODE_ENV === 'production';

    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: isSecure, // ✅ test env uses false
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60,
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    // Send user info (never include sensitive info)
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
    // Get the refreshToken from cookies
    const token = req.cookies?.refreshToken;
    console.log('Server: got refreshToken:', token);
    if (!token) {
      return next(new UnauthorizedError('Missing refresh token'));
    }

    // Verify the refresh token
    const payload = jwt.verify(token, config.jwtRefreshSecret) as any;

    // Get the user from DB
    const user = await userService.getUserById(payload.userId);
    if (!user) throw new NotFoundError('User not found');

    // Retrieve role
    const auth = await authorizationService.getAuthorizationByUserId(
      user.userId
    );
    const role = auth?.role || 'utilisateur';

    // Generate new tokens
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

    // ✅ use the same secure flag logic as in login
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
