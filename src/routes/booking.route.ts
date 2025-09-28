// src/routes/booking.routes.ts
import express from 'express';
import {
  createBooking,
  updateBooking,
  deleteBooking,
  getAllBookings,
  getBookingsByUser,
  getBookingsByScreening,
  getBookingsByStatus,
  searchBooking,
  markBookingAsUsed,
  cancelBooking,
  getBookingById,
  getUpcomingBookingsByUser,
} from '../controllers/booking.controller.js';

import { userIdParamValidator } from '../validators/user.validator.js';
import { decodeJwtToken } from '../middlewares/auth.middleware.js';

const bookingRouter = express.Router();



/** --------------------------
 * Routes
 * -------------------------- */

// Create booking (auth required)
bookingRouter.post('/', decodeJwtToken, createBooking);

// ----- Specific routes before generic :bookingId -----

// Search (staff/admin)
bookingRouter.get('/search', decodeJwtToken, searchBooking);
// All bookings (admin)
bookingRouter.get('/', decodeJwtToken,  getAllBookings);

// User’s bookings (self or admin)
bookingRouter.get(
  '/user/:userId',
  decodeJwtToken,
  
  userIdParamValidator,
  getBookingsByUser
);

// Upcoming for user (self or admin)
bookingRouter.get(
  '/user/:userId/upcoming',
  decodeJwtToken,
  
  userIdParamValidator,
 
  getUpcomingBookingsByUser
);

// By screening (staff/admin)
bookingRouter.get(
  '/screening/:screeningId',
  decodeJwtToken,
  

  getBookingsByScreening
);

// By status (staff/admin)
bookingRouter.get(
  '/status/:status',
  decodeJwtToken,
  getBookingsByStatus
);

// ----- BookingId-scoped (auth; ownership enforced in controllers) -----

// Read single booking (owner or staff/admin) — controller should enforce ownership
bookingRouter.get('/:bookingId', decodeJwtToken,  getBookingById);

// Update booking (owner or admin)
bookingRouter.patch('/:bookingId', decodeJwtToken,  updateBooking);

// Mark as used (staff/admin, e.g., scan at entrance)
bookingRouter.patch(
  '/:bookingId/used',
  decodeJwtToken,
  markBookingAsUsed
);

// Cancel booking (owner or staff/admin)
bookingRouter.patch('/:bookingId/cancel', decodeJwtToken,  cancelBooking);

// Delete booking (owner or admin)
bookingRouter.delete('/:bookingId', decodeJwtToken,  deleteBooking);

export default bookingRouter;
