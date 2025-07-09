import { Sequelize } from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import { ScreeningModel } from '../../models/screening.model.js';
import { MovieModel } from '../../models/movie.model.js';
import { MovieTheaterModel } from '../../models/movie-theater.model.js';
import { MovieHallModel } from '../../models/movie-hall.model.js';
import { ValidationError } from 'sequelize';

describe('ScreeningModel', () => {
  let sequelize: Sequelize;

  const movieId = uuidv4();
  const theaterId = 'theater123';
  const hallId = 'hallA';

  beforeAll(async () => {
    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: ':memory:',
      logging: false,
      models: [ScreeningModel, MovieModel, MovieTheaterModel, MovieHallModel],
    });

    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    await ScreeningModel.destroy({ where: {} });
    await MovieHallModel.destroy({ where: {} });
    await MovieTheaterModel.destroy({ where: {} });
    await MovieModel.destroy({ where: {} });

    await MovieModel.create({
      movieId,
      title: 'Inception',
      description: 'A mind-bending thriller',
      ageRating: 'PG-13',
      genre: 'Sci-Fi',
      releaseDate: new Date('2010-07-16'),
      director: 'Christopher Nolan',
      durationMinutes: 150,
    });

    await MovieTheaterModel.create({
      theaterId,
      address: '123 Main Street',
      postalCode: '75000',
      city: 'Paris',
      phone: '0102030405',
      email: 'theater@example.com',
    });

    await MovieHallModel.create({
      theaterId,
      hallId,
      quality: 'IMAX', // ⬅️ Include quality here
      seatsLayout: [
        [1, 2, 3, 4, 5],
        [1, 2, 'A', 'B'],
        ['VIP', 2, 3],
      ],
    });
  });

  it('should create a screening with valid attributes and associate with Movie, Theater, and Hall', async () => {
    const screeningData = {
      screeningId: uuidv4(),
      movieId,
      theaterId,
      hallId,
      startTime: new Date('2025-01-01T18:00:00Z'),
      price: 12.5,
    };

    const screening = await ScreeningModel.create(screeningData);

    expect(screening).toBeDefined();
    expect(screening.movieId).toBe(movieId);
    expect(screening.theaterId).toBe(theaterId);
    expect(screening.hallId).toBe(hallId);
    expect(Number(screening.price)).toBe(12.5);

    const foundScreening = await ScreeningModel.findByPk(
      screening.screeningId,
      {
        include: [MovieModel, MovieTheaterModel, MovieHallModel],
      }
    );

    expect(foundScreening).toBeDefined();
    expect(foundScreening!.movie).toBeDefined();
    expect(foundScreening!.movie.title).toBe('Inception');
    expect(foundScreening!.movie.durationMinutes).toBe(150);
    expect(foundScreening!.theater).toBeDefined();
    expect(foundScreening!.theater.theaterId).toBe(theaterId);
    expect(foundScreening!.hall).toBeDefined();
    expect(foundScreening!.hall.hallId).toBe(hallId);
    expect(foundScreening!.hall.quality).toBe('IMAX');
    expect(Number(foundScreening!.price)).toBe(12.5);
  });

  it('should fail to create a screening with a negative price', async () => {
    const screeningData = {
      screeningId: uuidv4(),
      movieId,
      theaterId,
      hallId,
      startTime: new Date('2025-01-01T22:00:00Z'),
      price: -5.0,
    };

    await expect(ScreeningModel.create(screeningData)).rejects.toThrow(
      ValidationError
    );
  });
});
