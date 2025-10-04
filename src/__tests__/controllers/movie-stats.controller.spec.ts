import { Request, Response, NextFunction } from 'express';
import { MovieStatsController } from '../../controllers/movie-stats.controller';
import movieStatsService from '../../services/movie-stats.service';
import { NotFoundError } from '../../errors/not-found-error';
import { BadRequestError } from '../../errors/bad-request-error';

// Mock dependencies
jest.mock('../../services/movie-stats.service');

describe('MovieStatsController', () => {
  let controller: MovieStatsController;
  let mockRequest: any;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  const mockStats = {
    _id: '507f1f77bcf86cd799439011',
    movieId: 'movie-123',
    bookingNumbers: [
      { date: '2025-10-03', number: 25 },
      { date: '2025-10-02', number: 30 },
      { date: '2025-10-01', number: 28 },
    ],
  };

  beforeEach(() => {
    controller = new MovieStatsController();

    mockRequest = {
      params: {},
      query: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  describe('getMovieStats', () => {
    it('should return movie stats successfully', async () => {
      mockRequest.params = { movieId: 'movie-123' };

      (movieStatsService.getStatsByMovieId as jest.Mock).mockResolvedValue(
        mockStats
      );

      await controller.getMovieStats(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieStatsService.getStatsByMovieId).toHaveBeenCalledWith(
        'movie-123'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Movie stats retrieved successfully',
        data: mockStats,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 404 if stats not found', async () => {
      mockRequest.params = { movieId: 'movie-999' };

      (movieStatsService.getStatsByMovieId as jest.Mock).mockResolvedValue(
        null
      );

      await controller.getMovieStats(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieStatsService.getStatsByMovieId).toHaveBeenCalledWith(
        'movie-999'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Stats not found for movie movie-999',
        data: null,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 if movieId is missing', async () => {
      mockRequest.params = {};

      await controller.getMovieStats(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'movieId is required and must be a valid string',
        data: null,
      });
      expect(movieStatsService.getStatsByMovieId).not.toHaveBeenCalled();
    });

    it('should return 400 if movieId is empty string', async () => {
      mockRequest.params = { movieId: '' };

      await controller.getMovieStats(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'movieId is required and must be a valid string',
        data: null,
      });
    });

    it('should return 400 if movieId is only whitespace', async () => {
      mockRequest.params = { movieId: '   ' };

      await controller.getMovieStats(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'movieId is required and must be a valid string',
        data: null,
      });
    });

    it('should call next with error for unexpected errors', async () => {
      mockRequest.params = { movieId: 'movie-123' };

      const unexpectedError = new Error('Database connection failed');
      (movieStatsService.getStatsByMovieId as jest.Mock).mockRejectedValue(
        unexpectedError
      );

      await controller.getMovieStats(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(unexpectedError);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('getMultipleMovieStats', () => {
    it('should return stats for multiple movies', async () => {
      mockRequest.query = { movieIds: 'movie-1,movie-2,movie-3' };

      const mockStats1 = { ...mockStats, movieId: 'movie-1' };
      const mockStats2 = { ...mockStats, movieId: 'movie-2' };
      const mockStats3 = { ...mockStats, movieId: 'movie-3' };

      (movieStatsService.getStatsByMovieId as jest.Mock)
        .mockResolvedValueOnce(mockStats1)
        .mockResolvedValueOnce(mockStats2)
        .mockResolvedValueOnce(mockStats3);

      await controller.getMultipleMovieStats(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieStatsService.getStatsByMovieId).toHaveBeenCalledTimes(3);
      expect(movieStatsService.getStatsByMovieId).toHaveBeenCalledWith(
        'movie-1'
      );
      expect(movieStatsService.getStatsByMovieId).toHaveBeenCalledWith(
        'movie-2'
      );
      expect(movieStatsService.getStatsByMovieId).toHaveBeenCalledWith(
        'movie-3'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Stats retrieved for 3 movie(s)',
        data: [mockStats1, mockStats2, mockStats3],
      });
    });

    it('should filter out null results for movies without stats', async () => {
      mockRequest.query = { movieIds: 'movie-1,movie-2,movie-3' };

      const mockStats1 = { ...mockStats, movieId: 'movie-1' };

      (movieStatsService.getStatsByMovieId as jest.Mock)
        .mockResolvedValueOnce(mockStats1)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      await controller.getMultipleMovieStats(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Stats retrieved for 1 movie(s)',
        data: [mockStats1],
      });
    });

    it('should handle single movieId in query', async () => {
      mockRequest.query = { movieIds: 'movie-123' };

      (movieStatsService.getStatsByMovieId as jest.Mock).mockResolvedValue(
        mockStats
      );

      await controller.getMultipleMovieStats(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieStatsService.getStatsByMovieId).toHaveBeenCalledTimes(1);
      expect(movieStatsService.getStatsByMovieId).toHaveBeenCalledWith(
        'movie-123'
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Stats retrieved for 1 movie(s)',
        data: [mockStats],
      });
    });

    it('should trim whitespace from movie IDs', async () => {
      mockRequest.query = { movieIds: ' movie-1 , movie-2 , movie-3 ' };

      (movieStatsService.getStatsByMovieId as jest.Mock)
        .mockResolvedValueOnce({ ...mockStats, movieId: 'movie-1' })
        .mockResolvedValueOnce({ ...mockStats, movieId: 'movie-2' })
        .mockResolvedValueOnce({ ...mockStats, movieId: 'movie-3' });

      await controller.getMultipleMovieStats(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieStatsService.getStatsByMovieId).toHaveBeenCalledWith(
        'movie-1'
      );
      expect(movieStatsService.getStatsByMovieId).toHaveBeenCalledWith(
        'movie-2'
      );
      expect(movieStatsService.getStatsByMovieId).toHaveBeenCalledWith(
        'movie-3'
      );
    });

    it('should filter out empty strings after splitting', async () => {
      mockRequest.query = { movieIds: 'movie-1,,movie-2,,' };

      (movieStatsService.getStatsByMovieId as jest.Mock)
        .mockResolvedValueOnce({ ...mockStats, movieId: 'movie-1' })
        .mockResolvedValueOnce({ ...mockStats, movieId: 'movie-2' });

      await controller.getMultipleMovieStats(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieStatsService.getStatsByMovieId).toHaveBeenCalledTimes(2);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Stats retrieved for 2 movie(s)',
        data: expect.any(Array),
      });
    });

    it('should return 400 if movieIds query param is missing', async () => {
      mockRequest.query = {};

      await controller.getMultipleMovieStats(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'movieIds query parameter is required (comma-separated)',
        data: null,
      });
      expect(movieStatsService.getStatsByMovieId).not.toHaveBeenCalled();
    });

    it('should return 400 if movieIds is not a string', async () => {
      mockRequest.query = { movieIds: 123 };

      await controller.getMultipleMovieStats(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'movieIds query parameter is required (comma-separated)',
        data: null,
      });
    });

    it('should return 400 if movieIds results in empty array after parsing', async () => {
      mockRequest.query = { movieIds: ',,,,' };

      await controller.getMultipleMovieStats(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'At least one valid movieId is required',
        data: null,
      });
    });

    it('should return 400 if movieIds is empty string', async () => {
      mockRequest.query = { movieIds: '' };

      await controller.getMultipleMovieStats(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'movieIds query parameter is required (comma-separated)',
        data: null,
      });
    });

    it('should return empty data array if all movies have no stats', async () => {
      mockRequest.query = { movieIds: 'movie-1,movie-2,movie-3' };

      (movieStatsService.getStatsByMovieId as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      await controller.getMultipleMovieStats(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Stats retrieved for 0 movie(s)',
        data: [],
      });
    });

    it('should call next with error for unexpected errors', async () => {
      mockRequest.query = { movieIds: 'movie-1,movie-2' };

      const unexpectedError = new Error('Database error');
      (movieStatsService.getStatsByMovieId as jest.Mock).mockRejectedValue(
        unexpectedError
      );

      await controller.getMultipleMovieStats(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(unexpectedError);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });
});
