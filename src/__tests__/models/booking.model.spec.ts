import { Sequelize } from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import { BookingModel, BookingStatus } from '../../models/booking.model';
import { UserModel } from '../../models/user.model';
import { ScreeningModel } from '../../models/screening.model';
import { MovieModel } from '../../models/movie.model';
import { MovieTheaterModel } from '../../models/movie-theater.model';
import { MovieHallModel } from '../../models/movie-hall.model';

describe('BookingModel', () => {
  let sequelize: Sequelize;

  // Shared IDs for referential integrity in each test
  const userId = uuidv4();
  const movieId = uuidv4();
  const theaterId = 'theater1';
  const hallId = 'hallA';
  const screeningId = uuidv4();

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

    // Create persistent dependencies only once for all tests
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
    });

    await ScreeningModel.create({
      screeningId,
      movieId,
      theaterId,
      hallId,
      startTime: new Date('2025-01-01T18:00:00Z'),
      price: 11.5,
      quality: '2D',
    });
  });

  afterAll(async () => {
    if (sequelize) await sequelize.close();
  });

  beforeEach(async () => {
    // Only destroy bookings for isolation unless a test specifically needs more
    await BookingModel.destroy({ where: {} });
  });

  it('should create a booking with valid attributes and associate with User and Screening', async () => {
    const booking = await BookingModel.create({
      bookingId: uuidv4(),
      userId,
      screeningId,
      seatsNumber: 2,
      status: 'pending' as BookingStatus,
      bookingDate: new Date(),
    });

    expect(booking).toBeDefined();
    expect(booking.userId).toBe(userId);
    expect(booking.screeningId).toBe(screeningId);
    expect(booking.seatsNumber).toBe(2);
    expect(booking.status).toBe('pending');
    expect(booking.bookingDate).toBeDefined();

    // Fetch with associations
    const foundBooking = await BookingModel.findByPk(booking.bookingId, {
      include: [UserModel, ScreeningModel],
    });

    expect(foundBooking).toBeDefined();
    expect(foundBooking!.user).toBeDefined();
    expect(foundBooking!.user.username).toBe('janedoe');
    expect(foundBooking!.user.email).toBe('jane.doe@example.com');
    expect(foundBooking!.screening).toBeDefined();
    expect(foundBooking!.screening.screeningId).toBe(screeningId);
  });

  it('should require seatsNumber to be at least 1', async () => {
    await expect(
      BookingModel.create({
        bookingId: uuidv4(),
        userId,
        screeningId,
        seatsNumber: 0, // Invalid!
        status: 'pending' as BookingStatus,
        bookingDate: new Date(),
      })
    ).rejects.toThrow();
  });
});
