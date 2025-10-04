import { Request, Response, NextFunction } from 'express';
import { ScreeningController } from '../../controllers/screening.controller';
import screeningService from '../../services/screening.service';
import { sequelize } from '../../config/db';
import { BadRequestError } from '../../errors/bad-request-error';
import { NotFoundError } from '../../errors/not-found-error';

// Mock dependencies
jest.mock('../../services/screening.service');
jest.mock('../../config/db');

describe('ScreeningController', () => {
  let controller: ScreeningController;
  let mockRequest: any;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockTransaction: any;

  const mockScreening = {
    screeningId: 'screening-123',
    movieId: 'movie-456',
    theaterId: 'theater-789',
    hallId: 'hall-1',
    startTime: new Date('2025-12-25T19:00:00Z'),
    price: 12.5,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    controller = new ScreeningController();

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

  describe('createScreening', () => {
    it('should create screening with valid data', async () => {
      mockRequest.body = {
        movieId: 'movie-456',
        theaterId: 'theater-789',
        hallId: 'hall-1',
        startTime: '2025-12-25T19:00:00Z',
        price: 12.5,
      };

      (screeningService.create as jest.Mock).mockResolvedValue(mockScreening);

      await controller.createScreening(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(screeningService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          movieId: 'movie-456',
          theaterId: 'theater-789',
          hallId: 'hall-1',
          startTime: expect.any(Date),
          price: 12.5,
        }),
        { transaction: mockTransaction }
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('should throw BadRequestError if movieId is missing', async () => {
      mockRequest.body = {
        theaterId: 'theater-789',
        hallId: 'hall-1',
        startTime: '2025-12-25T19:00:00Z',
        price: 12.5,
      };

      await controller.createScreening(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Movie ID is required',
        })
      );
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should throw BadRequestError if theaterId is missing', async () => {
      mockRequest.body = {
        movieId: 'movie-456',
        hallId: 'hall-1',
        startTime: '2025-12-25T19:00:00Z',
        price: 12.5,
      };

      await controller.createScreening(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Theater ID is required',
        })
      );
    });

    it('should throw BadRequestError if hallId is missing', async () => {
      mockRequest.body = {
        movieId: 'movie-456',
        theaterId: 'theater-789',
        startTime: '2025-12-25T19:00:00Z',
        price: 12.5,
      };

      await controller.createScreening(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Hall ID is required',
        })
      );
    });

    it('should throw BadRequestError if startTime is missing', async () => {
      mockRequest.body = {
        movieId: 'movie-456',
        theaterId: 'theater-789',
        hallId: 'hall-1',
        price: 12.5,
      };

      await controller.createScreening(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Start time is required',
        })
      );
    });

    it('should throw BadRequestError if price is missing', async () => {
      mockRequest.body = {
        movieId: 'movie-456',
        theaterId: 'theater-789',
        hallId: 'hall-1',
        startTime: '2025-12-25T19:00:00Z',
      };

      await controller.createScreening(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Price is required',
        })
      );
    });

    it('should throw BadRequestError for invalid startTime format', async () => {
      mockRequest.body = {
        movieId: 'movie-456',
        theaterId: 'theater-789',
        hallId: 'hall-1',
        startTime: 'invalid-date',
        price: 12.5,
      };

      await controller.createScreening(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid start time format',
        })
      );
    });

    it('should handle Date object for startTime', async () => {
      mockRequest.body = {
        movieId: 'movie-456',
        theaterId: 'theater-789',
        hallId: 'hall-1',
        startTime: new Date('2025-12-25T19:00:00Z'),
        price: 12.5,
      };

      (screeningService.create as jest.Mock).mockResolvedValue(mockScreening);

      await controller.createScreening(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(screeningService.create).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
    });
  });

  describe('getScreeningById', () => {
    it('should return screening by ID', async () => {
      mockRequest.params = { screeningId: 'screening-123' };

      (screeningService.get as jest.Mock).mockResolvedValue(mockScreening);

      await controller.getScreeningById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(screeningService.get).toHaveBeenCalledWith('screening-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Screening found successfully',
        data: { screening: mockScreening },
      });
    });

    it('should throw NotFoundError if screening not found', async () => {
      mockRequest.params = { screeningId: 'screening-999' };

      (screeningService.get as jest.Mock).mockResolvedValue(null);

      await controller.getScreeningById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Screening screening-999 not found',
        })
      );
    });
  });

  describe('updateScreening', () => {
    it('should update screening with valid data', async () => {
      mockRequest.params = { screeningId: 'screening-123' };
      mockRequest.body = { price: 15.0 };

      const updatedScreening = { ...mockScreening, price: 15.0 };
      (screeningService.update as jest.Mock).mockResolvedValue(
        updatedScreening
      );

      await controller.updateScreening(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(screeningService.update).toHaveBeenCalledWith(
        'screening-123',
        { price: 15.0 },
        { transaction: mockTransaction }
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should parse startTime string when updating', async () => {
      mockRequest.params = { screeningId: 'screening-123' };
      mockRequest.body = { startTime: '2025-12-26T20:00:00Z' };

      (screeningService.update as jest.Mock).mockResolvedValue(mockScreening);

      await controller.updateScreening(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(screeningService.update).toHaveBeenCalledWith(
        'screening-123',
        expect.objectContaining({
          startTime: expect.any(Date),
        }),
        { transaction: mockTransaction }
      );
    });

    it('should throw BadRequestError for invalid startTime', async () => {
      mockRequest.params = { screeningId: 'screening-123' };
      mockRequest.body = { startTime: 'invalid' };

      await controller.updateScreening(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid start time format',
        })
      );
    });

    it('should throw NotFoundError if screening not found', async () => {
      mockRequest.params = { screeningId: 'screening-999' };
      mockRequest.body = { price: 15.0 };

      (screeningService.update as jest.Mock).mockResolvedValue(null);

      await controller.updateScreening(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
    });
  });

  describe('deleteScreening', () => {
    it('should delete screening successfully', async () => {
      mockRequest.params = { screeningId: 'screening-123' };

      (screeningService.remove as jest.Mock).mockResolvedValue(true);

      await controller.deleteScreening(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(screeningService.remove).toHaveBeenCalledWith('screening-123', {
        transaction: mockTransaction,
      });
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should throw NotFoundError if screening not found', async () => {
      mockRequest.params = { screeningId: 'screening-999' };

      (screeningService.remove as jest.Mock).mockResolvedValue(false);

      await controller.deleteScreening(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
    });
  });

  describe('listScreenings', () => {
    it('should list screenings with pagination', async () => {
      mockRequest.query = { page: '2', pageSize: '10' };

      const mockResult = {
        items: [mockScreening],
        totalItems: 25,
        page: 2,
        limit: 10,
        totalPages: 3,
      };

      (screeningService.list as jest.Mock).mockResolvedValue(mockResult);

      await controller.listScreenings(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(screeningService.list).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        sortBy: undefined,
        sortDir: undefined,
        filters: {},
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should handle array filters', async () => {
      mockRequest.query = {
        movieId: ['movie-1', 'movie-2'],
        theaterId: ['theater-1', 'theater-2'],
      };

      const mockResult = {
        items: [],
        totalItems: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };

      (screeningService.list as jest.Mock).mockResolvedValue(mockResult);

      await controller.listScreenings(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(screeningService.list).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: {
            movieId: ['movie-1', 'movie-2'],
            theaterId: ['theater-1', 'theater-2'],
          },
        })
      );
    });

    it('should handle quality filter as CSV string', async () => {
      mockRequest.query = { quality: '2D,3D,IMAX' };

      const mockResult = {
        items: [],
        totalItems: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };

      (screeningService.list as jest.Mock).mockResolvedValue(mockResult);

      await controller.listScreenings(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(screeningService.list).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: {
            quality: ['2D', '3D', 'IMAX'],
          },
        })
      );
    });

    it('should handle price and time filters', async () => {
      mockRequest.query = {
        minPrice: '10.00',
        maxPrice: '20.00',
        startTimeFrom: '2025-12-01T00:00:00Z',
        startTimeTo: '2025-12-31T23:59:59Z',
      };

      const mockResult = {
        items: [],
        totalItems: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };

      (screeningService.list as jest.Mock).mockResolvedValue(mockResult);

      await controller.listScreenings(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(screeningService.list).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: {
            minPrice: 10.0,
            maxPrice: 20.0,
            startTimeFrom: '2025-12-01T00:00:00Z',
            startTimeTo: '2025-12-31T23:59:59Z',
          },
        })
      );
    });
  });

  describe('searchScreenings', () => {
    it('should search screenings with query string', async () => {
      mockRequest.query = { q: 'action movie' };

      const mockResult = {
        items: [mockScreening],
        totalItems: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      (screeningService.search as jest.Mock).mockResolvedValue(mockResult);

      await controller.searchScreenings(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(screeningService.search).toHaveBeenCalledWith({
        page: undefined,
        limit: undefined,
        sortBy: undefined,
        sortDir: undefined,
        q: 'action movie',
        filters: {},
      });
    });
  });

  describe('getScreeningsByMovie', () => {
    it('should return screenings for specific movie', async () => {
      mockRequest.params = { movieId: 'movie-456' };

      const mockResult = {
        items: [mockScreening],
        totalItems: 5,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      (screeningService.getByMovie as jest.Mock).mockResolvedValue(mockResult);

      await controller.getScreeningsByMovie(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(screeningService.getByMovie).toHaveBeenCalledWith(
        'movie-456',
        expect.any(Object)
      );
    });
  });

  describe('getScreeningsByDate', () => {
    it('should return screenings for specific date', async () => {
      mockRequest.params = { date: '2025-12-25' };

      const mockResult = {
        items: [mockScreening],
        totalItems: 10,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      (screeningService.getByDate as jest.Mock).mockResolvedValue(mockResult);

      await controller.getScreeningsByDate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(screeningService.getByDate).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Object)
      );
    });

    it('should throw BadRequestError for invalid date', async () => {
      mockRequest.params = { date: 'invalid-date' };

      await controller.getScreeningsByDate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid date format',
        })
      );
    });
  });

  describe('getUpcomingScreenings', () => {
    it('should return upcoming screenings from now', async () => {
      mockRequest.query = {};

      const mockResult = {
        items: [mockScreening],
        totalItems: 20,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      (screeningService.getUpcoming as jest.Mock).mockResolvedValue(mockResult);

      await controller.getUpcomingScreenings(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(screeningService.getUpcoming).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Object)
      );
    });

    it('should handle custom from time', async () => {
      mockRequest.query = { from: '2025-12-25T00:00:00Z' };

      const mockResult = {
        items: [],
        totalItems: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };

      (screeningService.getUpcoming as jest.Mock).mockResolvedValue(mockResult);

      await controller.getUpcomingScreenings(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(screeningService.getUpcoming).toHaveBeenCalled();
    });

    it('should throw BadRequestError for invalid from time', async () => {
      mockRequest.query = { from: 'invalid' };

      await controller.getUpcomingScreenings(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid from time format',
        })
      );
    });
  });

  describe('getPastScreenings', () => {
    it('should return past screenings before now', async () => {
      mockRequest.query = {};

      const mockResult = {
        items: [mockScreening],
        totalItems: 50,
        page: 1,
        limit: 20,
        totalPages: 3,
      };

      (screeningService.getPast as jest.Mock).mockResolvedValue(mockResult);

      await controller.getPastScreenings(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(screeningService.getPast).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Object)
      );
    });
  });

  describe('getMultipleScreenings', () => {
    it('should return multiple specific screenings', async () => {
      mockRequest.body = {
        screeningIds: ['screening-1', 'screening-2', 'screening-3'],
      };

      const mockResult = {
        items: [mockScreening],
        totalItems: 3,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      (screeningService.getMultiple as jest.Mock).mockResolvedValue(mockResult);

      await controller.getMultipleScreenings(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(screeningService.getMultiple).toHaveBeenCalledWith(
        ['screening-1', 'screening-2', 'screening-3'],
        expect.any(Object)
      );
    });

    it('should throw BadRequestError if screeningIds array is empty', async () => {
      mockRequest.body = { screeningIds: [] };

      await controller.getMultipleScreenings(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Screening IDs array is required',
        })
      );
    });
  });

  describe('checkSchedulingConflicts', () => {
    it('should check for conflicts successfully', async () => {
      mockRequest.params = { theaterId: 'theater-789', hallId: 'hall-1' };
      mockRequest.body = { startTime: '2025-12-25T19:00:00Z' };

      (
        screeningService.checkSchedulingConflicts as jest.Mock
      ).mockResolvedValue([]);

      await controller.checkSchedulingConflicts(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(screeningService.checkSchedulingConflicts).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Scheduling conflicts check completed',
        data: {
          conflicts: [],
          hasConflicts: false,
          conflictCount: 0,
        },
      });
    });

    it('should throw BadRequestError if startTime is missing', async () => {
      mockRequest.params = { theaterId: 'theater-789', hallId: 'hall-1' };
      mockRequest.body = {};

      await controller.checkSchedulingConflicts(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Start time is required',
        })
      );
    });
  });

  describe('checkSlotAvailability', () => {
    it('should check slot availability successfully', async () => {
      mockRequest.params = { theaterId: 'theater-789', hallId: 'hall-1' };
      mockRequest.body = { startTime: '2025-12-25T19:00:00Z' };

      (screeningService.isSlotAvailable as jest.Mock).mockResolvedValue(true);

      await controller.checkSlotAvailability(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Slot availability check completed',
        data: { isAvailable: true },
      });
    });
  });

  describe('findAvailableSlots', () => {
    it('should find available slots for a date', async () => {
      mockRequest.params = { theaterId: 'theater-789', hallId: 'hall-1' };
      mockRequest.query = { date: '2025-12-25', duration: '120' };

      const mockSlots = [
        { startTime: '10:00', endTime: '12:00' },
        { startTime: '14:00', endTime: '16:00' },
      ];

      (screeningService.findAvailableSlots as jest.Mock).mockResolvedValue(
        mockSlots
      );

      await controller.findAvailableSlots(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(screeningService.findAvailableSlots).toHaveBeenCalledWith(
        'theater-789',
        'hall-1',
        expect.any(Date),
        120
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Available time slots found successfully',
        data: {
          slots: mockSlots,
          count: 2,
        },
      });
    });

    it('should throw BadRequestError if date is missing', async () => {
      mockRequest.params = { theaterId: 'theater-789', hallId: 'hall-1' };
      mockRequest.query = {};

      await controller.findAvailableSlots(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Date is required',
        })
      );
    });
  });

  describe('checkScreeningExists', () => {
    it('should return true if screening exists', async () => {
      mockRequest.params = { screeningId: 'screening-123' };

      (screeningService.exists as jest.Mock).mockResolvedValue(true);

      await controller.checkScreeningExists(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Screening existence check completed',
        data: { exists: true },
      });
    });
  });

  describe('generateMonthlySchedule', () => {
    it('should generate monthly schedule successfully', async () => {
      mockRequest.params = { theaterId: 'theater-789', hallId: 'hall-1' };
      mockRequest.body = {
        year: '2025',
        month: '12',
        screeningsPerDay: '4',
        startHour: '10',
        basePrice: '12.50',
      };

      const mockScreenings = [mockScreening, mockScreening, mockScreening];
      (screeningService.generateMonthlySchedule as jest.Mock).mockResolvedValue(
        mockScreenings
      );

      await controller.generateMonthlySchedule(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(screeningService.generateMonthlySchedule).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('should throw BadRequestError if year or month missing', async () => {
      mockRequest.params = { theaterId: 'theater-789', hallId: 'hall-1' };
      mockRequest.body = { year: '2025' };

      await controller.generateMonthlySchedule(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Year and month are required',
        })
      );
    });
  });

  describe('clearMonthlySchedule', () => {
    it('should clear monthly schedule successfully', async () => {
      mockRequest.params = { theaterId: 'theater-789', hallId: 'hall-1' };
      mockRequest.body = { year: '2025', month: '12' };

      (screeningService.clearMonthlySchedule as jest.Mock).mockResolvedValue(
        15
      );

      await controller.clearMonthlySchedule(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(screeningService.clearMonthlySchedule).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Monthly schedule cleared successfully for 12/2025',
        data: expect.objectContaining({
          deletedCount: 15,
        }),
      });
    });
  });

  describe('getScreeningStats', () => {
    it('should return screening statistics', async () => {
      const mockStats = {
        totalScreenings: 500,
        byTheater: { 'theater-1': 150, 'theater-2': 200 },
        avgPrice: 13.25,
      };

      (screeningService.getStats as jest.Mock).mockResolvedValue(mockStats);

      await controller.getScreeningStats(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Screening statistics retrieved successfully',
        data: { stats: mockStats },
      });
    });
  });
});
