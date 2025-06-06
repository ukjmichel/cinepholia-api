import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { userService } from '../services/user.service.js';
import { BadRequestError } from '../errors/bad-request-error.js';
import { AuthorizationService } from '../services/authorization.service.js';
import { config } from '../config/env.js';

export const authorizationService = new AuthorizationService();

/**
 * Authenticates a user and returns user info, setting JWT tokens in HttpOnly cookies.
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

    // Authenticate and get tokens
    const tokens = await authService.login(emailOrUsername, password);
    const user = await userService.getUserByUsernameOrEmail(emailOrUsername);

    if (!user) {
      throw new BadRequestError('User not found');
    }

    let role = 'utilisateur';
    if (user.userId) {
      const authorization = await authorizationService.getAuthorizationByUserId(
        user.userId
      );
      if (authorization?.role) {
        role = authorization.role;
      }
    }

    // Clean user object: get rid of password and sequelize metadata
    const plainUser =
      typeof user.get === 'function' ? user.get({ plain: true }) : user;
    const { userId, username, firstName, lastName, email } = plainUser;

    // Set cookies (adjust options for production: secure, sameSite, etc.)
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // send cookie only over HTTPS in prod
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes, adjust as needed
      path: '/',
    });
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days, adjust as needed
      path: '/',
    });

    // Send only user info (not tokens) in response
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
