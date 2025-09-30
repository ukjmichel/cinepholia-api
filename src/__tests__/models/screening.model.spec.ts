import { ScreeningModel } from '../../models/screening.model.js';
import { MovieModel } from '../../models/movie.model.js';
import { MovieTheaterModel } from '../../models/movie-theater.model.js';
import { MovieHallModel } from '../../models/movie-hall.model.js';
import { BookingModel } from '../../models/booking.model.js';
import { BookedSeatModel } from '../../models/booked-seat.model.js';
import { sequelize, loadModels } from '../../config/db.js';
import { registerAssociations } from '../../models/association.js';
import { Op } from 'sequelize';

describe('ScreeningModel', () => {
  let testMovie: MovieModel;
  let testTheater: MovieTheaterModel;
  let testHall: MovieHallModel;

  beforeAll(async () => {
    // Load all models into Sequelize
    loadModels();

    // Register associations
    registerAssociations();

    // Sync database with force:true for clean test environment
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    // Create test movie
    testMovie = await MovieModel.create({
      title: 'Test Movie',
      description: 'A test movie for screening tests',
      ageRating: 'PG-13',
      genre: 'Action',
      releaseDate: new Date('2024-01-01'),
      director: 'Test Director',
      durationMinutes: 120,
    });

    // Create test theater
    testTheater = await MovieTheaterModel.create({
      theaterId: 'test-theater',
      name: 'Test Cinema',
      address: '123 Test Street',
      postalCode: '12345',
      city: 'TestCity',
      phone: '0142865750',
      email: 'test@theater.com',
    });

    // Create test hall
    testHall = await MovieHallModel.create({
      theaterId: testTheater.theaterId,
      hallId: 'hall-1',
      seatsLayout: [
        ['A1', 'A2', 'A3'],
        ['B1', 'B2', 'B3'],
      ],
      quality: '2D',
    });
  });

  afterEach(async () => {
    // Clean up in correct order (foreign key constraints)
    await ScreeningModel.destroy({ where: {} });
    await MovieHallModel.destroy({ where: {} });
    await MovieTheaterModel.destroy({ where: {} });
    await MovieModel.destroy({ where: {} });
  });

  it('should have the correct table name', () => {
    expect(ScreeningModel.tableName).toBe('screenings');
  });

  it('should create a screening with all required fields', async () => {
    const startTime = new Date('2025-12-01T19:30:00');

    const screening = await ScreeningModel.create({
      movieId: testMovie.movieId,
      theaterId: testTheater.theaterId,
      hallId: testHall.hallId,
      startTime,
      price: 12.5,
    });

    expect(screening.screeningId).toBeDefined();
    expect(screening.movieId).toBe(testMovie.movieId);
    expect(screening.theaterId).toBe(testTheater.theaterId);
    expect(screening.hallId).toBe(testHall.hallId);
    expect(screening.startTime.toISOString()).toBe(startTime.toISOString());
    expect(Number(screening.price)).toBe(12.5);
    expect(screening.createdAt).toBeDefined();
    expect(screening.updatedAt).toBeDefined();
  });

  it('should auto-generate UUID for screeningId', async () => {
    const screening1 = await ScreeningModel.create({
      movieId: testMovie.movieId,
      theaterId: testTheater.theaterId,
      hallId: testHall.hallId,
      startTime: new Date('2025-12-01T19:30:00'),
      price: 12.5,
    });

    const screening2 = await ScreeningModel.create({
      movieId: testMovie.movieId,
      theaterId: testTheater.theaterId,
      hallId: testHall.hallId,
      startTime: new Date('2025-12-01T21:30:00'),
      price: 15.0,
    });

    expect(screening1.screeningId).toBeDefined();
    expect(screening2.screeningId).toBeDefined();
    expect(screening1.screeningId).not.toBe(screening2.screeningId);
    expect(screening1.screeningId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it('should enforce screeningId uniqueness', async () => {
    const screening = await ScreeningModel.create({
      movieId: testMovie.movieId,
      theaterId: testTheater.theaterId,
      hallId: testHall.hallId,
      startTime: new Date('2025-12-01T19:30:00'),
      price: 12.5,
    });

    // Try to create another screening with the same ID
    await expect(
      ScreeningModel.create({
        screeningId: screening.screeningId,
        movieId: testMovie.movieId,
        theaterId: testTheater.theaterId,
        hallId: testHall.hallId,
        startTime: new Date('2025-12-01T21:30:00'),
        price: 15.0,
      })
    ).rejects.toThrow();
  });

  it('should require all foreign keys', async () => {
    // Missing movieId
    await expect(
      ScreeningModel.create({
        theaterId: testTheater.theaterId,
        hallId: testHall.hallId,
        startTime: new Date('2025-12-01T19:30:00'),
        price: 12.5,
      } as any)
    ).rejects.toThrow();

    // Missing theaterId
    await expect(
      ScreeningModel.create({
        movieId: testMovie.movieId,
        hallId: testHall.hallId,
        startTime: new Date('2025-12-01T19:30:00'),
        price: 12.5,
      } as any)
    ).rejects.toThrow();

    // Missing hallId
    await expect(
      ScreeningModel.create({
        movieId: testMovie.movieId,
        theaterId: testTheater.theaterId,
        startTime: new Date('2025-12-01T19:30:00'),
        price: 12.5,
      } as any)
    ).rejects.toThrow();
  });

  it('should require startTime', async () => {
    await expect(
      ScreeningModel.create({
        movieId: testMovie.movieId,
        theaterId: testTheater.theaterId,
        hallId: testHall.hallId,
        price: 12.5,
      } as any)
    ).rejects.toThrow();
  });

  it('should require price', async () => {
    await expect(
      ScreeningModel.create({
        movieId: testMovie.movieId,
        theaterId: testTheater.theaterId,
        hallId: testHall.hallId,
        startTime: new Date('2025-12-01T19:30:00'),
      } as any)
    ).rejects.toThrow();
  });

  it('should validate price is non-negative', async () => {
    // Negative price
    await expect(
      ScreeningModel.create({
        movieId: testMovie.movieId,
        theaterId: testTheater.theaterId,
        hallId: testHall.hallId,
        startTime: new Date('2025-12-01T19:30:00'),
        price: -5.0,
      })
    ).rejects.toThrow();

    // Zero price (valid - free screening)
    const freeScreening = await ScreeningModel.create({
      movieId: testMovie.movieId,
      theaterId: testTheater.theaterId,
      hallId: testHall.hallId,
      startTime: new Date('2025-12-01T19:30:00'),
      price: 0.0,
    });
    expect(Number(freeScreening.price)).toBe(0);
  });

  it('should handle decimal prices correctly', async () => {
    const prices = [12.5, 8.0, 15.99, 25.5, 10.25];

    for (const price of prices) {
      const screening = await ScreeningModel.create({
        movieId: testMovie.movieId,
        theaterId: testTheater.theaterId,
        hallId: testHall.hallId,
        startTime: new Date(`2025-12-01T${10 + prices.indexOf(price)}:00:00`),
        price,
      });
      expect(Number(screening.price)).toBe(price);
      await screening.destroy();
    }
  });

  it('should store and retrieve startTime correctly', async () => {
    const testTimes = [
      new Date('2025-10-15T19:30:00'),
      new Date('2025-10-16T14:00:00'),
      new Date('2025-10-16T22:45:00'),
      new Date('2025-12-25T12:00:00'),
    ];

    for (const startTime of testTimes) {
      const screening = await ScreeningModel.create({
        movieId: testMovie.movieId,
        theaterId: testTheater.theaterId,
        hallId: testHall.hallId,
        startTime,
        price: 12.5,
      });

      expect(screening.startTime.toISOString()).toBe(startTime.toISOString());
      await screening.destroy();
    }
  });

  it('should have movie association defined', () => {
    const associations = ScreeningModel.associations;
    expect(associations.movie).toBeDefined();
    expect(associations.movie.associationType).toBe('BelongsTo');
  });

  it('should have theater association defined', () => {
    const associations = ScreeningModel.associations;
    expect(associations.theater).toBeDefined();
    expect(associations.theater.associationType).toBe('BelongsTo');
  });

  it('should have hall association defined', () => {
    const associations = ScreeningModel.associations;
    expect(associations.hall).toBeDefined();
    expect(associations.hall.associationType).toBe('BelongsTo');
  });

  it('should have bookings association defined', () => {
    const associations = ScreeningModel.associations;
    expect(associations.bookings).toBeDefined();
    expect(associations.bookings.associationType).toBe('HasMany');
  });

  it('should have bookedSeats association defined', () => {
    const associations = ScreeningModel.associations;
    expect(associations.bookedSeats).toBeDefined();
    expect(associations.bookedSeats.associationType).toBe('HasMany');
  });

  it('should load screening with movie association', async () => {
    const screening = await ScreeningModel.create({
      movieId: testMovie.movieId,
      theaterId: testTheater.theaterId,
      hallId: testHall.hallId,
      startTime: new Date('2025-12-01T19:30:00'),
      price: 12.5,
    });

    const screeningWithMovie = await ScreeningModel.findByPk(
      screening.screeningId,
      {
        include: [{ model: MovieModel, as: 'movie' }],
      }
    );

    expect(screeningWithMovie).toBeDefined();
    expect(screeningWithMovie!.movie).toBeDefined();
    expect(screeningWithMovie!.movie.movieId).toBe(testMovie.movieId);
    expect(screeningWithMovie!.movie.title).toBe('Test Movie');
  });

  it('should load screening with theater association', async () => {
    const screening = await ScreeningModel.create({
      movieId: testMovie.movieId,
      theaterId: testTheater.theaterId,
      hallId: testHall.hallId,
      startTime: new Date('2025-12-01T19:30:00'),
      price: 12.5,
    });

    const screeningWithTheater = await ScreeningModel.findByPk(
      screening.screeningId,
      {
        include: [{ model: MovieTheaterModel, as: 'theater' }],
      }
    );

    expect(screeningWithTheater).toBeDefined();
    expect(screeningWithTheater!.theater).toBeDefined();
    expect(screeningWithTheater!.theater.theaterId).toBe(testTheater.theaterId);
    expect(screeningWithTheater!.theater.name).toBe('Test Cinema');
  });

  it('should load screening with hall association', async () => {
    const screening = await ScreeningModel.create({
      movieId: testMovie.movieId,
      theaterId: testTheater.theaterId,
      hallId: testHall.hallId,
      startTime: new Date('2025-12-01T19:30:00'),
      price: 12.5,
    });

    const screeningWithHall = await ScreeningModel.findByPk(
      screening.screeningId,
      {
        include: [{ model: MovieHallModel, as: 'hall' }],
      }
    );

    expect(screeningWithHall).toBeDefined();
    expect(screeningWithHall!.hall).toBeDefined();
    expect(screeningWithHall!.hall.hallId).toBe(testHall.hallId);
    expect(screeningWithHall!.hall.quality).toBe('2D');
  });

  it('should load screening with all associations', async () => {
    const screening = await ScreeningModel.create({
      movieId: testMovie.movieId,
      theaterId: testTheater.theaterId,
      hallId: testHall.hallId,
      startTime: new Date('2025-12-01T19:30:00'),
      price: 12.5,
    });

    const fullScreening = await ScreeningModel.findByPk(screening.screeningId, {
      include: [
        { model: MovieModel, as: 'movie' },
        { model: MovieTheaterModel, as: 'theater' },
        { model: MovieHallModel, as: 'hall' },
      ],
    });

    expect(fullScreening).toBeDefined();
    expect(fullScreening!.movie).toBeDefined();
    expect(fullScreening!.theater).toBeDefined();
    expect(fullScreening!.hall).toBeDefined();
  });

  it('should find all screenings for a specific movie', async () => {
    const movie2 = await MovieModel.create({
      title: 'Another Movie',
      description: 'Another test movie',
      ageRating: 'PG',
      genre: 'Comedy',
      releaseDate: new Date('2024-06-01'),
      director: 'Another Director',
      durationMinutes: 90,
    });

    // Create screenings for first movie
    await ScreeningModel.create({
      movieId: testMovie.movieId,
      theaterId: testTheater.theaterId,
      hallId: testHall.hallId,
      startTime: new Date('2025-12-01T19:30:00'),
      price: 12.5,
    });

    await ScreeningModel.create({
      movieId: testMovie.movieId,
      theaterId: testTheater.theaterId,
      hallId: testHall.hallId,
      startTime: new Date('2025-12-01T21:30:00'),
      price: 12.5,
    });

    // Create screening for second movie
    await ScreeningModel.create({
      movieId: movie2.movieId,
      theaterId: testTheater.theaterId,
      hallId: testHall.hallId,
      startTime: new Date('2025-12-01T18:00:00'),
      price: 10.0,
    });

    const movieScreenings = await ScreeningModel.findAll({
      where: { movieId: testMovie.movieId },
    });

    expect(movieScreenings).toHaveLength(2);
    expect(movieScreenings.every((s) => s.movieId === testMovie.movieId)).toBe(
      true
    );
  });

  it('should find all screenings at a specific theater', async () => {
    const theater2 = await MovieTheaterModel.create({
      theaterId: 'theater-2',
      name: 'Another Cinema',
      address: '456 Test Avenue',
      postalCode: '67890',
      city: 'OtherCity',
      phone: '0987654321',
      email: 'other@theater.com',
    });

    const hall2 = await MovieHallModel.create({
      theaterId: theater2.theaterId,
      hallId: 'hall-1',
      seatsLayout: [['A1', 'A2']],
      quality: '3D',
    });

    // Screenings at first theater
    await ScreeningModel.create({
      movieId: testMovie.movieId,
      theaterId: testTheater.theaterId,
      hallId: testHall.hallId,
      startTime: new Date('2025-12-01T19:30:00'),
      price: 12.5,
    });

    await ScreeningModel.create({
      movieId: testMovie.movieId,
      theaterId: testTheater.theaterId,
      hallId: testHall.hallId,
      startTime: new Date('2025-12-01T21:30:00'),
      price: 12.5,
    });

    // Screening at second theater
    await ScreeningModel.create({
      movieId: testMovie.movieId,
      theaterId: theater2.theaterId,
      hallId: hall2.hallId,
      startTime: new Date('2025-12-01T20:00:00'),
      price: 15.0,
    });

    const theaterScreenings = await ScreeningModel.findAll({
      where: { theaterId: testTheater.theaterId },
    });

    expect(theaterScreenings).toHaveLength(2);
    expect(
      theaterScreenings.every((s) => s.theaterId === testTheater.theaterId)
    ).toBe(true);
  });

  it('should find screenings by price range', async () => {
    await ScreeningModel.create({
      movieId: testMovie.movieId,
      theaterId: testTheater.theaterId,
      hallId: testHall.hallId,
      startTime: new Date('2025-12-01T14:00:00'),
      price: 8.0,
    });

    await ScreeningModel.create({
      movieId: testMovie.movieId,
      theaterId: testTheater.theaterId,
      hallId: testHall.hallId,
      startTime: new Date('2025-12-01T19:30:00'),
      price: 12.5,
    });

    await ScreeningModel.create({
      movieId: testMovie.movieId,
      theaterId: testTheater.theaterId,
      hallId: testHall.hallId,
      startTime: new Date('2025-12-01T21:00:00'),
      price: 18.0,
    });

    const affordableScreenings = await ScreeningModel.findAll({
      where: {
        price: { [Op.lte]: 10.0 }, // ✅ use Op here
      },
    });

    expect(affordableScreenings).toHaveLength(1);
    expect(Number(affordableScreenings[0].price)).toBe(8.0);
  });

  it('should update screening information', async () => {
    const screening = await ScreeningModel.create({
      movieId: testMovie.movieId,
      theaterId: testTheater.theaterId,
      hallId: testHall.hallId,
      startTime: new Date('2025-12-01T19:30:00'),
      price: 12.5,
    });

    await screening.update({
      price: 15.0,
      startTime: new Date('2025-12-01T20:00:00'),
    });

    expect(Number(screening.price)).toBe(15.0);
    expect(screening.startTime.toISOString()).toBe(
      new Date('2025-12-01T20:00:00').toISOString()
    );

    // Verify in database
    const updated = await ScreeningModel.findByPk(screening.screeningId);
    expect(Number(updated!.price)).toBe(15.0);
  });

  it('should handle timestamps correctly', async () => {
    const beforeCreate = new Date();

    const screening = await ScreeningModel.create({
      movieId: testMovie.movieId,
      theaterId: testTheater.theaterId,
      hallId: testHall.hallId,
      startTime: new Date('2025-12-01T19:30:00'),
      price: 12.5,
    });

    const afterCreate = new Date();

    expect(screening.createdAt.getTime()).toBeGreaterThanOrEqual(
      beforeCreate.getTime()
    );
    expect(screening.createdAt.getTime()).toBeLessThanOrEqual(
      afterCreate.getTime()
    );
    expect(screening.updatedAt.getTime()).toBeGreaterThanOrEqual(
      beforeCreate.getTime()
    );
    expect(screening.updatedAt.getTime()).toBeLessThanOrEqual(
      afterCreate.getTime()
    );
  });

  it('should allow multiple screenings of the same movie', async () => {
    const screening1 = await ScreeningModel.create({
      movieId: testMovie.movieId,
      theaterId: testTheater.theaterId,
      hallId: testHall.hallId,
      startTime: new Date('2025-12-01T14:00:00'),
      price: 8.0,
    });

    const screening2 = await ScreeningModel.create({
      movieId: testMovie.movieId,
      theaterId: testTheater.theaterId,
      hallId: testHall.hallId,
      startTime: new Date('2025-12-01T19:30:00'),
      price: 12.5,
    });

    const screening3 = await ScreeningModel.create({
      movieId: testMovie.movieId,
      theaterId: testTheater.theaterId,
      hallId: testHall.hallId,
      startTime: new Date('2025-12-01T22:00:00'),
      price: 12.5,
    });

    expect(screening1.screeningId).not.toBe(screening2.screeningId);
    expect(screening2.screeningId).not.toBe(screening3.screeningId);

    const allScreenings = await ScreeningModel.findAll({
      where: { movieId: testMovie.movieId },
    });

    expect(allScreenings).toHaveLength(3);
  });

  it('should support screenings in different halls at same time', async () => {
    const hall2 = await MovieHallModel.create({
      theaterId: testTheater.theaterId,
      hallId: 'hall-2',
      seatsLayout: [['C1', 'C2']],
      quality: 'IMAX',
    });

    const startTime = new Date('2025-12-01T19:30:00');

    const screening1 = await ScreeningModel.create({
      movieId: testMovie.movieId,
      theaterId: testTheater.theaterId,
      hallId: testHall.hallId,
      startTime,
      price: 12.5,
    });

    const screening2 = await ScreeningModel.create({
      movieId: testMovie.movieId,
      theaterId: testTheater.theaterId,
      hallId: hall2.hallId,
      startTime,
      price: 15.0,
    });

    expect(screening1.hallId).toBe('hall-1');
    expect(screening2.hallId).toBe('hall-2');
    expect(screening1.startTime.toISOString()).toBe(
      screening2.startTime.toISOString()
    );
  });

  it('should handle various pricing scenarios', async () => {
    // Free screening
    const free = await ScreeningModel.create({
      movieId: testMovie.movieId,
      theaterId: testTheater.theaterId,
      hallId: testHall.hallId,
      startTime: new Date('2025-12-01T10:00:00'),
      price: 0.0,
    });
    expect(Number(free.price)).toBe(0);

    // Matinee pricing
    const matinee = await ScreeningModel.create({
      movieId: testMovie.movieId,
      theaterId: testTheater.theaterId,
      hallId: testHall.hallId,
      startTime: new Date('2025-12-01T14:00:00'),
      price: 8.5,
    });
    expect(Number(matinee.price)).toBe(8.5);

    // Standard pricing
    const standard = await ScreeningModel.create({
      movieId: testMovie.movieId,
      theaterId: testTheater.theaterId,
      hallId: testHall.hallId,
      startTime: new Date('2025-12-01T19:30:00'),
      price: 12.5,
    });
    expect(Number(standard.price)).toBe(12.5);

    // Premium pricing
    const premium = await ScreeningModel.create({
      movieId: testMovie.movieId,
      theaterId: testTheater.theaterId,
      hallId: testHall.hallId,
      startTime: new Date('2025-12-01T21:00:00'),
      price: 25.99,
    });
    expect(Number(premium.price)).toBe(25.99);
  });
});
