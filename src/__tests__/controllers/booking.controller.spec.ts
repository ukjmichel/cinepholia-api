import { Request, Response, NextFunction } from 'express';
import { BookingController } from '../../controllers/booking.controller';
import { bookingService } from '../../services/booking.service';
import { bookedSeatService } from '../../services/booked-seat.service';
import screeningService from '../../services/screening.service';
import movieStatsService from '../../services/movie-stats.service';
import { sequelize } from '../../config/db';
import { NotFoundError } from '../../errors/not-found-error';
import { BadRequestError } from '../../errors/bad-request-error';
import { ConflictError } from '../../errors/conflict-error';

// Extend Express Request type to include user
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string;
      roles?: string[];
    };
  }
}

// Mock dependencies
jest.mock('../../services/booking.service');
jest.mock('../../services/booked-seat.service');
jest.mock('../../services/screening.service');
jest.mock('../../services/movie-stats.service');
jest.mock('../../config/db');

describe('BookingController', () => {
  let controller: BookingController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockTransaction: any;

  beforeEach(() => {
    controller = new BookingController();

    mockRequest = {
      params: {},
      query: {},
      body: {},
      user: undefined,
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

  describe('listBookings', () => {
    it('should return paginated bookings successfully', async () => {
      const mockResult = {
        items: [
          { bookingId: '1', userId: 'user1', status: 'PENDING' },
          { bookingId: '2', userId: 'user2', status: 'CONFIRMED' },
        ],
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      };

      (bookingService.list as jest.Mock).mockResolvedValue(mockResult);

      await controller.listBookings(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(bookingService.list).toHaveBeenCalledWith({
        page: undefined,
        limit: undefined,
        sortBy: undefined,
        sortDir: undefined,
        filters: {},
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Bookings retrieved successfully',
        data: mockResult.items,
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
        },
      });
    });

    it('should handle query parameters correctly', async () => {
      mockRequest.query = {
        page: '2',
        limit: '20',
        sortBy: 'createdAt',
        sortDir: 'desc',
        status: 'PENDING',
        userId: 'user1',
      };

      const mockResult = {
        items: [],
        page: 2,
        limit: 20,
        total: 0,
        totalPages: 0,
      };

      (bookingService.list as jest.Mock).mockResolvedValue(mockResult);

      await controller.listBookings(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(bookingService.list).toHaveBeenCalledWith({
        page: 2,
        limit: 20,
        sortBy: 'createdAt',
        sortDir: 'desc',
        filters: {
          status: 'PENDING',
          userId: 'user1',
        },
      });
    });

    it('should call next with error on failure', async () => {
      const error = new Error('Database error');
      (bookingService.list as jest.Mock).mockRejectedValue(error);

      await controller.listBookings(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('searchBookings', () => {
    it('should search bookings with query string', async () => {
      mockRequest.query = { q: 'search term', page: '1' };

      const mockResult = {
        items: [{ bookingId: '1' }],
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      };

      (bookingService.search as jest.Mock).mockResolvedValue(mockResult);

      await controller.searchBookings(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(bookingService.search).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'search term', page: 1 })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('createBooking', () => {
    const validBookingData = {
      userId: 'user-123',
      screeningId: 'screening-123',
      seatIds: ['seat-1', 'seat-2'],
    };

    const mockScreening = {
      screeningId: 'screening-123',
      movieId: 'movie-123',
      ticketPrice: 10,
      startTime: new Date(Date.now() + 86400000), // Tomorrow
    };

    beforeEach(() => {
      mockRequest.body = validBookingData;
    });

    it('should create booking successfully with all validations passing', async () => {
      (screeningService.getById as jest.Mock).mockResolvedValue(mockScreening);
      (bookedSeatService.validateSeatsExist as jest.Mock).mockResolvedValue(
        true
      );
      (bookedSeatService.validateSeatsAvailable as jest.Mock).mockResolvedValue(
        true
      );
      (bookingService.createBookingWithSeats as jest.Mock).mockResolvedValue({
        bookingId: 'booking-123',
        ...validBookingData,
      });
      (movieStatsService.addBooking as jest.Mock).mockResolvedValue({});

      await controller.createBooking(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(screeningService.getById).toHaveBeenCalledWith('screening-123', {
        transaction: mockTransaction,
      });
      expect(bookedSeatService.validateSeatsExist).toHaveBeenCalled();
      expect(bookedSeatService.validateSeatsAvailable).toHaveBeenCalled();
      expect(bookingService.createBookingWithSeats).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          screeningId: 'screening-123',
          seatsNumber: 2,
          totalPrice: 20,
          status: 'PENDING',
        }),
        ['seat-1', 'seat-2'],
        { transaction: mockTransaction }
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(movieStatsService.addBooking).toHaveBeenCalledWith(
        'movie-123',
        2,
        expect.any(String)
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 if userId is missing', async () => {
      mockRequest.body = { ...validBookingData, userId: undefined };

      await controller.createBooking(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'userId is required and must be a string',
        data: null,
      });
      expect(mockTransaction.commit).not.toHaveBeenCalled();
    });

    it('should return 400 if screeningId is missing', async () => {
      mockRequest.body = { ...validBookingData, screeningId: undefined };

      await controller.createBooking(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'screeningId is required and must be a string',
        data: null,
      });
    });

    it('should return 400 if seatIds is empty array', async () => {
      mockRequest.body = { ...validBookingData, seatIds: [] };

      await controller.createBooking(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'seatIds is required and must be a non-empty array',
        data: null,
      });
    });

    it('should return 400 if seatIds contains duplicates', async () => {
      mockRequest.body = { ...validBookingData, seatIds: ['seat-1', 'seat-1'] };

      await controller.createBooking(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Duplicate seats in booking request',
        data: null,
      });
    });

    it('should return 404 if screening not found', async () => {
      (screeningService.getById as jest.Mock).mockResolvedValue(null);

      await controller.createBooking(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Screening not found',
        data: null,
      });
    });

    it('should return 400 if screening already started', async () => {
      const pastScreening = {
        ...mockScreening,
        startTime: new Date(Date.now() - 86400000), // Yesterday
      };
      (screeningService.getById as jest.Mock).mockResolvedValue(pastScreening);

      await controller.createBooking(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Screening already started or finished',
        data: null,
      });
    });

    it('should return 409 on unique constraint error', async () => {
      (screeningService.getById as jest.Mock).mockResolvedValue(mockScreening);
      (bookedSeatService.validateSeatsExist as jest.Mock).mockResolvedValue(
        true
      );
      (bookedSeatService.validateSeatsAvailable as jest.Mock).mockResolvedValue(
        true
      );

      const uniqueError = new Error('Duplicate');
      (uniqueError as any).name = 'SequelizeUniqueConstraintError';
      (bookingService.createBookingWithSeats as jest.Mock).mockRejectedValue(
        uniqueError
      );

      await controller.createBooking(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'One or more seats have just been booked',
        data: null,
      });
    });

    it('should handle movie stats update failure gracefully', async () => {
      (screeningService.getById as jest.Mock).mockResolvedValue(mockScreening);
      (bookedSeatService.validateSeatsExist as jest.Mock).mockResolvedValue(
        true
      );
      (bookedSeatService.validateSeatsAvailable as jest.Mock).mockResolvedValue(
        true
      );
      (bookingService.createBookingWithSeats as jest.Mock).mockResolvedValue(
        {}
      );
      (movieStatsService.addBooking as jest.Mock).mockRejectedValue(
        new Error('Stats error')
      );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await controller.createBooking(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to update movie stats:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getBooking', () => {
    it('should return booking by ID', async () => {
      const mockBooking = { bookingId: '123', userId: 'user1' };
      mockRequest.params = { bookingId: '123' };
      (bookingService.getById as jest.Mock).mockResolvedValue(mockBooking);

      await controller.getBooking(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(bookingService.getById).toHaveBeenCalledWith('123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Booking retrieved successfully',
        data: mockBooking,
      });
    });

    it('should return 404 if booking not found', async () => {
      mockRequest.params = { bookingId: '123' };
      (bookingService.getById as jest.Mock).mockRejectedValue(
        new NotFoundError('Booking not found')
      );

      await controller.getBooking(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Booking not found',
        data: null,
      });
    });
  });

  describe('updateBooking', () => {
    it('should update booking if user is owner', async () => {
      const mockBooking = { bookingId: '123', userId: 'user1' };
      const updatedBooking = { ...mockBooking, status: 'CONFIRMED' };

      mockRequest.params = { bookingId: '123' };
      mockRequest.body = { status: 'CONFIRMED' };
      (mockRequest as any).user = { id: 'user1' };

      (bookingService.getById as jest.Mock).mockResolvedValue(mockBooking);
      (bookingService.update as jest.Mock).mockResolvedValue(updatedBooking);

      await controller.updateBooking(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(bookingService.update).toHaveBeenCalledWith('123', {
        status: 'CONFIRMED',
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Booking updated successfully',
        data: updatedBooking,
      });
    });

    it('should update booking if user is admin', async () => {
      const mockBooking = { bookingId: '123', userId: 'user1' };
      const updatedBooking = { ...mockBooking, status: 'CONFIRMED' };

      mockRequest.params = { bookingId: '123' };
      mockRequest.body = { status: 'CONFIRMED' };
      (mockRequest as any).user = { id: 'user2', roles: ['admin'] };

      (bookingService.getById as jest.Mock).mockResolvedValue(mockBooking);
      (bookingService.update as jest.Mock).mockResolvedValue(updatedBooking);

      await controller.updateBooking(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should return 403 if user is not owner or admin', async () => {
      const mockBooking = { bookingId: '123', userId: 'user1' };

      mockRequest.params = { bookingId: '123' };
      (mockRequest as any).user = { id: 'user2', roles: ['user'] };

      (bookingService.getById as jest.Mock).mockResolvedValue(mockBooking);

      await controller.updateBooking(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Forbidden',
        data: null,
      });
    });
  });

  describe('deleteBooking', () => {
    const mockBooking = {
      bookingId: '123',
      userId: 'user1',
      seatsNumber: 2,
      screeningId: 'screening-123',
    };

    const mockScreening = {
      screeningId: 'screening-123',
      movieId: 'movie-123',
    };

    it('should delete booking and update stats', async () => {
      mockRequest.params = { bookingId: '123' };
      (mockRequest as any).user = { id: 'user1' };

      (bookingService.getById as jest.Mock).mockResolvedValue(mockBooking);
      (
        bookedSeatService.deleteSeatBookingsByBookingId as jest.Mock
      ).mockResolvedValue(true);
      (bookingService.remove as jest.Mock).mockResolvedValue(true);
      (screeningService.getById as jest.Mock).mockResolvedValue(mockScreening);
      (movieStatsService.removeBooking as jest.Mock).mockResolvedValue({});

      await controller.deleteBooking(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(
        bookedSeatService.deleteSeatBookingsByBookingId
      ).toHaveBeenCalledWith('123', mockTransaction);
      expect(bookingService.remove).toHaveBeenCalledWith('123', {
        transaction: mockTransaction,
      });
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(movieStatsService.removeBooking).toHaveBeenCalledWith(
        'movie-123',
        2,
        expect.any(String)
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should return 403 if user is not authorized', async () => {
      mockRequest.params = { bookingId: '123' };
      (mockRequest as any).user = { id: 'user2', roles: [] };

      (bookingService.getById as jest.Mock).mockResolvedValue(mockBooking);

      await controller.deleteBooking(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
  });

  describe('cancelBooking', () => {
    const mockBooking = {
      bookingId: '123',
      userId: 'user1',
      status: 'PENDING',
      seatsNumber: 2,
      screeningId: 'screening-123',
    };

    const mockScreening = {
      screeningId: 'screening-123',
      movieId: 'movie-123',
    };

    it('should cancel booking and update stats', async () => {
      mockRequest.params = { bookingId: '123' };
      (mockRequest as any).user = { id: 'user1' };

      (bookingService.getById as jest.Mock).mockResolvedValue(mockBooking);
      (bookingService.update as jest.Mock).mockResolvedValue({
        ...mockBooking,
        status: 'CANCELLED',
      });
      (screeningService.getById as jest.Mock).mockResolvedValue(mockScreening);
      (movieStatsService.removeBooking as jest.Mock).mockResolvedValue({});

      await controller.cancelBooking(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(bookingService.update).toHaveBeenCalledWith('123', {
        status: 'CANCELLED',
      });
      expect(movieStatsService.removeBooking).toHaveBeenCalledWith(
        'movie-123',
        2,
        expect.any(String)
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 if booking already cancelled', async () => {
      mockRequest.params = { bookingId: '123' };
      (mockRequest as any).user = { id: 'user1' };

      (bookingService.getById as jest.Mock).mockResolvedValue({
        ...mockBooking,
        status: 'CANCELLED',
      });

      await controller.cancelBooking(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Booking already cancelled',
        data: null,
      });
    });

    it('should return 403 if user not authorized', async () => {
      mockRequest.params = { bookingId: '123' };
      (mockRequest as any).user = { id: 'user2', roles: [] };

      (bookingService.getById as jest.Mock).mockResolvedValue(mockBooking);

      await controller.cancelBooking(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
  });

  describe('markBookingAsUsed', () => {
    it('should mark booking as used', async () => {
      const mockBooking = { bookingId: '123', status: 'PENDING' };
      mockRequest.params = { bookingId: '123' };

      (bookingService.getById as jest.Mock).mockResolvedValue(mockBooking);
      (bookingService.update as jest.Mock).mockResolvedValue({
        ...mockBooking,
        status: 'USED',
      });

      await controller.markBookingAsUsed(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(bookingService.update).toHaveBeenCalledWith('123', {
        status: 'USED',
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 if booking already used', async () => {
      const mockBooking = { bookingId: '123', status: 'USED' };
      mockRequest.params = { bookingId: '123' };

      (bookingService.getById as jest.Mock).mockResolvedValue(mockBooking);

      await controller.markBookingAsUsed(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Booking already marked as used',
        data: null,
      });
    });
  });

  describe('getBookingsByUser', () => {
    it('should return user bookings with pagination', async () => {
      const mockResult = {
        items: [{ bookingId: '1' }, { bookingId: '2' }],
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      };

      mockRequest.params = { userId: 'user1' };
      (bookingService.getByUser as jest.Mock).mockResolvedValue(mockResult);

      await controller.getBookingsByUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(bookingService.getByUser).toHaveBeenCalledWith(
        'user1',
        expect.any(Object)
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getBookingsByScreening', () => {
    it('should return screening bookings with pagination', async () => {
      const mockResult = {
        items: [{ bookingId: '1' }],
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      };

      mockRequest.params = { screeningId: 'screening1' };
      (bookingService.getByScreening as jest.Mock).mockResolvedValue(
        mockResult
      );

      await controller.getBookingsByScreening(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(bookingService.getByScreening).toHaveBeenCalledWith(
        'screening1',
        expect.any(Object)
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getBookingsByStatus', () => {
    it('should return bookings filtered by status', async () => {
      const mockResult = {
        items: [{ bookingId: '1', status: 'PENDING' }],
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      };

      mockRequest.params = { status: 'PENDING' };
      (bookingService.getByStatus as jest.Mock).mockResolvedValue(mockResult);

      await controller.getBookingsByStatus(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(bookingService.getByStatus).toHaveBeenCalledWith(
        'PENDING',
        expect.any(Object)
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getUpcomingBookingsByUser', () => {
    it('should return upcoming bookings for user', async () => {
      const mockResult = {
        items: [{ bookingId: '1' }],
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      };

      mockRequest.params = { userId: 'user1' };
      (bookingService.getUpcomingByUser as jest.Mock).mockResolvedValue(
        mockResult
      );

      await controller.getUpcomingBookingsByUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(bookingService.getUpcomingByUser).toHaveBeenCalledWith(
        'user1',
        expect.any(Date),
        expect.any(Object)
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });
});
