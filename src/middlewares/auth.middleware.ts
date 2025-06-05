import { Request, Response, NextFunction } from 'express';
import { AuthorizationService } from '../services/authorization.service.js';
import { UnauthorizedError } from '../errors/unauthorized-error.js';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

const authorizationService = new AuthorizationService();
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

  // If not found in cookies, check the Authorization header (for tests)
  if (!token && req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove "Bearer "
    }
  }

  if (!token) {
    return next(new UnauthorizedError('Missing access token'));
  }

  try {
    // Decode/verify JWT
    const payload = jwt.verify(token, JWT_SECRET) as any;
    req.userJwtPayload = payload;
    const auth = await authorizationService.getAuthorizationByUserId(
      payload.userId
    );
    req.userRole = auth.role;
    next();
  } catch (err) {
    next(new UnauthorizedError('Invalid or expired access token'));
  }
}
