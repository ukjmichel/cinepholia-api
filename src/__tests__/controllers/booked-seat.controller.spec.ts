import * as bookingController from '../../controllers/booking.controller.js';
import { bookingService } from '../../services/booking.service.js';
import { screeningService } from '../../services/screening.service.js';
import movieStatsService from '../../services/movie-stats.service.js';
import { BadRequestError } from '../../errors/bad-request-error.js';
import { BookingModel } from '../../models/booking.model.js';

// ✅ Mock sequelize.transaction BEFORE imports
jest.mock('../../config/db.js', () => ({
  sequelize: {
    transaction: jest.fn((cb?: any) => {
      const transaction = {
        LOCK: { UPDATE: 'UPDATE' },
        commit: jest.fn(),
        rollback: jest.fn(),
      };
      return cb ? cb(transaction) : Promise.resolve(transaction);
    }),
  },
}));

// ✅ Mock dependent services
jest.mock('../../services/booking.service.js');
jest.mock('../../services/screening.service.js');
jest.mock('../../services/movie-stats.service.js', () => ({
  __esModule: true,
  default: {
    addBooking: jest.fn().mockResolvedValue(undefined),
    removeBooking: jest.fn().mockResolvedValue(undefined),
  },
}));

// ✅ Helpers
const mockRequest = (body = {}, params = {}, query = {}) =>
  ({ body, params, query } as any);
const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};
const mockNext = jest.fn();

// ✅ Shared mock data
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

beforeEach(() => {
  jest.clearAllMocks();
});

