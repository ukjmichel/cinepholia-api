import { Request, Response, NextFunction } from 'express';
import { Role } from '../models/authorization.model';
import { UnauthorizedError } from '../errors/unauthorized-error';

type UserReq = Request & { user?: { role?: Role } };

class Permission {
  isUser(req: UserReq, res: Response, next: NextFunction) {
    if (!req.user?.role) {
      return next(new UnauthorizedError('Authentication required'));
    }
    next();
  }

  isEmployee(req: UserReq, res: Response, next: NextFunction) {
    if (req.user?.role !== 'employé') {
      return next(new UnauthorizedError('Employee access required'));
    }
    next();
  }

  isAdmin(req: UserReq, res: Response, next: NextFunction) {
    if (req.user?.role !== 'administrateur') {
      return next(new UnauthorizedError('Admin access required'));
    }
    next();
  }

  // Staff = Employee OR Admin
  isStaff(req: UserReq, res: Response, next: NextFunction) {
    if (req.user?.role !== 'employé' && req.user?.role !== 'administrateur') {
      return next(
        new UnauthorizedError('Staff (Employee or Admin) access required')
      );
    }
    next();
  }

  // Only users who are NOT staff (not Employee, not Admin)
  isNotStaff(req: UserReq, res: Response, next: NextFunction) {
    if (req.user?.role === 'employé' || req.user?.role === 'administrateur') {
      return next(new UnauthorizedError('Only non-staff users allowed'));
    }
    next();
  }
}

// Singleton export
export const permission = new Permission();
