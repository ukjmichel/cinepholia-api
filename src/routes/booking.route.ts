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
  restrictSearch,
} from '../controllers/booking.controller.js';
import {
  createBookingValidator,
  updateBookingValidator,
  bookingIdParamValidator,
  searchBookingValidator,
  restrictSearchValidator,
} from '../validators/booking.validator.js';
import { userIdParamValidator } from '../validators/user.validator.js';
import { screeningIdParamValidator } from '../validators/screening.validator.js';
import { handleValidationError } from '../middlewares/handleValidatonError.middleware.js';
import { decodeJwtToken } from '../middlewares/auth.middleware.js';
import { permission } from '../middlewares/permission.js';
import { generateTicket } from '../controllers/generate-ticket.controller.js';

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
  decodeJwtToken,
  permission.canCreateBooking,
  createBookingValidator,
  handleValidationError,
  createBooking
);

/**
 * @swagger
 * /bookings/search:
 *   get:
 *     summary: Search all bookings by query or filters (admin/staff only)
 *     description: Returns bookings matching the query. Supports filters by status, userId, screeningId, seatsNumber, totalPrice, and bookingDate.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: false
 *         description: Global search string (matches bookingId, status, userId, etc.)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter by booking status
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter by user ID
 *       - in: query
 *         name: screeningId
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter by screening ID
 *       - in: query
 *         name: bookingDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter by booking creation date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Bookings matching search criteria
 *       400:
 *         description: Bad request (missing or invalid parameter)
 */
router.get(
  '/search',
  decodeJwtToken,
  permission.isStaff,
  searchBookingValidator,
  handleValidationError,
  searchBooking
);

/**
 * @swagger
 * /bookings/restrict-search:
 *   get:
 *     summary: Get bookings for the authenticated user, filtered by screening date, booking date, and/or booking status
 *     description: >
 *       Returns bookings for the user identified by their JWT token.
 *       - Use `screeningDate` to filter by the date of the movie screening (YYYY-MM-DD).
 *       - Use `date` to filter by the date the booking was created (YYYY-MM-DD).
 *       - Use `status` to filter by booking status.
 *       All filters are optional and can be combined.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: screeningDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter by the date of the screening (YYYY-MM-DD). Returns bookings where the screening occurs on this date.
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter by the date the booking was created (YYYY-MM-DD).
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, used, canceled]
 *         required: false
 *         description: Filter by booking status.
 *     responses:
 *       200:
 *         description: Bookings found for the authenticated user with the given filters.
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
 *         description: Bad request (missing or invalid parameters)
 *       404:
 *         description: No bookings found
 *       401:
 *         description: Unauthorized (JWT missing or invalid)
 */
router.get(
  '/restrict-search',
  decodeJwtToken,
  restrictSearchValidator, 
  handleValidationError,
  restrictSearch
);


/**
 * @swagger
 * /bookings:
 *   get:
 *     summary: Get all bookings (staff only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
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
router.get(
  '/',
  decodeJwtToken,
  permission.isStaff,
  handleValidationError,
  getAllBookings
);

/**
 * @swagger
 * /bookings/{bookingId}:
 *   get:
 *     summary: Get a booking by ID (owner or staff)
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
  decodeJwtToken,
  permission.canAccessBooking,
  bookingIdParamValidator,
  handleValidationError,
  getBookingById
);

/**
 * @swagger
 * /bookings/{bookingId}:
 *   patch:
 *     summary: Update a booking (owner or staff)
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
  decodeJwtToken,
  permission.canAccessBooking,
  bookingIdParamValidator,
  updateBookingValidator,
  handleValidationError,
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
  decodeJwtToken,
  permission.isStaff,
  bookingIdParamValidator,
  handleValidationError,
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
  decodeJwtToken,
  permission.canAccessBooking,
  bookingIdParamValidator,
  handleValidationError,
  cancelBooking
);

/**
 * @swagger
 * /bookings/{bookingId}:
 *   delete:
 *     summary: Delete a booking (owner or staff)
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
  decodeJwtToken,
  permission.canAccessBooking,
  bookingIdParamValidator,
  handleValidationError,
  deleteBooking
);

/**
 * @swagger
 * /bookings/user/{userId}:
 *   get:
 *     summary: Get all bookings for a specific user (owner or staff)
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
  decodeJwtToken,
  permission.isOwnerOrStaff,
  userIdParamValidator,
  handleValidationError,
  getBookingsByUser
);

/**
 * @swagger
 * /bookings/screening/{screeningId}:
 *   get:
 *     summary: Get all bookings for a screening (staff only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
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
  decodeJwtToken,
  permission.isStaff,
  screeningIdParamValidator,
  handleValidationError,
  getBookingsByScreening
);

/**
 * @swagger
 * /bookings/status/{status}:
 *   get:
 *     summary: Get bookings by status (staff only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
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
router.get(
  '/status/:status',
  decodeJwtToken,
  permission.isStaff,
  handleValidationError,
  getBookingsByStatus
);

/**
 * @swagger
 * /bookings/{bookingId}/ticket:
 *   get:
 *     summary: Generate a ticket for a booking (owner or staff)
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
 *         description: Ticket generated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Booking'
 */
router.get(
  '/:bookingId/ticket',
  decodeJwtToken,
  permission.canAccessBooking,
  bookingIdParamValidator,
  handleValidationError,
  generateTicket
);

export default router;
