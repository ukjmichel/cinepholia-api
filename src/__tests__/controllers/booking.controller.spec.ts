import * as bookingController from '../../controllers/booking.controller.js';
import { bookingService } from '../../services/booking.service.js';
import { NotFoundError } from '../../errors/not-found-error.js';
import { BadRequestError } from '../../errors/bad-request-error.js';
import { sequelize } from '../../config/db.js';
import { BookingModel } from '../../models/booking.model.js';
import { screeningService } from '../../services/screening.service.js';
import movieStatsService from '../../services/movie-stats.service.js';

// Mocks
jest.mock('../../services/booking.service.js');
jest.mock('../../services/screening.service.js');
jest.mock('../../services/movie-stats.service.js', () => ({
  __esModule: true,
  default: {
    removeBooking: jest.fn().mockResolvedValue(undefined),
  },
}));

// Helpers
const mockRequest = (body = {}, params = {}, query = {}) =>
  ({ body, params, query }) as any;

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

// Shared mock data
const mockBooking = {
  bookingId: 'b-1',
  userId: 'u-1',
  screeningId: 's-1',
  seatsNumber: 2,
  totalPrice: 30,
  status: 'pending',
  bookingDate: new Date('2025-01-01T00:00:00Z'),
} as unknown as BookingModel;

const mockBookings = [mockBooking];

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

