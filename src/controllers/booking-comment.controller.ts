/**
 * @module controllers/booking-comment.controller
 *
 * @description
 * Handles all booking comment endpoints with:
 * - **CRUD operations** (create, read, update, delete)
 * - **Search and filtering** by status, movie, or text query
 * - **Confirmation workflow** (approve pending comments)
 * - **Average movie rating** retrieval
 * - ✅ **Security:** Sanitizes user input to prevent XSS attacks (via DOMPurify + jsdom)
 *
 * ## Response Structure
 * All endpoints return JSON with the format:
 * ```json
 * {
 *   "message": "Description of response",
 *   "data": { ... } | [ ... ]
 * }
 * ```
 *
 * ## Security
 * - **XSS Prevention:** User comments are cleaned server-side with DOMPurify.
 * - **Input Validation:** Status, IDs, and query parameters are checked before use.
 */

import { Request, Response, NextFunction } from 'express';
import { bookingCommentService } from '../services/booking-comment.service.js';
import { BadRequestError } from '../errors/bad-request-error.js';
import { BookingComment } from '../models/booking-comment.schema.js';
import { UserModel } from '../models/user.model.js';
import { BookingModel } from '../models/booking.model.js';
import createDOMPurify, { DOMPurify } from 'dompurify';
import { JSDOM } from 'jsdom';

// ✅ DOMPurify instance for sanitizing comments
// Create a jsdom window (server-side DOM)
const { window } = new JSDOM('');
const DOMPurifyInstance = createDOMPurify(window as any);

/**
 * Sanitize a comment to prevent XSS.
 * Strips all tags and attributes.
 *
 * @param input - The user-provided comment
 * @returns A safe, sanitized string
 */
