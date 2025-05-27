import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { userService } from '../services/user.service.js';
import { BadRequestError } from '../errors/bad-request-error.js';
import { AuthorizationService } from '../services/authorization.service.js';

export const authorizationService = new AuthorizationService();

/**
 * Authenticates a user and returns JWT tokens and user info.
 *
 * @param {Request} req - Express request object (should contain emailOrUsername and password in body)
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<void>} Sends a JSON response with user and tokens, or passes error to next middleware
 *
 * Example successful response:
 * {
 *   message: "Login successful",
 *   data: {
 *     user: { userId, username, firstName, lastName, email, role },
 *     tokens: { accessToken, refreshToken }
 *   }
 * }
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
        tokens,
      },
    });
  } catch (err) {
    next(err);
  }
};
