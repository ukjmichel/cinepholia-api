// --- Mocks for dependencies ---
// These lines must come first to mock dependencies BEFORE they're imported elsewhere

// Mock the sequelize transaction so it doesn't actually hit the database
jest.mock('../../config/db.js', () => ({
  sequelize: { transaction: jest.fn((fn) => fn()) },
}));

// Mock MovieModel methods (so we don't use the real DB or model implementation)
jest.mock('../../models/movie.model.js', () => ({
  MovieModel: {
    findByPk: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
  },
}));

// Mock MovieImageService so file upload/storage isn't triggered for tests
jest.mock('../../services/movie-image.service.js', () => ({
  MovieImageService: {
    saveMovieImage: jest.fn(),
  },
}));

// --- Imports (after mocks above) ---
import { MovieService } from '../../services/movie.service.js';
import { MovieModel } from '../../models/movie.model.js';
import { NotFoundError } from '../../errors/not-found-error.js';
import { MovieImageService } from '../../services/movie-image.service.js';
import { Op } from 'sequelize';

// --- Test Data Setup ---
const mockMovie = {
  movieId: 'movie-1',
  title: 'Inception',
  description: 'Dreams within dreams',
  ageRating: 'PG-13',
  genre: 'Sci-Fi',
  releaseDate: new Date('2010-07-16'),
  director: 'Christopher Nolan',
  durationMinutes: 148,
  posterUrl: 'https://example.com/inception.jpg',
  recommended: true,
  update: jest.fn().mockResolvedValue(undefined), // Mock update method for updateMovie
  destroy: jest.fn().mockResolvedValue(undefined), // Mock destroy method for deleteMovie
  toJSON() {
    return this;
  },
};

// --- Test Suite for MovieService ---
describe('MovieService', () => {
  // Clean all mocks before each test to avoid cross-test pollution
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- Test: getMovieById ---
  describe('getMovieById', () => {
    it('returns movie if found', async () => {
      (MovieModel.findByPk as jest.Mock).mockResolvedValue(mockMovie);
      const result = await MovieService.getMovieById('movie-1');
      expect(result).toBe(mockMovie);
    });

    it('throws NotFoundError if not found', async () => {
      (MovieModel.findByPk as jest.Mock).mockResolvedValue(null);
      await expect(MovieService.getMovieById('not-exist')).rejects.toThrow(
        NotFoundError
      );
    });
  });

  // --- Test: createMovie ---
  describe('createMovie', () => {
    it('creates and returns a movie without file', async () => {
      // The input payload for the service (no posterUrl set)
      const payload = {
        movieId: 'movie-1',
        title: 'Inception',
        description: 'Dreams within dreams',
        ageRating: 'PG-13',
        genre: 'Sci-Fi',
        releaseDate: new Date('2010-07-16'),
        director: 'Christopher Nolan',
        durationMinutes: 148,
        recommended: true,
        // posterUrl omitted intentionally
      };
      // Mock DB return value to match what the service should produce (posterUrl: undefined)
      (MovieModel.create as jest.Mock).mockResolvedValue({
        ...payload,
        posterUrl: undefined,
      });

      const result = await MovieService.createMovie(payload);
      expect(MovieModel.create).toHaveBeenCalledWith(
        { ...payload, posterUrl: undefined },
        expect.any(Object)
      );
      expect(result).toEqual({ ...payload, posterUrl: undefined });
    });

    it('creates and returns a movie with file', async () => {
      const mockFile = { originalname: 'file.png', size: 1000 } as any;
      // Mock file upload result
      (MovieImageService.saveMovieImage as jest.Mock).mockResolvedValue(
        'url-from-service'
      );
      // Mock the DB to return a movie with the given posterUrl
      (MovieModel.create as jest.Mock).mockResolvedValue({
        ...mockMovie,
        posterUrl: 'url-from-service',
      });

      const result = await MovieService.createMovie(mockMovie, mockFile);
      expect(MovieImageService.saveMovieImage).toHaveBeenCalledWith(mockFile);
      expect(MovieModel.create).toHaveBeenCalledWith(
        { ...mockMovie, posterUrl: 'url-from-service' },
        expect.any(Object)
      );
      expect(result.posterUrl).toBe('url-from-service');
    });
  });

  // --- Test: updateMovie ---
  describe('updateMovie', () => {
    it('updates and returns the movie', async () => {
      const updatedMovie = {
        ...mockMovie,
        title: 'New Title',
        update: jest.fn().mockResolvedValue(undefined),
      };
      (MovieModel.findByPk as jest.Mock).mockResolvedValue(updatedMovie);

      await MovieService.updateMovie('movie-1', { title: 'New Title' });
      expect(updatedMovie.update).toHaveBeenCalledWith(
        { title: 'New Title', posterUrl: undefined },
        expect.any(Object)
      );
    });

    it('updates posterUrl if file provided', async () => {
      const updatedMovie = {
        ...mockMovie,
        update: jest.fn().mockResolvedValue(undefined),
      };
      (MovieModel.findByPk as jest.Mock).mockResolvedValue(updatedMovie);
      const mockFile = { originalname: 'poster.png', size: 1000 } as any;
      (MovieImageService.saveMovieImage as jest.Mock).mockResolvedValue(
        'poster.png'
      );

      await MovieService.updateMovie('movie-1', {}, mockFile);
      expect(MovieImageService.saveMovieImage).toHaveBeenCalledWith(mockFile);
      expect(updatedMovie.update).toHaveBeenCalledWith(
        { posterUrl: 'poster.png' },
        expect.any(Object)
      );
    });
  });

  // --- Test: deleteMovie ---
  describe('deleteMovie', () => {
    it('deletes the movie if exists', async () => {
      const mockDestroy = jest.fn().mockResolvedValue(undefined);
      (MovieModel.findByPk as jest.Mock).mockResolvedValue({
        ...mockMovie,
        destroy: mockDestroy,
      });

      await expect(
        MovieService.deleteMovie('movie-1')
      ).resolves.toBeUndefined();
      expect(mockDestroy).toHaveBeenCalledWith(expect.any(Object));
    });

    it('throws NotFoundError if not found', async () => {
      (MovieModel.findByPk as jest.Mock).mockResolvedValue(null);
      await expect(MovieService.deleteMovie('not-exist')).rejects.toThrow(
        NotFoundError
      );
    });
  });

  // --- Test: getAllMovies ---
  describe('getAllMovies', () => {
    it('returns all movies', async () => {
      (MovieModel.findAll as jest.Mock).mockResolvedValue([mockMovie]);
      const result = await MovieService.getAllMovies();
      expect(result).toEqual([mockMovie]);
    });
  });

  // --- Test: searchMovie ---
  describe('searchMovie', () => {
    it('returns matched movies', async () => {
      (MovieModel.findAll as jest.Mock).mockResolvedValue([mockMovie]);
      const result = await MovieService.searchMovie('Inception');

      expect(MovieModel.findAll).toHaveBeenCalledWith({
        where: {
          [Op.or]: [
            { title: { [Op.like]: '%Inception%' } },
            { director: { [Op.like]: '%Inception%' } },
            { genre: { [Op.like]: '%Inception%' } },
          ],
        },
      });
      expect(result).toEqual([mockMovie]);
    });
  });
});
