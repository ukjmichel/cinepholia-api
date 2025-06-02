import { Request, Response, NextFunction } from 'express';
import { Role } from '../models/authorization.model.js';
import { UnauthorizedError } from '../errors/unauthorized-error.js';
import { NotFoundError } from '../errors/not-found-error.js';
import { BookingModel } from '../models/booking.model.js';
import { ForbiddenError } from '../errors/forbidden-error.js';

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

class Permission {
  // Any authenticated user
  isUser(req: Request, res: Response, next: NextFunction) {
    const role = req.userRole;
    if (!role) {
      return next(new UnauthorizedError('Authentication required'));
    }
    next();
  }

  // Only 'employé' (employee)
  isEmployee(req: Request, res: Response, next: NextFunction) {
    const role = req.userRole;
    if (role !== 'employé') {
      return next(new UnauthorizedError('Employee access required'));
    }
    next();
  }

  // Only 'administrateur'
  isAdmin(req: Request, res: Response, next: NextFunction) {
    const role = req.userRole;
    if (role !== 'administrateur') {
      return next(new UnauthorizedError('Admin access required'));
    }
    next();
  }

  // 'employé' or 'administrateur' (staff)
  isStaff(req: Request, res: Response, next: NextFunction) {
    const role = req.userRole;
    if (role !== 'employé' && role !== 'administrateur') {
      return next(
        new ForbiddenError('Staff (Employee or Admin) access required')
      );
    }
    next();
  }

  // Only non-staff users
  isNotStaff(req: Request, res: Response, next: NextFunction) {
    const role = req.userRole;
    if (role === 'employé' || role === 'administrateur') {
      return next(new UnauthorizedError('Only non-staff users allowed'));
    }
    next();
  }

  // For routes where user must be staff OR acting on their own resource (userId in params)
  async isSelfOrStaff(req: Request, res: Response, next: NextFunction) {
    const { userId, bookingId } = req.params;
    const tokenUserId = req.userJwtPayload?.userId;
    const role = req.userRole;

    if (!tokenUserId) {
      return next(new UnauthorizedError('No user information in token'));
    }

    if (role === 'employé' || role === 'administrateur') {
      return next();
    }

    // Handle routes with userId param (e.g., /users/:userId or /bookings/user/:userId)
    if (userId && userId === tokenUserId) {
      return next();
    }

    // Handle routes with bookingId param (e.g., /bookings/:bookingId/ticket)
    if (bookingId) {
      try {
        const booking = await BookingModel.findByPk(bookingId);
        if (!booking) {
          return next(new NotFoundError('Booking not found'));
        }
        if ((booking as any).userId === tokenUserId) {
          return next();
        }
        return next(
          new UnauthorizedError('You are not allowed to access this resource')
        );
      } catch (err) {
        return next(err);
      }
    }

    // Fallback: deny
    return next(
      new UnauthorizedError('You are not allowed to access this resource')
    );
  }

  // For booking creation - check if user can create booking for the specified userId
  canCreateBooking(req: Request, res: Response, next: NextFunction) {
    const bookingUserId = req.body.userId;
    const tokenUserId = req.userJwtPayload?.userId;
    const role = req.userRole;

    if (!tokenUserId) {
      return next(new UnauthorizedError('No user information in token'));
    }

    // Staff can create bookings for anyone
    if (role === 'employé' || role === 'administrateur') {
      return next();
    }

    // Regular users can only create bookings for themselves
    if (bookingUserId === tokenUserId) {
      return next();
    }

    return next(
      new UnauthorizedError('You can only create bookings for yourself')
    );
  }

  // For booking operations - check if user owns the booking or is staff
  async canAccessBooking(req: Request, res: Response, next: NextFunction) {
    const bookingId = req.params.bookingId;
    const tokenUserId = req.userJwtPayload?.userId;
    const role = req.userRole;

    if (!tokenUserId) {
      return next(new UnauthorizedError('No user information in token'));
    }

    // Staff can access any booking
    if (role === 'employé' || role === 'administrateur') {
      return next();
    }

    // Regular users can only access their own bookings
    try {
      const booking = await BookingModel.findByPk(bookingId);
      if (!booking) {
        return next(new NotFoundError('Booking not found'));
      }

      if ((booking as any).userId !== tokenUserId) {
        return next(
          new UnauthorizedError('You can only access your own bookings')
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  }
}

export const permission = new Permission();
