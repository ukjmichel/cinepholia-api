import MovieStats, {
  MovieStatsDocument,
} from '../models/movie-stats.schema.js';

class MovieStatsService {
  /**
   * Increment the booking count for a movie on a given date (default: today).
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
   * Decrement the booking count for a movie on a given date (default: today).
   * If count falls to 0 or below, removes the entry for that date.
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
      // Remove this day from array if no bookings left
      stats.bookingNumbers = stats.bookingNumbers.filter((b) => b.date !== day);
    }
    await stats.save();
    return stats;
  }
  /**
   * Get the booking stats for a movie by its movieId.
   */
  async getStatsByMovieId(movieId: string): Promise<MovieStatsDocument | null> {
    return await MovieStats.findOne({ movieId });
  }
}

export default new MovieStatsService();
