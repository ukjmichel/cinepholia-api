/**
 * Booking comments management service.
 *
 * This service allows creating, reading, updating, deleting, and searching for comments
 * associated with bookings, with filtering by status or by movie, and conflict management.
 * It is also possible to confirm a comment and perform a text search.
 *
 * Main features:
 * - Creation of comments linked to a booking
 * - Updating or deleting existing comments
 * - Confirmation of comments (status change)
 * - Retrieval of all comments or filtered by status/movie
 * - Text search within comments
 * - Management of business errors (404, conflict)
 *
 * @module services/booking-comment.service
 * @since 2024
 */

import {
  BookingComment,
  BookingCommentModel,
} from '../models/booking-comment.schema.js';
import { NotFoundError } from '../errors/not-found-error.js';
import { ConflictError } from '../errors/conflict-error.js';
import mongoose from 'mongoose';
import { BookingModel } from '../models/booking.model.js';
import { ScreeningModel } from '../models/screening.model.js';
import { Op } from 'sequelize';

/**
 * Advanced search filters for booking comments.
 */
export interface BookingCommentFilter {
  comment?: string;
  status?: 'pending' | 'confirmed';
  bookingId?: string;
  rating?: number;
  movieId?: string;
  createdAt?: Date;
}

/**
 * Service class for operations on booking comments.
 */
export class BookingCommentService {
  /**
   * Retrieves a comment based on the booking ID.
   * @param bookingId Booking identifier.
   * @returns Promise resolving to the found comment.
   * @throws NotFoundError If no comment is found.
   */
  async getCommentByBookingId(bookingId: string): Promise<BookingComment> {
    const comment = await BookingCommentModel.findOne({ bookingId }).lean();
    if (!comment)
      throw new NotFoundError(`No comment found for bookingId ${bookingId}`);
    return comment;
  }

  /**
   * Creates a new comment for a booking, only if the booking is used.
   * @param data Comment data.
   * @returns Promise resolving to the created comment.
   * @throws ConflictError If a comment already exists for this booking.
   * @throws NotFoundError If the booking does not exist or is not used.
   */
  async createComment(data: BookingComment): Promise<BookingComment> {
    // Check if the booking exists and has status 'used'
    const booking = (await BookingModel.findOne({
      where: { bookingId: data.bookingId },
    })) as { status: string } | null;
    if (!booking) {
      throw new NotFoundError(`Booking with id ${data.bookingId} not found`);
    }
    if (booking.status !== 'used') {
      throw new ConflictError('You can only comment on used bookings');
    }

    // Check for existing comment
    const exists = await BookingCommentModel.exists({
      bookingId: data.bookingId,
    });
    if (exists) {
      throw new ConflictError(
        `Comment already exists for bookingId ${data.bookingId}`
      );
    }
    const created = await BookingCommentModel.create(data);
    return created.toObject();
  }

  /**
   * Updates an existing comment via its booking ID.
   * @param bookingId Booking identifier.
   * @param updateData Data to update.
   * @returns Promise resolving to the updated comment.
   * @throws NotFoundError If no comment is found.
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
   * @param bookingId Booking identifier.
   * @returns Promise<void>
   * @throws NotFoundError If no comment is found.
   */
  async deleteComment(bookingId: string): Promise<void> {
    const result = await BookingCommentModel.deleteOne({ bookingId });
    if (result.deletedCount === 0)
      throw new NotFoundError(`No comment found for bookingId ${bookingId}`);
  }

  /**
   * Retrieves all existing comments, sorted by creation date (newest to oldest).
   * @returns Promise resolving to a list of all comments.
   */
  async getAllComments(): Promise<BookingComment[]> {
    return BookingCommentModel.find().sort({ createdAt: -1 }).lean();
  }

  /**
   * Retrieves all comments related to a movie.
   * First, it finds the bookings associated with the movie.
   * @param movieId Movie identifier.
   * @returns Promise resolving to a list of comments related to this movie.
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

    return BookingCommentModel.find({
      bookingId: { $in: bookingIds },
    })
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Retrieves all comments with a given status ('pending' or 'confirmed').
   * @param status The comment status to filter by.
   * @returns Promise resolving to a list of matching comments.
   */
  async getCommentsByStatus(
    status: 'pending' | 'confirmed'
  ): Promise<BookingComment[]> {
    return BookingCommentModel.find({ status }).sort({ createdAt: -1 }).lean();
  }

  /**
   * Performs an advanced search for booking comments: full-text and/or filters.
   * Possible filters: status, rating, bookingId, movieId, createdAt, and free-text search in comment.
   * @param q Free-text to search in comments.
   * @param filters Advanced field filters.
   * @returns Promise resolving to a list of matching comments.
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
        // Find all screenings for the movie
        const screenings = await ScreeningModel.findAll({
          where: { movieId: filters.movieId },
          attributes: ['screeningId'],
          raw: true,
        });
        const screeningIds = screenings.map((s) => s.screeningId);
        if (!screeningIds.length) return [];

        // Find all bookings for those screenings
        const bookings = await BookingModel.findAll({
          where: { screeningId: { [Op.in]: screeningIds } },
          attributes: ['bookingId'],
          raw: true,
        });
        const bookingIds = bookings.map((b) => b.bookingId);
        if (bookingIds.length) {
          mongoFilter.bookingId = { $in: bookingIds };
        } else {
          return [];
        }
      }
    }

    if (q) {
      mongoFilter.comment = { $regex: q, $options: 'i' };
    }

    return BookingCommentModel.find(mongoFilter).sort({ createdAt: -1 }).lean();
  }

  /**
   * Confirms a comment by updating its status to "confirmed".
   * @param bookingId Booking identifier.
   * @returns Promise resolving to the confirmed comment.
   * @throws NotFoundError If no comment is found for the given bookingId.
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
   * Calculates the average rating (notation) for a given movie.
   * @param movieId The movie identifier.
   * @returns Promise resolving to the average rating, or null if no ratings found.
   */
  async getAverageRatingForMovie(movieId: string): Promise<number | null> {
    // 1. Find all screenings for this movie (SQL)
    const screenings = await ScreeningModel.findAll({
      where: { movieId },
      attributes: ['screeningId'],
      raw: true,
    });
    const screeningIds = screenings.map((s) => s.screeningId);
    if (!screeningIds.length) return null;

    // 2. Find all bookings for these screenings (SQL)
    const bookings = await BookingModel.findAll({
      where: { screeningId: { [Op.in]: screeningIds } },
      attributes: ['bookingId'],
      raw: true,
    });
    const bookingIds = bookings.map((b) => b.bookingId);
    if (!bookingIds.length) return null;

    // 3. Find all comments for these bookings (MongoDB)
    const comments = await BookingCommentModel.find({
      bookingId: { $in: bookingIds },
      status: 'confirmed', // Only confirmed ratings
    }).lean();

    if (!comments.length) return null;

    // 4. Compute the average rating
    const sum = comments.reduce(
      (acc, comment) => acc + (comment.rating ?? 0),
      0
    );
    const avg = sum / comments.length;

    return Number(avg.toFixed(2)); // rounded to 2 decimals
  }
}

export const bookingCommentService = new BookingCommentService();
