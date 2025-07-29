import { Sequelize } from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import { BookingModel, BookingStatus } from '../../models/booking.model.js';
import { UserModel } from '../../models/user.model.js';
import { ScreeningModel } from '../../models/screening.model.js';
import { MovieModel } from '../../models/movie.model.js';
import { MovieTheaterModel } from '../../models/movie-theater.model.js';
import { MovieHallModel } from '../../models/movie-hall.model.js';

// Fixed: this will always use the shared, correct FK unless overridden
function makeBooking(overrides: Partial<any> = {}) {
  return {
    bookingId: uuidv4(),
    userId, // Shared static user
    screeningId, // Shared static screening
    seatsNumber: 2,
    status: 'pending' as BookingStatus,
    bookingDate: new Date(),
    totalPrice: 22.5,
    ...overrides,
  };
}

// Use shared variables for correct referential integrity
const userId = uuidv4();
const movieId = uuidv4();
const theaterId = 'theater1';
const hallId = 'hallA';
const screeningId = uuidv4();

describe('BookingModel', () => {
  let sequelize: Sequelize;

  beforeAll(async () => {
    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: ':memory:',
      logging: false,
      models: [
        BookingModel,
        UserModel,
        ScreeningModel,
        MovieModel,
        MovieTheaterModel,
        MovieHallModel,
      ],
    });

    await sequelize.sync({ force: true });

    // --- Setup static entities for FK integrity ---
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
    if (sequelize) await sequelize.close();
  });

  beforeEach(async () => {
    await BookingModel.destroy({ where: {} });
  });

  it('should create a booking with valid attributes and associate with User and Screening', async () => {
    const booking = await BookingModel.create(makeBooking());

    expect(booking).toBeDefined();
    expect(booking.userId).toBe(userId);
    expect(booking.screeningId).toBe(screeningId);
    expect(booking.seatsNumber).toBe(2);
    expect(booking.status).toBe('pending');
    expect(booking.bookingDate).toBeDefined();

    // Associations
    const foundBooking = await BookingModel.findByPk(booking.bookingId, {
      include: [UserModel, ScreeningModel],
    });

    expect(foundBooking).toBeDefined();
    expect(foundBooking!.user).toBeDefined();
    expect(foundBooking!.user.username).toBe('janedoe');
    expect(foundBooking!.screening).toBeDefined();
    expect(foundBooking!.screening.screeningId).toBe(screeningId);
  });

  it('should require seatsNumber to be at least 1', async () => {
    await expect(
      BookingModel.create(makeBooking({ seatsNumber: 0 }))
    ).rejects.toThrow();
  });

  it('should require totalPrice to be non-negative', async () => {
    await expect(
      BookingModel.create(makeBooking({ totalPrice: -10 }))
    ).rejects.toThrow();
  });

  it('should not allow duplicate bookingId', async () => {
    const booking1 = await BookingModel.create(makeBooking());
    await expect(
      BookingModel.create({ ...makeBooking(), bookingId: booking1.bookingId })
    ).rejects.toThrow();
  });

  it('should update booking status', async () => {
    const booking = await BookingModel.create(makeBooking());
    booking.status = 'used';
    await booking.save();
    const updated = await BookingModel.findByPk(booking.bookingId);
    expect(updated!.status).toBe('used');
  });

  it('should delete a booking', async () => {
    const booking = await BookingModel.create(makeBooking());
    await booking.destroy();
    const found = await BookingModel.findByPk(booking.bookingId);
    expect(found).toBeNull();
  });

  it('should cascade delete when user is removed', async () => {
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
    // Adapt if your FK is set to SET NULL instead of CASCADE!
    expect(found).toBeNull();
  });

  it('should not create booking for missing userId', async () => {
    await expect(
      BookingModel.create(makeBooking({ userId: undefined }))
    ).rejects.toThrow();
  });

  it('should not create booking for missing screeningId', async () => {
    await expect(
      BookingModel.create(makeBooking({ screeningId: undefined }))
    ).rejects.toThrow();
  });

  it('should not create booking for missing seatsNumber', async () => {
    await expect(
      BookingModel.create(makeBooking({ seatsNumber: undefined }))
    ).rejects.toThrow();
  });

  it('should default status to "pending" if not provided', async () => {
    const booking = await BookingModel.create(
      makeBooking({ status: undefined })
    );
    expect(booking.status).toBe('pending');
  });

  it('should not create booking for missing totalPrice', async () => {
    await expect(
      BookingModel.create(makeBooking({ totalPrice: undefined }))
    ).rejects.toThrow();
  });
});
