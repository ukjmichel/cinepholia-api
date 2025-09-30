import mongoose from 'mongoose';
import MovieStats from '../../models/movie-stats.schema';
import connectMongoDB from '../../config/mongo';

describe('MovieStats (real DB)', () => {
  beforeAll(async () => {
    await connectMongoDB();
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  afterEach(async () => {
    await MovieStats.deleteMany({});
  });

  describe('Creation', () => {
    it('should create movie stats with movieId and empty bookingNumbers', async () => {
      const stats = await MovieStats.create({
        movieId: 'movie-123',
      });

      expect(stats._id).toBeDefined();
      expect(stats.movieId).toBe('movie-123');
      expect(stats.bookingNumbers).toEqual([]);
    });

    it('should create movie stats with initial booking numbers', async () => {
      const stats = await MovieStats.create({
        movieId: 'movie-456',
        bookingNumbers: [
          { date: '2025-09-30', number: 25 },
          { date: '2025-09-29', number: 30 },
        ],
      });

      expect(stats.movieId).toBe('movie-456');
      expect(stats.bookingNumbers).toHaveLength(2);
      expect(stats.bookingNumbers[0].date).toBe('2025-09-30');
      expect(stats.bookingNumbers[0].number).toBe(25);
    });

    it('should default number to 0 if not provided', async () => {
      const stats = await MovieStats.create({
        movieId: 'movie-123',
        bookingNumbers: [{ date: '2025-09-30' }],
      });

      expect(stats.bookingNumbers[0].number).toBe(0);
    });
  });

  describe('Validation', () => {
    it('should fail if movieId is missing', async () => {
      await expect(
        MovieStats.create({
          bookingNumbers: [{ date: '2025-09-30', number: 10 }],
        } as any)
      ).rejects.toThrow(/movieId/);
    });

    it('should fail if date is missing in bookingNumber', async () => {
      await expect(
        MovieStats.create({
          movieId: 'movie-123',
          bookingNumbers: [{ number: 10 }],
        } as any)
      ).rejects.toThrow(/date/);
    });


  });

  describe('Pre-save Hook: Sorting', () => {
    it('should sort bookingNumbers by date descending (newest first)', async () => {
      const stats = await MovieStats.create({
        movieId: 'movie-sort',
        bookingNumbers: [
          { date: '2025-09-27', number: 10 },
          { date: '2025-09-30', number: 25 },
          { date: '2025-09-28', number: 15 },
          { date: '2025-09-29', number: 20 },
        ],
      });

      expect(stats.bookingNumbers).toHaveLength(4);
      expect(stats.bookingNumbers[0].date).toBe('2025-09-30');
      expect(stats.bookingNumbers[1].date).toBe('2025-09-29');
      expect(stats.bookingNumbers[2].date).toBe('2025-09-28');
      expect(stats.bookingNumbers[3].date).toBe('2025-09-27');
    });

    it('should maintain sort order after adding new entries', async () => {
      const stats = await MovieStats.create({
        movieId: 'movie-sort-2',
        bookingNumbers: [
          { date: '2025-09-29', number: 20 },
          { date: '2025-09-30', number: 25 },
        ],
      });

      stats.bookingNumbers.push({ date: '2025-09-28', number: 15 });
      await stats.save();

      expect(stats.bookingNumbers[0].date).toBe('2025-09-30');
      expect(stats.bookingNumbers[1].date).toBe('2025-09-29');
      expect(stats.bookingNumbers[2].date).toBe('2025-09-28');
    });
  });

  describe('Pre-save Hook: Deduplication', () => {
    it('should remove duplicate dates and keep first occurrence', async () => {
      const stats = await MovieStats.create({
        movieId: 'movie-dedup',
        bookingNumbers: [
          { date: '2025-09-30', number: 25 },
          { date: '2025-09-29', number: 20 },
          { date: '2025-09-30', number: 30 }, // Duplicate
          { date: '2025-09-28', number: 15 },
          { date: '2025-09-29', number: 22 }, // Duplicate
        ],
      });

      expect(stats.bookingNumbers).toHaveLength(3);
      expect(stats.bookingNumbers[0].date).toBe('2025-09-30');
      expect(stats.bookingNumbers[0].number).toBe(25); // First occurrence kept
      expect(stats.bookingNumbers[1].date).toBe('2025-09-29');
      expect(stats.bookingNumbers[1].number).toBe(20); // First occurrence kept
      expect(stats.bookingNumbers[2].date).toBe('2025-09-28');
    });

    it('should handle multiple duplicates of same date', async () => {
      const stats = await MovieStats.create({
        movieId: 'movie-multi-dup',
        bookingNumbers: [
          { date: '2025-09-30', number: 10 },
          { date: '2025-09-30', number: 20 },
          { date: '2025-09-30', number: 30 },
          { date: '2025-09-29', number: 5 },
        ],
      });

      expect(stats.bookingNumbers).toHaveLength(2);
      expect(stats.bookingNumbers[0].date).toBe('2025-09-30');
      expect(stats.bookingNumbers[0].number).toBe(10);
      expect(stats.bookingNumbers[1].date).toBe('2025-09-29');
    });
  });

  describe('Pre-save Hook: 7-day Truncation', () => {
    it('should keep only the most recent 7 days', async () => {
      const stats = await MovieStats.create({
        movieId: 'movie-truncate',
        bookingNumbers: [
          { date: '2025-09-30', number: 30 },
          { date: '2025-09-29', number: 29 },
          { date: '2025-09-28', number: 28 },
          { date: '2025-09-27', number: 27 },
          { date: '2025-09-26', number: 26 },
          { date: '2025-09-25', number: 25 },
          { date: '2025-09-24', number: 24 },
          { date: '2025-09-23', number: 23 }, // Should be removed
          { date: '2025-09-22', number: 22 }, // Should be removed
        ],
      });

      expect(stats.bookingNumbers).toHaveLength(7);
      expect(stats.bookingNumbers[0].date).toBe('2025-09-30');
      expect(stats.bookingNumbers[6].date).toBe('2025-09-24');

      // Verify oldest dates were removed
      const dates = stats.bookingNumbers.map((e) => e.date);
      expect(dates).not.toContain('2025-09-23');
      expect(dates).not.toContain('2025-09-22');
    });

    it('should allow less than 7 entries', async () => {
      const stats = await MovieStats.create({
        movieId: 'movie-few',
        bookingNumbers: [
          { date: '2025-09-30', number: 30 },
          { date: '2025-09-29', number: 29 },
          { date: '2025-09-28', number: 28 },
        ],
      });

      expect(stats.bookingNumbers).toHaveLength(3);
    });
  });

  describe('Pre-save Hook: Combined Operations', () => {
    it('should sort, deduplicate, and truncate in correct order', async () => {
      const stats = await MovieStats.create({
        movieId: 'movie-combined',
        bookingNumbers: [
          { date: '2025-09-22', number: 22 }, // Old, should be removed
          { date: '2025-09-30', number: 30 },
          { date: '2025-09-29', number: 29 },
          { date: '2025-09-30', number: 35 }, // Duplicate
          { date: '2025-09-28', number: 28 },
          { date: '2025-09-27', number: 27 },
          { date: '2025-09-26', number: 26 },
          { date: '2025-09-25', number: 25 },
          { date: '2025-09-24', number: 24 },
          { date: '2025-09-23', number: 23 }, // Should be removed after dedup
        ],
      });

      expect(stats.bookingNumbers).toHaveLength(7);
      expect(stats.bookingNumbers[0].date).toBe('2025-09-30');
      expect(stats.bookingNumbers[0].number).toBe(30); // First occurrence
      expect(stats.bookingNumbers[6].date).toBe('2025-09-24');

      const dates = stats.bookingNumbers.map((e) => e.date);
      expect(dates).not.toContain('2025-09-23');
      expect(dates).not.toContain('2025-09-22');
    });
  });

  describe('CRUD Operations', () => {
    it('should find movie stats by movieId', async () => {
      await MovieStats.create({
        movieId: 'movie-find',
        bookingNumbers: [{ date: '2025-09-30', number: 50 }],
      });

      const found = await MovieStats.findOne({ movieId: 'movie-find' });

      expect(found).toBeDefined();
      expect(found!.movieId).toBe('movie-find');
      expect(found!.bookingNumbers).toHaveLength(1);
    });

    it('should update existing movie stats', async () => {
      const stats = await MovieStats.create({
        movieId: 'movie-update',
        bookingNumbers: [{ date: '2025-09-30', number: 10 }],
      });

      stats.bookingNumbers.push({ date: '2025-10-01', number: 15 });
      await stats.save();

      const found = await MovieStats.findById(stats._id);
      expect(found!.bookingNumbers).toHaveLength(2);
      expect(found!.bookingNumbers[0].date).toBe('2025-10-01'); // Sorted newest first
    });

    it('should delete movie stats', async () => {
      const stats = await MovieStats.create({
        movieId: 'movie-delete',
        bookingNumbers: [{ date: '2025-09-30', number: 10 }],
      });

      await MovieStats.deleteOne({ _id: stats._id });

      const found = await MovieStats.findById(stats._id);
      expect(found).toBeNull();
    });
  });

  describe('Business Logic Scenarios', () => {
    it('should increment booking count for existing date', async () => {
      const stats = await MovieStats.create({
        movieId: 'movie-increment',
        bookingNumbers: [
          { date: '2025-09-30', number: 10 },
          { date: '2025-09-29', number: 15 },
        ],
      });

      const todayEntry = stats.bookingNumbers.find(
        (e) => e.date === '2025-09-30'
      );
      if (todayEntry) {
        todayEntry.number += 5;
      }
      await stats.save();

      const found = await MovieStats.findById(stats._id);
      const updated = found!.bookingNumbers.find(
        (e) => e.date === '2025-09-30'
      );
      expect(updated!.number).toBe(15);
    });

    it('should add new booking entry for new date', async () => {
      const stats = await MovieStats.create({
        movieId: 'movie-new-date',
        bookingNumbers: [{ date: '2025-09-29', number: 10 }],
      });

      const newDate = '2025-09-30';
      const existingEntry = stats.bookingNumbers.find(
        (e) => e.date === newDate
      );

      if (!existingEntry) {
        stats.bookingNumbers.push({ date: newDate, number: 1 });
      }
      await stats.save();

      const found = await MovieStats.findById(stats._id);
      expect(found!.bookingNumbers).toHaveLength(2);
      expect(found!.bookingNumbers[0].date).toBe('2025-09-30'); // Sorted newest first
    });

    it('should calculate total bookings over period', async () => {
      const stats = await MovieStats.create({
        movieId: 'movie-total',
        bookingNumbers: [
          { date: '2025-09-30', number: 25 },
          { date: '2025-09-29', number: 30 },
          { date: '2025-09-28', number: 20 },
          { date: '2025-09-27', number: 15 },
        ],
      });

      const total = stats.bookingNumbers.reduce(
        (sum, entry) => sum + entry.number,
        0
      );
      expect(total).toBe(90);
    });

    it('should calculate average daily bookings', async () => {
      const stats = await MovieStats.create({
        movieId: 'movie-average',
        bookingNumbers: [
          { date: '2025-09-30', number: 20 },
          { date: '2025-09-29', number: 30 },
          { date: '2025-09-28', number: 40 },
          { date: '2025-09-27', number: 10 },
        ],
      });

      const total = stats.bookingNumbers.reduce(
        (sum, entry) => sum + entry.number,
        0
      );
      const average = total / stats.bookingNumbers.length;
      expect(average).toBe(25);
    });

    it('should handle multiple movies independently', async () => {
      await MovieStats.create({
        movieId: 'movie-A',
        bookingNumbers: [{ date: '2025-09-30', number: 100 }],
      });

      await MovieStats.create({
        movieId: 'movie-B',
        bookingNumbers: [{ date: '2025-09-30', number: 200 }],
      });

      const statsA = await MovieStats.findOne({ movieId: 'movie-A' });
      const statsB = await MovieStats.findOne({ movieId: 'movie-B' });

      expect(statsA!.bookingNumbers[0].number).toBe(100);
      expect(statsB!.bookingNumbers[0].number).toBe(200);
    });
  });

  describe('Date Format Consistency', () => {
    it('should accept dates in YYYY-MM-DD format', async () => {
      const stats = await MovieStats.create({
        movieId: 'movie-date-format',
        bookingNumbers: [
          { date: '2025-09-30', number: 10 },
          { date: '2025-01-05', number: 20 },
          { date: '2025-12-31', number: 30 },
        ],
      });

      expect(stats.bookingNumbers[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(stats.bookingNumbers[1].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(stats.bookingNumbers[2].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should sort dates correctly using localeCompare', async () => {
      const stats = await MovieStats.create({
        movieId: 'movie-date-sort',
        bookingNumbers: [
          { date: '2025-01-15', number: 10 },
          { date: '2025-12-01', number: 20 },
          { date: '2025-06-30', number: 30 },
        ],
      });

      expect(stats.bookingNumbers[0].date).toBe('2025-12-01');
      expect(stats.bookingNumbers[1].date).toBe('2025-06-30');
      expect(stats.bookingNumbers[2].date).toBe('2025-01-15');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty bookingNumbers array', async () => {
      const stats = await MovieStats.create({
        movieId: 'movie-empty',
        bookingNumbers: [],
      });

      expect(stats.bookingNumbers).toEqual([]);
    });

    it('should handle single booking entry', async () => {
      const stats = await MovieStats.create({
        movieId: 'movie-single',
        bookingNumbers: [{ date: '2025-09-30', number: 42 }],
      });

      expect(stats.bookingNumbers).toHaveLength(1);
      expect(stats.bookingNumbers[0].number).toBe(42);
    });

    it('should handle exactly 7 entries', async () => {
      const bookings = Array.from({ length: 7 }, (_, i) => ({
        date: `2025-09-${30 - i}`,
        number: i + 1,
      }));

      const stats = await MovieStats.create({
        movieId: 'movie-seven',
        bookingNumbers: bookings,
      });

      expect(stats.bookingNumbers).toHaveLength(7);
    });

    it('should handle zero booking numbers', async () => {
      const stats = await MovieStats.create({
        movieId: 'movie-zero',
        bookingNumbers: [
          { date: '2025-09-30', number: 0 },
          { date: '2025-09-29', number: 0 },
        ],
      });

      expect(stats.bookingNumbers[0].number).toBe(0);
      expect(stats.bookingNumbers[1].number).toBe(0);
    });

    it('should handle large booking numbers', async () => {
      const stats = await MovieStats.create({
        movieId: 'movie-large',
        bookingNumbers: [{ date: '2025-09-30', number: 999999 }],
      });

      expect(stats.bookingNumbers[0].number).toBe(999999);
    });
  });
});
