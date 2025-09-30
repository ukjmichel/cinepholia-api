/**
 * @module models/booking-comment.model.ts
 * @description Mongoose Schema for Booking Comments.
 *
 *
 * This file defines the `BookingCommentModel` which allows for storing and validating
 * comments submitted by users on their bookings.
 * It integrates validation constraints and a structure tailored to business needs.
 *
 * - Each comment is linked to a booking (`bookingId`), identified by a UUID (verified by regex).
 * - The text comment is mandatory, limited to 1000 characters, and trimmed of extra spaces.
 * - The rating (`rating`) is an integer between 0 and 5.
 * - The status (`status`) is either 'pending' or 'confirmed'.
 * - The fields `createdAt` and `updatedAt` are automatically added via the `timestamps` option.
 * - Only one comment is allowed per booking (unique index on `bookingId`).
 * - The JSON transformation standardizes the exposed ID (`id` instead of `_id`).
 */

import mongoose, { Schema } from 'mongoose';

/**
 * @typedef {('pending'|'confirmed')} CommentStatus
 * @description Enumeration of available comment statuses in the system
 */
export type CommentStatus = 'pending' | 'confirmed';

/**
 * @interface BookingComment
 * @description Defines the structure of a booking comment record
 *
 * @property {string} bookingId - Unique identifier of the booking (UUID format)
 * @property {string} comment - Text content of the comment (max 1000 characters)
 * @property {number} rating - Rating value (integer between 0 and 5)
 * @property {CommentStatus} status - Current status of the comment
 * @property {Date} [createdAt] - Timestamp when the comment was created (auto-generated)
 * @property {Date} [updatedAt] - Timestamp when the comment was last updated (auto-generated)
 */
export interface BookingComment {
  bookingId: string;
  comment: string;
  rating: number;
  status: 'pending' | 'confirmed';
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * @constant {RegExp} uuidRegex
 * @description Regular expression to verify UUID v1-v5 format
 * @private
 */
const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * @constant {Schema<BookingComment>} BookingCommentSchema
 * @description Mongoose schema definition for booking comments
 *
 * Schema Features:
 * - UUID validation for bookingId
 * - String trimming and length validation for comments
 * - Integer range validation for ratings
 * - Enum validation for status field
 * - Automatic timestamp generation
 * - Unique index on bookingId to ensure one comment per booking
 * - Custom JSON transformation to expose 'id' instead of '_id'
 *
 * @example
 * // Creating a new booking comment
 * const comment = await BookingCommentModel.create({
 *   bookingId: '123e4567-e89b-12d3-a456-426614174000',
 *   comment: 'Great movie experience!',
 *   rating: 5,
 *   status: 'pending'
 * });
 *
 * @example
 * // Finding a comment by bookingId
 * const comment = await BookingCommentModel.findOne({
 *   bookingId: '123e4567-e89b-12d3-a456-426614174000'
 * });
 *
 * @example
 * // Updating comment status to confirmed
 * await BookingCommentModel.findOneAndUpdate(
 *   { bookingId: '123e4567-e89b-12d3-a456-426614174000' },
 *   { status: 'confirmed' },
 *   { new: true }
 * );
 *
 * @example
 * // Finding all confirmed comments with rating >= 4
 * const highRatedComments = await BookingCommentModel.find({
 *   status: 'confirmed',
 *   rating: { $gte: 4 }
 * });
 */
const BookingCommentSchema = new Schema<BookingComment>(
  {
    /**
     * @property {string} bookingId
     * @description Unique identifier of the associated booking
     * @type {string}
     * @required
     * @unique
     * @pattern UUID format (validated by regex)
     */
    bookingId: {
      type: String,
      required: [true, 'Booking ID is required'],
      match: [uuidRegex, 'Invalid UUID format for bookingId'],
    },

    /**
     * @property {string} comment
     * @description Text content of the user's comment
     * @type {string}
     * @required
     * @maxLength 1000
     * @trim Whitespace automatically trimmed
     */
    comment: {
      type: String,
      required: [true, 'Comment is required'],
      trim: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },

    /**
     * @property {number} rating
     * @description Numerical rating given by the user
     * @type {number}
     * @required
     * @min 0
     * @max 5
     * @validate Must be an integer
     */
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [0, 'Rating must be at least 0'],
      max: [5, 'Rating must be at most 5'],
      validate: {
        validator: Number.isInteger,
        message: 'Rating must be an integer',
      },
    },

    /**
     * @property {CommentStatus} status
     * @description Current status of the comment (pending or confirmed)
     * @type {CommentStatus}
     * @default 'pending'
     * @enum ['pending', 'confirmed']
     */
    status: {
      type: String,
      enum: {
        values: ['pending', 'confirmed'],
        message: 'Status must be either "pending" or "confirmed"',
      },
      default: 'pending',
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_, ret) => {
        ret.id = ret._id.toString(); // Replaces _id with id in the JSON output
        delete ret._id;
        return ret;
      },
    },
  }
);

/**
 * Uniqueness constraint: only one comment per booking (bookingId)
 * @index bookingId (unique)
 */
BookingCommentSchema.index({ bookingId: 1 }, { unique: true });

/**
 * @class BookingCommentModel
 * @description Mongoose model for managing booking comments
 * @extends {mongoose.Model<BookingComment>}
 *
 * This model provides methods for creating, reading, updating, and deleting
 * booking comments with built-in validation and unique constraints.
 *
 * @exports BookingCommentModel
 */
export const BookingCommentModel = mongoose.model<BookingComment>(
  'Comment',
  BookingCommentSchema
);