describe('BookingController', () => {
  describe('getBookingById', () => {
    it('should return a booking by id', async () => {
      (bookingService.getBookingById as jest.Mock).mockResolvedValue(
        mockBooking
      );
      const req = mockRequest({}, { bookingId: 'b-1' });
      const res = mockResponse();

      await bookingController.getBookingById(req, res, mockNext);

      expect(bookingService.getBookingById).toHaveBeenCalledWith('b-1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Booking found',
        data: mockBooking,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('createBooking', () => {
    it('should call next with error if creation fails', async () => {
      (bookingService.createBooking as jest.Mock).mockRejectedValue(
        new Error('fail')
      );
      const req = mockRequest({
        userId: 'bad',
        screeningId: 'bad',
        seatIds: ['s1'],
      });
      const res = mockResponse();

      await bookingController.createBooking(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('updateBooking', () => {
    it('should update and return a booking', async () => {
      const req = mockRequest({ status: 'used' }, { bookingId: 'b-1' });
      const res = mockResponse();

      const mockTransaction = { commit: jest.fn(), rollback: jest.fn() } as any;
      jest.spyOn(sequelize, 'transaction').mockResolvedValue(mockTransaction);

      (bookingService.getBookingById as jest.Mock).mockResolvedValue(
        mockBooking
      );
      (bookingService.updateBooking as jest.Mock).mockResolvedValue({
        ...mockBooking,
        status: 'used',
      });

      await bookingController.updateBooking(req, res, mockNext);

      expect(bookingService.updateBooking).toHaveBeenCalledWith(
        'b-1',
        req.body,
        mockTransaction
      );
      expect(res.json).toHaveBeenCalledWith({
        message: 'Booking updated',
        data: { ...mockBooking, status: 'used' },
      });
    });

    it('should call next with NotFoundError if booking not found', async () => {
      (bookingService.getBookingById as jest.Mock).mockRejectedValue(
        new NotFoundError('Booking not found')
      );
      const req = mockRequest({}, { bookingId: 'bad' });
      const res = mockResponse();

      await bookingController.getBookingById(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
    });
  });

  // ✅ Your original test (unchanged)
  describe('deleteBooking', () => {
    it('should delete a booking and return 204', async () => {
      const req = mockRequest({}, { bookingId: 'b-1' });
      const res = mockResponse();

      (bookingService.getBookingById as jest.Mock).mockResolvedValue(
        mockBooking
      );
      (screeningService.getScreeningById as jest.Mock).mockResolvedValue({
        movieId: 'm-1',
      });
      (bookingService.deleteBooking as jest.Mock).mockResolvedValue(undefined);

      await bookingController.deleteBooking(req, res, mockNext);

      expect(bookingService.deleteBooking).toHaveBeenCalledWith('b-1');
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalledWith();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with NotFoundError if not found', async () => {
      (bookingService.getBookingById as jest.Mock).mockResolvedValue(
        mockBooking
      );
      (screeningService.getScreeningById as jest.Mock).mockResolvedValue({
        movieId: 'm-1',
      });
      (bookingService.deleteBooking as jest.Mock).mockRejectedValue(
        new NotFoundError('not found')
      );
      const req = mockRequest({}, { bookingId: 'fail' });
      const res = mockResponse();

      await bookingController.deleteBooking(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
    });
  });

  // === GET ALL BOOKINGS ===
  describe('getAllBookings', () => {
    it('should return all bookings', async () => {
      (bookingService.getAllBookings as jest.Mock).mockResolvedValue(
        mockBookings
      );
      const req = mockRequest();
      const res = mockResponse();

      await bookingController.getAllBookings(req, res, mockNext);

      expect(res.json).toHaveBeenCalledWith({
        message: 'All bookings',
        data: mockBookings,
      });
    });

    it('should call next if error thrown', async () => {
      (bookingService.getAllBookings as jest.Mock).mockRejectedValue(
        new Error('fail')
      );
      const req = mockRequest();
      const res = mockResponse();

      await bookingController.getAllBookings(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  // === GET BOOKINGS BY USER ===
  describe('getBookingsByUser', () => {
    it('should return bookings for a user', async () => {
      (bookingService.getBookingsByUser as jest.Mock).mockResolvedValue(
        mockBookings
      );
      const req = mockRequest({}, { userId: 'u-1' });
      const res = mockResponse();

      await bookingController.getBookingsByUser(req, res, mockNext);

      expect(res.json).toHaveBeenCalledWith({
        message: 'Bookings by user',
        data: mockBookings,
      });
    });
  });

  // === GET BOOKINGS BY SCREENING ===
  describe('getBookingsByScreening', () => {
    it('should return bookings for a screening', async () => {
      (bookingService.getBookingsByScreening as jest.Mock).mockResolvedValue(
        mockBookings
      );
      const req = mockRequest({}, { screeningId: 's-1' });
      const res = mockResponse();

      await bookingController.getBookingsByScreening(req, res, mockNext);

      expect(res.json).toHaveBeenCalledWith({
        message: 'Bookings by screening',
        data: mockBookings,
      });
    });
  });

  // === GET BOOKINGS BY STATUS ===
  describe('getBookingsByStatus', () => {
    it('should return bookings by status', async () => {
      (bookingService.getBookingsByStatus as jest.Mock).mockResolvedValue(
        mockBookings
      );
      const req = mockRequest({}, { status: 'pending' });
      const res = mockResponse();

      await bookingController.getBookingsByStatus(req, res, mockNext);

      expect(res.json).toHaveBeenCalledWith({
        message: 'Bookings by status',
        data: mockBookings,
      });
    });
  });

  // === SEARCH BOOKINGS ===
  describe('searchBooking', () => {
    it('should return bookings matching the query', async () => {
      (bookingService.searchBookingSimple as jest.Mock).mockResolvedValue(
        mockBookings
      );
      const req = mockRequest({}, {}, { q: 'alice' });
      const res = mockResponse();

      await bookingController.searchBooking(req, res, mockNext);

      expect(res.json).toHaveBeenCalledWith({
        message: 'Bookings search results',
        data: mockBookings,
      });
    });

    it('should call next with BadRequestError if query is missing', async () => {
      const req = mockRequest();
      const res = mockResponse();

      await bookingController.searchBooking(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
    });
  });

  // === MARK BOOKING AS USED ===
  describe('markBookingAsUsed', () => {
    it('should update booking status to used', async () => {
      const req = mockRequest({}, { bookingId: 'b-1' });
      const res = mockResponse();

      (bookingService.getBookingById as jest.Mock).mockResolvedValue({
        ...mockBooking,
        status: 'pending',
      });
      (bookingService.updateBooking as jest.Mock).mockResolvedValue({
        ...mockBooking,
        status: 'used',
      });

      await bookingController.markBookingAsUsed(req, res, mockNext);

      expect(res.json).toHaveBeenCalledWith({
        message: 'Booking marked as used',
        data: { ...mockBooking, status: 'used' },
      });
    });

    it('should call next with BadRequestError if already used', async () => {
      (bookingService.getBookingById as jest.Mock).mockResolvedValue({
        ...mockBooking,
        status: 'used',
      });
      const req = mockRequest({}, { bookingId: 'b-1' });
      const res = mockResponse();

      await bookingController.markBookingAsUsed(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
    });

    it('should call next with BadRequestError if booking not found', async () => {
      (bookingService.getBookingById as jest.Mock).mockResolvedValue(null);
      const req = mockRequest({}, { bookingId: 'b-404' });
      const res = mockResponse();

      await bookingController.markBookingAsUsed(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
    });
  });

  // === CANCEL BOOKING ===
  describe('cancelBooking', () => {
    it('should update booking status to canceled', async () => {
      const req = mockRequest({}, { bookingId: 'b-1' });
      const res = mockResponse();

      (bookingService.getBookingById as jest.Mock).mockResolvedValue({
        ...mockBooking,
        status: 'pending',
      });
      (bookingService.updateBooking as jest.Mock).mockResolvedValue({
        ...mockBooking,
        status: 'canceled',
      });

      await bookingController.cancelBooking(req, res, mockNext);

      expect(res.json).toHaveBeenCalledWith({
        message: 'Booking canceled',
        data: { ...mockBooking, status: 'canceled' },
      });
    });

    it('should call next with BadRequestError if already canceled', async () => {
      (bookingService.getBookingById as jest.Mock).mockResolvedValue({
        ...mockBooking,
        status: 'canceled',
      });
      const req = mockRequest({}, { bookingId: 'b-1' });
      const res = mockResponse();

      await bookingController.cancelBooking(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
    });

    it('should call next with BadRequestError if booking not found', async () => {
      (bookingService.getBookingById as jest.Mock).mockResolvedValue(null);
      const req = mockRequest({}, { bookingId: 'b-404' });
      const res = mockResponse();

      await bookingController.cancelBooking(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
    });
  });
});
