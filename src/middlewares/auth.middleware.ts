import { Request, Response, NextFunction } from 'express';
import { AuthorizationService } from '../services/authorization.service.js';
import { UnauthorizedError } from '../errors/unauthorized-error.js';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { NotFoundError } from '../errors/not-found-error.js';
import { UserService } from '../services/user.service.js';

const authorizationService = new AuthorizationService();
const userService = new UserService();
const JWT_SECRET = config.jwtSecret;

declare global {
  namespace Express {
    interface Request {
      user?: import('../models/user.model.js').UserModel;
      userRole?: string; // Or: Role
      userJwtPayload?: import('../services/auth.service.js').AccessTokenPayload;
    }
  }
}

export async function decodeJwtToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Try to get token from cookie first, then from Authorization header
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
    const payload = jwt.verify(token, JWT_SECRET) as any;
    req.userJwtPayload = payload;

    const user = await userService.getUserById(payload.userId);
    if (!user) throw new NotFoundError('User not found');
    req.user = user;

    const auth = await authorizationService.getAuthorizationByUserId(
      user.userId
    );
    req.userRole = auth.role;

    next();
  } catch (err) {
    next(err);
  }
}
