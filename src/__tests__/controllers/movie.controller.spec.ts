import * as MovieController from '../../controllers/movie.controller.js';
import { MovieModel } from '../../models/movie.model.js';
import { MovieService } from '../../services/movie.service.js';

const mockRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const next = jest.fn();

const mockMovie: Partial<MovieModel> = {
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
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('MovieController', () => {
  describe('getMovieById', () => {
    it('returns { message, data } with the movie', async () => {
      jest
        .spyOn(MovieService, 'getMovieById')
        .mockResolvedValue(mockMovie as MovieModel);

      const req = { params: { movieId: 'movie-1' } } as any;
      const res = mockRes();

      await MovieController.getMovieById(req, res, next);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Movie fetched successfully',
        data: mockMovie,
      });
    });
  });

  describe('createMovie', () => {
    it('returns { message, data } with the created movie and 201', async () => {
      jest
        .spyOn(MovieService, 'createMovie')
        .mockResolvedValue(mockMovie as MovieModel);

      const req = { body: mockMovie } as any;
      const res = mockRes();

      await MovieController.createMovie(req, res, next);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Movie created successfully',
        data: mockMovie,
      });
    });
  });

  describe('updateMovie', () => {
    it('returns { message, data } with the updated movie', async () => {
      const updated = { ...mockMovie, title: 'Updated Title' };
      jest
        .spyOn(MovieService, 'updateMovie')
        .mockResolvedValue(updated as MovieModel);

      const req = {
        params: { movieId: 'movie-1' },
        body: { title: 'Updated Title' },
      } as any;
      const res = mockRes();

      await MovieController.updateMovie(req, res, next);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Movie updated successfully',
        data: updated,
      });
    });
  });

  describe('deleteMovie', () => {
    it('returns { message, data } with null after delete', async () => {
      jest.spyOn(MovieService, 'deleteMovie').mockResolvedValue(undefined);

      const req = { params: { movieId: 'movie-1' } } as any;
      const res = mockRes();

      await MovieController.deleteMovie(req, res, next);
      // Accept either 204 or default (200) with json (per your last code suggestion)
      // Here, expect status 204 with json:
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Movie deleted successfully',
        data: null,
      });
    });
  });

  describe('getAllMovies', () => {
    it('returns { message, data } with all movies', async () => {
      jest
        .spyOn(MovieService, 'getAllMovies')
        .mockResolvedValue([mockMovie as MovieModel]);

      const req = {} as any;
      const res = mockRes();

      await MovieController.getAllMovies(req, res, next);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Movies fetched successfully',
        data: [mockMovie],
      });
    });
  });

  describe('searchMovie', () => {
    it('returns { message, data } with matched movies', async () => {
      jest.spyOn(MovieService, 'searchMovie').mockResolvedValue([
        /*...*/
      ]);
      const req = { query: { q: 'Inception' } } as any;
      const res = mockRes();
      const next = jest.fn();

      await MovieController.searchMovie(req, res, next);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Movies search completed',
        data: expect.any(Array),
      });
    });

    it('calls next with BadRequestError if query is missing', async () => {
      const req = { query: {} } as any;
      const res = mockRes();
      const next = jest.fn();

      await MovieController.searchMovie(req, res, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'BadRequestError',
          message: 'Missing or invalid search query',
          status: 400,
        })
      );
    });

    it('calls next with BadRequestError if query is an empty string', async () => {
      const req = { query: { q: '' } } as any;
      const res = mockRes();
      const next = jest.fn();

      await MovieController.searchMovie(req, res, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'BadRequestError',
          message: 'Missing or invalid search query',
          status: 400,
        })
      );
    });
  });
});
