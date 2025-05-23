import { Request, Response, NextFunction } from 'express';
import { Role } from '../models/authorization.model.js';
import { UnauthorizedError } from '../errors/unauthorized-error.js';

class Permission {
  isUser(req: Request, res: Response, next: NextFunction) {
    const role = req.userRole as Role | undefined;
    if (!role) {
      return next(new UnauthorizedError('Authentication required'));
    }
    next();
  }

  isEmployee(req: Request, res: Response, next: NextFunction) {
    const role = req.userRole as Role | undefined;
    if (role !== 'employé') {
      return next(new UnauthorizedError('Employee access required'));
    }
    next();
  }

  isAdmin(req: Request, res: Response, next: NextFunction) {
    const role = req.userRole as Role | undefined;
    if (role !== 'administrateur') {
      return next(new UnauthorizedError('Admin access required'));
    }
    next();
  }

  isStaff(req: Request, res: Response, next: NextFunction) {
    const role = req.userRole as Role | undefined;
    if (role !== 'employé' && role !== 'administrateur') {
      return next(
        new UnauthorizedError('Staff (Employee or Admin) access required')
      );
    }
    next();
  }

  isNotStaff(req: Request, res: Response, next: NextFunction) {
    const role = req.userRole as Role | undefined;
    if (role === 'employé' || role === 'administrateur') {
      return next(new UnauthorizedError('Only non-staff users allowed'));
    }
    next();
  }
  isSelfOrStaff(req: Request, res: Response, next: NextFunction) {
    const paramUserId = req.params.userId;
    const tokenUserId = req.userJwtPayload?.userId;
    const role = req.userRole as Role | undefined;

    if (!tokenUserId) {
      return next(new UnauthorizedError('No user information in token'));
    }

    // Allow if staff, or if userId matches
    if (
      role === 'employé' ||
      role === 'administrateur' ||
      paramUserId === tokenUserId
    ) {
      return next();
    }
    return next(
      new UnauthorizedError('You are not allowed to access this resource')
    );
  }
}

export const permission = new Permission();
