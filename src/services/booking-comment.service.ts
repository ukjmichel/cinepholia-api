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
 */

import {
  BookingCommentModel,
  Comment,
} from '../models/booking-comment.schema.js';
import { NotFoundError } from '../errors/not-found-error.js';
import { ConflictError } from '../errors/conflict-error.js';
import mongoose from 'mongoose';

// Minimal import to access bookings by movieId
const BookingSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  movieId: { type: String, required: true },
});
const BookingModel =
  mongoose.models.Booking || mongoose.model('Booking', BookingSchema);

/**
 * Service class for operations on booking comments.
 */
export class BookingCommentService {
  /**
   * Retrieves a comment based on the booking ID.
   *
   * @param {string} bookingId - Booking identifier.
   * @returns {Promise<Comment>} Found comment.
   * @throws {NotFoundError} If no comment is found.
   */
  async getCommentByBookingId(bookingId: string): Promise<Comment> {
    const comment = await BookingCommentModel.findOne({ bookingId }).lean();
    if (!comment)
      throw new NotFoundError(`No comment found for bookingId ${bookingId}`);
    return comment;
  }

  /**
   * Creates a new comment for a booking.
   *
   * @param {Comment} data - Comment data.
   * @returns {Promise<Comment>} Created comment.
   * @throws {ConflictError} If a comment already exists for this booking.
   */
  async createComment(data: Comment): Promise<Comment> {
    const exists = await BookingCommentModel.exists({
      bookingId: data.bookingId,
    });
    if (exists)
      throw new ConflictError(
        `Comment already exists for bookingId ${data.bookingId}`
      );
    const created = await BookingCommentModel.create(data);
    return created.toObject();
  }

  /**
   * Updates an existing comment via its booking ID.
   *
   * @param {string} bookingId - Booking identifier.
   * @param {Partial<Comment>} updateData - Data to update.
   * @returns {Promise<Comment>} Updated comment.
   * @throws {NotFoundError} If no comment is found.
   */
  async updateComment(
    bookingId: string,
    updateData: Partial<Comment>
  ): Promise<Comment> {
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
   *
   * @param {string} bookingId - Booking identifier.
   * @returns {Promise<void>}
   * @throws {NotFoundError} If no comment is found.
   */
  async deleteComment(bookingId: string): Promise<void> {
    const result = await BookingCommentModel.deleteOne({ bookingId });
    if (result.deletedCount === 0)
      throw new NotFoundError(`No comment found for bookingId ${bookingId}`);
  }

  /**
   * Retrieves all existing comments, sorted by creation date (newest to oldest).
   *
   * @returns {Promise<Comment[]>} List of all comments.
   */
  async getAllComments(): Promise<Comment[]> {
    return BookingCommentModel.find().sort({ createdAt: -1 }).lean();
  }

  /**
   * Retrieves comments based on a given status.
   *
   * @param {'pending' | 'confirmed'} status - Status to filter by.
   * @returns {Promise<Comment[]>} List of comments with this status.
   */
  async getCommentsByStatus(
    status: 'pending' | 'confirmed'
  ): Promise<Comment[]> {
    return BookingCommentModel.find({ status }).sort({ createdAt: -1 }).lean();
  }

  /**
   * Confirms a comment by updating its status to "confirmed".
   *
   * @param {string} bookingId - Booking identifier.
   * @returns {Promise<Comment>} Updated comment.
   * @throws {NotFoundError} If no comment is found.
   */
  async confirmComment(bookingId: string): Promise<Comment> {
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
   * Retrieves all comments related to a movie.
   * First, it finds the bookings associated with the movie.
   *
   * @param {string} movieId - Movie identifier.
   * @returns {Promise<Comment[]>} List of comments related to this movie.
   */
  async getCommentsByMovieId(movieId: string): Promise<Comment[]> {
    const bookings = await BookingModel.find({ movieId }, { _id: 1 }).lean();
    const bookingIds = bookings.map((b) => b._id?.toString());
    if (!bookingIds.length) return [];
    return BookingCommentModel.find({
      bookingId: { $in: bookingIds },
    })
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Performs a text search on the `comment`, `status`, and `bookingId` fields.
   *
   * @param {string} query - String to search for.
   * @returns {Promise<Comment[]>} Search results.
   */
  async searchComments(query: string): Promise<Comment[]> {
    const regex = new RegExp(query, 'i');
    return BookingCommentModel.find({
      $or: [
        { comment: { $regex: regex } },
        { status: { $regex: regex } },
        { bookingId: { $regex: regex } },
      ],
    })
      .sort({ createdAt: -1 })
      .lean();
  }
}

export const bookingCommentService = new BookingCommentService();
