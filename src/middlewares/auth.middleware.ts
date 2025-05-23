import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { UserService } from '../services/user.service.js';
import { AuthorizationService } from '../services/authorization.service.js';
import { UnauthorizedError } from '../errors/unauthorized-error.js';
import { NotFoundError } from '../errors/not-found-error.js';
// import { Role } from '../models/authorization.model.js'; // (optional, for typing)

const userService = new UserService();
const authService = new AuthService();
const authorizationService = new AuthorizationService();

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
  try {
    // 1. Get and decode JWT
    const token = getAccessToken(req);
    if (!token) throw new UnauthorizedError('Missing access token');

    const payload = authService.verifyAccessToken(token);
    req.userJwtPayload = payload;

    // 2. Fetch user from DB
    const user = await userService.getUserById(payload.userId);
    if (!user) throw new NotFoundError('User not found');
    req.user = user;

    // 3. Fetch user role from DB
    // If role is present in payload and you trust it, you could do: req.userRole = payload.role;
    // If not, get from DB as you do here:
    const auth = await authorizationService.getAuthorizationByUserId(
      user.userId
    );
    req.userRole = auth.role;

    next();
  } catch (err) {
    next(err);
  }
}
