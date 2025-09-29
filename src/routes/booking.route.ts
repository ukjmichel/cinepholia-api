import { Router, Request, Response, NextFunction } from 'express';
import { bookingController } from '../controllers/booking.controller.js';
import { validationResult } from 'express-validator';
import {
  decodeJwtToken,
  requireAdmin,
  requireSelfOrAdmin,
  requireStaffOrAdmin,
} from '../middlewares/auth.middleware.js';
import {
  validateCreateBooking,
  validateBookingIdParam,
  validateUpdateBooking,
  validateListBookings,
  validateSearchBookings,
  validateGetBookingsByUser,
  validateGetBookingsByScreening,
  validateGetBookingsByStatus,
  validateGetUpcomingBookings,
  validateBookingStatus,
} from '../validators/booking.validator.js';
import { generateTicket } from '../controllers/generate-ticket.controller.js';

const router = Router();

/* =============== MAIN CRUD ENDPOINTS =============== */

/** List bookings - Staff/Admin only */
router.get(
  '/',
  decodeJwtToken,
  requireStaffOrAdmin,
  validateListBookings,
  bookingController.listBookings
);

/** Search bookings - Staff/Admin only */
router.get(
  '/search',
  decodeJwtToken,
  requireStaffOrAdmin,
  validateSearchBookings,
  bookingController.searchBookings
);

/** Create a new booking - Authenticated users */
router.post(
  '/',
  decodeJwtToken,
  validateCreateBooking,
  bookingController.createBooking
);

/** Get single booking by ID - Owner or Staff/Admin */
router.get(
  '/:bookingId',
  decodeJwtToken,
  requireSelfOrAdmin,
  validateBookingIdParam,
  bookingController.getBooking
);

/** Update booking - Owner or Admin */
router.patch(
  '/:bookingId',
  decodeJwtToken,
  validateUpdateBooking,
  bookingController.updateBooking
);

/** Delete booking - Owner or Admin */
router.delete(
  '/:bookingId',
  decodeJwtToken,
  validateBookingIdParam,
  bookingController.deleteBooking
);

/* =============== SPECIALIZED QUERY ENDPOINTS =============== */

/** Get bookings by user - Owner or Staff/Admin */
router.get(
  '/user/:userId',
  decodeJwtToken,
  requireSelfOrAdmin,
  validateGetBookingsByUser,
  bookingController.getBookingsByUser
);

/** Get upcoming bookings for user - Owner or Staff/Admin */
router.get(
  '/user/:userId/upcoming',
  decodeJwtToken,
  requireSelfOrAdmin,
  validateGetUpcomingBookings,
  bookingController.getUpcomingBookingsByUser
);

/** Get bookings by screening - Staff/Admin only */
router.get(
  '/screening/:screeningId',
  decodeJwtToken,
  requireStaffOrAdmin,
  validateGetBookingsByScreening,
  bookingController.getBookingsByScreening
);

/** Get bookings by status - Staff/Admin only */
router.get(
  '/status/:status',
  decodeJwtToken,
  requireStaffOrAdmin,
  validateGetBookingsByStatus,
  bookingController.getBookingsByStatus
);

/* =============== STATUS MANAGEMENT ENDPOINTS =============== */

/** Mark booking as used - Staff/Admin only */
router.patch(
  '/:bookingId/use',
  decodeJwtToken,
  requireStaffOrAdmin,
  validateBookingIdParam,
  bookingController.markBookingAsUsed
);

/** Cancel booking - Owner or Staff/Admin */
router.patch(
  '/:bookingId/cancel',
  decodeJwtToken,
  validateBookingIdParam,
  bookingController.cancelBooking
);

router.get(
  '/:bookingId/ticket',
  validateBookingIdParam,
  decodeJwtToken,
  generateTicket
);

export default router;
