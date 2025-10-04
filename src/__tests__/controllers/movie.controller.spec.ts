import { Request, Response, NextFunction } from 'express';
import { MovieController } from '../../controllers/movie.controller';
import movieService from '../../services/movie.service';
import { sequelize } from '../../config/db';
import { NotFoundError } from '../../errors/not-found-error';

// Mock dependencies
jest.mock('../../services/movie.service');
jest.mock('../../config/db');

describe('MovieController', () => {
  let controller: MovieController;
  let mockRequest: any;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockTransaction: any;

  const mockMovie = {
    movieId: 'movie-123',
    title: 'The Matrix',
    description: 'A computer hacker learns about the true nature of reality',
    ageRating: 'R',
    genre: 'Sci-Fi',
    releaseDate: new Date('1999-03-31'),
    director: 'The Wachowskis',
    durationMinutes: 136,
    recommended: true,
    posterUrl: 'https://example.com/poster.jpg',
  };

  beforeEach(() => {
    controller = new MovieController();

    mockRequest = {
      params: {},
      query: {},
      body: {},
      file: undefined,
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    mockTransaction = {
      commit: jest.fn(),
      rollback: jest.fn(),
    };

    (sequelize.transaction as jest.Mock) = jest
      .fn()
      .mockResolvedValue(mockTransaction);

    jest.clearAllMocks();
  });

  describe('createMovie', () => {
    it('should create movie with all fields', async () => {
      mockRequest.body = {
        title: 'The Matrix',
        description: 'A computer hacker learns about reality',
        ageRating: 'R',
        genre: 'Sci-Fi',
        releaseDate: '1999-03-31',
        director: 'The Wachowskis',
        durationMinutes: '136',
        recommended: 'true',
      };

      (movieService.create as jest.Mock).mockResolvedValue(mockMovie);

      await controller.createMovie(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieService.create).toHaveBeenCalledWith(
        {
          title: 'The Matrix',
          description: 'A computer hacker learns about reality',
          ageRating: 'R',
          genre: 'Sci-Fi',
          releaseDate: new Date('1999-03-31'),
          director: 'The Wachowskis',
          durationMinutes: 136,
          recommended: true,
        },
        undefined,
        { transaction: mockTransaction }
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Movie created successfully',
        data: { movie: mockMovie },
      });
    });

    it('should create movie with file upload', async () => {
      mockRequest.body = {
        title: 'The Matrix',
        description: 'Test description',
        ageRating: 'R',
        genre: 'Sci-Fi',
        releaseDate: '1999-03-31',
        director: 'The Wachowskis',
        durationMinutes: '136',
        recommended: 'false',
      };

      const mockFile = {
        filename: 'poster.jpg',
        path: '/uploads/poster.jpg',
      };
      mockRequest.file = mockFile;

      (movieService.create as jest.Mock).mockResolvedValue(mockMovie);

      await controller.createMovie(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieService.create).toHaveBeenCalledWith(
        expect.any(Object),
        mockFile,
        { transaction: mockTransaction }
      );
    });

    it('should handle recommended as boolean', async () => {
      mockRequest.body = {
        title: 'Test Movie',
        description: 'Test',
        ageRating: 'PG',
        genre: 'Drama',
        releaseDate: '2025-01-01',
        director: 'Test Director',
        durationMinutes: '120',
        recommended: true,
      };

      (movieService.create as jest.Mock).mockResolvedValue(mockMovie);

      await controller.createMovie(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          recommended: true,
        }),
        undefined,
        { transaction: mockTransaction }
      );
    });

    it('should rollback transaction on error', async () => {
      mockRequest.body = {
        title: 'Test Movie',
        description: 'Test',
        ageRating: 'PG',
        genre: 'Drama',
        releaseDate: '2025-01-01',
        director: 'Test Director',
        durationMinutes: '120',
        recommended: 'false',
      };

      const error = new Error('Database error');
      (movieService.create as jest.Mock).mockRejectedValue(error);

      await controller.createMovie(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockTransaction.commit).not.toHaveBeenCalled();
    });
  });

  describe('listMovies', () => {
    it('should list movies with pagination', async () => {
      mockRequest.query = { page: '2', pageSize: '10' };

      const mockResult = {
        items: [mockMovie],
        totalItems: 25,
        page: 2,
        limit: 10,
        totalPages: 3,
      };

      (movieService.list as jest.Mock).mockResolvedValue(mockResult);

      await controller.listMovies(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieService.list).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        filters: expect.any(Object),
        sortBy: undefined,
        sortDir: undefined,
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Movies found successfully',
        data: {
          movies: [mockMovie],
          total: 25,
          page: 2,
          pageSize: 10,
          totalPages: 3,
        },
      });
    });

    it('should list movies with filters', async () => {
      mockRequest.query = {
        title: 'Matrix',
        director: 'Wachowski',
        genre: 'Sci-Fi',
        ageRating: 'R',
        recommended: 'true',
        minDuration: '100',
        maxDuration: '200',
        releasedFrom: '1999-01-01',
        releasedTo: '1999-12-31',
      };

      const mockResult = {
        items: [mockMovie],
        totalItems: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      (movieService.list as jest.Mock).mockResolvedValue(mockResult);

      await controller.listMovies(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieService.list).toHaveBeenCalledWith({
        page: undefined,
        limit: undefined,
        filters: {
          title: 'Matrix',
          director: 'Wachowski',
          genre: 'Sci-Fi',
          ageRating: 'R',
          recommended: true,
          minDuration: 100,
          maxDuration: 200,
          releasedFrom: '1999-01-01',
          releasedTo: '1999-12-31',
        },
        sortBy: undefined,
        sortDir: undefined,
      });
    });

    it('should handle recommended filter as false', async () => {
      mockRequest.query = { recommended: 'false' };

      const mockResult = {
        items: [],
        totalItems: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };

      (movieService.list as jest.Mock).mockResolvedValue(mockResult);

      await controller.listMovies(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieService.list).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.objectContaining({
            recommended: false,
          }),
        })
      );
    });
  });

  describe('searchMovies', () => {
    it('should search movies with query string', async () => {
      mockRequest.query = { q: 'matrix' };

      const mockResult = {
        items: [mockMovie],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      (movieService.search as jest.Mock).mockResolvedValue(mockResult);

      await controller.searchMovies(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieService.search).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        q: 'matrix',
        filters: {},
        sortBy: undefined,
        sortDir: undefined,
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Movies found successfully',
        data: {
          movies: [mockMovie],
          total: 1,
          page: 1,
          pageSize: 20,
          totalPages: 1,
          query: 'matrix',
        },
      });
    });

    it('should search with filters and pagination', async () => {
      mockRequest.query = {
        q: 'sci-fi',
        page: '2',
        pageSize: '15',
        genre: 'Sci-Fi',
        recommended: 'true',
      };

      const mockResult = {
        items: [mockMovie],
        total: 30,
        page: 2,
        limit: 15,
        totalPages: 2,
      };

      (movieService.search as jest.Mock).mockResolvedValue(mockResult);

      await controller.searchMovies(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieService.search).toHaveBeenCalledWith({
        page: 2,
        limit: 15,
        q: 'sci-fi',
        filters: {
          genre: 'Sci-Fi',
          recommended: true,
        },
        sortBy: undefined,
        sortDir: undefined,
      });
    });

    it('should handle page beyond total pages by refetching last page', async () => {
      mockRequest.query = { page: '10', pageSize: '20' };

      const mockResult = {
        items: [mockMovie],
        total: 25,
        page: 2,
        limit: 20,
        totalPages: 2,
      };

      (movieService.search as jest.Mock)
        .mockResolvedValueOnce({ items: [], total: 25, page: 10, limit: 20 })
        .mockResolvedValueOnce(mockResult);

      await controller.searchMovies(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieService.search).toHaveBeenCalledTimes(2);
      expect(movieService.search).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 })
      );
    });

    it('should normalize invalid pagination parameters', async () => {
      mockRequest.query = { page: '-1', pageSize: '500' };

      const mockResult = {
        items: [],
        total: 0,
        page: 1,
        limit: 100,
        totalPages: 0,
      };

      (movieService.search as jest.Mock).mockResolvedValue(mockResult);

      await controller.searchMovies(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 100,
        })
      );
    });

    it('should handle recommended filter variations', async () => {
      mockRequest.query = { recommended: '1' };

      const mockResult = {
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };

      (movieService.search as jest.Mock).mockResolvedValue(mockResult);

      await controller.searchMovies(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: { recommended: true },
        })
      );
    });

    it('should trim filter values', async () => {
      mockRequest.query = {
        title: '  Matrix  ',
        director: '  Wachowski  ',
      };

      const mockResult = {
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };

      (movieService.search as jest.Mock).mockResolvedValue(mockResult);

      await controller.searchMovies(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: {
            title: 'Matrix',
            director: 'Wachowski',
          },
        })
      );
    });
  });

  describe('getMovieById', () => {
    it('should return movie by ID', async () => {
      mockRequest.params = { movieId: 'movie-123' };

      (movieService.get as jest.Mock).mockResolvedValue(mockMovie);

      await controller.getMovieById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieService.get).toHaveBeenCalledWith('movie-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Movie found successfully',
        data: { movie: mockMovie },
      });
    });

    it('should throw NotFoundError if movie does not exist', async () => {
      mockRequest.params = { movieId: 'non-existent' };

      (movieService.get as jest.Mock).mockResolvedValue(null);

      await controller.getMovieById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
    });
  });

  describe('updateMovie', () => {
    it('should update movie with provided fields', async () => {
      mockRequest.params = { movieId: 'movie-123' };
      mockRequest.body = {
        title: 'The Matrix Reloaded',
        description: 'Updated description',
      };

      const updatedMovie = {
        ...mockMovie,
        title: 'The Matrix Reloaded',
        description: 'Updated description',
      };

      (movieService.update as jest.Mock).mockResolvedValue(updatedMovie);

      await controller.updateMovie(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieService.update).toHaveBeenCalledWith(
        'movie-123',
        {
          title: 'The Matrix Reloaded',
          description: 'Updated description',
        },
        undefined,
        { transaction: mockTransaction }
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should update movie with file upload', async () => {
      mockRequest.params = { movieId: 'movie-123' };
      mockRequest.body = { title: 'Updated Title' };

      const mockFile = { filename: 'new-poster.jpg' };
      mockRequest.file = mockFile;

      (movieService.update as jest.Mock).mockResolvedValue(mockMovie);

      await controller.updateMovie(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieService.update).toHaveBeenCalledWith(
        'movie-123',
        expect.any(Object),
        mockFile,
        { transaction: mockTransaction }
      );
    });

    it('should handle partial updates', async () => {
      mockRequest.params = { movieId: 'movie-123' };
      mockRequest.body = { recommended: 'false' };

      (movieService.update as jest.Mock).mockResolvedValue(mockMovie);

      await controller.updateMovie(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieService.update).toHaveBeenCalledWith(
        'movie-123',
        { recommended: false },
        undefined,
        { transaction: mockTransaction }
      );
    });

    it('should throw NotFoundError if movie does not exist', async () => {
      mockRequest.params = { movieId: 'non-existent' };
      mockRequest.body = { title: 'Test' };

      (movieService.update as jest.Mock).mockResolvedValue(null);

      await controller.updateMovie(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
    });

    it('should rollback transaction on error', async () => {
      mockRequest.params = { movieId: 'movie-123' };
      mockRequest.body = { title: 'Test' };

      const error = new Error('Update failed');
      (movieService.update as jest.Mock).mockRejectedValue(error);

      await controller.updateMovie(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('deleteMovie', () => {
    it('should delete movie successfully', async () => {
      mockRequest.params = { movieId: 'movie-123' };

      (movieService.remove as jest.Mock).mockResolvedValue(true);

      await controller.deleteMovie(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieService.remove).toHaveBeenCalledWith('movie-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Movie deleted successfully',
        data: null,
      });
    });

    it('should throw NotFoundError if movie does not exist', async () => {
      mockRequest.params = { movieId: 'non-existent' };

      (movieService.remove as jest.Mock).mockResolvedValue(false);

      await controller.deleteMovie(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
    });
  });

  describe('getUpcomingMovies', () => {
    it('should return upcoming movies with pagination', async () => {
      mockRequest.query = { page: '1', pageSize: '10' };

      const mockResult = {
        items: [mockMovie],
        totalItems: 5,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      (movieService.getUpcoming as jest.Mock).mockResolvedValue(mockResult);

      await controller.getUpcomingMovies(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieService.getUpcoming).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        sortBy: undefined,
        sortDir: undefined,
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Upcoming movies found successfully',
        data: {
          movies: [mockMovie],
          total: 5,
          page: 1,
          pageSize: 10,
          totalPages: 1,
        },
      });
    });
  });

  describe('getMoviesByTheater', () => {
    it('should return movies by theater', async () => {
      mockRequest.params = { theaterId: 'theater-456' };
      mockRequest.query = { page: '1', pageSize: '20' };

      const mockResult = {
        items: [mockMovie],
        totalItems: 3,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      (movieService.getByTheater as jest.Mock).mockResolvedValue(mockResult);

      await controller.getMoviesByTheater(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieService.getByTheater).toHaveBeenCalledWith('theater-456', {
        page: 1,
        limit: 20,
        sortBy: undefined,
        sortDir: undefined,
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Movies by theater found successfully',
        data: expect.objectContaining({
          theaterId: 'theater-456',
        }),
      });
    });
  });

  describe('getMovieByScreening', () => {
    it('should return movie by screening ID', async () => {
      mockRequest.params = { screeningId: 'screening-789' };

      (movieService.getByScreeningId as jest.Mock).mockResolvedValue(mockMovie);

      await controller.getMovieByScreening(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieService.getByScreeningId).toHaveBeenCalledWith(
        'screening-789'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Movie by screening found successfully',
        data: {
          movie: mockMovie,
          screeningId: 'screening-789',
        },
      });
    });
  });

  describe('Error handling', () => {
    it('should call next with error on service failure in listMovies', async () => {
      const error = new Error('Service error');
      (movieService.list as jest.Mock).mockRejectedValue(error);

      await controller.listMovies(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should call next with error on service failure in searchMovies', async () => {
      const error = new Error('Search error');
      (movieService.search as jest.Mock).mockRejectedValue(error);

      await controller.searchMovies(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
