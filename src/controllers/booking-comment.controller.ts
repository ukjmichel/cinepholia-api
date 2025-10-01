/**
 * @module controllers/booking-comment.controller
 *
 * @description
 * Handles all operations related to user comments on bookings
 *
 * @features
 * - **CRUD Operations**: Create, read, update, and delete comments
 * - **Filtering**: Retrieve comments by movie, user, status, or booking ID
 * - **Search**: Text search with optional filters (status, rating, date, movie)
 * - **Confirmation Workflow**: Approve pending comments
 * - **Analytics**: Retrieve average ratings for a given movie
 *
 * @security
 * - **XSS Prevention**: All user-provided comments are sanitized server-side using DOMPurify and jsdom.
 * - **Input Validation**: Status, IDs, and query parameters are validated before processing.
 *
 * @dependencies
 * - `bookingCommentService`: Business logic and database operations for comments.
 * - `BookingComment` (MongoDB): Stores the comment documents.
 * - `UserModel` & `BookingModel` (SQL): Used to enrich comments with user details.
 * - `DOMPurify` + `jsdom`: Sanitize HTML to prevent XSS attacks.
 *
 * @response
 * All endpoints return JSON in this unified shape:
 * ```json
 * {
 *   "message": "Short description of result",
 *   "data": { ... } | [ ... ] | null
 * }
 * ```
 */

import { Request, Response, NextFunction } from 'express';
import { bookingCommentService } from '../services/booking-comment.service.js';

import { UserModel } from '../models/user.model.js';
import { BookingModel } from '../models/booking.model.js';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { BadRequestError } from '../errors/bad-request-error.js';
import { BookingComment } from '../interfaces/booking-comment.js';

// DOMPurify instance for sanitizing comments
const { window } = new JSDOM('');
const DOMPurifyInstance = createDOMPurify(window as any);

/**
 * Sanitize a comment to prevent XSS.
 * Strips all tags and attributes.
 */
