import express from 'express';
import {
  createBooking,
  getBookingById,
  updateBooking,
  deleteBooking,
  getAllBookings,
  getBookingsByUser,
  getBookingsByScreening,
  getBookingsByStatus,
  searchBooking,
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
 *     summary: Update a booking (ownership or staff only)
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
  permission.canAccessBooking,
  updateBooking
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

router.get(
  '/:bookingId/ticket',
  bookingIdParamValidator,
  handleValidationError,
  decodeJwtToken,
  permission.isSelfOrStaff,
  generateTicket
);

export default router;

/**
 * @swagger
 * components:
 *   schemas:
 *     Booking:
 *       type: object
 *       properties:
 *         bookingId:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the booking
 *         userId:
 *           type: string
 *           format: uuid
 *           description: User who made the booking
 *         screeningId:
 *           type: string
 *           format: uuid
 *           description: Screening for this booking
 *         seatsNumber:
 *           type: integer
 *           description: Number of seats booked
 *         status:
 *           type: string
 *           enum: [pending, used, canceled]
 *           description: Status of the booking
 *         bookingDate:
 *           type: string
 *           format: date-time
 *           description: Date and time of booking
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     BookingInput:
 *       type: object
 *       required:
 *         - userId
 *         - screeningId
 *         - seatsNumber
 *       properties:
 *         userId:
 *           type: string
 *           format: uuid
 *         screeningId:
 *           type: string
 *           format: uuid
 *         seatsNumber:
 *           type: integer
 *           minimum: 1
 *
 *     BookingUpdate:
 *       type: object
 *       properties:
 *         seatsNumber:
 *           type: integer
 *           minimum: 1
 *         status:
 *           type: string
 *           enum: [pending, used, canceled]
 */

/**
 * @swagger
 * tags:
 *   - name: Bookings
 *     description: API for managing cinema bookings
 */
