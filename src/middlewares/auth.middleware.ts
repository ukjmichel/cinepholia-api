import { Request, Response, NextFunction } from 'express';
import { AuthorizationService } from '../services/authorization.service.js';
import { UnauthorizedError } from '../errors/unauthorized-error.js';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { NotFoundError } from '../errors/not-found-error.js';
import { UserService } from '../services/user.service.js';
import { authService } from '../services/auth.service.js'; // ✅ add this for blacklist check

const authorizationService = new AuthorizationService();
const userService = new UserService();
const JWT_SECRET = config.jwtSecret;

declare global {
  namespace Express {
    interface Request {
      user?: import('../models/user.model.js').UserModel;
      userRole?: string;
      userJwtPayload?: import('../services/auth.service.js').AccessTokenPayload;
    }
  }
}

export async function decodeJwtToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  let token = req.cookies?.accessToken;

  if (!token && req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token) {
    return next(new UnauthorizedError('Missing access token'));
  }

  try {
    // ✅ Check if token is blacklisted
    const isBlacklisted = await authService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      return next(
        new UnauthorizedError('Token has been revoked or blacklisted')
      );
    }

    const payload = jwt.verify(token, JWT_SECRET) as any;
    req.userJwtPayload = payload;

    const user = await userService.getUserById(payload.userId);
    if (!user) throw new NotFoundError('User not found');
    req.user = user;

    const auth = await authorizationService.getAuthorizationByUserId(
      user.userId
    );
    req.userRole = auth?.role;

    next();
  } catch (err) {
    next(err);
  }
}
