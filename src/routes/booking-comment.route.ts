import { Router } from 'express';
import * as bookingCommentController from '../controllers/booking-comment.controller.js';
import { validate } from '../middlewares/validate.js';

import { permission } from '../middlewares/permission.js';
import {
  createCommentValidation,
  updateCommentValidation,
  bookingIdParamValidation,
  statusParamValidation,
  movieIdParamValidation,
  searchQueryValidation,
} from '../validators/booking-comment.validator.js';
import { decodeJwtToken } from '../middlewares/auth.middleware.js';
import { validateUserIdParam } from '../validators/user.validator.js';
import { handleValidationError } from '../middlewares/handleValidatonError.middleware.js';

const router = Router();

/**
 * @swagger
 * /movies/{movieId}/comments:
 *   get:
 *     summary: Get all comments for a specific movie (public)
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: movieId
 *         required: true
 *         schema:
 *           type: string
 *         description: Movie ID
 *     responses:
 *       200:
 *         description: List of comments for the movie
 */
router.get(
  '/movies/:movieId/comments',
  movieIdParamValidation,
  handleValidationError,
  bookingCommentController.getCommentsByMovie
);

// All routes below require authentication
router.use(decodeJwtToken);

/**
 * @swagger
 * /bookings/{bookingId}/comment:
 *   get:
 *     summary: Get comment for a booking (owner or staff)
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Found comment
 */
router.get(
  '/bookings/:bookingId/comment',
  decodeJwtToken,
  permission.canAccessBooking,
  bookingIdParamValidation,
  handleValidationError,
  bookingCommentController.getCommentByBookingId
);

/**
 * @swagger
 * /bookings/{bookingId}/add-comment:
 *   post:
 *     summary: Add a comment to a booking (owner or staff)
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - comment
 *               - rating
 *             properties:
 *               comment:
 *                 type: string
 *               rating:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 5
 *     responses:
 *       201:
 *         description: Comment added
 */
router.post(
  '/bookings/:bookingId/add-comment',
  decodeJwtToken,
  permission.canAccessBooking,
  createCommentValidation,
  handleValidationError,
  bookingCommentController.createComment
);

/**
 * @swagger
 * /bookings/{bookingId}/comment:
 *   put:
 *     summary: Update a comment (owner or staff)
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - comment
 *               - rating
 *             properties:
 *               comment:
 *                 type: string
 *               rating:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Comment updated
 */
router.put(
  '/bookings/:bookingId/comment',
  decodeJwtToken,
  permission.canAccessBooking,
  updateCommentValidation,
  handleValidationError,
  bookingCommentController.updateComment
);

/**
 * @swagger
 * /bookings/{bookingId}/comment:
 *   delete:
 *     summary: Delete a comment (owner or staff)
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Comment deleted
 */
router.delete(
  '/bookings/:bookingId/comment',
  decodeJwtToken,
  permission.canAccessBooking,
  bookingIdParamValidation,
  handleValidationError,
  bookingCommentController.deleteComment
);

/**
 * @swagger
 * /bookings/{bookingId}/comment/confirm:
 *   patch:
 *     summary: Confirm a comment (staff only)
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Comment confirmed
 */
router.patch(
  '/bookings/:bookingId/comment/confirm',
  decodeJwtToken,
  permission.isStaff,
  bookingIdParamValidation,
  handleValidationError,
  bookingCommentController.confirmComment
);

/**
 * @swagger
 * /bookings/comments:
 *   get:
 *     summary: Get all comments (staff only)
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all comments
 */
router.get(
  '/bookings/comments',
  decodeJwtToken,
  permission.isStaff,
  bookingCommentController.getAllComments
);

/**
 * @swagger
 * /bookings/comments/status/{status}:
 *   get:
 *     summary: Get comments by status (staff only)
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: status
 *         required: true
 *         schema:
 *           type: string
 *           enum: [pending, confirmed]
 *     responses:
 *       200:
 *         description: List of comments filtered by status
 */
router.get(
  '/bookings/comments/status/:status',
  decodeJwtToken,
  permission.isStaff,
  statusParamValidation,
  handleValidationError,
  bookingCommentController.getCommentsByStatus
);

/**
 * @swagger
 * /bookings/comments/search:
 *   get:
 *     summary: Search comments (staff only)
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: false
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [pending, confirmed]
 *       - in: query
 *         name: rating
 *         required: false
 *         schema:
 *           type: integer
 *       - in: query
 *         name: bookingId
 *         required: false
 *         schema:
 *           type: string
 *       - in: query
 *         name: movieId
 *         required: false
 *         schema:
 *           type: string
 *       - in: query
 *         name: createdAt
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Search results
 */
router.get(
  '/bookings/comments/search',
  decodeJwtToken,
  permission.isStaff,
  searchQueryValidation,
  handleValidationError,
  bookingCommentController.searchComments
);

/**
 * @swagger
 * /movies/{movieId}/comments/average:
 *   get:
 *     summary: Get the average rating for a movie
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: movieId
 *         required: true
 *         schema:
 *           type: string
 *         description: Movie ID
 *     responses:
 *       200:
 *         description: The average rating for the movie (null if no ratings)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: number
 *                   nullable: true
 */
router.get(
  '/movies/:movieId/comments/average',
  movieIdParamValidation,
  handleValidationError,
  bookingCommentController.getAverageRatingForMovie
);

/**
 * @swagger
 * /users/{userId}/comments:
 *   get:
 *     summary: Get all comments made by a specific user (public)
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: List of comments made by the user
 */
router.get(
  '/users/:userId/comments',
  decodeJwtToken,
  permission.isOwnerOrStaff,
  validateUserIdParam,
  handleValidationError,
  bookingCommentController.getCommentsByUser
);

export default router;
