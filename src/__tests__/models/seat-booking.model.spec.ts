import { Sequelize } from 'sequelize-typescript';
import { ScreeningModel } from '../../models/screening.model.js';
import { BookingModel } from '../../models/booking.model.js';
import { SeatBookingModel } from '../../models/seat-booking.model.js';
import { UserModel } from '../../models/user.model.js';
import { MovieTheaterModel } from '../../models/movie-theater.model.js';
import { MovieHallModel } from '../../models/movie-hall.model.js';
import { MovieModel } from '../../models/movie.model.js';
import { v4 as uuidv4 } from 'uuid';

describe('SeatBookingModel', () => {
  let sequelize: Sequelize;
  let screening: ScreeningModel;
  let booking: BookingModel;
  let user: UserModel;

  beforeAll(async () => {
    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: ':memory:',
      logging: false,
      models: [
        UserModel,
        MovieModel,
        MovieTheaterModel,
        MovieHallModel,
        ScreeningModel,
        BookingModel,
        SeatBookingModel,
      ],
    });
    await sequelize.sync({ force: true });

    // Create required FK records
    user = await UserModel.create({
      userId: uuidv4(),
      username: 'seatuser',
      firstName: 'Seat',
      lastName: 'Booker',
      email: 'seat.user@example.com',
      password: 'testpass',
    });

    const movie = await MovieModel.create({
      movieId: uuidv4(),
      title: 'Inception',
      description: 'A mind-bending thriller.',
      ageRating: 'PG-13',
      genre: 'Sci-Fi',
      releaseDate: new Date('2010-07-16'),
      director: 'Christopher Nolan',
      durationMinutes: 148,
      posterUrl: 'https://example.com/poster.jpg',
      recommended: false,
    });

    const theater = await MovieTheaterModel.create({
      theaterId: 't1',
      address: '123 St',
      postalCode: '12345',
      city: 'City',
      phone: '1234567890',
      email: 'theater@example.com',
    });

    const hall = await MovieHallModel.create({
      theaterId: theater.theaterId,
      hallId: 'h1',
      seatsLayout: [
        [1, 2, 3],
        [4, 5, 6],
      ],
    });

    screening = await ScreeningModel.create({
      screeningId: uuidv4(),
      movieId: movie.movieId,
      theaterId: theater.theaterId,
      hallId: hall.hallId,
      startTime: new Date(),
      price: 10,
      quality: '2D',
    });

    booking = await BookingModel.create({
      bookingId: uuidv4(),
      userId: user.userId,
      screeningId: screening.screeningId,
      seatsNumber: 1,
      status: 'pending',
      bookingDate: new Date(),
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    // Only clear seat bookings before each test (preserves setup speed)
    await SeatBookingModel.destroy({ where: {} });
  });

  it('creates a valid seat booking', async () => {
    const seatBooking = await SeatBookingModel.create({
      screeningId: screening.screeningId,
      seatId: 'A1',
      bookingId: booking.bookingId,
    });

    expect(seatBooking.screeningId).toBe(screening.screeningId);
    expect(seatBooking.seatId).toBe('A1');
    expect(seatBooking.bookingId).toBe(booking.bookingId);
  });

  it('associates seat booking with screening and booking', async () => {
    const seatBooking = await SeatBookingModel.create({
      screeningId: screening.screeningId,
      seatId: 'A2',
      bookingId: booking.bookingId,
    });

    const associatedScreening = await seatBooking.$get('screening');
    expect(associatedScreening).toBeTruthy();
    expect(associatedScreening!.screeningId).toBe(screening.screeningId);

    const associatedBooking = await seatBooking.$get('booking');
    expect(associatedBooking).toBeTruthy();
    expect(associatedBooking!.bookingId).toBe(booking.bookingId);
  });

  it('enforces composite uniqueness (no duplicate seat for same screening)', async () => {
    await SeatBookingModel.create({
      screeningId: screening.screeningId,
      seatId: 'B1',
      bookingId: booking.bookingId,
    });

    // Should fail due to PK constraint
    await expect(
      SeatBookingModel.create({
        screeningId: screening.screeningId,
        seatId: 'B1',
        bookingId: booking.bookingId,
      })
    ).rejects.toThrow(/unique|constraint|Validation error/i);
  });

  it('fails with invalid screeningId', async () => {
    await expect(
      SeatBookingModel.create({
        screeningId: uuidv4(), // UUID but not in table
        seatId: 'C1',
        bookingId: booking.bookingId,
      })
    ).rejects.toThrow(/FOREIGN KEY|foreign key|constraint/i);
  });

  it('fails with invalid bookingId', async () => {
    await expect(
      SeatBookingModel.create({
        screeningId: screening.screeningId,
        seatId: 'C2',
        bookingId: uuidv4(), // UUID but not in table
      })
    ).rejects.toThrow(/FOREIGN KEY|foreign key|constraint/i);
  });
});
