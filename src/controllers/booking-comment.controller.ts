/**
 * Booking Comment Controller
 *
 * Handles CRUD operations for booking comments:
 * - Create, read, update, and delete comments related to bookings.
 * - Search for comments by status, movie, or full-text.
 * - Confirm comments.
 *
 * Dependencies:
 * - bookingCommentService: business logic for comment management.
 * - NotFoundError, BadRequestError: explicit error handling.
 *
 * Each Express handler follows RESTful conventions: status codes, messages, and consistent response structure.
 *
 * @module controllers/booking-comment.controller
 * @since 2024
 */

import { Request, Response, NextFunction } from 'express';
import { bookingCommentService } from '../services/booking-comment.service.js';
import { NotFoundError } from '../errors/not-found-error.js';
import { BadRequestError } from '../errors/bad-request-error.js';
import { BookingComment } from '../models/booking-comment.schema.js';
import { UserModel } from '../models/user.model.js';
import { BookingModel } from '../models/booking.model.js';

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

/**
 * Retrieve all comments, sorted by creation date (newest first).
 *
 * @function getAllComments
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next middleware.
 * @returns {Promise<void>} JSON response with all comments.
 */

/**
 * Retrieve all comments, sorted by creation date (newest first).
 *
 * @function getAllComments
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next middleware.
 * @returns {Promise<void>} JSON response with all comments.
 */
export async function getAllComments(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const comments = await bookingCommentService.getAllComments();
    const formattedComments = await Promise.all(
      comments.map((comment) => formatCommentResponse(comment))
    );
    res.json({ message: 'All comments', data: formattedComments });
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieve all comments for a specific movie.
 *
 * @function getCommentsByMovie
 * @param {Request<{ movieId: string }>} req - Express request object with movieId param.
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next middleware.
 * @returns {Promise<void>} JSON response with comments for the movie.
 */
export async function getCommentsByMovie(
  req: Request<{ movieId: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const { movieId } = req.params;
    const comments = await bookingCommentService.getCommentsByMovie(movieId);
    const formattedComments = await Promise.all(
      comments.map((comment) => formatCommentResponse(comment))
    );
    res.json({ message: 'Comments for movie', data: formattedComments });
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieve comments filtered by status ('pending' or 'confirmed').
 *
 * @function getCommentsByStatus
 * @param {Request<{ status: string }>} req - Express request object with status param.
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next middleware.
 * @returns {Promise<void>} JSON response with comments filtered by status.
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
    const formattedComments = await Promise.all(
      comments.map((comment) => formatCommentResponse(comment))
    );
    res.json({
      message: `Comments with status ${status}`,
      data: formattedComments,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieve a comment by bookingId.
 *
 * @function getCommentByBookingId
 * @param {Request<{ bookingId: string }>} req - Express request object with bookingId param.
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next middleware.
 * @returns {Promise<void>} JSON response with the found comment.
 */
export async function getCommentByBookingId(
  req: Request<{ bookingId: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const { bookingId } = req.params;
    const comment =
      await bookingCommentService.getCommentByBookingId(bookingId);
    const formattedComment = comment
      ? await formatCommentResponse(comment)
      : null;
    res.json({ message: 'Comment found', data: formattedComment });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new comment for a booking.
 * @param {Request} req - Express request object (param: bookingId, body: comment fields).
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next middleware.
 * @returns {Promise<void>} JSON response with the created comment.
 */
export async function createComment(
  req: Request<{ bookingId: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const { bookingId } = req.params;
    if (!bookingId) {
      res.status(400).json({ message: 'bookingId is required in URL' });
      return;
    }
    const payload = { ...req.body, bookingId };
    const created = await bookingCommentService.createComment(payload);
    const formattedComment = await formatCommentResponse(created);
    res
      .status(201)
      .json({ message: 'Comment created', data: formattedComment });
  } catch (error) {
    next(error);
  }
}

/**
 * Update an existing comment by bookingId.
 *
 * @function updateComment
 * @param {Request<{ bookingId: string }>} req - Express request object (params: bookingId, body: updates).
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next middleware.
 * @returns {Promise<void>} JSON response with the updated comment.
 */
export async function updateComment(
  req: Request<{ bookingId: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const { bookingId } = req.params;
    const updated = await bookingCommentService.updateComment(
      bookingId,
      req.body
    );
    const formattedComment = await formatCommentResponse(updated);
    res.json({ message: 'Comment updated', data: formattedComment });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a comment by bookingId.
 *
 * @function deleteComment
 * @param {Request<{ bookingId: string }>} req - Express request object with bookingId param.
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next middleware.
 * @returns {Promise<void>} Sends 204 No Content on success.
 */
export async function deleteComment(
  req: Request<{ bookingId: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const { bookingId } = req.params;
    await bookingCommentService.deleteComment(bookingId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * Confirm a comment (set its status to 'confirmed').
 *
 * @function confirmComment
 * @param {Request<{ bookingId: string }>} req - Express request object with bookingId param.
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next middleware.
 * @returns {Promise<void>} JSON response with the confirmed comment.
 */
export async function confirmComment(
  req: Request<{ bookingId: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const { bookingId } = req.params;
    const updated = await bookingCommentService.confirmComment(bookingId);
    const formattedComment = await formatCommentResponse(updated);
    res.json({ message: 'Comment confirmed', data: formattedComment });
  } catch (error) {
    next(error);
  }
}

/**
 * Search for comments using optional full-text and advanced filters.
 *
 * Query parameters:
 *  - q: search text in comment
 *  - status, rating, bookingId, movieId, createdAt (for advanced filtering)
 *
 * @function searchComments
 * @param {Request} req - Express request object with search query params.
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next middleware.
 * @returns {Promise<void>} JSON response with the search results.
 */
export async function searchComments(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { q, status, rating, bookingId, movieId, createdAt } = req.query;

    // Build filters for the service
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
    const formattedResults = await Promise.all(
      results.map((comment) => formatCommentResponse(comment))
    );
    res.json({ message: 'Search results', data: formattedResults });
  } catch (error) {
    next(error);
  }
}

/**
 * Get the average rating (notation) for a specific movie.
 *
 * @param req - Express request (params: movieId)
 * @param res - Express response
 * @param next - Express next (error handler)
 *
 * @returns 200 OK with average rating (or null if no ratings)
 *
 * Example response:
 *   { "message": "Average rating", "data": 4.25 }
 */
export async function getAverageRatingForMovie(
  req: Request<{ movieId: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const { movieId } = req.params;
    const avg = await bookingCommentService.getAverageRatingForMovie(movieId);
    res.json({
      message: 'Average rating',
      data: avg,
    });
  } catch (error) {
    next(error);
  }
}
