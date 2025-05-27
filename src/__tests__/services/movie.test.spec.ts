import { MovieService } from '../../services/movie.service.js';
import { MovieModel } from '../../models/movie.model.js';
import { NotFoundError } from '../../errors/not-found-error.js';
import { Op } from 'sequelize';

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
  update: jest.fn().mockResolvedValue(this),
  destroy: jest.fn().mockResolvedValue(undefined),
  toJSON() {
    return this;
  },
};

describe('MovieService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (MovieModel.findByPk as jest.Mock) = jest.fn();
    (MovieModel.create as jest.Mock) = jest.fn();
    (MovieModel.findAll as jest.Mock) = jest.fn();
  });

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

  describe('createMovie', () => {
    it('creates and returns a movie', async () => {
      (MovieModel.create as jest.Mock).mockResolvedValue(mockMovie);

      const result = await MovieService.createMovie(mockMovie);
      expect(MovieModel.create).toHaveBeenCalledWith(
        mockMovie,
        expect.any(Object)
      );
      expect(result).toBe(mockMovie);
    });
  });

  describe('updateMovie', () => {
    it('updates and returns the movie', async () => {
      const mockUpdate = jest.fn(function (updateObj) {
        Object.assign(this, updateObj);
        return this;
      });
      (MovieModel.findByPk as jest.Mock).mockResolvedValue({
        ...mockMovie,
        update: mockUpdate,
      });

      const result = await MovieService.updateMovie('movie-1', {
        title: 'New Title',
      });
      expect(mockUpdate).toHaveBeenCalledWith(
        { title: 'New Title' },
        expect.any(Object)
      );
      expect(result.title).toBe('New Title');
    });
  });

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

  describe('getAllMovies', () => {
    it('returns all movies', async () => {
      (MovieModel.findAll as jest.Mock).mockResolvedValue([mockMovie]);

      const result = await MovieService.getAllMovies();
      expect(result).toEqual([mockMovie]);
    });
  });

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
