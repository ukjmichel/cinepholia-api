import mongoose from 'mongoose';
import MovieStats from '../../models/movie-stats.schema.js';
import { config } from '../../config/env.js';

describe('MovieStats Model', () => {
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

  it('creates a MovieStats with one booking', async () => {
    const doc = await MovieStats.create({
      movieId: 'movie-1',
      bookings: [
        {
          bookingId: 'booking-1',
          userId: 'user-1',
          bookedAt: new Date(),
          seatsNumber: 3,
        },
      ],
    });

    expect(doc.movieId).toBe('movie-1');
    expect(doc.bookings.length).toBe(1);
    expect(doc.bookings[0].bookingId).toBe('booking-1');
    expect(doc.bookings[0].seatsNumber).toBe(3);
  });

  it('rejects duplicate bookingIds in the same MovieStats', async () => {
    const doc = new MovieStats({
      movieId: 'movie-2',
      bookings: [
        {
          bookingId: 'booking-2',
          userId: 'user-1',
          bookedAt: new Date(),
          seatsNumber: 2,
        },
        {
          bookingId: 'booking-2',
          userId: 'user-2',
          bookedAt: new Date(),
          seatsNumber: 1,
        },
      ],
    });

    await expect(doc.save()).rejects.toThrow(/Duplicate bookingId detected/i);
  });

  it('allows multiple unique bookings', async () => {
    const doc = await MovieStats.create({
      movieId: 'movie-3',
      bookings: [
        {
          bookingId: 'booking-3a',
          userId: 'user-1',
          bookedAt: new Date(),
          seatsNumber: 2,
        },
        {
          bookingId: 'booking-3b',
          userId: 'user-2',
          bookedAt: new Date(),
          seatsNumber: 4,
        },
      ],
    });

    expect(doc.bookings.length).toBe(2);
    expect(doc.bookings[0].bookingId).not.toBe(doc.bookings[1].bookingId);
  });

  it('allows creation with no bookings', async () => {
    const doc = await MovieStats.create({ movieId: 'movie-4', bookings: [] });
    expect(doc.movieId).toBe('movie-4');
    expect(doc.bookings.length).toBe(0);
  });

  it('validates required fields', async () => {
    // Test missing movieId
    const docWithoutMovieId = new MovieStats({
      bookings: [
        {
          bookingId: 'booking-5',
          userId: 'user-1',
          bookedAt: new Date(),
          seatsNumber: 1,
        },
      ],
    });

    await expect(docWithoutMovieId.save()).rejects.toThrow();
  });

  it('validates booking fields', async () => {
    // Test booking with missing required fields
    const docWithInvalidBooking = new MovieStats({
      movieId: 'movie-6',
      bookings: [
        {
          bookingId: 'booking-6',
          // Missing userId, bookedAt, seatsNumber
        },
      ],
    });

    await expect(docWithInvalidBooking.save()).rejects.toThrow();
  });

  it('handles concurrent access correctly', async () => {
    // Create initial document
    await MovieStats.create({
      movieId: 'movie-7',
      bookings: [
        {
          bookingId: 'booking-7a',
          userId: 'user-1',
          bookedAt: new Date(),
          seatsNumber: 2,
        },
      ],
    });

    // Simulate concurrent updates
    const updates = [
      MovieStats.findOneAndUpdate(
        { movieId: 'movie-7' },
        {
          $push: {
            bookings: {
              bookingId: 'booking-7b',
              userId: 'user-2',
              bookedAt: new Date(),
              seatsNumber: 3,
            },
          },
        },
        { new: true }
      ),
      MovieStats.findOneAndUpdate(
        { movieId: 'movie-7' },
        {
          $push: {
            bookings: {
              bookingId: 'booking-7c',
              userId: 'user-3',
              bookedAt: new Date(),
              seatsNumber: 1,
            },
          },
        },
        { new: true }
      ),
    ];

    const results = await Promise.all(updates);

    // Verify both updates succeeded
    expect(results[0]).toBeTruthy();
    expect(results[1]).toBeTruthy();

    // Get final state
    const finalDoc = await MovieStats.findOne({ movieId: 'movie-7' });
    expect(finalDoc!.bookings.length).toBeGreaterThanOrEqual(2);
  });
});
