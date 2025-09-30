import { BookingModel } from '../../models/booking.model.js';
import { UserModel } from '../../models/user.model.js';
import { ScreeningModel } from '../../models/screening.model.js';
import { MovieModel } from '../../models/movie.model.js';
import { MovieTheaterModel } from '../../models/movie-theater.model.js';
import { MovieHallModel } from '../../models/movie-hall.model.js';
import { BookedSeatModel } from '../../models/booked-seat.model.js';
import { sequelize, loadModels } from '../../config/db.js';
import { registerAssociations } from '../../models/association.js';
import { BookingStatus } from '../../interfaces/booking.js';

describe('BookingModel', () => {
  let testUserId: string;
  let testScreeningId: string;

  beforeAll(async () => {
    // Load all models into Sequelize
    loadModels();

    // Register associations
    registerAssociations();

    // Sync database with force:true for clean test environment
    await sequelize.sync({ force: true });

    // Create test user
    const user = await UserModel.create({
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      password: 'password123',
      verified: true,
    });
    testUserId = user.userId;

    // Create test movie
    const movie = await MovieModel.create({
      title: 'Test Movie',
      description: 'A test movie description',
      ageRating: 'PG-13',
      genre: 'Action',
      releaseDate: new Date('2024-01-01'),
      director: 'Test Director',
      durationMinutes: 120,
    });

    // Create test theater
    const theater = await MovieTheaterModel.create({
      theaterId: 'test-theater-1',
      name: 'Test Cinema',
      address: '123 Test Street',
      postalCode: '12345',
      city: 'TestCity',
      phone: '0142865750',
      email: 'theater@test.com',
    });

    // Create test hall
    await MovieHallModel.create({
      theaterId: 'test-theater-1',
      hallId: 'hall-1',
      seatsLayout: [
        ['A1', 'A2', 'A3'],
        ['B1', 'B2', 'B3'],
      ],
      quality: '2D',
    });

    // Create test screening
    const screening = await ScreeningModel.create({
      movieId: movie.movieId,
      theaterId: 'test-theater-1',
      hallId: 'hall-1',
      startTime: new Date('2025-12-01T19:00:00'),
      price: 12.5,
    });
    testScreeningId = screening.screeningId;
  });

  afterAll(async () => {
    await sequelize.close();
  });

  afterEach(async () => {
    // Clean up bookings between tests
    await BookingModel.destroy({ where: {} });
  });

  it('should have the correct table name', () => {
    expect(BookingModel.tableName).toBe('bookings');
  });

  it('should create a booking with default values', async () => {
    const booking = await BookingModel.create({
      userId: testUserId,
      screeningId: testScreeningId,
      seatsNumber: 2,
      totalPrice: 25.0,
    });

    expect(booking.bookingId).toBeDefined();
    expect(booking.userId).toBe(testUserId);
    expect(booking.screeningId).toBe(testScreeningId);
    expect(booking.seatsNumber).toBe(2);
    expect(booking.totalPrice).toBe(25.0);
    expect(booking.status).toBe('PENDING'); // default status
    expect(booking.bookingDate).toBeDefined();
    expect(booking.createdAt).toBeDefined();
    expect(booking.updatedAt).toBeDefined();
  });

  it('should allow setting status explicitly', async () => {
    const booking = await BookingModel.create({
      userId: testUserId,
      screeningId: testScreeningId,
      seatsNumber: 1,
      totalPrice: 12.5,
      status: 'USED' as BookingStatus,
    });

    expect(booking.status).toBe('USED');
  });

  it('should validate minimum seatsNumber', async () => {
    await expect(
      BookingModel.create({
        userId: testUserId,
        screeningId: testScreeningId,
        seatsNumber: 0, // Invalid: min is 1
        totalPrice: 0,
      })
    ).rejects.toThrow();
  });

  it('should validate minimum totalPrice', async () => {
    await expect(
      BookingModel.create({
        userId: testUserId,
        screeningId: testScreeningId,
        seatsNumber: 1,
        totalPrice: -10, // Invalid: min is 0
      })
    ).rejects.toThrow();
  });

  it('should have correct enum values for status', () => {
    const statusEnum = BookingModel.getAttributes().status.values;
    expect(statusEnum).toEqual(['PENDING', 'USED', 'CANCELLED']);
  });

  it('should auto-generate UUID for bookingId', async () => {
    const booking = await BookingModel.create({
      userId: testUserId,
      screeningId: testScreeningId,
      seatsNumber: 2,
      totalPrice: 25.0,
    });

    expect(booking.bookingId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it('should have user association defined', () => {
    const associations = BookingModel.associations;
    expect(associations.user).toBeDefined();
    expect(associations.user.associationType).toBe('BelongsTo');
  });

  it('should have screening association defined', () => {
    const associations = BookingModel.associations;
    expect(associations.screening).toBeDefined();
    expect(associations.screening.associationType).toBe('BelongsTo');
  });

  it('should have bookedSeats association defined', () => {
    const associations = BookingModel.associations;
    expect(associations.bookedSeats).toBeDefined();
    expect(associations.bookedSeats.associationType).toBe('HasMany');
  });

  it('should cascade delete when user is deleted', async () => {
    // Create a temporary user
    const tempUser = await UserModel.create({
      username: 'tempuser',
      firstName: 'Temp',
      lastName: 'User',
      email: 'temp@example.com',
      password: 'password123',
      verified: true,
    });

    // Create booking for temp user
    const booking = await BookingModel.create({
      userId: tempUser.userId,
      screeningId: testScreeningId,
      seatsNumber: 1,
      totalPrice: 12.5,
    });

    // Delete user
    await tempUser.destroy();

    // Booking should be deleted (cascade)
    const deletedBooking = await BookingModel.findByPk(booking.bookingId);
    expect(deletedBooking).toBeNull();
  });

  it('should load booking with user association', async () => {
    const booking = await BookingModel.create({
      userId: testUserId,
      screeningId: testScreeningId,
      seatsNumber: 2,
      totalPrice: 25.0,
    });

    const bookingWithUser = await BookingModel.findByPk(booking.bookingId, {
      include: [{ model: UserModel, as: 'user' }],
    });

    expect(bookingWithUser).toBeDefined();
    expect(bookingWithUser!.user).toBeDefined();
    expect(bookingWithUser!.user.userId).toBe(testUserId);
    expect(bookingWithUser!.user.email).toBe('test@example.com');
  });

  it('should load booking with screening association', async () => {
    const booking = await BookingModel.create({
      userId: testUserId,
      screeningId: testScreeningId,
      seatsNumber: 2,
      totalPrice: 25.0,
    });

    const bookingWithScreening = await BookingModel.findByPk(
      booking.bookingId,
      {
        include: [{ model: ScreeningModel, as: 'screening' }],
      }
    );

    expect(bookingWithScreening).toBeDefined();
    expect(bookingWithScreening!.screening).toBeDefined();
    expect(bookingWithScreening!.screening.screeningId).toBe(testScreeningId);
  });

  it('should update booking status', async () => {
    const booking = await BookingModel.create({
      userId: testUserId,
      screeningId: testScreeningId,
      seatsNumber: 1,
      totalPrice: 12.5,
      status: 'PENDING',
    });

    await booking.update({ status: 'USED' });

    expect(booking.status).toBe('USED');

    // Verify in database
    const updated = await BookingModel.findByPk(booking.bookingId);
    expect(updated!.status).toBe('USED');
  });

  it('should store decimal prices correctly', async () => {
    const booking = await BookingModel.create({
      userId: testUserId,
      screeningId: testScreeningId,
      seatsNumber: 3,
      totalPrice: 37.99,
    });

    expect(booking.totalPrice).toBe(37.99);

    // Verify precision in database
    const fetched = await BookingModel.findByPk(booking.bookingId);
    expect(Number(fetched!.totalPrice)).toBe(37.99);
  });
});
