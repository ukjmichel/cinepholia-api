import * as MovieController from '../../controllers/movie.controller.js';
import { movieService } from '../../services/movie.service.js';
import { bookingCommentService } from '../../services/booking-comment.service.js';
import { MovieModel } from '../../models/movie.model.js';

jest.mock('../../services/movie.service.js');
jest.mock('../../services/booking-comment.service.js');

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
  // ✅ Ensure enrichment always has a rating
  (
    bookingCommentService.getAverageRatingForMovie as jest.Mock
  ).mockResolvedValue(4.5);
});

describe('MovieController', () => {
  describe('getMovieById', () => {
    it('returns enriched movie with rating', async () => {
      (movieService.getMovieById as jest.Mock).mockResolvedValue(mockMovie);
      const req = { params: { movieId: 'movie-1' } } as any;
      const res = mockRes();

      await MovieController.getMovieById(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        message: 'Movie fetched successfully',
        data: { ...mockMovie, rating: 4.5 },
      });
    });

    it('calls next on error', async () => {
      (movieService.getMovieById as jest.Mock).mockRejectedValue(
        new Error('DB fail')
      );
      const req = { params: { movieId: 'movie-1' } } as any;
      const res = mockRes();

      await MovieController.getMovieById(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('createMovie', () => {
    it('creates movie and returns 201 with rating', async () => {
      (movieService.createMovie as jest.Mock).mockResolvedValue(mockMovie);
      const req = { body: mockMovie } as any;
      const res = mockRes();

      await MovieController.createMovie(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Movie created successfully',
        data: { ...mockMovie, rating: 4.5 },
      });
    });

    it('calls next on error', async () => {
      (movieService.createMovie as jest.Mock).mockRejectedValue(
        new Error('fail')
      );
      const req = { body: mockMovie } as any;
      const res = mockRes();

      await MovieController.createMovie(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('updateMovie', () => {
    it('updates movie and returns enriched data', async () => {
      const updated = { ...mockMovie, title: 'Updated' };
      (movieService.updateMovie as jest.Mock).mockResolvedValue(updated);
      const req = {
        params: { movieId: 'movie-1' },
        body: { title: 'Updated' },
      } as any;
      const res = mockRes();

      await MovieController.updateMovie(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        message: 'Movie updated successfully',
        data: { ...updated, rating: 4.5 },
      });
    });

    it('calls next on error', async () => {
      (movieService.updateMovie as jest.Mock).mockRejectedValue(
        new Error('fail')
      );
      const req = { params: { movieId: 'movie-1' }, body: {} } as any;
      const res = mockRes();

      await MovieController.updateMovie(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

 describe('deleteMovie', () => {
   it('deletes movie and returns 200 with message', async () => {
     (movieService.deleteMovie as jest.Mock).mockResolvedValue(undefined);
     const req = { params: { movieId: 'movie-1' } } as any;
     const res = mockRes();

     await MovieController.deleteMovie(req, res, next);

     expect(res.status).toHaveBeenCalledWith(200);
     expect(res.json).toHaveBeenCalledWith({
       message: 'Movie deleted successfully',
       data: null,
     });
   });

   it('calls next on error', async () => {
     (movieService.deleteMovie as jest.Mock).mockRejectedValue(
       new Error('fail')
     );
     const req = { params: { movieId: 'movie-1' } } as any;
     const res = mockRes();

     await MovieController.deleteMovie(req, res, next);
     expect(next).toHaveBeenCalledWith(expect.any(Error));
   });
 });

  describe('getAllMovies', () => {
    it('returns all movies enriched with ratings', async () => {
      (movieService.getAllMovies as jest.Mock).mockResolvedValue([mockMovie]);
      const req = {} as any;
      const res = mockRes();

      await MovieController.getAllMovies(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        message: 'Movies fetched successfully',
        data: [{ ...mockMovie, rating: 4.5 }],
      });
    });

    it('calls next on error', async () => {
      (movieService.getAllMovies as jest.Mock).mockRejectedValue(
        new Error('fail')
      );
      const req = {} as any;
      const res = mockRes();

      await MovieController.getAllMovies(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('searchMovie', () => {
    it('returns matched movies', async () => {
      (movieService.searchMovie as jest.Mock).mockResolvedValue([mockMovie]);
      const req = { query: { q: 'Inception' } } as any;
      const res = mockRes();

      await MovieController.searchMovie(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        message: 'Movies search completed',
        data: [{ ...mockMovie, rating: 4.5 }],
      });
    });

    it('returns empty array when no movies match', async () => {
      (movieService.searchMovie as jest.Mock).mockResolvedValue([]);
      const req = { query: {} } as any;
      const res = mockRes();

      await MovieController.searchMovie(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        message: 'Movies search completed',
        data: [],
      });
    });

    it('calls next on error', async () => {
      (movieService.searchMovie as jest.Mock).mockRejectedValue(
        new Error('fail')
      );
      const req = { query: {} } as any;
      const res = mockRes();

      await MovieController.searchMovie(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getUpcomingMovies', () => {
    it('returns upcoming movies enriched with ratings', async () => {
      (movieService.getUpcomingMovies as jest.Mock).mockResolvedValue([
        mockMovie,
      ]);
      const req = {} as any;
      const res = mockRes();

      await MovieController.getUpcomingMovies(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        message: 'Upcoming movies fetched successfully',
        data: [{ ...mockMovie, rating: 4.5 }],
      });
    });

    it('calls next on error', async () => {
      (movieService.getUpcomingMovies as jest.Mock).mockRejectedValue(
        new Error('fail')
      );
      const req = {} as any;
      const res = mockRes();

      await MovieController.getUpcomingMovies(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getMoviesByTheater', () => {
    it('returns movies by theater enriched with ratings', async () => {
      (movieService.getMoviesByTheater as jest.Mock).mockResolvedValue([
        mockMovie,
      ]);
      const req = { params: { theaterId: 't-1' } } as any;
      const res = mockRes();

      await MovieController.getMoviesByTheater(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        message: 'Movies by theater fetched successfully',
        data: [{ ...mockMovie, rating: 4.5 }],
      });
    });

    it('calls next on error', async () => {
      (movieService.getMoviesByTheater as jest.Mock).mockRejectedValue(
        new Error('fail')
      );
      const req = { params: { theaterId: 't-1' } } as any;
      const res = mockRes();

      await MovieController.getMoviesByTheater(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
