/**
 * @module tests/models/associations.test.ts
 * @description Unit tests for model associations registry
 *
 * Tests verify that:
 * - All associations are properly registered
 * - Foreign keys are correctly configured
 * - Association aliases are correct
 * - Bidirectional relationships are symmetrical
 * - Cascade behaviors work correctly (via integration tests)
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { Sequelize } from 'sequelize-typescript';

import { UserModel } from '../../models/user.model';
import { AuthorizationModel } from '../../models/authorization.model';
import { MovieModel } from '../../models/movie.model';
import { MovieTheaterModel } from '../../models/movie-theater.model';
import { MovieHallModel } from '../../models/movie-hall.model';
import { ScreeningModel } from '../../models/screening.model';
import { BookingModel } from '../../models/booking.model';
import { BookedSeatModel } from '../../models/booked-seat.model';
import { UserTokenModel } from '../../models/user-token.model';
import {
  getAssociationsSummary,
  registerAssociations,
} from '../../models/association';

describe('Model Associations', () => {
  let sequelize: Sequelize;

  beforeAll(async () => {
    // Initialize in-memory SQLite database for testing
    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: ':memory:',
      logging: false,
      models: [
        UserModel,
        AuthorizationModel,
        UserTokenModel,
        MovieModel,
        MovieTheaterModel,
        MovieHallModel,
        ScreeningModel,
        BookingModel,
        BookedSeatModel,
      ],
    });

    // Register all associations
    registerAssociations();

    // Sync database
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('User Associations', () => {
    describe('User ↔ Authorization (One-to-One)', () => {
      it('should establish User.hasOne(Authorization)', () => {
        const association = UserModel.associations.authorization;

        expect(association).toBeDefined();
        expect(association.associationType).toBe('HasOne');
        expect(association.target).toBe(AuthorizationModel);
        expect(association.foreignKey).toBe('userId');
      });

      it('should establish Authorization.belongsTo(User)', () => {
        const association = AuthorizationModel.associations.user;

        expect(association).toBeDefined();
        expect(association.associationType).toBe('BelongsTo');
        expect(association.target).toBe(UserModel);
        expect(association.foreignKey).toBe('userId');
      });
    });

    describe('User ↔ UserToken (One-to-One)', () => {
      it('should establish User.hasOne(UserToken)', () => {
        const association = UserModel.associations.token;

        expect(association).toBeDefined();
        expect(association.associationType).toBe('HasOne');
        expect(association.target).toBe(UserTokenModel);
        expect(association.foreignKey).toBe('userId');
      });

      it('should establish UserToken.belongsTo(User)', () => {
        const association = UserTokenModel.associations.user;

        expect(association).toBeDefined();
        expect(association.associationType).toBe('BelongsTo');
        expect(association.target).toBe(UserModel);
        expect(association.foreignKey).toBe('userId');
      });
    });

    describe('User ↔ Booking (One-to-Many)', () => {
      it('should establish User.hasMany(Booking)', () => {
        const association = UserModel.associations.bookings;

        expect(association).toBeDefined();
        expect(association.associationType).toBe('HasMany');
        expect(association.target).toBe(BookingModel);
        expect(association.foreignKey).toBe('userId');
      });

      it('should establish Booking.belongsTo(User)', () => {
        const association = BookingModel.associations.user;

        expect(association).toBeDefined();
        expect(association.associationType).toBe('BelongsTo');
        expect(association.target).toBe(UserModel);
        expect(association.foreignKey).toBe('userId');
      });
    });
  });

  describe('Movie Theater Associations', () => {
    describe('MovieTheater ↔ MovieHall (One-to-Many)', () => {
      it('should establish MovieTheater.hasMany(MovieHall)', () => {
        const association = MovieTheaterModel.associations.halls;

        expect(association).toBeDefined();
        expect(association.associationType).toBe('HasMany');
        expect(association.target).toBe(MovieHallModel);
        expect(association.foreignKey).toBe('theaterId');
      });

      it('should establish MovieHall.belongsTo(MovieTheater)', () => {
        const association = MovieHallModel.associations.theater;

        expect(association).toBeDefined();
        expect(association.associationType).toBe('BelongsTo');
        expect(association.target).toBe(MovieTheaterModel);
        expect(association.foreignKey).toBe('theaterId');
      });
    });

    describe('MovieTheater ↔ Screening (One-to-Many)', () => {
      it('should establish MovieTheater.hasMany(Screening)', () => {
        const association = MovieTheaterModel.associations.screenings;

        expect(association).toBeDefined();
        expect(association.associationType).toBe('HasMany');
        expect(association.target).toBe(ScreeningModel);
        expect(association.foreignKey).toBe('theaterId');
      });

      it('should establish Screening.belongsTo(MovieTheater)', () => {
        const association = ScreeningModel.associations.theater;

        expect(association).toBeDefined();
        expect(association.associationType).toBe('BelongsTo');
        expect(association.target).toBe(MovieTheaterModel);
        expect(association.foreignKey).toBe('theaterId');
      });
    });
  });

  describe('Movie Hall Associations', () => {
    describe('MovieHall ↔ Screening (One-to-Many)', () => {
      it('should establish MovieHall.hasMany(Screening)', () => {
        const association = MovieHallModel.associations.screenings;

        expect(association).toBeDefined();
        expect(association.associationType).toBe('HasMany');
        expect(association.target).toBe(ScreeningModel);
        expect(association.foreignKey).toBe('hallId');
      });

      it('should establish Screening.belongsTo(MovieHall)', () => {
        const association = ScreeningModel.associations.hall;

        expect(association).toBeDefined();
        expect(association.associationType).toBe('BelongsTo');
        expect(association.target).toBe(MovieHallModel);
        expect(association.foreignKey).toBe('hallId');
      });
    });
  });

  describe('Movie Associations', () => {
    describe('Movie ↔ Screening (One-to-Many)', () => {
      it('should establish Movie.hasMany(Screening)', () => {
        const association = MovieModel.associations.screenings;

        expect(association).toBeDefined();
        expect(association.associationType).toBe('HasMany');
        expect(association.target).toBe(ScreeningModel);
        expect(association.foreignKey).toBe('movieId');
      });

      it('should establish Screening.belongsTo(Movie)', () => {
        const association = ScreeningModel.associations.movie;

        expect(association).toBeDefined();
        expect(association.associationType).toBe('BelongsTo');
        expect(association.target).toBe(MovieModel);
        expect(association.foreignKey).toBe('movieId');
      });
    });
  });

  describe('Screening Associations', () => {
    describe('Screening ↔ Booking (One-to-Many)', () => {
      it('should establish Screening.hasMany(Booking)', () => {
        const association = ScreeningModel.associations.bookings;

        expect(association).toBeDefined();
        expect(association.associationType).toBe('HasMany');
        expect(association.target).toBe(BookingModel);
        expect(association.foreignKey).toBe('screeningId');
      });

      it('should establish Booking.belongsTo(Screening)', () => {
        const association = BookingModel.associations.screening;

        expect(association).toBeDefined();
        expect(association.associationType).toBe('BelongsTo');
        expect(association.target).toBe(ScreeningModel);
        expect(association.foreignKey).toBe('screeningId');
      });
    });

    describe('Screening ↔ BookedSeat (One-to-Many)', () => {
      it('should establish Screening.hasMany(BookedSeat)', () => {
        const association = ScreeningModel.associations.bookedSeats;

        expect(association).toBeDefined();
        expect(association.associationType).toBe('HasMany');
        expect(association.target).toBe(BookedSeatModel);
        expect(association.foreignKey).toBe('screeningId');
      });

      it('should establish BookedSeat.belongsTo(Screening)', () => {
        const association = BookedSeatModel.associations.screening;

        expect(association).toBeDefined();
        expect(association.associationType).toBe('BelongsTo');
        expect(association.target).toBe(ScreeningModel);
        expect(association.foreignKey).toBe('screeningId');
      });
    });
  });

  describe('Booking Associations', () => {
    describe('Booking ↔ BookedSeat (One-to-Many)', () => {
      it('should establish Booking.hasMany(BookedSeat)', () => {
        const association = BookingModel.associations.bookedSeats;

        expect(association).toBeDefined();
        expect(association.associationType).toBe('HasMany');
        expect(association.target).toBe(BookedSeatModel);
        expect(association.foreignKey).toBe('bookingId');
      });

      it('should establish BookedSeat.belongsTo(Booking)', () => {
        const association = BookedSeatModel.associations.booking;

        expect(association).toBeDefined();
        expect(association.associationType).toBe('BelongsTo');
        expect(association.target).toBe(BookingModel);
        expect(association.foreignKey).toBe('bookingId');
      });
    });
  });

  describe('Association Summary', () => {
    it('should return correct association summary', () => {
      const summary = getAssociationsSummary();

      expect(summary).toBeDefined();
      expect(summary.UserModel).toContain('hasOne: AuthorizationModel');
      expect(summary.UserModel).toContain('hasOne: UserTokenModel');
      expect(summary.UserModel).toContain('hasMany: BookingModel');
      expect(summary.MovieModel).toContain('hasMany: ScreeningModel');
      expect(summary.MovieTheaterModel).toContain('hasMany: MovieHallModel');
      expect(summary.MovieTheaterModel).toContain('hasMany: ScreeningModel');
      expect(summary.BookingModel).toContain('belongsTo: UserModel');
      expect(summary.BookingModel).toContain('belongsTo: ScreeningModel');
      expect(summary.BookingModel).toContain('hasMany: BookedSeatModel');
    });
  });

  describe('CASCADE Behavior Integration Tests', () => {
    it('should cascade delete from User to Authorization', async () => {
      const user = await UserModel.create({
        username: 'cascadetest', // Changed from 'cascade-test'
        firstName: 'Cascade',
        lastName: 'Test',
        email: 'cascade@test.com',
        password: 'password123',
        verified: true,
      });

      await AuthorizationModel.create({
        userId: user.userId,
        role: 'admin',
      });

      let auth = await AuthorizationModel.findOne({
        where: { userId: user.userId },
      });
      expect(auth).toBeDefined();

      await user.destroy();

      auth = await AuthorizationModel.findOne({
        where: { userId: user.userId },
      });
      expect(auth).toBeNull();
    });

    it('should cascade delete from Screening to Bookings and BookedSeats', async () => {
      const movie = await MovieModel.create({
        title: 'Cascade Test Movie',
        description: 'Testing cascade deletion',
        ageRating: 'PG',
        genre: 'Drama',
        releaseDate: new Date('2025-01-01'),
        director: 'Test Director',
        durationMinutes: 90,
      });

      const theater = await MovieTheaterModel.create({
        theaterId: 'cascade-theater',
        name: 'Cascade Theater',
        address: '456 Cascade Ave',
        postalCode: '54321',
        city: 'CascadeCity',
        phone: '0987654321',
        email: 'cascade@theater.com',
      });

      const hall = await MovieHallModel.create({
        theaterId: theater.theaterId,
        hallId: 'cascade-hall',
        seatsLayout: [['C1', 'C2']],
        quality: '3D',
      });

      const screening = await ScreeningModel.create({
        movieId: movie.movieId,
        theaterId: theater.theaterId,
        hallId: hall.hallId,
        startTime: new Date('2025-10-20T20:00:00'),
        price: 15.0,
      });

      const user = await UserModel.create({
        username: 'bookinguser',
        firstName: 'Booking',
        lastName: 'User',
        email: 'booking@test.com',
        password: 'password123',
        verified: true,
      });

      const booking = await BookingModel.create({
        userId: user.userId,
        screeningId: screening.screeningId,
        seatsNumber: 1,
        totalPrice: 15.0,
        status: 'PENDING',
      });

      await BookedSeatModel.create({
        screeningId: screening.screeningId,
        seatId: 'C1',
        bookingId: booking.bookingId,
      });

      let foundBooking = await BookingModel.findByPk(booking.bookingId);
      let foundSeat = await BookedSeatModel.findOne({
        where: { bookingId: booking.bookingId },
      });
      expect(foundBooking).toBeDefined();
      expect(foundSeat).toBeDefined();

      await screening.destroy();

      foundBooking = await BookingModel.findByPk(booking.bookingId);
      foundSeat = await BookedSeatModel.findOne({
        where: { screeningId: screening.screeningId },
      });
      expect(foundBooking).toBeNull();
      expect(foundSeat).toBeNull();
    });

    it('should allow eager loading of nested associations', async () => {
      const user = await UserModel.create({
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'password123',
        verified: true,
      });

      await AuthorizationModel.create({
        userId: user.userId,
        role: 'user',
      });

      const movie = await MovieModel.create({
        title: 'Test Movie',
        description: 'A test movie description',
        ageRating: 'PG-13',
        genre: 'Action',
        releaseDate: new Date('2025-01-01'),
        director: 'Test Director',
        durationMinutes: 120,
        recommended: false,
      });

      const theater = await MovieTheaterModel.create({
        theaterId: 'theater-test',
        name: 'Test Theater',
        address: '123 Test Street',
        postalCode: '12345',
        city: 'TestCity',
        phone: '1234567890',
        email: 'theater@test.com',
      });

      const hall = await MovieHallModel.create({
        theaterId: theater.theaterId,
        hallId: 'hall-1',
        seatsLayout: [
          ['A1', 'A2'],
          ['B1', 'B2'],
        ],
        quality: '2D',
      });

      const screening = await ScreeningModel.create({
        movieId: movie.movieId,
        theaterId: theater.theaterId,
        hallId: hall.hallId,
        startTime: new Date('2025-10-15T19:30:00'),
        price: 12.5,
      });

      await BookingModel.create({
        userId: user.userId,
        screeningId: screening.screeningId,
        seatsNumber: 2,
        totalPrice: 25.0,
        status: 'PENDING',
      });

      const loadedUser = await UserModel.findByPk(user.userId, {
        include: [
          { model: AuthorizationModel, as: 'authorization' },
          {
            model: BookingModel,
            as: 'bookings',
            include: [
              {
                model: ScreeningModel,
                as: 'screening',
                include: [
                  { model: MovieModel, as: 'movie' },
                  { model: MovieTheaterModel, as: 'theater' },
                  { model: MovieHallModel, as: 'hall' },
                ],
              },
            ],
          },
        ],
      });

      expect(loadedUser).toBeDefined();
      expect(loadedUser?.authorization).toBeDefined();
      expect(loadedUser?.authorization.role).toBe('user');
      expect(loadedUser?.bookings).toHaveLength(1);
      expect(loadedUser?.bookings[0].screening).toBeDefined();
      expect(loadedUser?.bookings[0].screening.movie).toBeDefined();
      expect(loadedUser?.bookings[0].screening.theater).toBeDefined();
      expect(loadedUser?.bookings[0].screening.hall).toBeDefined();
    });
  });
});