function sanitizeComment(input: string): string {
  return DOMPurifyInstance.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

/**
 * Formats a raw comment by adding user details from the SQL database.
 */
async function formatCommentResponse(comment: BookingComment) {
  const booking = await BookingModel.findOne({
    where: { bookingId: (comment as any).bookingId },
    include: [{ model: UserModel, as: 'user' }],
  });

  return {
    ...(typeof (comment as any).toObject === 'function'
      ? (comment as any).toObject()
      : (comment as any)),
    user: booking?.user
      ? {
          userId: booking.user.id,
          username: booking.user.username,
          firstName: booking.user.firstName,
          lastName: booking.user.lastName,
          email: booking.user.email,
        }
      : null,
  };
}

export class BookingCommentController {
  /**
   * Retrieve all comments, sorted by creation date
   * @route GET /api/comments
   */
  getAllComments = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const comments = await bookingCommentService.getAllComments();
      const formatted = await Promise.all(comments.map(formatCommentResponse));
      res.status(200).json({ message: 'All comments', data: formatted });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Retrieve all comments for a specific movie
   * @route GET /api/movies/:movieId/comments
   */
  getCommentsByMovie = async (
    req: Request<{ movieId: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const comments = await bookingCommentService.getCommentsByMovie(
        req.params.movieId
      );
      const formatted = await Promise.all(comments.map(formatCommentResponse));
      res.status(200).json({ message: 'Comments for movie', data: formatted });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Retrieve comments filtered by status
   * @route GET /api/comments/status/:status
   */
  getCommentsByStatus = async (
    req: Request<{ status: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { status } = req.params;
      if (!['pending', 'confirmed'].includes(status)) {
        throw new BadRequestError(
          'Invalid status. Must be pending or confirmed.'
        );
      }
      const comments = await bookingCommentService.getCommentsByStatus(
        status as 'pending' | 'confirmed'
      );
      const formatted = await Promise.all(comments.map(formatCommentResponse));
      res
        .status(200)
        .json({ message: `Comments with status ${status}`, data: formatted });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Retrieve a comment by its booking ID
   * @route GET /api/comments/booking/:bookingId
   */
  getCommentByBookingId = async (
    req: Request<{ bookingId: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const comment = await bookingCommentService.getCommentByBookingId(
        req.params.bookingId
      );
      const formatted = await formatCommentResponse(comment);
      res.status(200).json({ message: 'Comment found', data: formatted });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Retrieve all comments written by a user
   * @route GET /api/comments/user/:userId
   */
  getCommentsByUser = async (
    req: Request<{ userId: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const comments = await bookingCommentService.getCommentsByUser(
        req.params.userId
      );
      const formatted = await Promise.all(comments.map(formatCommentResponse));
      res.status(200).json({
        message: `Comments by user ${req.params.userId}`,
        data: formatted,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create a new comment (XSS sanitized)
   * @route POST /api/comments/:bookingId
   * @security Sanitizes comment to prevent XSS
   */
  createComment = async (
    req: Request<{ bookingId: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.params.bookingId) {
        throw new BadRequestError('bookingId is required in URL');
      }

      // Sanitize comment if provided
      if (req.body.comment) {
        req.body.comment = sanitizeComment(req.body.comment);
      }

      const payload = { ...req.body, bookingId: req.params.bookingId };
      const created = await bookingCommentService.createComment(payload);
      const formatted = await formatCommentResponse(created);
      res.status(201).json({ message: 'Comment created', data: formatted });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update an existing comment (with XSS sanitization)
   * @route PUT /api/comments/:bookingId
   */
  updateComment = async (
    req: Request<{ bookingId: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Sanitize comment if provided
      if (req.body.comment) {
        req.body.comment = sanitizeComment(req.body.comment);
      }

      const updated = await bookingCommentService.updateComment(
        req.params.bookingId,
        req.body
      );
      const formatted = await formatCommentResponse(updated);
      res.status(200).json({ message: 'Comment updated', data: formatted });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete a comment by its booking ID
   * @route DELETE /api/comments/:bookingId
   */
  deleteComment = async (
    req: Request<{ bookingId: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      await bookingCommentService.deleteComment(req.params.bookingId);
      res.status(200).json({ message: 'Comment deleted', data: null });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Confirm a pending comment
   * @route PATCH /api/comments/:bookingId/confirm
   */
  confirmComment = async (
    req: Request<{ bookingId: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const updated = await bookingCommentService.confirmComment(
        req.params.bookingId
      );
      const formatted = await formatCommentResponse(updated);
      res.status(200).json({ message: 'Comment confirmed', data: formatted });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Search for comments by text or filters
   * @route GET /api/comments/search
   * @query q - Full-text search in comment
   * @query status - Filter by status (pending, confirmed)
   * @query rating - Filter by exact rating
   * @query movieId - Filter by movie
   */
  searchComments = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { q, status, rating, bookingId, movieId, createdAt } =
        req.query as {
          q?: string;
          status?: string;
          rating?: string | number;
          bookingId?: string;
          movieId?: string;
          createdAt?: string;
        };

      const filters: any = {};
      if (status) filters.status = status;
      if (bookingId) filters.bookingId = bookingId;
      if (rating !== undefined) filters.rating = Number(rating);
      if (movieId) filters.movieId = movieId;
      if (createdAt) filters.createdAt = new Date(createdAt);

      const results = await bookingCommentService.searchComments(q, filters);
      const formatted = await Promise.all(results.map(formatCommentResponse));
      res.status(200).json({ message: 'Search results', data: formatted });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get the average rating for a movie
   * @route GET /api/movies/:movieId/average-rating
   */
  getAverageRatingForMovie = async (
    req: Request<{ movieId: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const avg = await bookingCommentService.getAverageRatingForMovie(
        req.params.movieId
      );
      res.status(200).json({ message: 'Average rating', data: avg });
    } catch (error) {
      next(error);
    }
  };
}

/** Singleton instance for routing usage */
export const bookingCommentController = new BookingCommentController();
