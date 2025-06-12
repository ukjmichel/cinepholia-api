/**
 * Mongoose Schema for Booking Comments.
 *
 * This file defines the Mongoose model `BookingCommentModel` which allows for storing
 * and validating comments submitted by users on their bookings.
 * It integrates validation constraints and a structure tailored to business needs.
 *
 * Main Features:
 *  - Each comment is linked to a booking (`bookingId`), identified by a UUID (verified by regex).
 *  - The text comment is mandatory, limited to 1000 characters, and trimmed of extra spaces.
 *  - The rating (`rating`) is an integer between 0 and 5.
 *  - The status (`status`) is either 'pending' or 'confirmed'.
 *  - The fields `createdAt` and `updatedAt` are automatically added thanks to the `timestamps` option.
 *  - Only one comment is allowed per booking (unique index on `bookingId`).
 *  - The JSON transformation standardizes the exposed ID (`id` instead of `_id`).
 */

import mongoose, { Schema } from 'mongoose';

export interface Comment {
  bookingId: string;
  comment: string;
  rating: number;
  status: 'pending' | 'confirmed';
  createdAt?: Date;
  updatedAt?: Date;
}

// Regular expression to verify UUID format
const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Definition of the Mongoose schema for booking comments
const BookingCommentSchema = new Schema<Comment>(
  {
    bookingId: {
      type: String,
      required: [true, 'Booking ID is required'],
      match: [uuidRegex, 'Invalid UUID format for bookingId'],
    },
    comment: {
      type: String,
      required: [true, 'Comment is required'],
      trim: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },
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

// Uniqueness constraint: only one comment per booking (bookingId)
BookingCommentSchema.index({ bookingId: 1 }, { unique: true });

// Export the Mongoose model
export const BookingCommentModel = mongoose.model<Comment>(
  'Comment',
  BookingCommentSchema
);
