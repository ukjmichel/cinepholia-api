import { Request, Response, NextFunction } from 'express';
import { MovieTheaterController } from '../../controllers/movie-theater.controller';
import movieTheaterService from '../../services/movie-theater.service';
import { sequelize } from '../../config/db';
import { BadRequestError } from '../../errors/bad-request-error';
import { NotFoundError } from '../../errors/not-found-error';

// Mock dependencies
jest.mock('../../services/movie-theater.service');
jest.mock('../../config/db');

describe('MovieTheaterController', () => {
  let controller: MovieTheaterController;
  let mockRequest: any;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockTransaction: any;

  const mockTheater = {
    theaterId: 'theater-123',
    name: 'Grand Cinema',
    address: '123 Main Street',
    city: 'New York',
    postalCode: '10001',
    phone: '+1-555-1234',
    email: 'info@grandcinema.com',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    controller = new MovieTheaterController();

    mockRequest = {
      params: {},
      query: {},
      body: {},
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

  describe('createTheater', () => {
    it('should create theater with valid data', async () => {
      mockRequest.body = {
        theaterId: 'theater-123',
        name: 'Grand Cinema',
        address: '123 Main Street',
        city: 'New York',
        postalCode: '10001',
        phone: '+1-555-1234',
        email: 'info@grandcinema.com',
      };

      (movieTheaterService.create as jest.Mock).mockResolvedValue(mockTheater);

      await controller.createTheater(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieTheaterService.create).toHaveBeenCalledWith(
        mockRequest.body,
        {
          transaction: mockTransaction,
        }
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Movie theater created successfully',
        data: { theater: mockTheater },
      });
    });

    it('should throw BadRequestError if theaterId is missing', async () => {
      mockRequest.body = {
        name: 'Grand Cinema',
        address: '123 Main Street',
        city: 'New York',
      };

      await controller.createTheater(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Theater ID is required',
        })
      );
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      mockRequest.body = {
        theaterId: 'theater-123',
        name: 'Grand Cinema',
      };

      const error = new Error('Database error');
      (movieTheaterService.create as jest.Mock).mockRejectedValue(error);

      await controller.createTheater(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockTransaction.commit).not.toHaveBeenCalled();
    });
  });

  describe('getTheaterById', () => {
    it('should return theater by ID', async () => {
      mockRequest.params = { theaterId: 'theater-123' };

      (movieTheaterService.get as jest.Mock).mockResolvedValue(mockTheater);

      await controller.getTheaterById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieTheaterService.get).toHaveBeenCalledWith('theater-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Movie theater found successfully',
        data: { theater: mockTheater },
      });
    });

    it('should throw NotFoundError if theater does not exist', async () => {
      mockRequest.params = { theaterId: 'non-existent' };

      (movieTheaterService.get as jest.Mock).mockResolvedValue(null);

      await controller.getTheaterById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Movie theater not found',
        })
      );
    });
  });

  describe('updateTheater', () => {
    it('should update theater with valid data', async () => {
      mockRequest.params = { theaterId: 'theater-123' };
      mockRequest.body = {
        name: 'Updated Cinema',
        phone: '+1-555-9999',
      };

      const updatedTheater = {
        ...mockTheater,
        name: 'Updated Cinema',
        phone: '+1-555-9999',
      };

      (movieTheaterService.update as jest.Mock).mockResolvedValue(
        updatedTheater
      );

      await controller.updateTheater(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieTheaterService.update).toHaveBeenCalledWith(
        'theater-123',
        mockRequest.body,
        { transaction: mockTransaction }
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Movie theater updated successfully',
        data: { theater: updatedTheater },
      });
    });

    it('should throw NotFoundError if theater does not exist', async () => {
      mockRequest.params = { theaterId: 'non-existent' };
      mockRequest.body = { name: 'Updated Name' };

      (movieTheaterService.update as jest.Mock).mockResolvedValue(null);

      await controller.updateTheater(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      mockRequest.params = { theaterId: 'theater-123' };
      mockRequest.body = { name: 'Test' };

      const error = new Error('Update failed');
      (movieTheaterService.update as jest.Mock).mockRejectedValue(error);

      await controller.updateTheater(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('deleteTheater', () => {
    it('should delete theater successfully', async () => {
      mockRequest.params = { theaterId: 'theater-123' };

      (movieTheaterService.remove as jest.Mock).mockResolvedValue(true);

      await controller.deleteTheater(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieTheaterService.remove).toHaveBeenCalledWith('theater-123', {
        transaction: mockTransaction,
      });
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Movie theater deleted successfully',
        data: null,
      });
    });

    it('should throw NotFoundError if theater does not exist', async () => {
      mockRequest.params = { theaterId: 'non-existent' };

      (movieTheaterService.remove as jest.Mock).mockResolvedValue(false);

      await controller.deleteTheater(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      mockRequest.params = { theaterId: 'theater-123' };

      const error = new Error('Delete failed');
      (movieTheaterService.remove as jest.Mock).mockRejectedValue(error);

      await controller.deleteTheater(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('listTheaters', () => {
    it('should list theaters with pagination', async () => {
      mockRequest.query = { page: '2', pageSize: '10' };

      const mockResult = {
        items: [mockTheater],
        totalItems: 25,
        page: 2,
        limit: 10,
        totalPages: 3,
      };

      (movieTheaterService.list as jest.Mock).mockResolvedValue(mockResult);

      await controller.listTheaters(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieTheaterService.list).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        sortBy: undefined,
        sortDir: undefined,
        filters: {},
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Movie theaters found successfully',
        data: {
          theaters: [mockTheater],
          total: 25,
          page: 2,
          pageSize: 10,
          totalPages: 3,
        },
      });
    });

    it('should handle filters', async () => {
      mockRequest.query = {
        name: 'Grand',
        city: 'New York',
        postalCode: '10001',
        phone: '+1-555',
        email: 'info@',
      };

      const mockResult = {
        items: [mockTheater],
        totalItems: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      (movieTheaterService.list as jest.Mock).mockResolvedValue(mockResult);

      await controller.listTheaters(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieTheaterService.list).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: {
            name: 'Grand',
            city: 'New York',
            postalCode: '10001',
            phone: '+1-555',
            email: 'info@',
          },
        })
      );
    });

    it('should handle array filter for theaterId', async () => {
      mockRequest.query = {
        theaterId: ['theater-1', 'theater-2', 'theater-3'],
      };

      const mockResult = {
        items: [],
        totalItems: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };

      (movieTheaterService.list as jest.Mock).mockResolvedValue(mockResult);

      await controller.listTheaters(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieTheaterService.list).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: {
            theaterId: ['theater-1', 'theater-2', 'theater-3'],
          },
        })
      );
    });

    it('should handle date range filters', async () => {
      mockRequest.query = {
        createdFrom: '2025-01-01',
        createdTo: '2025-12-31',
        updatedFrom: '2025-06-01',
        updatedTo: '2025-06-30',
      };

      const mockResult = {
        items: [],
        totalItems: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };

      (movieTheaterService.list as jest.Mock).mockResolvedValue(mockResult);

      await controller.listTheaters(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieTheaterService.list).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: {
            createdFrom: '2025-01-01',
            createdTo: '2025-12-31',
            updatedFrom: '2025-06-01',
            updatedTo: '2025-06-30',
          },
        })
      );
    });

    it('should handle sorting parameters', async () => {
      mockRequest.query = {
        sortBy: 'name',
        sortDir: 'asc',
      };

      const mockResult = {
        items: [],
        totalItems: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };

      (movieTheaterService.list as jest.Mock).mockResolvedValue(mockResult);

      await controller.listTheaters(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieTheaterService.list).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'name',
          sortDir: 'asc',
        })
      );
    });

    it('should support both limit and pageSize query params', async () => {
      mockRequest.query = { limit: '15' };

      const mockResult = {
        items: [],
        totalItems: 0,
        page: 1,
        limit: 15,
        totalPages: 0,
      };

      (movieTheaterService.list as jest.Mock).mockResolvedValue(mockResult);

      await controller.listTheaters(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieTheaterService.list).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 15,
        })
      );
    });
  });

  describe('searchTheaters', () => {
    it('should search theaters with query string', async () => {
      mockRequest.query = { q: 'grand' };

      const mockResult = {
        items: [mockTheater],
        totalItems: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      (movieTheaterService.search as jest.Mock).mockResolvedValue(mockResult);

      await controller.searchTheaters(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieTheaterService.search).toHaveBeenCalledWith({
        page: undefined,
        limit: undefined,
        sortBy: undefined,
        sortDir: undefined,
        q: 'grand',
        filters: {},
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should search with filters and pagination', async () => {
      mockRequest.query = {
        q: 'cinema',
        page: '2',
        pageSize: '15',
        city: 'New York',
      };

      const mockResult = {
        items: [mockTheater],
        totalItems: 30,
        page: 2,
        limit: 15,
        totalPages: 2,
      };

      (movieTheaterService.search as jest.Mock).mockResolvedValue(mockResult);

      await controller.searchTheaters(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieTheaterService.search).toHaveBeenCalledWith({
        page: 2,
        limit: 15,
        sortBy: undefined,
        sortDir: undefined,
        q: 'cinema',
        filters: {
          city: 'New York',
        },
      });
    });

    it('should handle array filter for theaterId', async () => {
      mockRequest.query = {
        q: 'test',
        theaterId: ['theater-1', 'theater-2'],
      };

      const mockResult = {
        items: [],
        totalItems: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };

      (movieTheaterService.search as jest.Mock).mockResolvedValue(mockResult);

      await controller.searchTheaters(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieTheaterService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: {
            theaterId: ['theater-1', 'theater-2'],
          },
        })
      );
    });
  });

  describe('getAllTheaters', () => {
    it('should return all theaters without pagination', async () => {
      const mockTheaters = [
        mockTheater,
        { ...mockTheater, theaterId: 'theater-456', name: 'Cinema Plus' },
        { ...mockTheater, theaterId: 'theater-789', name: 'Mega Movies' },
      ];

      (movieTheaterService.getAll as jest.Mock).mockResolvedValue(mockTheaters);

      await controller.getAllTheaters(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieTheaterService.getAll).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'All movie theaters retrieved successfully',
        data: {
          theaters: mockTheaters,
          total: 3,
        },
      });
    });

    it('should return empty array if no theaters exist', async () => {
      (movieTheaterService.getAll as jest.Mock).mockResolvedValue([]);

      await controller.getAllTheaters(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'All movie theaters retrieved successfully',
        data: {
          theaters: [],
          total: 0,
        },
      });
    });
  });

  describe('getTheaterStats', () => {
    it('should return theater statistics', async () => {
      const mockStats = {
        totalTheaters: 50,
        byCity: {
          'New York': 15,
          'Los Angeles': 12,
          Chicago: 10,
        },
        totalCapacity: 25000,
        avgHallsPerTheater: 8,
      };

      (movieTheaterService.getStats as jest.Mock).mockResolvedValue(mockStats);

      await controller.getTheaterStats(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieTheaterService.getStats).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Theater statistics retrieved successfully',
        data: { stats: mockStats },
      });
    });
  });

  describe('Error handling', () => {
    it('should call next with error on service failure in listTheaters', async () => {
      const error = new Error('Service error');
      (movieTheaterService.list as jest.Mock).mockRejectedValue(error);

      await controller.listTheaters(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should call next with error on service failure in searchTheaters', async () => {
      const error = new Error('Search error');
      (movieTheaterService.search as jest.Mock).mockRejectedValue(error);

      await controller.searchTheaters(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should call next with error on service failure in getAllTheaters', async () => {
      const error = new Error('Database error');
      (movieTheaterService.getAll as jest.Mock).mockRejectedValue(error);

      await controller.getAllTheaters(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should call next with error on service failure in getTheaterStats', async () => {
      const error = new Error('Stats error');
      (movieTheaterService.getStats as jest.Mock).mockRejectedValue(error);

      await controller.getTheaterStats(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
