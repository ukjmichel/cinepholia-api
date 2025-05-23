import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import MovieStats from '../../models/movie-stats.schema.js';
import { cleanMoviesStats } from '../../scripts/clean-old-bookings-cron';

describe('cleanMoviesStats', () => {
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  afterEach(async () => {
    await MovieStats.deleteMany({});
  });

  it('should remove bookings older than 7 days', async () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 10);
    const recentDate = new Date();

    await MovieStats.create({
      movieId: 'm1',
      bookings: [
        { bookingId: 'b1', userId: 'u1', seatsNumber: 2, bookedAt: oldDate },
        { bookingId: 'b2', userId: 'u2', seatsNumber: 3, bookedAt: recentDate },
      ],
    });

    await cleanMoviesStats();

    const doc = await MovieStats.findOne({ movieId: 'm1' });
    expect(doc!.bookings.length).toBe(1);
    expect(doc!.bookings[0].bookingId).toBe('b2');
  });

  it('should not remove recent bookings', async () => {
    const recentDate = new Date();
    await MovieStats.create({
      movieId: 'm2',
      bookings: [
        { bookingId: 'b3', userId: 'u3', seatsNumber: 4, bookedAt: recentDate },
        { bookingId: 'b4', userId: 'u4', seatsNumber: 5, bookedAt: recentDate },
      ],
    });

    await cleanMoviesStats();

    const doc = await MovieStats.findOne({ movieId: 'm2' });
    expect(doc!.bookings.length).toBe(2);
  });

  it('should do nothing if there are no old bookings', async () => {
    await MovieStats.create({
      movieId: 'm3',
      bookings: [],
    });

    await cleanMoviesStats();

    const doc = await MovieStats.findOne({ movieId: 'm3' });
    expect(doc!.bookings.length).toBe(0);
  });
});
