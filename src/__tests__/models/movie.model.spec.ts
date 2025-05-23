import { Sequelize } from 'sequelize-typescript';
import { MovieModel } from '../../models/movie.model.js'; // Adjust the import path as needed

let sequelize: Sequelize;

beforeAll(async () => {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false,
    models: [MovieModel],
  });

  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

describe('MovieModel', () => {
  it('should create a movie with valid attributes and recommended defaults to false', async () => {
    const movie = await MovieModel.create({
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

    expect(movie.movieId).toBeDefined();
    expect(movie.title).toBe('Inception');
    expect(movie.durationMinutes).toBe(148);
    expect(movie.recommended).toBe(false); // defaultValue test
  });

  it('should allow creating a movie with recommended set to true', async () => {
    const movie = await MovieModel.create({
      title: 'The Dark Knight',
      description: 'Gotham needs a hero.',
      ageRating: 'PG-13',
      genre: 'Action',
      releaseDate: new Date('2008-07-18'),
      director: 'Christopher Nolan',
      durationMinutes: 152,
      posterUrl: 'https://example.com/batman.jpg',
      recommended: true,
    });

    expect(movie.recommended).toBe(true);
  });

  it('should fail if title is empty', async () => {
    await expect(
      MovieModel.create({
        title: '',
        description: 'No title movie',
        ageRating: 'PG-13',
        genre: 'Sci-Fi',
        releaseDate: new Date('2010-07-16'),
        director: 'Christopher Nolan',
        durationMinutes: 100,
        recommended: false,
      })
    ).rejects.toThrow(/Title is required/);
  });

  it('should fail if duration is not integer', async () => {
    await expect(
      MovieModel.create({
        title: 'Test',
        description: 'desc',
        ageRating: 'PG-13',
        genre: 'Sci-Fi',
        releaseDate: new Date('2010-07-16'),
        director: 'Christopher Nolan',
        durationMinutes: '2h' as any,
        recommended: false,
      })
    ).rejects.toThrow(/Duration must be an integer value in minutes/);
  });

  it('should fail if releaseDate is in the future', async () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    await expect(
      MovieModel.create({
        title: 'Future Movie',
        description: 'desc',
        ageRating: 'PG-13',
        genre: 'Sci-Fi',
        releaseDate: futureDate,
        director: 'Christopher Nolan',
        durationMinutes: 100,
        recommended: false,
      })
    ).rejects.toThrow(/Release date cannot be in the future/);
  });

  it('should fail if ageRating is invalid', async () => {
    await expect(
      MovieModel.create({
        title: 'Bad Rating',
        description: 'desc',
        ageRating: 'XYZ',
        genre: 'Sci-Fi',
        releaseDate: new Date('2010-07-16'),
        director: 'Christopher Nolan',
        durationMinutes: 100,
        recommended: false,
      })
    ).rejects.toThrow(/Age rating must be a valid rating/);
  });

  it('should allow null posterUrl', async () => {
    const movie = await MovieModel.create({
      title: 'No Poster',
      description: 'desc',
      ageRating: 'PG-13',
      genre: 'Sci-Fi',
      releaseDate: new Date('2010-07-16'),
      director: 'Christopher Nolan',
      durationMinutes: 100,
      posterUrl: null as any,
      recommended: false,
    });
    expect(movie.posterUrl).toBeNull();
  });

  it('should fail for invalid posterUrl', async () => {
    await expect(
      MovieModel.create({
        title: 'Bad Poster',
        description: 'desc',
        ageRating: 'PG-13',
        genre: 'Sci-Fi',
        releaseDate: new Date('2010-07-16'),
        director: 'Christopher Nolan',
        durationMinutes: 100,
        posterUrl: 'not-a-url',
        recommended: false,
      })
    ).rejects.toThrow(/Poster URL must be a valid URL/);
  });
});