export function sanitizeComment(input: string): string {
  return DOMPurifyInstance.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

/**
 * ✅ Formats a raw comment by adding user details from the SQL database.
 *
 * @async
 * @param {BookingComment} comment - Comment document retrieved from MongoDB.
 * @returns {Promise<object>} Comment with embedded `user` object, or `null` if user not found.
 *
 * @example
 * ```json
 * {
 *   "_id": "123",
 *   "comment": "Nice!",
 *   "rating": 4,
 *   "user": {
 *     "userId": "u1",
 *     "username": "john",
 *     "email": "john@mail.com"
 *   }
 * }
 * ```
 */
export const formatCommentResponse = async (comment: BookingComment) => {
  const booking = await BookingModel.findOne({
    where: { bookingId: comment.bookingId },
    include: [{ model: UserModel, as: 'user' }],
  });

  return {
    ...comment,
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
};

/* --------------------------------------------------------------------------
   ✅ CRUD HANDLERS
   -------------------------------------------------------------------------- */

/**
 * **GET /comments**
 *
 * Retrieve all comments, sorted by creation date.
 *
 * @route GET /comments
 * @returns {Promise<Response>} `200 OK` with all comments.
 */
export async function getAllComments(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const comments = await bookingCommentService.getAllComments();
    const formatted = await Promise.all(comments.map(formatCommentResponse));
    res.json({ message: 'All comments', data: formatted });
  } catch (error) {
    next(error);
  }
}

/**
 * **GET /movies/:movieId/comments**
 *
 * Retrieve all comments for a specific movie.
 *
 * @route GET /movies/:movieId/comments
 * @param {string} req.params.movieId - UUID of the movie.
 * @returns {Promise<Response>} `200 OK` with an array of comments.
 */
export async function getCommentsByMovie(
  req: Request<{ movieId: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const comments = await bookingCommentService.getCommentsByMovie(
      req.params.movieId
    );
    const formatted = await Promise.all(comments.map(formatCommentResponse));
    res.json({ message: 'Comments for movie', data: formatted });
  } catch (error) {
    next(error);
  }
}

/**
 * **GET /comments/status/:status**
 *
 * Retrieve comments filtered by status.
 *
 * @route GET /comments/status/:status
 * @param {string} req.params.status - Must be either `pending` or `confirmed`.
 * @throws {BadRequestError} If invalid status is provided.
 * @returns {Promise<Response>} `200 OK` with filtered comments.
 */
export async function getCommentsByStatus(
  req: Request<{ status: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const { status } = req.params;
    if (!['pending', 'confirmed'].includes(status)) {
      return next(new BadRequestError('Invalid status'));
    }
    const comments = await bookingCommentService.getCommentsByStatus(
      status as 'pending' | 'confirmed'
    );
    const formatted = await Promise.all(comments.map(formatCommentResponse));
    res.json({ message: `Comments with status ${status}`, data: formatted });
  } catch (error) {
    next(error);
  }
}

/**
 * **GET /comments/booking/:bookingId**
 *
 * Retrieve a comment by its booking ID.
 *
 * @route GET /comments/booking/:bookingId
 * @throws {NotFoundError} If no comment exists for the booking.
 */
export async function getCommentByBookingId(
  req: Request<{ bookingId: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const comment = await bookingCommentService.getCommentByBookingId(
      req.params.bookingId
    );
    const formatted = await formatCommentResponse(comment);
    res.json({ message: 'Comment found', data: formatted });
  } catch (error) {
    next(error);
  }
}

/**
 * **GET /comments/user/:userId**
 *
 * Retrieve all comments written by a user.
 *
 * @route GET /comments/user/:userId
 */
export async function getCommentsByUser(
  req: Request<{ userId: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const comments = await bookingCommentService.getCommentsByUser(
      req.params.userId
    );
    const formatted = await Promise.all(comments.map(formatCommentResponse));
    res.json({
      message: `Comments by user ${req.params.userId}`,
      data: formatted,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * **POST /comments/:bookingId**
 *
 * Create a new comment (XSS sanitized).
 *
 * @security
 * - Sanitizes `req.body.comment` to prevent malicious HTML/JS.
 *
 * @route POST /comments/:bookingId
 * @body {string} comment - User-provided text.
 * @body {number} rating - Rating from 1 to 5.
 */
export async function createComment(
  req: Request<{ bookingId: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.params.bookingId) {
      res.status(400).json({ message: 'bookingId is required in URL' });
      return;
    }

    if (req.body.comment) req.body.comment = sanitizeComment(req.body.comment);

    const payload = { ...req.body, bookingId: req.params.bookingId };
    const created = await bookingCommentService.createComment(payload);
    const formatted = await formatCommentResponse(created);
    res.status(201).json({ message: 'Comment created', data: formatted });
  } catch (error) {
    next(error);
  }
}

/**
 * **PUT /comments/:bookingId**
 *
 * Update an existing comment (with XSS sanitization).
 */
export async function updateComment(
  req: Request<{ bookingId: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    if (req.body.comment) req.body.comment = sanitizeComment(req.body.comment);
    const updated = await bookingCommentService.updateComment(
      req.params.bookingId,
      req.body
    );
    const formatted = await formatCommentResponse(updated);
    res.json({ message: 'Comment updated', data: formatted });
  } catch (error) {
    next(error);
  }
}

/**
 * **DELETE /comments/:bookingId**
 *
 * Delete a comment by its booking ID.
 */
export async function deleteComment(
  req: Request<{ bookingId: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    await bookingCommentService.deleteComment(req.params.bookingId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * **PATCH /comments/:bookingId/confirm**
 *
 * Confirm a pending comment.
 */
export async function confirmComment(
  req: Request<{ bookingId: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const updated = await bookingCommentService.confirmComment(
      req.params.bookingId
    );
    const formatted = await formatCommentResponse(updated);
    res.json({ message: 'Comment confirmed', data: formatted });
  } catch (error) {
    next(error);
  }
}

/* --------------------------------------------------------------------------
   ✅ SEARCH & RATING
   -------------------------------------------------------------------------- */

/**
 * **GET /comments/search**
 *
 * Search for comments by text or filters.
 *
 * @query {string} q - Full-text search in comment.
 * @query {string} status - Filter by status (`pending`, `confirmed`).
 * @query {number} rating - Filter by exact rating.
 * @query {string} movieId - Filter by movie.
 */
export async function searchComments(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { q, status, rating, bookingId, movieId, createdAt } = req.query;
    const filters: any = {};
    if (status) filters.status = status;
    if (bookingId) filters.bookingId = bookingId;
    if (rating) filters.rating = Number(rating);
    if (movieId) filters.movieId = movieId;
    if (createdAt) filters.createdAt = new Date(createdAt as string);

    const results = await bookingCommentService.searchComments(
      q as string | undefined,
      filters
    );
    const formatted = await Promise.all(results.map(formatCommentResponse));
    res.json({ message: 'Search results', data: formatted });
  } catch (error) {
    next(error);
  }
}

/**
 * **GET /movies/:movieId/average-rating**
 *
 * Get the average rating for a movie.
 */
export async function getAverageRatingForMovie(
  req: Request<{ movieId: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const avg = await bookingCommentService.getAverageRatingForMovie(
      req.params.movieId
    );
    res.json({ message: 'Average rating', data: avg });
  } catch (error) {
    next(error);
  }
}
