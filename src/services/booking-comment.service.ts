/**
 * BookingCommentService
 * ---------------------
 * Service for managing comments linked to bookings.
 *
 * Features:
 * - Create, read, update, delete, and search comments.
 * - Filter comments by status, movie, user, and text search.
 * - Enforce business rules:
 *   - Prevent duplicate comments for the same booking.
 *   - Allow comments only on "used" bookings.
 * - Confirm comments and calculate average ratings per movie.
 *
 * Integrations:
 * - MongoDB (Mongoose) for comment storage.
 * - Sequelize (SQL) for bookings, screenings, and movie lookups.
 *
 */

import {
  BookingComment,
  BookingCommentModel,
} from '../models/booking-comment.schema.js';
import { NotFoundError } from '../errors/not-found-error.js';
import { ConflictError } from '../errors/conflict-error.js';
import { BookingModel } from '../models/booking.model.js';
import { ScreeningModel } from '../models/screening.model.js';
import { MovieModel } from '../models/movie.model.js';
import { Op } from 'sequelize';

export interface BookingCommentFilter {
  comment?: string;
  status?: 'pending' | 'confirmed';
  bookingId?: string;
  rating?: number;
  movieId?: string;
  createdAt?: Date;
}

/**
 * Service class responsible for all booking comment operations.
 */
export class BookingCommentService {
  /**
   * Retrieves a comment by its booking ID.
   * @param bookingId - UUID of the booking.
   * @returns The found comment.
   * @throws {NotFoundError} If no comment is found for the given booking ID.
   */
  async getCommentByBookingId(bookingId: string): Promise<BookingComment> {
    const comment = await BookingCommentModel.findOne({ bookingId }).lean();
    if (!comment) {
      throw new NotFoundError(`No comment found for bookingId ${bookingId}`);
    }
    return comment;
  }

  /**
   * Creates a new comment for a booking if the booking is used and no comment exists yet.
   * @param data - The comment data to create.
   * @returns The created comment.
   * @throws {NotFoundError} If the booking does not exist.
   * @throws {ConflictError} If the booking is not used or a comment already exists.
   * @throws {Error} If creation fails unexpectedly.
   */
  async createComment(data: BookingComment): Promise<BookingComment> {
    const booking = (await BookingModel.findOne({
      where: { bookingId: data.bookingId },
    })) as { status: string } | null;

    if (!booking)
      throw new NotFoundError(`Booking with id ${data.bookingId} not found`);
    if (booking.status !== 'used')
      throw new ConflictError('You can only comment on used bookings');

    try {
      const created = await BookingCommentModel.create(data);
      return created.toObject();
    } catch (err: any) {
      if (err.code === 11000) {
        throw new ConflictError(
          `Comment already exists for bookingId ${data.bookingId}`
        );
      }
      throw err;
    }
  }

  /**
   * Updates an existing comment by booking ID.
   * @param bookingId - UUID of the booking.
   * @param updateData - Partial comment data to update.
   * @returns The updated comment.
   * @throws {NotFoundError} If no comment is found.
   * @throws {Error} If update fails unexpectedly.
   */
  async updateComment(
    bookingId: string,
    updateData: Partial<BookingComment>
  ): Promise<BookingComment> {
    const updated = await BookingCommentModel.findOneAndUpdate(
      { bookingId },
      updateData,
      { new: true }
    ).lean();

    if (!updated)
      throw new NotFoundError(`No comment found for bookingId ${bookingId}`);
    return updated;
  }

  /**
   * Deletes a comment by booking ID.
   * @param bookingId - UUID of the booking.
   * @throws {NotFoundError} If no comment is found.
   * @throws {Error} If deletion fails unexpectedly.
   */
  async deleteComment(bookingId: string): Promise<void> {
    const result = await BookingCommentModel.deleteOne({ bookingId });
    if (result.deletedCount === 0) {
      throw new NotFoundError(`No comment found for bookingId ${bookingId}`);
    }
  }

  /**
   * Retrieves all comments sorted by creation date (newest first).
   * @returns A list of comments.
   * @throws {Error} If retrieval fails.
   */
  async getAllComments(): Promise<BookingComment[]> {
    return BookingCommentModel.find().sort({ createdAt: -1 }).lean();
  }

