import {
  BookingCommentModel,
  Comment,
} from '../models/booking-comment.schema.js';
import { NotFoundError } from '../errors/not-found-error.js';
import { ConflictError } from '../errors/conflict-error.js';
import mongoose from 'mongoose';

// Minimal BookingModel import for getCommentsByMovieId
const BookingSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  movieId: { type: String, required: true },
});
const BookingModel =
  mongoose.models.Booking || mongoose.model('Booking', BookingSchema);

/**
 * Service class for managing booking comments.
 * Provides CRUD operations, movie-based queries, and search capabilities.
 */
export class BookingCommentService {
  /**
   * Retrieve a comment by its booking ID.
   * @param {string} bookingId - The UUID of the booking.
   * @returns {Promise<Comment>} The found comment object.
   * @throws {NotFoundError} If no comment is found for the given booking ID.
   */
  static async getCommentByBookingId(bookingId: string): Promise<Comment> {
    const comment = await BookingCommentModel.findOne({ bookingId }).lean();
    if (!comment)
      throw new NotFoundError(`No comment found for bookingId ${bookingId}`);
    return comment;
  }

  /**
   * Create a new comment for a booking.
   * @param {Comment} data - The comment data to create.
   * @returns {Promise<Comment>} The created comment object.
   * @throws {ConflictError} If a comment for this booking already exists.
   */
  static async createComment(data: Comment): Promise<Comment> {
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
   * Update a comment by its booking ID.
   * @param {string} bookingId - The booking UUID.
   * @param {Partial<Comment>} updateData - The fields to update.
   * @returns {Promise<Comment>} The updated comment object.
   * @throws {NotFoundError} If no comment is found for the given booking ID.
   */
  static async updateComment(
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
   * Delete a comment by its booking ID.
   * @param {string} bookingId - The booking UUID.
   * @returns {Promise<void>}
   * @throws {NotFoundError} If no comment is found for the given booking ID.
   */
  static async deleteComment(bookingId: string): Promise<void> {
    const result = await BookingCommentModel.deleteOne({ bookingId });
    if (result.deletedCount === 0)
      throw new NotFoundError(`No comment found for bookingId ${bookingId}`);
  }

  /**
   * Retrieve all comments, sorted by creation date (most recent first).
   * @returns {Promise<Comment[]>} Array of comment objects.
   */
  static async getAllComments(): Promise<Comment[]> {
    return BookingCommentModel.find().sort({ createdAt: -1 }).lean();
  }

  /**
   * Retrieve all comments with the specified status.
   * @param {'pending' | 'confirmed'} status - The status to filter by.
   * @returns {Promise<Comment[]>} Array of comment objects.
   */
  static async getCommentsByStatus(
    status: 'pending' | 'confirmed'
  ): Promise<Comment[]> {
    return BookingCommentModel.find({ status }).sort({ createdAt: -1 }).lean();
  }

  /**
   * Confirm a comment by setting its status to 'confirmed'.
   * @param {string} bookingId - The booking UUID.
   * @returns {Promise<Comment>} The updated comment object.
   * @throws {NotFoundError} If no comment is found for the given booking ID.
   */
  static async confirmComment(bookingId: string): Promise<Comment> {
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
   * Retrieve all comments for a specific movie.
   * This is done by finding all bookings for the movie, then retrieving comments for those bookings.
   * @param {string} movieId - The UUID of the movie.
   * @returns {Promise<Comment[]>} Array of comment objects related to the movie.
   */
  static async getCommentsByMovieId(movieId: string): Promise<Comment[]> {
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
   * Perform a free-text search across comment, status, and bookingId fields.
   * @param {string} query - The search string.
   * @returns {Promise<Comment[]>} Array of matching comment objects.
   */
  static async searchComments(query: string): Promise<Comment[]> {
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
