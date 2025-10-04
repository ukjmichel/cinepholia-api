import mongoose from 'mongoose';
import MovieStats from '../../models/movie-stats.schema';
import MovieStatsService from '../../services/movie-stats.service';
import connectMongoDB from '../../config/mongo';

describe('MovieStatsService (real DB)', () => {
  beforeAll(async () => {
    await connectMongoDB();
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  afterEach(async () => {
    await MovieStats.deleteMany({});
  });

  describe('addBooking', () => {
    it('should create new stats document if none exists', async () => {
      const result = await MovieStatsService.addBooking(
        'movie-new',
        1,
        '2025-10-01'
      );

      expect(result).toBeDefined();
      expect(result.movieId).toBe('movie-new');
      expect(result.bookingNumbers).toHaveLength(1);
      expect(result.bookingNumbers[0].date).toBe('2025-10-01');
      expect(result.bookingNumbers[0].number).toBe(1);
    });

    it('should increment existing date entry', async () => {
      // Create initial stats
      await MovieStats.create({
        movieId: 'movie-increment',
        bookingNumbers: [{ date: '2025-10-01', number: 5 }],
      });

      const result = await MovieStatsService.addBooking(
        'movie-increment',
        3,
        '2025-10-01'
      );

      expect(result.bookingNumbers).toHaveLength(1);
      expect(result.bookingNumbers[0].number).toBe(8);
    });

    it('should add new date entry to existing stats', async () => {
      // Create initial stats
      await MovieStats.create({
        movieId: 'movie-add',
        bookingNumbers: [{ date: '2025-09-30', number: 10 }],
      });

      const result = await MovieStatsService.addBooking(
        'movie-add',
        5,
        '2025-10-01'
      );

      expect(result.bookingNumbers).toHaveLength(2);
      // Should be sorted DESC after save
      expect(result.bookingNumbers[0].date).toBe('2025-10-01');
      expect(result.bookingNumbers[0].number).toBe(5);
      expect(result.bookingNumbers[1].date).toBe('2025-09-30');
      expect(result.bookingNumbers[1].number).toBe(10);
    });

    it('should default to today if no date provided', async () => {
      const today = new Date().toISOString().slice(0, 10);

      const result = await MovieStatsService.addBooking('movie-today', 2);

      expect(result.bookingNumbers).toHaveLength(1);
      expect(result.bookingNumbers[0].date).toBe(today);
      expect(result.bookingNumbers[0].number).toBe(2);
    });

    it('should default count to 1 if not provided', async () => {
      const result = await MovieStatsService.addBooking(
        'movie-default',
        undefined,
        '2025-10-01'
      );

      expect(result.bookingNumbers[0].number).toBe(1);
    });

    it('should handle multiple additions on different dates', async () => {
      await MovieStatsService.addBooking('movie-multi', 10, '2025-10-01');
      await MovieStatsService.addBooking('movie-multi', 15, '2025-09-30');
      const result = await MovieStatsService.addBooking(
        'movie-multi',
        20,
        '2025-09-29'
      );

      expect(result.bookingNumbers).toHaveLength(3);
      expect(result.bookingNumbers[0].date).toBe('2025-10-01');
      expect(result.bookingNumbers[1].date).toBe('2025-09-30');
      expect(result.bookingNumbers[2].date).toBe('2025-09-29');
    });

    it('should trigger pre-save hook for sorting and truncation', async () => {
      // Create stats with entries
      await MovieStats.create({
        movieId: 'movie-hook',
        bookingNumbers: [
          { date: '2025-09-25', number: 1 },
          { date: '2025-09-26', number: 2 },
          { date: '2025-09-27', number: 3 },
          { date: '2025-09-28', number: 4 },
          { date: '2025-09-29', number: 5 },
          { date: '2025-09-30', number: 6 },
        ],
      });

      // Add one more to push it to 7 entries
      const result = await MovieStatsService.addBooking(
        'movie-hook',
        10,
        '2025-10-01'
      );

      // Should have exactly 7 entries (truncated)
      expect(result.bookingNumbers).toHaveLength(7);
      expect(result.bookingNumbers[0].date).toBe('2025-10-01');
      expect(result.bookingNumbers[6].date).toBe('2025-09-25');
    });
  });

  describe('removeBooking', () => {
    it('should return null if no stats exist for movie', async () => {
      const result = await MovieStatsService.removeBooking(
        'non-existent',
        1,
        '2025-10-01'
      );

      expect(result).toBeNull();
    });

    it('should decrement booking count', async () => {
      await MovieStats.create({
        movieId: 'movie-decrement',
        bookingNumbers: [{ date: '2025-10-01', number: 10 }],
      });

      const result = await MovieStatsService.removeBooking(
        'movie-decrement',
        3,
        '2025-10-01'
      );

      expect(result).not.toBeNull();
      expect(result!.bookingNumbers).toHaveLength(1);
      expect(result!.bookingNumbers[0].number).toBe(7);
    });

    it('should remove date entry when count reaches 0', async () => {
      await MovieStats.create({
        movieId: 'movie-remove',
        bookingNumbers: [
          { date: '2025-10-01', number: 5 },
          { date: '2025-09-30', number: 10 },
        ],
      });

      const result = await MovieStatsService.removeBooking(
        'movie-remove',
        5,
        '2025-10-01'
      );

      expect(result).not.toBeNull();
      expect(result!.bookingNumbers).toHaveLength(1);
      expect(result!.bookingNumbers[0].date).toBe('2025-09-30');
    });

    it('should remove date entry when count goes below 0', async () => {
      await MovieStats.create({
        movieId: 'movie-negative',
        bookingNumbers: [{ date: '2025-10-01', number: 3 }],
      });

      const result = await MovieStatsService.removeBooking(
        'movie-negative',
        5,
        '2025-10-01'
      );

      expect(result).not.toBeNull();
      expect(result!.bookingNumbers).toHaveLength(0);
    });

    it('should return stats unchanged if date does not exist', async () => {
      await MovieStats.create({
        movieId: 'movie-no-date',
        bookingNumbers: [{ date: '2025-09-30', number: 10 }],
      });

      const result = await MovieStatsService.removeBooking(
        'movie-no-date',
        5,
        '2025-10-01'
      );

      expect(result).not.toBeNull();
      expect(result!.bookingNumbers).toHaveLength(1);
      expect(result!.bookingNumbers[0].number).toBe(10); // Unchanged
    });

    it('should default to today if no date provided', async () => {
      const today = new Date().toISOString().slice(0, 10);

      await MovieStats.create({
        movieId: 'movie-today-remove',
        bookingNumbers: [{ date: today, number: 10 }],
      });

      const result = await MovieStatsService.removeBooking(
        'movie-today-remove',
        4
      );

      expect(result).not.toBeNull();
      expect(result!.bookingNumbers[0].number).toBe(6);
    });

    it('should default count to 1 if not provided', async () => {
      await MovieStats.create({
        movieId: 'movie-default-remove',
        bookingNumbers: [{ date: '2025-10-01', number: 5 }],
      });

      const result = await MovieStatsService.removeBooking(
        'movie-default-remove',
        undefined,
        '2025-10-01'
      );

      expect(result!.bookingNumbers[0].number).toBe(4);
    });

    it('should handle multiple removals', async () => {
      await MovieStats.create({
        movieId: 'movie-multi-remove',
        bookingNumbers: [
          { date: '2025-10-01', number: 10 },
          { date: '2025-09-30', number: 8 },
        ],
      });

      await MovieStatsService.removeBooking(
        'movie-multi-remove',
        3,
        '2025-10-01'
      );
      const result = await MovieStatsService.removeBooking(
        'movie-multi-remove',
        2,
        '2025-09-30'
      );

      expect(result!.bookingNumbers).toHaveLength(2);
      expect(result!.bookingNumbers[0].number).toBe(7);
      expect(result!.bookingNumbers[1].number).toBe(6);
    });
  });

  describe('getStatsByMovieId', () => {
    it('should return stats if they exist', async () => {
      await MovieStats.create({
        movieId: 'movie-exists',
        bookingNumbers: [{ date: '2025-10-01', number: 25 }],
      });

      const result = await MovieStatsService.getStatsByMovieId('movie-exists');

      expect(result).not.toBeNull();
      expect(result!.movieId).toBe('movie-exists');
      expect(result!.bookingNumbers).toHaveLength(1);
      expect(result!.bookingNumbers[0].number).toBe(25);
    });

    it('should return null if stats do not exist', async () => {
      const result = await MovieStatsService.getStatsByMovieId('non-existent');

      expect(result).toBeNull();
    });

    it('should return stats with all booking numbers', async () => {
      await MovieStats.create({
        movieId: 'movie-full',
        bookingNumbers: [
          { date: '2025-10-01', number: 10 },
          { date: '2025-09-30', number: 15 },
          { date: '2025-09-29', number: 20 },
        ],
      });

      const result = await MovieStatsService.getStatsByMovieId('movie-full');

      expect(result).not.toBeNull();
      expect(result!.bookingNumbers).toHaveLength(3);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete booking lifecycle', async () => {
      const movieId = 'movie-lifecycle';

      // Add initial bookings
      await MovieStatsService.addBooking(movieId, 5, '2025-10-01');
      await MovieStatsService.addBooking(movieId, 3, '2025-10-01');

      // Verify state
      let stats = await MovieStatsService.getStatsByMovieId(movieId);
      expect(stats!.bookingNumbers[0].number).toBe(8);

      // Remove some bookings
      await MovieStatsService.removeBooking(movieId, 2, '2025-10-01');

      // Verify updated state
      stats = await MovieStatsService.getStatsByMovieId(movieId);
      expect(stats!.bookingNumbers[0].number).toBe(6);

      // Remove all remaining bookings
      await MovieStatsService.removeBooking(movieId, 6, '2025-10-01');

      // Verify date entry is removed
      stats = await MovieStatsService.getStatsByMovieId(movieId);
      expect(stats!.bookingNumbers).toHaveLength(0);
    });

    it('should handle bookings across multiple dates', async () => {
      const movieId = 'movie-dates';

      await MovieStatsService.addBooking(movieId, 10, '2025-10-01');
      await MovieStatsService.addBooking(movieId, 15, '2025-09-30');
      await MovieStatsService.addBooking(movieId, 8, '2025-09-29');

      const stats = await MovieStatsService.getStatsByMovieId(movieId);

      expect(stats!.bookingNumbers).toHaveLength(3);
      // Verify sorted DESC
      expect(stats!.bookingNumbers[0].date).toBe('2025-10-01');
      expect(stats!.bookingNumbers[1].date).toBe('2025-09-30');
      expect(stats!.bookingNumbers[2].date).toBe('2025-09-29');
    });

    it('should maintain stats across multiple movies', async () => {
      await MovieStatsService.addBooking('movie-a', 10, '2025-10-01');
      await MovieStatsService.addBooking('movie-b', 20, '2025-10-01');
      await MovieStatsService.addBooking('movie-c', 30, '2025-10-01');

      const statsA = await MovieStatsService.getStatsByMovieId('movie-a');
      const statsB = await MovieStatsService.getStatsByMovieId('movie-b');
      const statsC = await MovieStatsService.getStatsByMovieId('movie-c');

      expect(statsA!.bookingNumbers[0].number).toBe(10);
      expect(statsB!.bookingNumbers[0].number).toBe(20);
      expect(statsC!.bookingNumbers[0].number).toBe(30);
    });
  });
});
