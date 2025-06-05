import { Request, Response, NextFunction } from 'express';
import { userTokenService } from '../services/user-token.service.js';
import { BadRequestError } from '../errors/bad-request-error.js';
import { UserTokenType } from '../models/user-token.model.js';

export function validateTokenMiddleware(
  expectedType: UserTokenType | UserTokenType[]
) {
  return async (req: Request, res: Response, next: NextFunction) => {

    const token = req.cookies?.accessToken || req.cookies?.refreshToken; // adjust as needed

    if (!token || typeof token !== 'string') {
      return next(new BadRequestError('Token is required in cookies.'));
    }

    try {
      const tokenInstance = await userTokenService.validateToken(
        token,
        expectedType
      );

      (req as any).userToken = tokenInstance;
      next();
    } catch (err) {
      next(err);
    }
  };
}
