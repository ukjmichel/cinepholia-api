import * as bookingController from '../../controllers/booking.controller.js';
import { BookingService } from '../../services/booking.service.js';
import { NotFoundError } from '../../errors/not-found-error.js';
import { BadRequestError } from '../../errors/bad-request-error.js';
jest.mock('../../services/booking.service.js');

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

const mockBooking = {
  bookingId: 'b-1',
  userId: 'u-1',
  screeningId: 's-1',
  seatsNumber: 2,
  status: 'pending',
  bookingDate: '2025-01-01T00:00:00Z',
  user: { email: 'test@email.com', name: 'Alice' },
  screening: { screeningId: 's-1' },
};

const mockBookings = [mockBooking];

beforeEach(() => {
  jest.clearAllMocks();
});

describe('BookingController', () => {
  describe('getBookingById', () => {
    it('should return a booking by id', async () => {
      (BookingService.getBookingById as jest.Mock).mockResolvedValue(
        mockBooking
      );
      const req = mockRequest({}, { bookingId: 'b-1' });
      const res = mockResponse();
      await bookingController.getBookingById(req, res, mockNext);
      expect(BookingService.getBookingById).toHaveBeenCalledWith('b-1');
      expect(res.json).toHaveBeenCalledWith({
        message: 'Booking found',
        data: mockBooking,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with NotFoundError if not found', async () => {
      (BookingService.getBookingById as jest.Mock).mockRejectedValue(
        new NotFoundError('not found')
      );
      const req = mockRequest({}, { bookingId: '404' });
      const res = mockResponse();
      await bookingController.getBookingById(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('createBooking', () => {
    it('should create a booking and return 201', async () => {
      (BookingService.createBooking as jest.Mock).mockResolvedValue(
        mockBooking
      );
      const req = mockRequest({
        userId: 'u-1',
        screeningId: 's-1',
        seatsNumber: 2,
      });
      const res = mockResponse();
      await bookingController.createBooking(req, res, mockNext);
      expect(BookingService.createBooking).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Booking created',
        data: mockBooking,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with error if creation fails', async () => {
      (BookingService.createBooking as jest.Mock).mockRejectedValue(
        new Error('fail')
      );
      const req = mockRequest({ userId: 'bad' });
      const res = mockResponse();
      await bookingController.createBooking(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(res.status).not.toHaveBeenCalledWith(201);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('updateBooking', () => {
    it('should update and return a booking', async () => {
      (BookingService.updateBooking as jest.Mock).mockResolvedValue({
        ...mockBooking,
        status: 'used',
      });
      const req = mockRequest({ status: 'used' }, { bookingId: 'b-1' });
      const res = mockResponse();
      await bookingController.updateBooking(req, res, mockNext);
      expect(BookingService.updateBooking).toHaveBeenCalledWith('b-1', {
        status: 'used',
      });
      expect(res.json).toHaveBeenCalledWith({
        message: 'Booking updated',
        data: { ...mockBooking, status: 'used' },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with NotFoundError if not found', async () => {
      (BookingService.updateBooking as jest.Mock).mockRejectedValue(
        new NotFoundError('nf')
      );
      const req = mockRequest({ status: 'used' }, { bookingId: 'bad' });
      const res = mockResponse();
      await bookingController.updateBooking(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('deleteBooking', () => {
    it('should delete a booking and return 204', async () => {
      (BookingService.deleteBooking as jest.Mock).mockResolvedValue(undefined);
      const req = mockRequest({}, { bookingId: 'b-1' });
      const res = mockResponse();
      await bookingController.deleteBooking(req, res, mockNext);
      expect(BookingService.deleteBooking).toHaveBeenCalledWith('b-1');
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Booking deleted',
        data: null,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with NotFoundError if not found', async () => {
      (BookingService.deleteBooking as jest.Mock).mockRejectedValue(
        new NotFoundError('not found')
      );
      const req = mockRequest({}, { bookingId: 'fail' });
      const res = mockResponse();
      await bookingController.deleteBooking(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
      expect(res.status).not.toHaveBeenCalledWith(204);
    });
  });

  describe('getAllBookings', () => {
    it('should return all bookings', async () => {
      (BookingService.getAllBookings as jest.Mock).mockResolvedValue(
        mockBookings
      );
      const req = mockRequest();
      const res = mockResponse();
      await bookingController.getAllBookings(req, res, mockNext);
      expect(BookingService.getAllBookings).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        message: 'All bookings',
        data: mockBookings,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next if error thrown', async () => {
      (BookingService.getAllBookings as jest.Mock).mockRejectedValue(
        new Error('fail')
      );
      const req = mockRequest();
      const res = mockResponse();
      await bookingController.getAllBookings(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getBookingsByUser', () => {
    it('should return bookings for a user', async () => {
      (BookingService.getBookingsByUser as jest.Mock).mockResolvedValue(
        mockBookings
      );
      const req = mockRequest({}, { userId: 'u-1' });
      const res = mockResponse();
      await bookingController.getBookingsByUser(req, res, mockNext);
      expect(BookingService.getBookingsByUser).toHaveBeenCalledWith('u-1');
      expect(res.json).toHaveBeenCalledWith({
        message: 'Bookings for user',
        data: mockBookings,
      });
    });
  });

  describe('getBookingsByScreening', () => {
    it('should return bookings for a screening', async () => {
      (BookingService.getBookingsByScreening as jest.Mock).mockResolvedValue(
        mockBookings
      );
      const req = mockRequest({}, { screeningId: 's-1' });
      const res = mockResponse();
      await bookingController.getBookingsByScreening(req, res, mockNext);
      expect(BookingService.getBookingsByScreening).toHaveBeenCalledWith('s-1');
      expect(res.json).toHaveBeenCalledWith({
        message: 'Bookings for screening',
        data: mockBookings,
      });
    });
  });

  describe('getBookingsByStatus', () => {
    it('should return bookings by status', async () => {
      (BookingService.getBookingsByStatus as jest.Mock).mockResolvedValue(
        mockBookings
      );
      const req = mockRequest({}, { status: 'pending' });
      const res = mockResponse();
      await bookingController.getBookingsByStatus(req, res, mockNext);
      expect(BookingService.getBookingsByStatus).toHaveBeenCalledWith(
        'pending'
      );
      expect(res.json).toHaveBeenCalledWith({
        message: 'Bookings with status pending',
        data: mockBookings,
      });
    });
  });

  describe('searchBooking', () => {
    it('should return bookings matching the query', async () => {
      (BookingService.searchBookingSimple as jest.Mock).mockResolvedValue(
        mockBookings
      );
      const req = mockRequest({}, {}, { q: 'alice' });
      const res = mockResponse();
      await bookingController.searchBooking(req, res, mockNext);

      // SUCCESS: returns bookings
      expect(BookingService.searchBookingSimple).toHaveBeenCalledWith('alice');
      expect(res.json).toHaveBeenCalledWith({
        message: 'Bookings search results',
        data: mockBookings,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with BadRequestError if query is missing', async () => {
      const req = mockRequest({}, {}, {});
      const res = mockResponse();
      await bookingController.searchBooking(req, res, mockNext);

      // ERROR: next called, not res.json!
      expect(mockNext).toHaveBeenCalledTimes(1);
      const errorArg = mockNext.mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(BadRequestError);
      expect(errorArg.message).toBe('Query parameter q is required');
      // Use 'status' instead of 'statusCode' to match your BadRequestError class
      expect(errorArg.status).toBe(400);

      expect(res.json).not.toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should call next if error thrown', async () => {
      (BookingService.searchBookingSimple as jest.Mock).mockRejectedValue(
        new Error('fail')
      );
      const req = mockRequest({}, {}, { q: 'fail' });
      const res = mockResponse();
      await bookingController.searchBooking(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
