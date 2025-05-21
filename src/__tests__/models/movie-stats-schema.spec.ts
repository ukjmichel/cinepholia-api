import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import MovieStats from '../../models/movie-stats.schema';

describe('MovieStats Model', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
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
});
