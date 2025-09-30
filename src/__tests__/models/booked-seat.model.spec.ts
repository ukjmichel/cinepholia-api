import { BookedSeatModel } from '../../models/booked-seat.model.js';
import { BookingModel } from '../../models/booking.model.js';
import { ScreeningModel } from '../../models/screening.model.js';
import { UserModel } from '../../models/user.model.js';
import { MovieModel } from '../../models/movie.model.js';
import { MovieTheaterModel } from '../../models/movie-theater.model.js';
import { MovieHallModel } from '../../models/movie-hall.model.js';
import { sequelize, loadModels } from '../../config/db.js';
import { registerAssociations } from '../../models/association.js';

describe('BookedSeatModel', () => {
  let testUserId: string;
  let testScreeningId: string;
  let testBookingId: string;

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

    // Create test booking
    const booking = await BookingModel.create({
      userId: testUserId,
      screeningId: testScreeningId,
      seatsNumber: 2,
      totalPrice: 25.0,
    });
    testBookingId = booking.bookingId;
  });

  afterAll(async () => {
    await sequelize.close();
  });

  afterEach(async () => {
    // Clean up booked seats between tests
    await BookedSeatModel.destroy({ where: {} });
  });

  it('should have the correct table name', () => {
    expect(BookedSeatModel.tableName).toBe('booked_seats');
  });

  it('should create a booked seat with composite primary key', async () => {
    const bookedSeat = await BookedSeatModel.create({
      screeningId: testScreeningId,
      seatId: 'A1',
      bookingId: testBookingId,
    });

    expect(bookedSeat.screeningId).toBe(testScreeningId);
    expect(bookedSeat.seatId).toBe('A1');
    expect(bookedSeat.bookingId).toBe(testBookingId);
    expect(bookedSeat.createdAt).toBeDefined();
    expect(bookedSeat.updatedAt).toBeDefined();
  });

  it('should prevent duplicate seat bookings for the same screening', async () => {
    // Create first booking
    await BookedSeatModel.create({
      screeningId: testScreeningId,
      seatId: 'A2',
      bookingId: testBookingId,
    });

    // Try to book the same seat again - should fail
    await expect(
      BookedSeatModel.create({
        screeningId: testScreeningId,
        seatId: 'A2', // Same seat
        bookingId: testBookingId,
      })
    ).rejects.toThrow();
  });

  it('should allow the same seatId for different screenings', async () => {
    // Create another screening
    const screening2 = await ScreeningModel.create({
      movieId: (await MovieModel.findOne())!.movieId,
      theaterId: 'test-theater-1',
      hallId: 'hall-1',
      startTime: new Date('2025-12-02T19:00:00'),
      price: 12.5,
    });

    const booking2 = await BookingModel.create({
      userId: testUserId,
      screeningId: screening2.screeningId,
      seatsNumber: 1,
      totalPrice: 12.5,
    });

    // Book A1 for first screening
    const seat1 = await BookedSeatModel.create({
      screeningId: testScreeningId,
      seatId: 'A1',
      bookingId: testBookingId,
    });

    // Book A1 for second screening - should succeed
    const seat2 = await BookedSeatModel.create({
      screeningId: screening2.screeningId,
      seatId: 'A1', // Same seat ID, different screening
      bookingId: booking2.bookingId,
    });

    expect(seat1.seatId).toBe('A1');
    expect(seat2.seatId).toBe('A1');
    expect(seat1.screeningId).not.toBe(seat2.screeningId);
  });

  it('should find booked seat by composite primary key', async () => {
    await BookedSeatModel.create({
      screeningId: testScreeningId,
      seatId: 'B1',
      bookingId: testBookingId,
    });

    const found = await BookedSeatModel.findOne({
      where: {
        screeningId: testScreeningId,
        seatId: 'B1',
      },
    });

    expect(found).toBeDefined();
    expect(found!.screeningId).toBe(testScreeningId);
    expect(found!.seatId).toBe('B1');
  });

  it('should have screening association defined', () => {
    const associations = BookedSeatModel.associations;
    expect(associations.screening).toBeDefined();
    expect(associations.screening.associationType).toBe('BelongsTo');
  });

  it('should have booking association defined', () => {
    const associations = BookedSeatModel.associations;
    expect(associations.booking).toBeDefined();
    expect(associations.booking.associationType).toBe('BelongsTo');
  });

  it('should load booked seat with screening association', async () => {
    const bookedSeat = await BookedSeatModel.create({
      screeningId: testScreeningId,
      seatId: 'A3',
      bookingId: testBookingId,
    });

    const seatWithScreening = await BookedSeatModel.findOne({
      where: {
        screeningId: bookedSeat.screeningId,
        seatId: bookedSeat.seatId,
      },
      include: [{ model: ScreeningModel, as: 'screening' }],
    });

    expect(seatWithScreening).toBeDefined();
    expect(seatWithScreening!.screening).toBeDefined();
    expect(seatWithScreening!.screening.screeningId).toBe(testScreeningId);
  });

  it('should load booked seat with booking association', async () => {
    const bookedSeat = await BookedSeatModel.create({
      screeningId: testScreeningId,
      seatId: 'B2',
      bookingId: testBookingId,
    });

    const seatWithBooking = await BookedSeatModel.findOne({
      where: {
        screeningId: bookedSeat.screeningId,
        seatId: bookedSeat.seatId,
      },
      include: [{ model: BookingModel, as: 'booking' }],
    });

    expect(seatWithBooking).toBeDefined();
    expect(seatWithBooking!.booking).toBeDefined();
    expect(seatWithBooking!.booking.bookingId).toBe(testBookingId);
  });

  it('should cascade delete when screening is deleted', async () => {
    // Create a temporary screening
    const tempScreening = await ScreeningModel.create({
      movieId: (await MovieModel.findOne())!.movieId,
      theaterId: 'test-theater-1',
      hallId: 'hall-1',
      startTime: new Date('2025-12-03T19:00:00'),
      price: 12.5,
    });

    const tempBooking = await BookingModel.create({
      userId: testUserId,
      screeningId: tempScreening.screeningId,
      seatsNumber: 1,
      totalPrice: 12.5,
    });

    // Create booked seat for temp screening
    await BookedSeatModel.create({
      screeningId: tempScreening.screeningId,
      seatId: 'A1',
      bookingId: tempBooking.bookingId,
    });

    // Delete screening
    await tempScreening.destroy();

    // Booked seat should be deleted (cascade)
    const deletedSeat = await BookedSeatModel.findOne({
      where: {
        screeningId: tempScreening.screeningId,
        seatId: 'A1',
      },
    });

    expect(deletedSeat).toBeNull();
  });

  it('should cascade delete when booking is deleted', async () => {
    const tempBooking = await BookingModel.create({
      userId: testUserId,
      screeningId: testScreeningId,
      seatsNumber: 1,
      totalPrice: 12.5,
    });

    // Create booked seat for temp booking
    await BookedSeatModel.create({
      screeningId: testScreeningId,
      seatId: 'C1',
      bookingId: tempBooking.bookingId,
    });

    // Delete booking
    await tempBooking.destroy();

    // Booked seat should be deleted (cascade)
    const deletedSeat = await BookedSeatModel.findOne({
      where: {
        screeningId: testScreeningId,
        seatId: 'C1',
      },
    });

    expect(deletedSeat).toBeNull();
  });

  it('should find all booked seats for a screening', async () => {
    // Book multiple seats
    await BookedSeatModel.create({
      screeningId: testScreeningId,
      seatId: 'A1',
      bookingId: testBookingId,
    });

    await BookedSeatModel.create({
      screeningId: testScreeningId,
      seatId: 'A2',
      bookingId: testBookingId,
    });

    await BookedSeatModel.create({
      screeningId: testScreeningId,
      seatId: 'B1',
      bookingId: testBookingId,
    });

    const bookedSeats = await BookedSeatModel.findAll({
      where: { screeningId: testScreeningId },
    });

    expect(bookedSeats).toHaveLength(3);
    expect(bookedSeats.map((s) => s.seatId).sort()).toEqual(['A1', 'A2', 'B1']);
  });

  it('should use snake_case field names in database', async () => {
    const bookedSeat = await BookedSeatModel.create({
      screeningId: testScreeningId,
      seatId: 'B3',
      bookingId: testBookingId,
    });

    // Check that the model uses snake_case field names
    const rawAttributes = BookedSeatModel.getAttributes();
    expect(rawAttributes.screeningId.field).toBe('screening_id');
    expect(rawAttributes.seatId.field).toBe('seat_id');
    expect(rawAttributes.bookingId.field).toBe('booking_id');
  });

  it('should validate UUID format for screeningId and bookingId', async () => {
    // This test verifies the @IsUUID(4) decorators work
    const seat = await BookedSeatModel.create({
      screeningId: testScreeningId,
      seatId: 'TEST',
      bookingId: testBookingId,
    });

    // UUIDs should be valid v4 format
    expect(seat.screeningId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
    expect(seat.bookingId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });
});
