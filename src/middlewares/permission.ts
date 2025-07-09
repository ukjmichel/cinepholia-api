import { Request, Response, NextFunction } from 'express';
import { Role } from '../models/authorization.model.js';

import { NotFoundError } from '../errors/not-found-error.js';
import { BookingModel } from '../models/booking.model.js';
import { NotAuthorizedError } from '../errors/not-authorized-error.js';

// Extend Request type with custom properties
declare module 'express-serve-static-core' {
  interface Request {
    userRole?: Role;
    userJwtPayload?: {
      userId: string;
      [key: string]: any;
    };
  }
}

/**
 * Permission middleware class to enforce role-based and resource-based access control.
 */
class Permission {
  // ────────────────────────────────────────────────────────────────────────────────
  // Basic Role-Based Permissions
  // ────────────────────────────────────────────────────────────────────────────────

  /**
   * Allow any authenticated user (any role present).
   * @param req Express request
   * @param res Express response
   * @param next Next function
   */
  isUser(req: Request, res: Response, next: NextFunction) {
    if (!req.userRole) {
      return next(new NotAuthorizedError('Authentication required'));
    }
    next();
  }

  /**
   * Allow only 'employé' users.
   * @param req Express request
   * @param res Express response
   * @param next Next function
   */
  isEmployee(req: Request, res: Response, next: NextFunction) {
    if (req.userRole !== 'employé') {
      return next(new NotAuthorizedError('Employee access required'));
    }
    next();
  }

  /**
   * Allow only 'administrateur' users.
   * @param req Express request
   * @param res Express response
   * @param next Next function
   */
  isAdmin(req: Request, res: Response, next: NextFunction) {
    if (req.userRole !== 'administrateur') {
      return next(new NotAuthorizedError('Admin access required'));
    }
    next();
  }

  /**
   * Allow 'employé' or 'administrateur' (staff).
   * @param req Express request
   * @param res Express response
   * @param next Next function
   */
  isStaff(req: Request, res: Response, next: NextFunction) {
    const role = req.userRole;
    if (role !== 'employé' && role !== 'administrateur') {
      return next(
        new NotAuthorizedError('Staff (Employee or Admin) access required')
      );
    }
    next();
  }

  /**
   * Allow only non-staff users (i.e., not 'employé' or 'administrateur').
   * @param req Express request
   * @param res Express response
   * @param next Next function
   */
  isNotStaff(req: Request, res: Response, next: NextFunction) {
    const role = req.userRole;
    if (role === 'employé' || role === 'administrateur') {
      return next(new NotAuthorizedError('Only non-staff users allowed'));
    }
    next();
  }

  // ────────────────────────────────────────────────────────────────────────────────
  // Identity or Role-Based Permissions
  // ────────────────────────────────────────────────────────────────────────────────

  /**
   * Allow access if user is staff OR accessing their own userId (from route param).
   * Common for routes like `/users/:userId` or `/bookings/user/:userId`.
   * @param req Express request
   * @param res Express response
   * @param next Next function
   */
  async isSelfOrStaff(req: Request, res: Response, next: NextFunction) {
    const { userId } = req.params;
    const tokenUserId = req.userJwtPayload?.userId;
    const role = req.userRole;

    if (!tokenUserId) {
      return next(new NotAuthorizedError('No user information in token'));
    }

    if (role === 'employé' || role === 'administrateur') {
      return next();
    }

    if (userId && userId === tokenUserId) {
      return next();
    }

    return next(
      new NotAuthorizedError('You are not allowed to access this resource')
    );
  }

  /**
   * Allow access if user is 'administrateur' OR accessing their own userId (from route param).
   * Used for strict administrative access with self-service fallback.
   * @param req Express request
   * @param res Express response
   * @param next Next function
   */
  isSelfOrAdmin(req: Request, res: Response, next: NextFunction) {
    const { userId } = req.params;
    const tokenUserId = req.userJwtPayload?.userId;
    const role = req.userRole;

    if (!tokenUserId) {
      return next(new NotAuthorizedError('No user information in token'));
    }

    if (role === 'administrateur') {
      return next();
    }

    if (userId && userId === tokenUserId) {
      return next();
    }

    return next(
      new NotAuthorizedError('You are not allowed to access this resource')
    );
  }

  // ────────────────────────────────────────────────────────────────────────────────
  // Booking-Specific Permissions
  // ────────────────────────────────────────────────────────────────────────────────

  /**
   * Allow booking creation if:
   * - Staff (can create for any user)
   * - Regular user (can only create for themselves)
   * @param req Express request
   * @param res Express response
   * @param next Next function
   */
  canCreateBooking(req: Request, res: Response, next: NextFunction) {
    const bookingUserId = req.body.userId;
    const tokenUserId = req.userJwtPayload?.userId;
    const role = req.userRole;

    if (!tokenUserId) {
      return next(new NotAuthorizedError('No user information in token'));
    }

    if (role === 'employé' || role === 'administrateur') {
      return next();
    }

    if (bookingUserId === tokenUserId) {
      return next();
    }

    return next(
      new NotAuthorizedError('You can only create bookings for yourself')
    );
  }

  /**
   * Allow booking access if:
   * - Staff (can access any booking)
   * - Owner of the booking
   * @param req Express request
   * @param res Express response
   * @param next Next function
   */
  async canAccessBooking(req: Request, res: Response, next: NextFunction) {
    const bookingId = req.params.bookingId;
    const tokenUserId = req.userJwtPayload?.userId;
    const role = req.userRole;

    if (!tokenUserId) {
      return next(new NotAuthorizedError('No user information in token'));
    }

    try {
      const booking = await BookingModel.findByPk(bookingId);
      if (!booking) {
        return next(new NotFoundError('Booking not found'));
      }

      if (role === 'employé' || role === 'administrateur') {
        return next();
      }

      if ((booking as any).userId === tokenUserId) {
        return next();
      }

      return next(
        new NotAuthorizedError('You can only access your own bookings')
      );
    } catch (error) {
      next(error);
    }
  }
}

export const permission = new Permission();
