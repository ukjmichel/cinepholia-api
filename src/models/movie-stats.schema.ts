/**
 * @module models/movie-stats.model.ts
 * @description Mongoose Schema for Movie Statistics Tracking.
 *
 *
 * This file defines the `MovieStats` model which tracks daily booking numbers for movies
 * over a rolling 7-day period. It uses Mongoose subdocuments for efficient storage and retrieval
 * of time-series booking data.
 *
 * - Each movie statistics document is linked to a movie via `movieId` (indexed for fast lookups).
 * - The `bookingNumbers` array stores daily booking counts with date and number pairs.
 * - A pre-save hook automatically sorts entries by date (descending), removes duplicates, and maintains only the most recent 7 days.
 * - The date format is standardized as "YYYY-MM-DD" for consistency.
 * - The subdocument schema excludes `_id` fields to reduce document size.
 * - This model is ideal for analytics, trending calculations, and performance metrics.
 */

import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * @interface BookingNumber
 * @description Defines the structure of a daily booking number entry (subdocument)
 *
 * @property {string} date - Date in "YYYY-MM-DD" format representing the booking day
 * @property {number} number - Total number of bookings made on that date
 */
export interface BookingNumber {
  date: string; // "YYYY-MM-DD"
  number: number;
}

/**
 * @constant {Schema<BookingNumber>} bookingNumberSchema
 * @description Mongoose subdocument schema for daily booking entries
 *
 * Features:
 * - No auto-generated _id to minimize document size
 * - Date stored as string for consistent formatting and easy comparison
 * - Number defaults to 0 for new entries
 *
 * @property {string} date - Required string in "YYYY-MM-DD" format
 * @property {number} number - Required number, defaults to 0
 */
const bookingNumberSchema = new Schema<BookingNumber>(
  {
    date: { type: String, required: true },
    number: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

/**
 * @interface MovieStatsDocument
 * @extends {Document}
 * @description Defines the structure of a movie statistics document
 *
 * @property {string} movieId - Unique identifier of the movie (indexed)
 * @property {BookingNumber[]} bookingNumbers - Array of daily booking entries (max 7 days)
 */
export interface MovieStatsDocument extends Document {
  movieId: string;
  bookingNumbers: BookingNumber[];
}

/**
 * @constant {Schema<MovieStatsDocument>} movieStatsSchema
 * @description Mongoose schema definition for movie statistics
 *
 * Schema Features:
 * - Indexed movieId for efficient queries
 * - Embedded array of booking numbers with automatic management
 * - Pre-save hook for data maintenance (sorting, deduplication, truncation)
 *
 * @property {string} movieId - Movie identifier (indexed)
 * @property {BookingNumber[]} bookingNumbers - Daily booking data (max 7 entries)
 */
const movieStatsSchema = new Schema<MovieStatsDocument>({
  movieId: { type: String, required: true, index: true },
  bookingNumbers: { type: [bookingNumberSchema], default: [] },
});

/**
 * @hook pre-save
 * @description Pre-save middleware that maintains data integrity and enforces business rules
 *
 * Operations performed before each save:
 * 1. Sorts bookingNumbers by date in descending order (newest first)
 * 2. Removes duplicate entries for the same date (keeps the first occurrence)
 * 3. Truncates the array to keep only the most recent 7 days of data
 *
 * This ensures:
 * - Consistent ordering for reliable data retrieval
 * - No conflicting entries for the same date
 * - Controlled document size (rolling 7-day window)
 *
 * @param {Function} next - Callback to continue the save operation
 *
 * @example
 * // When saving with duplicate dates and more than 7 entries
 * const stats = new MovieStats({
 *   movieId: 'movie-123',
 *   bookingNumbers: [
 *     { date: '2025-09-30', number: 10 },
 *     { date: '2025-09-29', number: 15 },
 *     { date: '2025-09-30', number: 12 }, // Duplicate - will be removed
 *     // ... more entries
 *   ]
 * });
 * await stats.save(); // Hook automatically cleans and truncates data
 */
movieStatsSchema.pre<MovieStatsDocument>('save', function (next) {
  // Sort by date DESC (newest first)
  this.bookingNumbers.sort((a, b) => b.date.localeCompare(a.date));

  // Remove duplicates by date (keep first occurrence)
  const seen = new Set<string>();
  const deduped = this.bookingNumbers.filter((entry) => {
    if (seen.has(entry.date)) return false;
    seen.add(entry.date);
    return true;
  });

  // Only keep last 7 days
  this.set('bookingNumbers', deduped.slice(0, 7));

  next();
});

/**
 * @class MovieStats
 * @description Mongoose model for managing movie booking statistics
 * @extends {Model<MovieStatsDocument>}
 *
 * This model provides methods for tracking and analyzing movie booking trends
 * over time. The automatic 7-day rolling window makes it ideal for recent
 * performance metrics and trending calculations.
 *
 * @example
 * // Creating initial stats for a movie
 * const stats = new MovieStats({
 *   movieId: 'movie-123',
 *   bookingNumbers: [
 *     { date: '2025-09-30', number: 25 },
 *     { date: '2025-09-29', number: 30 }
 *   ]
 * });
 * await stats.save();
 *
 * @example
 * // Adding a new day's booking count
 * const stats = await MovieStats.findOne({ movieId: 'movie-123' });
 * if (stats) {
 *   stats.bookingNumbers.push({ date: '2025-10-01', number: 28 });
 *   await stats.save(); // Pre-save hook will handle sorting and truncation
 * }
 *
 * @example
 * // Updating today's booking count
 * const today = new Date().toISOString().split('T')[0];
 * const stats = await MovieStats.findOne({ movieId: 'movie-123' });
 * if (stats) {
 *   const todayEntry = stats.bookingNumbers.find(e => e.date === today);
 *   if (todayEntry) {
 *     todayEntry.number += 1; // Increment booking count
 *   } else {
 *     stats.bookingNumbers.push({ date: today, number: 1 });
 *   }
 *   await stats.save();
 * }
 *
 * @example
 * // Finding stats for a specific movie
 * const stats = await MovieStats.findOne({ movieId: 'movie-123' });
 * if (stats) {
 *   console.log(`Recent bookings for movie ${stats.movieId}:`);
 *   stats.bookingNumbers.forEach(entry => {
 *     console.log(`${entry.date}: ${entry.number} bookings`);
 *   });
 * }
 *
 * @example
 * // Calculating 7-day booking trend
 * const stats = await MovieStats.findOne({ movieId: 'movie-123' });
 * if (stats && stats.bookingNumbers.length > 0) {
 *   const totalBookings = stats.bookingNumbers.reduce(
 *     (sum, entry) => sum + entry.number,
 *     0
 *   );
 *   const avgDaily = totalBookings / stats.bookingNumbers.length;
 *   console.log(`Average daily bookings: ${avgDaily.toFixed(2)}`);
 * }
 *
 * @exports MovieStats
 */
const MovieStats: Model<MovieStatsDocument> =
  mongoose.model<MovieStatsDocument>('MovieStats', movieStatsSchema);

export default MovieStats;
