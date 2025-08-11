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
import {
  createBookingValidator,
  updateBookingValidator,
  bookingIdParamValidator,
  searchBookingValidator,
} from '../validators/booking.validator.js';
import { userIdParamValidator } from '../validators/user.validator.js';
import { screeningIdParamValidator } from '../validators/screening.validator.js';
import { handleValidationError } from '../middlewares/handleValidatonError.middleware.js';
import { decodeJwtToken } from '../middlewares/auth.middleware.js';
import { permission } from '../middlewares/permission.js';
import { generateTicket } from '../controllers/generate-ticket.controller.js';
import { getBookedSeatsByScreeningId } from '../controllers/booked-seat.controller.js';

const router = express.Router();

/**
 * @swagger
 * /bookings:
 *   post:
 *     summary: Create a new booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BookingInput'
 *     responses:
 *       201:
 *         description: Booking created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Booking'
 *       400:
 *         description: Invalid input or validation error
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Conflict (e.g. seats not available)
 */
router.post(
  '/',
  createBookingValidator,
  handleValidationError,
  decodeJwtToken,
  permission.canCreateBooking,
  createBooking
);

/**
 * @swagger
 * /bookings/search:
 *   get:
 *     summary: Search bookings by query string (status, userId, screeningId)
 *     tags: [Bookings]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: true
 *         description: Search query
 *     responses:
 *       200:
 *         description: Bookings found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Booking'
 *       400:
 *         description: Bad request (missing or invalid q parameter)
 */
router.get(
  '/search',
  searchBookingValidator,
  handleValidationError,
  searchBooking
);

/**
 * @swagger
 * /bookings:
 *   get:
 *     summary: Get all bookings
 *     tags: [Bookings]
 *     responses:
 *       200:
 *         description: List of bookings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Booking'
 */
router.get('/', getAllBookings);

/**
 * @swagger
 * /bookings/{bookingId}:
 *   get:
 *     summary: Get a booking by ID
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         schema:
 *           type: string
 *         required: true
 *         description: UUID of the booking
 *     responses:
 *       200:
 *         description: Booking found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Booking'
 *       404:
 *         description: Booking not found
 */
router.get(
  '/:bookingId',
  bookingIdParamValidator,
  handleValidationError,
  getBookingById
);

/**
 * @swagger
 * /bookings/{bookingId}:
 *   patch:
 *     summary: Update a booking (staff only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         schema:
 *           type: string
 *         required: true
 *         description: UUID of the booking
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BookingUpdate'
 *     responses:
 *       200:
 *         description: Booking updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Booking'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Booking not found
 */
router.patch(
  '/:bookingId',
  bookingIdParamValidator,
  updateBookingValidator,
  handleValidationError,
  decodeJwtToken,
  permission.isStaff, // only staff can update
  updateBooking
);

/**
 * @swagger
 * /bookings/{bookingId}/used:
 *   patch:
 *     summary: Mark a booking as used (staff only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         schema:
 *           type: string
 *         required: true
 *         description: UUID of the booking
 *     responses:
 *       200:
 *         description: Booking marked as used
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Booking'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Booking not found
 */
router.patch(
  '/:bookingId/used',
  bookingIdParamValidator,
  handleValidationError,
  decodeJwtToken,
  permission.isStaff, // only staff can mark as used
  markBookingAsUsed
);

/**
 * @swagger
 * /bookings/{bookingId}/cancel:
 *   patch:
 *     summary: Cancel a booking (owner or staff)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         schema:
 *           type: string
 *         required: true
 *         description: UUID of the booking
 *     responses:
 *       200:
 *         description: Booking canceled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Booking'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Booking not found
 */
router.patch(
  '/:bookingId/cancel',
  bookingIdParamValidator,
  handleValidationError,
  decodeJwtToken,
  permission.canAccessBooking, // owner or staff can cancel
  cancelBooking
);

/**
 * @swagger
 * /bookings/{bookingId}:
 *   delete:
 *     summary: Delete a booking (ownership or staff only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         schema:
 *           type: string
 *         required: true
 *         description: UUID of the booking
 *     responses:
 *       204:
 *         description: Booking deleted (No Content)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Booking not found
 */
router.delete(
  '/:bookingId',
  bookingIdParamValidator,
  handleValidationError,
  decodeJwtToken,
  permission.canAccessBooking,
  deleteBooking
);

/**
 * @swagger
 * /bookings/user/{userId}:
 *   get:
 *     summary: Get all bookings for a specific user
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: UUID of the user
 *     responses:
 *       200:
 *         description: Bookings for user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Booking'
 */
router.get(
  '/user/:userId',
  userIdParamValidator,
  handleValidationError,
  getBookingsByUser
);

/**
 * @swagger
 * /bookings/screening/{screeningId}:
 *   get:
 *     summary: Get all bookings for a screening
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: screeningId
 *         schema:
 *           type: string
 *         required: true
 *         description: UUID of the screening
 *     responses:
 *       200:
 *         description: Bookings for screening
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Booking'
 */
router.get(
  '/screening/:screeningId',
  screeningIdParamValidator,
  handleValidationError,
  getBookingsByScreening
);

/**
 * @swagger
 * /bookings/status/{status}:
 *   get:
 *     summary: Get bookings by status
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, used, canceled]
 *         required: true
 *         description: Booking status
 *     responses:
 *       200:
 *         description: Bookings with given status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Booking'
 */
router.get('/status/:status', handleValidationError, getBookingsByStatus);

/**
 * @swagger
 * /bookings/user/{userId}/upcoming:
 *   get:
 *     summary: Get all upcoming bookings for a user (screening is today or in the future)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: UUID of the user
 *     responses:
 *       200:
 *         description: Upcoming bookings for the user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Booking'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (if not self or staff)
 */
router.get(
  '/user/:userId/upcoming',
  decodeJwtToken,
  permission.isSelfOrStaff,
  userIdParamValidator,
  handleValidationError,
  getUpcomingBookingsByUser
);

router.get(
  '/:bookingId/ticket',
  bookingIdParamValidator,
  handleValidationError,
  decodeJwtToken,
  permission.canAccessBooking,
  generateTicket
);

export default router;
