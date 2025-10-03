/**
 *
 * This service handles:
 * - Incrementing and decrementing daily booking counts for a given movie.
 * - Automatically creating a stats document if it doesn't exist.
 * - Removing a date entry when bookings drop to zero or below.
 * - Retrieving booking statistics by movieId.
 *
 * Uses MongoDB via Mongoose for persistence.
 *
 */

import MovieStats, {
  MovieStatsDocument,
} from '../models/movie-stats.schema.js';
class MovieStatsService {
  /**
   * Increment the booking count for a movie on a given date.
   * Creates a new stats record if none exists.
   * If no date is provided, defaults to today's date (UTC).
   *
   * @param {string} movieId - The unique identifier of the movie.
   * @param {number} [count=1] - The number of bookings to add.
   * @param {string} [date] - The date in `YYYY-MM-DD` format. Defaults to today.
   * @returns {Promise<MovieStatsDocument>} The updated MovieStats document.
   * @throws {Error} If saving to the database fails.
   */
  async addBooking(
    movieId: string,
    count: number = 1,
    date?: string
  ): Promise<MovieStatsDocument> {
    const day = date || new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
    let stats = await MovieStats.findOne({ movieId });

    if (!stats) {
      stats = new MovieStats({
        movieId,
        bookingNumbers: [{ date: day, number: count }],
      });
    } else {
      const entry = stats.bookingNumbers.find((b) => b.date === day);
      if (entry) {
        entry.number += count;
      } else {
        stats.bookingNumbers.unshift({ date: day, number: count });
      }
    }

    await stats.save();
    return stats;
  }

  /**
   * Decrement the booking count for a movie on a given date.
   * If the resulting count is zero or less, removes that date entry.
   * If no date is provided, defaults to today's date (UTC).
   *
   * @param {string} movieId - The unique identifier of the movie.
   * @param {number} [count=1] - The number of bookings to remove.
   * @param {string} [date] - The date in `YYYY-MM-DD` format. Defaults to today.
   * @returns {Promise<MovieStatsDocument|null>} The updated MovieStats document, or null if no stats exist for the movie.
   * @throws {Error} If saving to the database fails.
   */
  async removeBooking(
    movieId: string,
    count: number = 1,
    date?: string
  ): Promise<MovieStatsDocument | null> {
    const day = date || new Date().toISOString().slice(0, 10);
    const stats = await MovieStats.findOne({ movieId });
    if (!stats) return null;

    const entry = stats.bookingNumbers.find((b) => b.date === day);
    if (!entry) return stats;

    entry.number -= count;
    if (entry.number <= 0) {
      stats.bookingNumbers = stats.bookingNumbers.filter((b) => b.date !== day);
    }

    await stats.save();
    return stats;
  }

  /**
   * Retrieve the booking statistics for a given movieId.
   *
   * @param {string} movieId - The unique identifier of the movie.
   * @returns {Promise<MovieStatsDocument|null>} The MovieStats document, or null if not found.
   * @throws {Error} If database retrieval fails.
   */
  async getStatsByMovieId(movieId: string): Promise<MovieStatsDocument | null> {
    return await MovieStats.findOne({ movieId });
  }
}

export default new MovieStatsService();