  /**
   * Retrieves all comments linked to a specific movie.
   * @param movieId - UUID of the movie.
   * @returns A list of comments for the movie.
   * @throws {Error} If retrieval fails.
   */
  async getCommentsByMovie(movieId: string): Promise<BookingComment[]> {
    const screenings = await ScreeningModel.findAll({
      where: { movieId },
      attributes: ['screeningId'],
      raw: true,
    });
    const screeningIds = screenings.map((s) => s.screeningId);
    if (!screeningIds.length) return [];

    const bookings = await BookingModel.findAll({
      where: { screeningId: { [Op.in]: screeningIds } },
      attributes: ['bookingId'],
      raw: true,
    });
    const bookingIds = bookings.map((b) => b.bookingId);
    if (!bookingIds.length) return [];

    return BookingCommentModel.find({ bookingId: { $in: bookingIds } })
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Retrieves comments filtered by status.
   * @param status - The status to filter ('pending' or 'confirmed').
   * @returns A list of comments.
   * @throws {Error} If retrieval fails.
   */
  async getCommentsByStatus(
    status: 'pending' | 'confirmed'
  ): Promise<BookingComment[]> {
    return BookingCommentModel.find({ status }).sort({ createdAt: -1 }).lean();
  }

  /**
   * Retrieves all comments submitted by a user, enriched with related movie information.
   * @param userId - UUID of the user.
   * @returns A list of comments with movie details.
   * @throws {Error} If retrieval or enrichment fails.
   */
  async getCommentsByUser(userId: string): Promise<any[]> {
    const bookings = await BookingModel.findAll({
      where: { userId },
      attributes: ['bookingId', 'screeningId'],
      raw: true,
    });
    if (!bookings.length) return [];

    const bookingMap = new Map(
      bookings.map((b) => [b.bookingId, b.screeningId])
    );
    const bookingIds = [...bookingMap.keys()];

    const comments = await BookingCommentModel.find({
      bookingId: { $in: bookingIds },
    })
      .sort({ createdAt: -1 })
      .lean();
    if (!comments.length) return [];

    const screeningIds = [...new Set(bookings.map((b) => b.screeningId))];
    const screenings = await ScreeningModel.findAll({
      where: { screeningId: screeningIds },
      include: [{ model: MovieModel, attributes: ['movieId', 'title'] }],
      raw: true,
      nest: true,
    });

    const screeningToMovieMap = new Map<
      string,
      { movieId: string; title: string }
    >();
    for (const screening of screenings) {
      if (screening.movie) {
        screeningToMovieMap.set(screening.screeningId, {
          movieId: screening.movie.movieId,
          title: screening.movie.title,
        });
      }
    }

    return comments.map((comment) => {
      const screeningId = bookingMap.get(comment.bookingId);
      const movie = screeningToMovieMap.get(screeningId || '');
      return {
        ...comment,
        movieId: movie?.movieId || null,
        movieTitle: movie?.title || null,
      };
    });
  }

  /**
   * Performs an advanced search for comments using text search and field filters.
   * @param q - Optional free-text search in the comment.
   * @param filters - Optional structured filters.
   * @returns A list of matching comments.
   * @throws {Error} If search fails.
   */
  async searchComments(
    q?: string,
    filters?: BookingCommentFilter
  ): Promise<BookingComment[]> {
    const mongoFilter: any = {};

    if (filters) {
      if (filters.status) mongoFilter.status = filters.status;
      if (filters.bookingId) mongoFilter.bookingId = filters.bookingId;
      if (filters.rating !== undefined) mongoFilter.rating = filters.rating;
      if (filters.createdAt) mongoFilter.createdAt = filters.createdAt;

      if (filters.movieId) {
        const screenings = await ScreeningModel.findAll({
          where: { movieId: filters.movieId },
          attributes: ['screeningId'],
          raw: true,
        });
        const screeningIds = screenings.map((s) => s.screeningId);
        if (!screeningIds.length) return [];

        const bookings = await BookingModel.findAll({
          where: { screeningId: { [Op.in]: screeningIds } },
          attributes: ['bookingId'],
          raw: true,
        });
        const bookingIds = bookings.map((b) => b.bookingId);
        if (bookingIds.length) mongoFilter.bookingId = { $in: bookingIds };
        else return [];
      }
    }

    if (q) mongoFilter.comment = { $regex: q, $options: 'i' };

    return BookingCommentModel.find(mongoFilter).sort({ createdAt: -1 }).lean();
  }

  /**
   * Confirms a comment by setting its status to 'confirmed'.
   * @param bookingId - UUID of the booking.
   * @returns The updated comment.
   * @throws {NotFoundError} If no comment is found.
   * @throws {Error} If confirmation fails unexpectedly.
   */
  async confirmComment(bookingId: string): Promise<BookingComment> {
    const updated = await BookingCommentModel.findOneAndUpdate(
      { bookingId },
      { status: 'confirmed' },
      { new: true }
    ).lean();
    if (!updated)
      throw new NotFoundError(`No comment found for bookingId ${bookingId}`);
    return updated;
  }

  /**
   * Calculates the average rating for a given movie using MongoDB aggregation.
   * Only confirmed comments are considered.
   * @param movieId - UUID of the movie.
   * @returns The average rating rounded to 2 decimals, or null if no ratings are found.
   * @throws {Error} If aggregation fails.
   */
  async getAverageRatingForMovie(movieId: string): Promise<number | null> {
    const screenings = await ScreeningModel.findAll({
      where: { movieId },
      attributes: ['screeningId'],
      raw: true,
    });
    const screeningIds = screenings.map((s) => s.screeningId);
    if (!screeningIds.length) return null;

    const bookings = await BookingModel.findAll({
      where: { screeningId: { [Op.in]: screeningIds } },
      attributes: ['bookingId'],
      raw: true,
    });
    const bookingIds = bookings.map((b) => b.bookingId);
    if (!bookingIds.length) return null;

    const result = await BookingCommentModel.aggregate([
      { $match: { bookingId: { $in: bookingIds }, status: 'confirmed' } },
      { $group: { _id: null, avgRating: { $avg: '$rating' } } },
    ]);

    return result.length ? Number(result[0].avgRating.toFixed(2)) : null;
  }
}

export const bookingCommentService = new BookingCommentService();
