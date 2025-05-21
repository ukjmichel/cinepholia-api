import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import MovieStats from '../../models/movie-stats.schema';
import { cleanMoviesStats } from '../../scripts/clean-old-bookings-cron';

describe('cleanMoviesStats', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await MovieStats.deleteMany({});
  });

  it('removes bookings older than 7 days at midnight', async () => {
    const now = new Date();
    const todayMidnight = new Date(now);
    todayMidnight.setHours(0, 0, 0, 0);

    const oldBooking = {
      bookingId: 'old',
      userId: 'user1',
      bookedAt: new Date(todayMidnight.getTime() - 10 * 24 * 60 * 60 * 1000),
      seatsNumber: 2,
    };
    const recentBooking = {
      bookingId: 'recent',
      userId: 'user2',
      bookedAt: new Date(todayMidnight.getTime() - 6 * 24 * 60 * 60 * 1000),
      seatsNumber: 4,
    };

    await MovieStats.create({
      movieId: 'movie-1',
      bookings: [oldBooking, recentBooking],
    });

    const result = await cleanMoviesStats();

    expect(result.modifiedCount).toBeGreaterThanOrEqual(1); // There should be at least 1 modified document

    const stats = await MovieStats.findOne({ movieId: 'movie-1' });
    expect(stats).not.toBeNull();
    if (stats) {
      expect(stats.bookings.length).toBe(1);
      expect(stats.bookings[0].bookingId).toBe('recent');
    }
  });

  it('does not remove recent bookings', async () => {
    const now = new Date();
    const todayMidnight = new Date(now);
    todayMidnight.setHours(0, 0, 0, 0);

    const booking1 = {
      bookingId: 'b1',
      userId: 'u1',
      bookedAt: new Date(todayMidnight.getTime() - 2 * 24 * 60 * 60 * 1000),
      seatsNumber: 1,
    };
    const booking2 = {
      bookingId: 'b2',
      userId: 'u2',
      bookedAt: new Date(todayMidnight.getTime() - 5 * 24 * 60 * 60 * 1000),
      seatsNumber: 1,
    };

    await MovieStats.create({
      movieId: 'movie-2',
      bookings: [booking1, booking2],
    });

    const result = await cleanMoviesStats();

    expect(result.modifiedCount).toBeGreaterThanOrEqual(0); // Might be 0 if no change

    const stats = await MovieStats.findOne({ movieId: 'movie-2' });
    expect(stats).not.toBeNull();
    if (stats) {
      expect(stats.bookings.length).toBe(2);
    }
  });

  it('removes all bookings if all are old', async () => {
    const now = new Date();
    const todayMidnight = new Date(now);
    todayMidnight.setHours(0, 0, 0, 0);

    const oldBooking1 = {
      bookingId: 'b3',
      userId: 'u3',
      bookedAt: new Date(todayMidnight.getTime() - 10 * 24 * 60 * 60 * 1000),
      seatsNumber: 2,
    };
    const oldBooking2 = {
      bookingId: 'b4',
      userId: 'u4',
      bookedAt: new Date(todayMidnight.getTime() - 8 * 24 * 60 * 60 * 1000),
      seatsNumber: 2,
    };

    await MovieStats.create({
      movieId: 'movie-3',
      bookings: [oldBooking1, oldBooking2],
    });

    const result = await cleanMoviesStats();

    expect(result.modifiedCount).toBeGreaterThanOrEqual(1);

    const stats = await MovieStats.findOne({ movieId: 'movie-3' });
    expect(stats).not.toBeNull();
    if (stats) {
      expect(stats.bookings.length).toBe(0);
    }
  });
});
