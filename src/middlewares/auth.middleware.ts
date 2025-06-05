import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { UserService } from '../services/user.service.js';
import { AuthorizationService } from '../services/authorization.service.js';
import { UnauthorizedError } from '../errors/unauthorized-error.js';
import { NotFoundError } from '../errors/not-found-error.js';
import jwt from 'jsonwebtoken';
// import { Role } from '../models/authorization.model.js'; // (optional, for typing)

const userService = new UserService();
const authService = new AuthService();
const authorizationService = new AuthorizationService();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

declare global {
  namespace Express {
    interface Request {
      user?: import('../models/user.model.js').UserModel;
      userRole?: string; // Or: Role
      userJwtPayload?: import('../services/auth.service.js').AccessTokenPayload;
    }
  }
}

function getAccessToken(req: Request): string | null {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

export async function decodeJwtToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Get token from cookies (adjust name if needed)
  const token = req.cookies?.accessToken;
  if (!token) {
    return next(new UnauthorizedError('Missing access token'));
  }

  try {
    // Decode/verify JWT
    const payload = jwt.verify(token, JWT_SECRET) as any;
    // Attach to request object for later middleware
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
