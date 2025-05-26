import mongoose from 'mongoose';
import MovieStats from '../../models/movie-stats.schema.js';
import { cleanMoviesStats } from '../../scripts/clean-old-bookings-cron';
import { config } from '../../config/env.js';

describe('cleanMoviesStats', () => {
  beforeAll(async () => {
    // Connect using the test MongoDB URI from config
    await mongoose.connect(config.mongodbUri);
  });

  afterAll(async () => {
    // Clean up the test database completely
    if (mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
    }
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    // Clean the collection before each test
    await MovieStats.deleteMany({});
  });

  it('should remove bookings older than 7 days', async () => {
    // Create a date that's definitely older than 7 days (10 days ago)
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 10);

    // Create a recent date (1 day ago to be safe)
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 1);

    await MovieStats.create({
      movieId: 'm1',
      bookings: [
        { bookingId: 'b1', userId: 'u1', seatsNumber: 2, bookedAt: oldDate },
        { bookingId: 'b2', userId: 'u2', seatsNumber: 3, bookedAt: recentDate },
      ],
    });

    await cleanMoviesStats();

    const doc = await MovieStats.findOne({ movieId: 'm1' });
    expect(doc).toBeTruthy();
    expect(doc!.bookings.length).toBe(1);
    expect(doc!.bookings[0].bookingId).toBe('b2');
  });

  it('should not remove recent bookings', async () => {
    // Use dates that are clearly within the 7-day window
    const recentDate1 = new Date();
    recentDate1.setDate(recentDate1.getDate() - 1); // 1 day ago

    const recentDate2 = new Date();
    recentDate2.setDate(recentDate2.getDate() - 3); // 3 days ago

    await MovieStats.create({
      movieId: 'm2',
      bookings: [
        {
          bookingId: 'b3',
          userId: 'u3',
          seatsNumber: 4,
          bookedAt: recentDate1,
        },
        {
          bookingId: 'b4',
          userId: 'u4',
          seatsNumber: 5,
          bookedAt: recentDate2,
        },
      ],
    });

    await cleanMoviesStats();

    const doc = await MovieStats.findOne({ movieId: 'm2' });
    expect(doc).toBeTruthy();
    expect(doc!.bookings.length).toBe(2);
  });

  it('should do nothing if there are no old bookings', async () => {
    await MovieStats.create({
      movieId: 'm3',
      bookings: [],
    });

    await cleanMoviesStats();

    const doc = await MovieStats.findOne({ movieId: 'm3' });
    expect(doc).toBeTruthy();
    expect(doc!.bookings.length).toBe(0);
  });

  it('should handle documents with only old bookings', async () => {
    const veryOldDate = new Date();
    veryOldDate.setDate(veryOldDate.getDate() - 15); // 15 days ago

    await MovieStats.create({
      movieId: 'm4',
      bookings: [
        {
          bookingId: 'b5',
          userId: 'u5',
          seatsNumber: 2,
          bookedAt: veryOldDate,
        },
        {
          bookingId: 'b6',
          userId: 'u6',
          seatsNumber: 1,
          bookedAt: veryOldDate,
        },
      ],
    });

    await cleanMoviesStats();

    const doc = await MovieStats.findOne({ movieId: 'm4' });
    expect(doc).toBeTruthy();
    expect(doc!.bookings.length).toBe(0);
  });
});
