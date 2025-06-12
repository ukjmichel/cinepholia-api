/**
 * Mongoose Schema for Movie Statistics (MovieStats).
 *
 * This file defines a MongoDB model for tracking bookings associated with each movie,
 * without storing complete details of users or movies.
 *
 * Two entities are managed:
 *  - Booking (subdocument): describes each booking for a movie (bookingId, userId, date, number of seats)
 *  - MovieStats: main document that references the movie (`movieId`) and its booking history.
 *
 * Key Points:
 *  - `movieId`: unique identifier for the movie (indexed for performance)
 *  - `bookings`: array of Booking subdocuments, storing bookings related to the movie.
 *      * Each booking must have a unique `bookingId` (ensured by a `pre-save` hook).
 *      * Booking subdocuments are defined via a separate schema, without an `_id` field.
 *  - The schema is designed to quickly aggregate booking data by movie,
 *    for example, for statistics or displaying booking history.
 *  - The `pre-save` hook prevents the insertion of duplicate bookings (same `bookingId` for a movie).
 *
 * Typical Use:
 *   - Track the evolution of bookings for each movie.
 *   - Generate attendance statistics for a given movie.
 *   - Prevent duplicates in bookings related to the same movie.
 */

import mongoose, { Document } from 'mongoose';

// Interface and schema for Booking subdocuments (movie booking)
interface Booking {
  bookingId: string;
  userId: string;
  bookedAt: Date;
  seatsNumber: number;
}

const bookingSchema = new mongoose.Schema<Booking>(
  {
    bookingId: { type: String, required: true },
    userId: { type: String, required: true },
    bookedAt: { type: Date, default: Date.now, required: true },
    seatsNumber: { type: Number, required: true },
  },
  { _id: false } // No individual _id for booking subdocuments
);

// Interface for the main MovieStats document
export interface MovieStatsDocument extends Document {
  movieId: string;
  bookings: Booking[];
}

// Main MovieStats schema: a movie and the list of its bookings
const movieStatsSchema = new mongoose.Schema<MovieStatsDocument>({
  movieId: { type: String, required: true, index: true },
  bookings: [bookingSchema],
});

// Mongoose hook: before saving, checks uniqueness of bookingId in bookings
movieStatsSchema.pre<MovieStatsDocument>('save', function (next) {
  const bookingIds = this.bookings.map((b) => b.bookingId);
  const uniqueBookingIds = new Set(bookingIds);
  if (bookingIds.length !== uniqueBookingIds.size) {
    return next(new Error('Duplicate bookingId detected in bookings array'));
  }
  next();
});

// Export the mongoose model
export default mongoose.model<MovieStatsDocument>(
  'MovieStats',
  movieStatsSchema
);
