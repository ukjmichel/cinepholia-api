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
    req.user = user;
    req.userRole = auth.role;

    next();
  } catch (err) {
    next(err);
  }
}

export async function refreshToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = req.cookies?.refreshToken;

  if (!token) {
    return next(new UnauthorizedError('Missing refresh token'));
  }

  try {
    // 1. Verify the refresh token
    const payload = jwt.verify(token, JWT_SECRET) as any;

    // 2. Get user from DB
    const user = await userService.getUserById(payload.userId);
    if (!user) throw new UnauthorizedError('User not found');

    // 3. Get user role (optional, for payload)
    const auth = await authorizationService.getAuthorizationByUserId(
      user.userId
    );
    const role = auth?.role || 'utilisateur';

    // 4. Generate new access (and refresh) tokens
    const newAccessToken = jwt.sign(
      { userId: user.userId, role }, // add extra payload as needed
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // generate a new refresh token for added security
    const newRefreshToken = jwt.sign({ userId: user.userId }, JWT_SECRET, {
      expiresIn: '7d',
    });

    // 5. Set new tokens in cookies
    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60, // 1 hour
    });

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    res.status(200).json({ message: 'Token refreshed successfully' });
  } catch (err) {
    next(new UnauthorizedError('Invalid or expired refresh token'));
  }
}
