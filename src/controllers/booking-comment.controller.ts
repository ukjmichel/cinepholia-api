import { Request, Response, NextFunction } from 'express';
import { BookingCommentService } from '../services/booking-comment.service.js';
import { NotFoundError } from '../errors/not-found-error.js';
import { BadRequestError } from '../errors/bad-request-error.js';

/**
 * Get comment by bookingId
 */
export async function getCommentByBookingId(
  req: Request<{ bookingId: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const { bookingId } = req.params;
    const comment =
      await BookingCommentService.getCommentByBookingId(bookingId);
    res.json({ message: 'Comment found', data: comment });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a comment for a booking
 */
export async function createComment(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const created = await BookingCommentService.createComment(req.body);
    res.status(201).json({ message: 'Comment created', data: created });
  } catch (error) {
    next(error);
  }
}

/**
 * Update a comment by bookingId
 */
export async function updateComment(
  req: Request<{ bookingId: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const { bookingId } = req.params;
    const updated = await BookingCommentService.updateComment(
      bookingId,
      req.body
    );
    res.json({ message: 'Comment updated', data: updated });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a comment by bookingId
 */
export async function deleteComment(
  req: Request<{ bookingId: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const { bookingId } = req.params;
    await BookingCommentService.deleteComment(bookingId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * Get all comments
 */
export async function getAllComments(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const comments = await BookingCommentService.getAllComments();
    res.json({ message: 'All comments', data: comments });
  } catch (error) {
    next(error);
  }
}

/**
 * Get comments by status
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
    const comments = await BookingCommentService.getCommentsByStatus(
      status as 'pending' | 'confirmed'
    );
    res.json({ message: `Comments with status ${status}`, data: comments });
  } catch (error) {
    next(error);
  }
}

/**
 * Confirm a comment (set status to 'confirmed')
 */
export async function confirmComment(
  req: Request<{ bookingId: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const { bookingId } = req.params;
    const updated = await BookingCommentService.confirmComment(bookingId);
    res.json({ message: 'Comment confirmed', data: updated });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all comments for a specific movieId
 */
export async function getCommentsByMovieId(
  req: Request<{ movieId: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const { movieId } = req.params;
    const comments = await BookingCommentService.getCommentsByMovieId(movieId);
    res.json({ message: `Comments for movie ${movieId}`, data: comments });
  } catch (error) {
    next(error);
  }
}

/**
 * Search comments (by text, status, bookingId)
 */
export async function searchComments(
  req: Request<{}, {}, {}, { q?: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const { q } = req.query;
    if (!q) {
      return next(new BadRequestError('Query parameter q is required'));
    }
    const results = await BookingCommentService.searchComments(q);
    res.json({ message: 'Comments search results', data: results });
  } catch (error) {
    next(error);
  }
}
