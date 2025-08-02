import { v4 as uuidv4 } from 'uuid';
import { sequelize, syncDB } from '../../config/db.js';
import { UserModel } from '../../models/user.model.js';
import { MovieModel } from '../../models/movie.model.js';
import { MovieTheaterModel } from '../../models/movie-theater.model.js';
import { MovieHallModel } from '../../models/movie-hall.model.js';
import { ScreeningModel } from '../../models/screening.model.js';
import { BookingModel, BookingStatus } from '../../models/booking.model.js';

// Shared test UUIDs for FKs
const userId = uuidv4();
const movieId = uuidv4();
const theaterId = 'theater1';
const hallId = 'hallA';
const screeningId = uuidv4();

// Helper for valid booking creation
function makeBooking(overrides: Partial<any> = {}) {
  return {
    bookingId: uuidv4(),
    userId,
    screeningId,
    seatsNumber: 2,
    status: 'pending' as BookingStatus,
    bookingDate: new Date(),
    totalPrice: 22.5,
    ...overrides,
  };
}

describe('BookingModel (MySQL)', () => {
  beforeAll(async () => {
    await syncDB();
    // Static data for FK integrity
    await UserModel.create({
      userId,
      username: 'janedoe',
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane.doe@example.com',
      password: 'password123',
      verified: true,
    });
    await MovieModel.create({
      movieId,
      title: 'A Movie',
      description: 'A description',
      ageRating: 'PG',
      genre: 'Drama',
      releaseDate: new Date('2020-01-01'),
      director: 'Jane Director',
      durationMinutes: 100,
    });
    await MovieTheaterModel.create({
      theaterId,
      address: '123 Main St',
      postalCode: '75000',
      city: 'Paris',
      phone: '0102030405',
      email: 'test@theater.com',
    });
    await MovieHallModel.create({
      theaterId,
      hallId,
      seatsLayout: [
        [1, 2, 3],
        [4, 5, 6],
      ],
      quality: '2D',
    });
    await ScreeningModel.create({
      screeningId,
      movieId,
      theaterId,
      hallId,
      startTime: new Date('2025-01-01T18:00:00Z'),
      price: 11.5,
    });
  });

  afterAll(async () => {
    if (sequelize.getDialect() === 'mysql') {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    }
    await BookingModel.destroy({ where: {}, truncate: true, cascade: true });
    await ScreeningModel.destroy({ where: {}, truncate: true, cascade: true });
    await MovieHallModel.destroy({ where: {}, truncate: true, cascade: true });
    await MovieTheaterModel.destroy({
      where: {},
      truncate: true,
      cascade: true,
    });
    await MovieModel.destroy({ where: {}, truncate: true, cascade: true });
    await UserModel.destroy({ where: {}, truncate: true, cascade: true });
    if (sequelize.getDialect() === 'mysql') {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    }
    await sequelize.close();
  });

  beforeEach(async () => {
    await BookingModel.destroy({ where: {} });
  });

  it('creates a booking and associates it with User and Screening', async () => {
    const booking = await BookingModel.create(makeBooking());
    expect(booking).toBeDefined();
    expect(booking.userId).toBe(userId);
    expect(booking.screeningId).toBe(screeningId);
    expect(booking.seatsNumber).toBe(2);
    expect(booking.status).toBe('pending');
    expect(booking.bookingDate).toBeInstanceOf(Date);
    expect(typeof booking.totalPrice).toBe('number');

    // Check associations are populated on fetch
    const found = await BookingModel.findByPk(booking.bookingId, {
      include: [UserModel, ScreeningModel],
    });
    expect(found).toBeDefined();
    expect(found!.user).toBeDefined();
    expect(found!.user.username).toBe('janedoe');
    expect(found!.screening).toBeDefined();
    expect(found!.screening.screeningId).toBe(screeningId);
  });

  it('requires seatsNumber to be at least 1', async () => {
    await expect(
      BookingModel.create(makeBooking({ seatsNumber: 0 }))
    ).rejects.toThrow();
  });

  it('requires totalPrice to be non-negative', async () => {
    await expect(
      BookingModel.create(makeBooking({ totalPrice: -10 }))
    ).rejects.toThrow();
  });

  it('does not allow duplicate bookingId', async () => {
    const booking1 = await BookingModel.create(makeBooking());
    await expect(
      BookingModel.create({ ...makeBooking(), bookingId: booking1.bookingId })
    ).rejects.toThrow();
  });

  it('updates booking status and persists the change', async () => {
    const booking = await BookingModel.create(
      makeBooking({ status: 'pending' })
    );
    booking.status = 'used';
    await booking.save();
    const updated = await BookingModel.findByPk(booking.bookingId);
    expect(updated!.status).toBe('used');
  });

  it('deletes a booking', async () => {
    const booking = await BookingModel.create(makeBooking());
    await booking.destroy();
    const found = await BookingModel.findByPk(booking.bookingId);
    expect(found).toBeNull();
  });

  it('cascades delete when user is removed', async () => {
    const tempUserId = uuidv4();
    await UserModel.create({
      userId: tempUserId,
      username: 'todelete',
      firstName: 'To',
      lastName: 'Delete',
      email: 'todelete@example.com',
      password: 'password123',
      verified: true,
    });
    const booking = await BookingModel.create(
      makeBooking({ userId: tempUserId })
    );
    await UserModel.destroy({ where: { userId: tempUserId } });
    const found = await BookingModel.findByPk(booking.bookingId);
    expect(found).toBeNull();
  });

  it('cascades delete when screening is removed', async () => {
    const tempScreeningId = uuidv4();
    await ScreeningModel.create({
      screeningId: tempScreeningId,
      movieId,
      theaterId,
      hallId,
      startTime: new Date('2025-02-01T15:00:00Z'),
      price: 8,
    });
    const booking = await BookingModel.create(
      makeBooking({ screeningId: tempScreeningId })
    );
    await ScreeningModel.destroy({ where: { screeningId: tempScreeningId } });
    const found = await BookingModel.findByPk(booking.bookingId);
    expect(found).toBeNull();
  });

  it('rejects booking for missing userId', async () => {
    await expect(
      BookingModel.create(makeBooking({ userId: undefined }))
    ).rejects.toThrow();
  });

  it('rejects booking for missing screeningId', async () => {
    await expect(
      BookingModel.create(makeBooking({ screeningId: undefined }))
    ).rejects.toThrow();
  });

  it('rejects booking for missing seatsNumber', async () => {
    await expect(
      BookingModel.create(makeBooking({ seatsNumber: undefined }))
    ).rejects.toThrow();
  });

  it('defaults status to "pending" if not provided', async () => {
    const booking = await BookingModel.create(
      makeBooking({ status: undefined })
    );
    expect(booking.status).toBe('pending');
  });

  it('rejects booking for missing totalPrice', async () => {
    await expect(
      BookingModel.create(makeBooking({ totalPrice: undefined }))
    ).rejects.toThrow();
  });

  it('does not allow invalid status', async () => {
    await expect(
      BookingModel.create(makeBooking({ status: 'foo' }))
    ).rejects.toThrow();
  });

  it('allows status to be "canceled"', async () => {
    const booking = await BookingModel.create(
      makeBooking({ status: 'canceled' })
    );
    expect(booking.status).toBe('canceled');
  });

  it('allows status to be "used"', async () => {
    const booking = await BookingModel.create(makeBooking({ status: 'used' }));
    expect(booking.status).toBe('used');
  });
});
