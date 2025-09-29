import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../errors/unauthorized-error.js';
import { NotFoundError } from '../errors/not-found-error.js';
import { config } from '../config/env.js';
import userService from '../services/user.service.js';
import { authorizationService } from '../services/authorization.service.js';
import { authService } from '../services/auth.service.js';
import { Role } from '../models/authorization.model.js';
import { AuthBag } from '../interfaces/auth.js';

export type JwtPayload = Record<string, any>;

export async function decodeJwtToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  let token = (req.cookies?.accessToken as string | undefined) ?? undefined;

  if (!token && req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token) {
    next(new UnauthorizedError('Missing access token'));
    return;
  }

  try {
    const blacklisted = await authService.isTokenBlacklisted(token);
    if (blacklisted) {
      next(new UnauthorizedError('Token has been revoked or blacklisted'));
      return;
    }

    const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;
    (req as any as AuthBag).userJwtPayload = payload;

    const userId = (payload as any).userId;
    const user = await userService.get(userId);
    if (!user) {
      next(new NotFoundError('User not found'));
      return;
    }
    (req as any as AuthBag).user = user;

    const auth = await authorizationService.get(user.userId);
    (req as any as AuthBag).userRole = (auth?.role as Role) ?? 'user';

    next();
  } catch (err: unknown) {
    // Normalize JWT errors to 401 instead of 500
    if (
      err &&
      typeof err === 'object' &&
      'name' in err &&
      ((err as any).name === 'JsonWebTokenError' ||
        (err as any).name === 'TokenExpiredError')
    ) {
      return next(new UnauthorizedError('Invalid or expired access token'));
    }
    next(err);
  }
}

export function requireAuthenticated(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const user = (req as any as AuthBag).user;
  if (!user) {
    next(new UnauthorizedError('Authentication required'));
    return;
  }
  next();
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const role = (req as any as AuthBag).userRole as Role | undefined;
  if (role !== 'admin') {
    res.status(403).json({ message: 'Forbidden: admin only', data: null });
    return;
  }
  next();
}

export function requireStaffOrAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const role = (req as any as AuthBag).userRole as Role | undefined;
  if (role !== 'staff' && role !== 'admin') {
    res
      .status(403)
      .json({ message: 'Forbidden: staff or admin required', data: null });
    return;
  }
  next();
}

export function requireSelfOrAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { userId: paramUserId } = req.params as { userId?: string };

  const bag = req as any as AuthBag;
  const role = bag.userRole;
  const authUserId: string | undefined =
    bag.user?.userId ?? (bag.userJwtPayload as any)?.userId;

  // Admins always allowed
  if (role === 'admin') {
    return next();
  }

  // Current user can only act on their own id
  if (paramUserId && authUserId && paramUserId === String(authUserId)) {
    return next();
  }

  res.status(403).json({
    message: 'Forbidden: you can only act on your own account',
    data: null,
  });
}

export const getJwtPayload = (req: Request) =>
  (req as any as AuthBag).userJwtPayload as JwtPayload | undefined;
export const getAuthUser = (req: Request) =>
  (req as any as AuthBag).user as any | undefined;
export const getUserRole = (req: Request) =>
  (req as any as AuthBag).userRole as Role | undefined;
