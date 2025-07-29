// --- Mocks for dependencies ---
jest.mock('../../config/db.js', () => ({
  sequelize: { transaction: jest.fn((fn) => fn()) },
}));

jest.mock('../../models/movie.model.js', () => ({
  MovieModel: {
    findByPk: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(), 
  },
}));

jest.mock('../../services/movie-image.service.js', () => ({
  movieImageService: {
    saveMovieImage: jest.fn(),
    deleteMovieImage: jest.fn(), 
  },
}));

// --- Imports (after mocks above) ---
import { movieService } from '../../services/movie.service.js';
import { MovieModel } from '../../models/movie.model.js';
import { NotFoundError } from '../../errors/not-found-error.js';
import { movieImageService } from '../../services/movie-image.service.js';
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
  update: jest.fn().mockResolvedValue(undefined),
  destroy: jest.fn().mockResolvedValue(undefined),
  toJSON() {
    return this;
  },
};

// --- Test Suite for movieService ---
describe('movieService', () => {
  // Clean all mocks before each test to avoid cross-test pollution
  beforeEach(() => {
    jest.clearAllMocks();
    // Add default return for findOne and deleteMovieImage (for failing tests)
    (MovieModel.findOne as jest.Mock).mockResolvedValue(null);
    (movieImageService.deleteMovieImage as jest.Mock).mockResolvedValue(
      undefined
    );
  });

  // --- Test: getMovieById ---
  describe('getMovieById', () => {
    it('returns movie if found', async () => {
      (MovieModel.findByPk as jest.Mock).mockResolvedValue(mockMovie);
      const result = await movieService.getMovieById('movie-1');
      expect(result).toBe(mockMovie);
    });

    it('throws NotFoundError if not found', async () => {
      (MovieModel.findByPk as jest.Mock).mockResolvedValue(null);
      await expect(movieService.getMovieById('not-exist')).rejects.toThrow(
        NotFoundError
      );
    });
  });

  // --- Test: createMovie ---
  describe('createMovie', () => {
    it('creates and returns a movie without file', async () => {
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
      };
      // Make sure findOne returns null (no duplicate)
      (MovieModel.findOne as jest.Mock).mockResolvedValue(null);
      (MovieModel.create as jest.Mock).mockResolvedValue({
        ...payload,
        posterUrl: undefined,
      });

      const result = await movieService.createMovie(payload);
      expect(MovieModel.create).toHaveBeenCalledWith(
        { ...payload, posterUrl: undefined },
        expect.any(Object)
      );
      expect(result).toEqual({ ...payload, posterUrl: undefined });
    });

    it('creates and returns a movie with file', async () => {
      const mockFile = { originalname: 'file.png', size: 1000 } as any;
      (MovieModel.findOne as jest.Mock).mockResolvedValue(null); // no duplicate
      (movieImageService.saveMovieImage as jest.Mock).mockResolvedValue(
        'url-from-service'
      );
      (MovieModel.create as jest.Mock).mockResolvedValue({
        ...mockMovie,
        posterUrl: 'url-from-service',
      });

      const result = await movieService.createMovie(mockMovie, mockFile);
      expect(movieImageService.saveMovieImage).toHaveBeenCalledWith(mockFile);
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

      await movieService.updateMovie('movie-1', { title: 'New Title' });
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
      (movieImageService.saveMovieImage as jest.Mock).mockResolvedValue(
        'poster.png'
      );

      await movieService.updateMovie('movie-1', {}, mockFile);
      expect(movieImageService.saveMovieImage).toHaveBeenCalledWith(mockFile);
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
        posterUrl: 'someUrl',
      });
      // deleteMovieImage should be mocked to resolve
      (movieImageService.deleteMovieImage as jest.Mock).mockResolvedValue(
        undefined
      );

      await expect(
        movieService.deleteMovie('movie-1')
      ).resolves.toBeUndefined();
      expect(mockDestroy).toHaveBeenCalledWith(expect.any(Object));
      expect(movieImageService.deleteMovieImage).toHaveBeenCalledWith(
        'someUrl'
      );
    });

    it('throws NotFoundError if not found', async () => {
      (MovieModel.findByPk as jest.Mock).mockResolvedValue(null);
      await expect(movieService.deleteMovie('not-exist')).rejects.toThrow(
        NotFoundError
      );
    });
  });

  // --- Test: getAllMovies ---
  describe('getAllMovies', () => {
    it('returns all movies', async () => {
      (MovieModel.findAll as jest.Mock).mockResolvedValue([mockMovie]);
      const result = await movieService.getAllMovies();
      expect(result).toEqual([mockMovie]);
    });
  });

  // --- Test: searchMovie ---
  describe('searchMovie', () => {
    it('returns matched movies', async () => {
      (MovieModel.findAll as jest.Mock).mockResolvedValue([mockMovie]);
      const result = await movieService.searchMovie('Inception');

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
