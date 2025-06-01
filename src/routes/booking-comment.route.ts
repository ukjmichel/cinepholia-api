import { Router, Request, Response, NextFunction } from 'express';
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
  validate,
  bookingCommentController.getCommentsByMovieId
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
  bookingIdParamValidation,
  validate,
  permission.canAccessBooking,
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
  createCommentValidation,
  validate,
  permission.canAccessBooking,
  bookingCommentController.createComment
);

/**
 * @swagger
 * /bookings/:bookingId/comment:
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
  updateCommentValidation,
  validate,
  permission.canAccessBooking,
  bookingCommentController.updateComment
);

/**
 * @swagger
 * /bookings/:bookingId/comment:
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
  bookingIdParamValidation,
  validate,
  permission.canAccessBooking,
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
  bookingIdParamValidation,
  validate,
  permission.isStaff,
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
  statusParamValidation,
  validate,
  permission.isStaff,
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
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *     responses:
 *       200:
 *         description: Search results
 */
router.get(
  '/bookings/comments/search',
  searchQueryValidation,
  validate,
  permission.isStaff,
  bookingCommentController.searchComments
);

export default router;