describe('BookingController', () => {
  // === GET BY ID ===
  describe('getBookingById', () => {
    it('returns booking if found', async () => {
      (bookingService.getBookingById as jest.Mock).mockResolvedValue(
        mockBooking
      );
      const req = mockRequest({}, { bookingId: 'b-1' });
      const res = mockResponse();

      await bookingController.getBookingById(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Booking found',
        data: mockBooking,
      });
    });

    it('calls next if service throws', async () => {
      (bookingService.getBookingById as jest.Mock).mockRejectedValue(
        new Error('fail')
      );
      const req = mockRequest({}, { bookingId: 'b-1' });
      await bookingController.getBookingById(req, mockResponse(), mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  // === CREATE BOOKING ===
  describe('createBooking', () => {
    it('calls next with error if service rejects', async () => {
      (bookingService.createBooking as jest.Mock).mockRejectedValue(
        new Error('fail')
      );
      const req = mockRequest({
        userId: 'u1',
        screeningId: 's1',
        seatIds: ['A1'],
      });
      await bookingController.createBooking(req, mockResponse(), mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('returns 400 if seatIds contains duplicates', async () => {
      const req = mockRequest({
        userId: 'u1',
        screeningId: 's1',
        seatIds: ['A1', 'A1'],
      });
      const res = mockResponse();
      await bookingController.createBooking(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // === UPDATE BOOKING ===
  describe('updateBooking', () => {
    it('updates and returns booking', async () => {
      (bookingService.updateBooking as jest.Mock).mockResolvedValue({
        ...mockBooking,
        status: 'used',
      });
      const req = mockRequest({ status: 'used' }, { bookingId: 'b-1' });
      const res = mockResponse();

      await bookingController.updateBooking(req, res, mockNext);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Booking updated',
        data: { ...mockBooking, status: 'used' },
      });
    });

    it('rolls back and calls next on error', async () => {
      (bookingService.updateBooking as jest.Mock).mockRejectedValue(
        new Error('fail')
      );
      const req = mockRequest({ status: 'used' }, { bookingId: 'b-1' });
      await bookingController.updateBooking(req, mockResponse(), mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  // === DELETE BOOKING ===
  describe('deleteBooking', () => {
    it('deletes and returns 200 with message', async () => {
      (bookingService.getBookingById as jest.Mock).mockResolvedValue(
        mockBooking
      );
      (screeningService.getScreeningById as jest.Mock).mockResolvedValue({
        movieId: 'm-1',
      });
      (bookingService.deleteBooking as jest.Mock).mockResolvedValue(undefined);
      const req = mockRequest({}, { bookingId: 'b-1' });
      const res = mockResponse();

      await bookingController.deleteBooking(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Booking deleted',
        data: null,
      });
    });

    it('returns 404 if booking not found', async () => {
      (bookingService.getBookingById as jest.Mock).mockResolvedValue(null);
      const res = mockResponse();
      await bookingController.deleteBooking(
        mockRequest({}, { bookingId: 'x' }),
        res,
        mockNext
      );
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Booking not found',
        data: null,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  // === GET ALL BOOKINGS ===
  describe('getAllBookings', () => {
    it('returns all bookings', async () => {
      (bookingService.getAllBookings as jest.Mock).mockResolvedValue(
        mockBookings
      );
      const res = mockResponse();
      await bookingController.getAllBookings(mockRequest(), res, mockNext);
      expect(res.json).toHaveBeenCalledWith({
        message: 'All bookings',
        data: mockBookings,
      });
    });

    it('calls next on error', async () => {
      (bookingService.getAllBookings as jest.Mock).mockRejectedValue(
        new Error('fail')
      );
      await bookingController.getAllBookings(
        mockRequest(),
        mockResponse(),
        mockNext
      );
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  // === SEARCH ===
  describe('searchBooking', () => {
    it('returns results if query present', async () => {
      (bookingService.searchBookingSimple as jest.Mock).mockResolvedValue(
        mockBookings
      );
      const res = mockResponse();
      await bookingController.searchBooking(
        mockRequest({}, {}, { q: 'alice' }),
        res,
        mockNext
      );
      expect(res.json).toHaveBeenCalledWith({
        message: 'Bookings search results',
        data: mockBookings,
      });
    });

    it('returns 400 JSON if q missing (controller does not call next)', async () => {
      const res = mockResponse();
      await bookingController.searchBooking(
        mockRequest(),
        res,
        mockNext
      );
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Query parameter q is required',
        data: null,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  // === MARK USED & CANCEL ===
  describe('markBookingAsUsed & cancelBooking', () => {
    it('marks booking as used', async () => {
      (bookingService.getBookingById as jest.Mock).mockResolvedValue({
        ...mockBooking,
        status: 'pending',
      });
      (bookingService.updateBooking as jest.Mock).mockResolvedValue({
        ...mockBooking,
        status: 'used',
      });
      const res = mockResponse();
      await bookingController.markBookingAsUsed(
        mockRequest({}, { bookingId: 'b-1' }),
        res,
        mockNext
      );
      expect(res.json).toHaveBeenCalledWith({
        message: 'Booking marked as used',
        data: { ...mockBooking, status: 'used' },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('returns 400 JSON if already used (controller does not call next)', async () => {
      (bookingService.getBookingById as jest.Mock).mockResolvedValue({
        ...mockBooking,
        status: 'used',
      });
      const res = mockResponse();
      await bookingController.markBookingAsUsed(
        mockRequest({}, { bookingId: 'b-1' }),
        res,
        mockNext
      );
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Booking already marked as used',
        data: null,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('cancels booking', async () => {
      (bookingService.getBookingById as jest.Mock).mockResolvedValue({
        ...mockBooking,
        status: 'pending',
      });
      (bookingService.updateBooking as jest.Mock).mockResolvedValue({
        ...mockBooking,
        status: 'canceled',
      });
      const res = mockResponse();
      await bookingController.cancelBooking(
        mockRequest({}, { bookingId: 'b-1' }),
        res,
        mockNext
      );
      expect(res.json).toHaveBeenCalledWith({
        message: 'Booking canceled',
        data: { ...mockBooking, status: 'canceled' },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('returns 404 JSON if booking not found when canceling (no next)', async () => {
      (bookingService.getBookingById as jest.Mock).mockResolvedValue(null);
      const res = mockResponse();
      await bookingController.cancelBooking(
        mockRequest({}, { bookingId: 'x' }),
        res,
        mockNext
      );
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Booking not found',
        data: null,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
