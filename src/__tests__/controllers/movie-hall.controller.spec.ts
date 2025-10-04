import { Request, Response, NextFunction } from 'express';
import { MovieHallController } from '../../controllers/movie-hall.controller';
import movieHallService from '../../services/movie-hall.service';
import { sequelize } from '../../config/db';
import { BadRequestError } from '../../errors/bad-request-error';
import { NotFoundError } from '../../errors/not-found-error';

// Mock dependencies
jest.mock('../../services/movie-hall.service');
jest.mock('../../config/db');

describe('MovieHallController', () => {
  let controller: MovieHallController;
  let mockRequest: any;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockTransaction: any;

  const mockHall = {
    theaterId: 'theater-123',
    hallId: 'hall-1',
    quality: '2D',
    seatsLayout: [
      [
        { seatId: 'A1', type: 'standard' },
        { seatId: 'A2', type: 'standard' },
      ],
      [
        { seatId: 'B1', type: 'vip' },
        { seatId: 'B2', type: 'vip' },
      ],
    ],
    totalCapacity: 4,
  };

  beforeEach(() => {
    controller = new MovieHallController();

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

  describe('createHall', () => {
    it('should create hall with valid data', async () => {
      mockRequest.body = {
        theaterId: 'theater-123',
        hallId: 'hall-1',
        quality: '2D',
        seatsLayout: [[{ seatId: 'A1', type: 'standard' }]],
      };

      (movieHallService.validateLayout as jest.Mock).mockReturnValue({
        isValid: true,
        errors: [],
      });
      (movieHallService.create as jest.Mock).mockResolvedValue(mockHall);

      await controller.createHall(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieHallService.validateLayout).toHaveBeenCalledWith(
        mockRequest.body.seatsLayout
      );
      expect(movieHallService.create).toHaveBeenCalledWith(mockRequest.body, {
        transaction: mockTransaction,
      });
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Movie hall created successfully',
        data: { hall: mockHall },
      });
    });

    it('should throw BadRequestError if theaterId is missing', async () => {
      mockRequest.body = {
        hallId: 'hall-1',
        quality: '2D',
        seatsLayout: [],
      };

      await controller.createHall(
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

    it('should throw BadRequestError if hallId is missing', async () => {
      mockRequest.body = {
        theaterId: 'theater-123',
        quality: '2D',
        seatsLayout: [],
      };

      await controller.createHall(
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

    it('should throw BadRequestError if seatsLayout is invalid', async () => {
      mockRequest.body = {
        theaterId: 'theater-123',
        hallId: 'hall-1',
        quality: '2D',
        seatsLayout: 'invalid',
      };

      await controller.createHall(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Valid seats layout is required',
        })
      );
    });

    it('should throw BadRequestError if quality is missing', async () => {
      mockRequest.body = {
        theaterId: 'theater-123',
        hallId: 'hall-1',
        seatsLayout: [],
      };

      await controller.createHall(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Hall quality is required',
        })
      );
    });

    it('should throw BadRequestError if layout validation fails', async () => {
      mockRequest.body = {
        theaterId: 'theater-123',
        hallId: 'hall-1',
        quality: '2D',
        seatsLayout: [[{ seatId: 'A1' }]],
      };

      (movieHallService.validateLayout as jest.Mock).mockReturnValue({
        isValid: false,
        errors: ['Duplicate seat IDs', 'Invalid seat type'],
      });

      await controller.createHall(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message:
            'Invalid seats layout: Duplicate seat IDs, Invalid seat type',
        })
      );
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  describe('getHallById', () => {
    it('should return hall by composite key', async () => {
      mockRequest.params = { theaterId: 'theater-123', hallId: 'hall-1' };

      (movieHallService.get as jest.Mock).mockResolvedValue(mockHall);

      await controller.getHallById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieHallService.get).toHaveBeenCalledWith(
        'theater-123',
        'hall-1'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Movie hall found successfully',
        data: { hall: mockHall },
      });
    });

    it('should throw NotFoundError if hall does not exist', async () => {
      mockRequest.params = { theaterId: 'theater-123', hallId: 'hall-99' };

      (movieHallService.get as jest.Mock).mockResolvedValue(null);

      await controller.getHallById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Hall hall-99 not found in theater theater-123',
        })
      );
    });
  });

  describe('updateHall', () => {
    it('should update hall with valid data', async () => {
      mockRequest.params = { theaterId: 'theater-123', hallId: 'hall-1' };
      mockRequest.body = { quality: '3D' };

      (movieHallService.update as jest.Mock).mockResolvedValue(mockHall);

      await controller.updateHall(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieHallService.update).toHaveBeenCalledWith(
        'theater-123',
        'hall-1',
        { quality: '3D' },
        { transaction: mockTransaction }
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should validate layout if provided in update', async () => {
      mockRequest.params = { theaterId: 'theater-123', hallId: 'hall-1' };
      mockRequest.body = {
        seatsLayout: [[{ seatId: 'A1', type: 'standard' }]],
      };

      (movieHallService.validateLayout as jest.Mock).mockReturnValue({
        isValid: true,
        errors: [],
      });
      (movieHallService.update as jest.Mock).mockResolvedValue(mockHall);

      await controller.updateHall(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieHallService.validateLayout).toHaveBeenCalled();
    });

    it('should throw NotFoundError if hall does not exist', async () => {
      mockRequest.params = { theaterId: 'theater-123', hallId: 'hall-99' };
      mockRequest.body = { quality: '3D' };

      (movieHallService.update as jest.Mock).mockResolvedValue(null);

      await controller.updateHall(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  describe('deleteHall', () => {
    it('should delete hall successfully', async () => {
      mockRequest.params = { theaterId: 'theater-123', hallId: 'hall-1' };

      (movieHallService.remove as jest.Mock).mockResolvedValue(true);

      await controller.deleteHall(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieHallService.remove).toHaveBeenCalledWith(
        'theater-123',
        'hall-1',
        { transaction: mockTransaction }
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should throw NotFoundError if hall does not exist', async () => {
      mockRequest.params = { theaterId: 'theater-123', hallId: 'hall-99' };

      (movieHallService.remove as jest.Mock).mockResolvedValue(false);

      await controller.deleteHall(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
    });
  });

  describe('listHalls', () => {
    it('should list halls with pagination', async () => {
      mockRequest.query = { page: '2', pageSize: '10' };

      const mockResult = {
        items: [mockHall],
        totalItems: 25,
        page: 2,
        limit: 10,
        totalPages: 3,
      };

      (movieHallService.list as jest.Mock).mockResolvedValue(mockResult);

      await controller.listHalls(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieHallService.list).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        sortBy: undefined,
        sortDir: undefined,
        filters: {},
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Movie halls found successfully',
        data: {
          halls: [mockHall],
          total: 25,
          page: 2,
          pageSize: 10,
          totalPages: 3,
        },
      });
    });

    it('should handle filters', async () => {
      mockRequest.query = {
        theaterId: 'theater-123',
        quality: '2D',
        minCapacity: '50',
        maxCapacity: '200',
      };

      const mockResult = {
        items: [],
        totalItems: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };

      (movieHallService.list as jest.Mock).mockResolvedValue(mockResult);

      await controller.listHalls(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieHallService.list).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: {
            theaterId: 'theater-123',
            quality: '2D',
            minCapacity: 50,
            maxCapacity: 200,
          },
        })
      );
    });

    it('should handle array filters', async () => {
      mockRequest.query = {
        theaterId: ['theater-1', 'theater-2'],
        quality: ['2D', '3D'],
      };

      const mockResult = {
        items: [],
        totalItems: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };

      (movieHallService.list as jest.Mock).mockResolvedValue(mockResult);

      await controller.listHalls(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieHallService.list).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: {
            theaterId: ['theater-1', 'theater-2'],
            quality: ['2D', '3D'],
          },
        })
      );
    });
  });

  describe('searchHalls', () => {
    it('should search halls with query string', async () => {
      mockRequest.query = { q: 'premium' };

      const mockResult = {
        items: [mockHall],
        totalItems: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      (movieHallService.search as jest.Mock).mockResolvedValue(mockResult);

      await controller.searchHalls(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieHallService.search).toHaveBeenCalledWith({
        page: undefined,
        limit: undefined,
        sortBy: undefined,
        sortDir: undefined,
        q: 'premium',
        filters: {},
      });
    });
  });

  describe('getHallsByTheater', () => {
    it('should return halls for specific theater', async () => {
      mockRequest.params = { theaterId: 'theater-123' };
      mockRequest.query = { page: '1', pageSize: '10' };

      const mockResult = {
        items: [mockHall],
        totalItems: 5,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      (movieHallService.getByTheater as jest.Mock).mockResolvedValue(
        mockResult
      );

      await controller.getHallsByTheater(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieHallService.getByTheater).toHaveBeenCalledWith(
        'theater-123',
        {
          page: 1,
          limit: 10,
          sortBy: undefined,
          sortDir: undefined,
        }
      );
    });
  });

  describe('getHallsByQuality', () => {
    it('should return halls filtered by quality', async () => {
      mockRequest.params = { quality: 'IMAX' };

      const mockResult = {
        items: [mockHall],
        totalItems: 3,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      (movieHallService.getByQuality as jest.Mock).mockResolvedValue(
        mockResult
      );

      await controller.getHallsByQuality(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieHallService.getByQuality).toHaveBeenCalledWith(
        'IMAX',
        expect.any(Object)
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Halls with IMAX quality found successfully',
        data: expect.any(Object),
      });
    });

    it('should throw BadRequestError for invalid quality', async () => {
      mockRequest.params = { quality: 'INVALID' };

      await controller.getHallsByQuality(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid hall quality',
        })
      );
    });
  });

  describe('getHallsByQualities', () => {
    it('should return halls filtered by multiple qualities', async () => {
      mockRequest.body = { qualities: ['2D', '3D', 'IMAX'] };

      const mockResult = {
        items: [mockHall],
        totalItems: 10,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      (movieHallService.getByQualities as jest.Mock).mockResolvedValue(
        mockResult
      );

      await controller.getHallsByQualities(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieHallService.getByQualities).toHaveBeenCalledWith(
        ['2D', '3D', 'IMAX'],
        expect.any(Object)
      );
    });

    it('should throw BadRequestError if qualities array is empty', async () => {
      mockRequest.body = { qualities: [] };

      await controller.getHallsByQualities(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Qualities array is required',
        })
      );
    });

    it('should throw BadRequestError for invalid qualities', async () => {
      mockRequest.body = { qualities: ['2D', 'INVALID', '3D'] };

      await controller.getHallsByQualities(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid hall qualities: INVALID',
        })
      );
    });
  });

  describe('getMultipleHalls', () => {
    it('should return multiple specific halls', async () => {
      mockRequest.body = {
        halls: [
          { theaterId: 'theater-1', hallId: 'hall-1' },
          { theaterId: 'theater-2', hallId: 'hall-2' },
        ],
      };

      const mockResult = {
        items: [mockHall],
        totalItems: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      (movieHallService.getMultiple as jest.Mock).mockResolvedValue(mockResult);

      await controller.getMultipleHalls(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieHallService.getMultiple).toHaveBeenCalledWith(
        mockRequest.body.halls,
        expect.any(Object)
      );
    });

    it('should throw BadRequestError if halls array is empty', async () => {
      mockRequest.body = { halls: [] };

      await controller.getMultipleHalls(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Halls array is required',
        })
      );
    });

    it('should throw BadRequestError if hall identifier is incomplete', async () => {
      mockRequest.body = {
        halls: [{ theaterId: 'theater-1' }],
      };

      await controller.getMultipleHalls(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Each hall must have theaterId and hallId',
        })
      );
    });
  });

  describe('getHallCapacity', () => {
    it('should return hall capacity information', async () => {
      mockRequest.params = { theaterId: 'theater-123', hallId: 'hall-1' };

      const mockCapacity = {
        theaterId: 'theater-123',
        hallId: 'hall-1',
        totalCapacity: 100,
        availableSeats: 75,
      };

      (movieHallService.getCapacityInfo as jest.Mock).mockResolvedValue(
        mockCapacity
      );

      await controller.getHallCapacity(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieHallService.getCapacityInfo).toHaveBeenCalledWith(
        'theater-123',
        'hall-1'
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Hall capacity information retrieved successfully',
        data: { capacity: mockCapacity },
      });
    });

    it('should throw NotFoundError if hall does not exist', async () => {
      mockRequest.params = { theaterId: 'theater-123', hallId: 'hall-99' };

      (movieHallService.getCapacityInfo as jest.Mock).mockResolvedValue(null);

      await controller.getHallCapacity(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
    });
  });

  describe('getTheaterCapacities', () => {
    it('should return capacities for all halls in theater', async () => {
      mockRequest.params = { theaterId: 'theater-123' };

      const mockCapacities = [
        { hallId: 'hall-1', capacity: 100 },
        { hallId: 'hall-2', capacity: 150 },
      ];

      (movieHallService.getTheaterCapacities as jest.Mock).mockResolvedValue(
        mockCapacities
      );

      await controller.getTheaterCapacities(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieHallService.getTheaterCapacities).toHaveBeenCalledWith(
        'theater-123'
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Theater hall capacities retrieved successfully',
        data: {
          capacities: mockCapacities,
          total: 2,
        },
      });
    });
  });

  describe('checkHallExists', () => {
    it('should return true if hall exists', async () => {
      mockRequest.params = { theaterId: 'theater-123', hallId: 'hall-1' };

      (movieHallService.exists as jest.Mock).mockResolvedValue(true);

      await controller.checkHallExists(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieHallService.exists).toHaveBeenCalledWith(
        'theater-123',
        'hall-1'
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Hall existence check completed',
        data: { exists: true },
      });
    });

    it('should return false if hall does not exist', async () => {
      mockRequest.params = { theaterId: 'theater-123', hallId: 'hall-99' };

      (movieHallService.exists as jest.Mock).mockResolvedValue(false);

      await controller.checkHallExists(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Hall existence check completed',
        data: { exists: false },
      });
    });
  });

  describe('getHallSeatIds', () => {
    it('should return all seat IDs from hall', async () => {
      mockRequest.params = { theaterId: 'theater-123', hallId: 'hall-1' };

      const mockSeatIds = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

      (movieHallService.getAllSeatIds as jest.Mock).mockResolvedValue(
        mockSeatIds
      );

      await controller.getHallSeatIds(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieHallService.getAllSeatIds).toHaveBeenCalledWith(
        'theater-123',
        'hall-1'
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Hall seat IDs retrieved successfully',
        data: {
          seatIds: mockSeatIds,
          total: 6,
        },
      });
    });
  });

  describe('getHallStats', () => {
    it('should return hall statistics', async () => {
      const mockStats = {
        totalHalls: 50,
        byQuality: {
          '2D': 20,
          '3D': 15,
          IMAX: 10,
          '4DX': 5,
        },
        avgCapacity: 125,
      };

      (movieHallService.getStats as jest.Mock).mockResolvedValue(mockStats);

      await controller.getHallStats(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieHallService.getStats).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Hall statistics retrieved successfully',
        data: { stats: mockStats },
      });
    });
  });

  describe('updateHallLayout', () => {
    it('should update hall layout with valid data', async () => {
      mockRequest.params = { theaterId: 'theater-123', hallId: 'hall-1' };
      mockRequest.body = {
        seatsLayout: [[{ seatId: 'A1', type: 'standard' }]],
      };

      (movieHallService.validateLayout as jest.Mock).mockReturnValue({
        isValid: true,
        errors: [],
      });
      (movieHallService.updateLayout as jest.Mock).mockResolvedValue(mockHall);

      await controller.updateHallLayout(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieHallService.validateLayout).toHaveBeenCalled();
      expect(movieHallService.updateLayout).toHaveBeenCalledWith(
        'theater-123',
        'hall-1',
        mockRequest.body.seatsLayout,
        { transaction: mockTransaction }
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should throw BadRequestError if seatsLayout is missing', async () => {
      mockRequest.params = { theaterId: 'theater-123', hallId: 'hall-1' };
      mockRequest.body = {};

      await controller.updateHallLayout(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Valid seats layout is required',
        })
      );
    });

    it('should throw BadRequestError if layout validation fails', async () => {
      mockRequest.params = { theaterId: 'theater-123', hallId: 'hall-1' };
      mockRequest.body = {
        seatsLayout: [[{ seatId: 'A1' }]],
      };

      (movieHallService.validateLayout as jest.Mock).mockReturnValue({
        isValid: false,
        errors: ['Invalid layout structure'],
      });

      await controller.updateHallLayout(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid seats layout: Invalid layout structure',
        })
      );
    });
  });

  describe('validateHallLayout', () => {
    it('should return validation result for valid layout', async () => {
      mockRequest.body = {
        seatsLayout: [[{ seatId: 'A1', type: 'standard' }]],
      };

      (movieHallService.validateLayout as jest.Mock).mockReturnValue({
        isValid: true,
        errors: [],
      });

      await controller.validateHallLayout(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Layout validation completed',
        data: {
          isValid: true,
          errors: [],
        },
      });
    });

    it('should return validation errors for invalid layout', async () => {
      mockRequest.body = {
        seatsLayout: [[{ seatId: 'A1' }]],
      };

      (movieHallService.validateLayout as jest.Mock).mockReturnValue({
        isValid: false,
        errors: ['Duplicate seat IDs', 'Missing seat types'],
      });

      await controller.validateHallLayout(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Layout validation completed',
        data: {
          isValid: false,
          errors: ['Duplicate seat IDs', 'Missing seat types'],
        },
      });
    });

    it('should throw BadRequestError if seatsLayout is missing', async () => {
      mockRequest.body = {};

      await controller.validateHallLayout(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
    });
  });
});
