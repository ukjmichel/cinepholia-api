import * as bookingController from '../../controllers/booking.controller.js';
import { bookingService } from '../../services/booking.service.js';
import { NotFoundError } from '../../errors/not-found-error.js';
import { BadRequestError } from '../../errors/bad-request-error.js';
import { sequelize } from '../../config/db.js';
import { ScreeningModel } from '../../models/screening.model.js';
import { bookedSeatService } from '../../services/booked-seat.service.js';
import { BookingModel } from '../../models/booking.model.js';
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
      (bookingService.getBookingById as jest.Mock).mockResolvedValue(
        mockBooking
      );
      const req = mockRequest({}, { bookingId: 'b-1' });
      const res = mockResponse();
      await bookingController.getBookingById(req, res, mockNext);
      expect(bookingService.getBookingById).toHaveBeenCalledWith('b-1');
      expect(res.json).toHaveBeenCalledWith({
        message: 'Booking found',
        data: mockBooking,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with NotFoundError if not found', async () => {
      (bookingService.getBookingById as jest.Mock).mockRejectedValue(
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
      // Arrange
      const req = mockRequest(
        {
          screeningId: 's-1',
          seatsNumber: 2,
          seatIds: ['A1', 'A2'],
        },
        {},
        {}
      );
      // ➜ Mock correctement req.user ici :
      req.user = { userId: 'u-1' };

      const res = mockResponse();
      const mockTransaction = { commit: jest.fn(), rollback: jest.fn() } as any;

      jest.spyOn(sequelize, 'transaction').mockResolvedValue(mockTransaction);

      // Mock la lecture du screening pour avoir un prix
      jest
        .spyOn(ScreeningModel, 'findByPk')
        .mockResolvedValue({ price: 10 } as any);

      // Mock les validations seats (doivent ne rien retourner)
      jest
        .spyOn(bookedSeatService, 'checkSeatsExist')
        .mockResolvedValue(undefined);
      jest
        .spyOn(bookedSeatService, 'checkSeatsAvailable')
        .mockResolvedValue(undefined);

      // Mock le service de création de booking
      const bookingResult = {
        bookingId: 'b-1',
        userId: 'u-1',
        screeningId: 's-1',
        seatsNumber: 2,
        status: 'pending',
        totalPrice: 20,
      };
      jest
        .spyOn(bookingService, 'createBooking')
        .mockResolvedValue(bookingResult as BookingModel);

      // Mock la création des booked seats (un objet pour chaque seatId)
      jest
        .spyOn(bookedSeatService, 'createSeatBooking')
        .mockResolvedValue({} as any);

      // Mock crypto.randomUUID pour être stable
      jest
        .spyOn(global.crypto, 'randomUUID')
        .mockReturnValue('11111111-1111-1111-1111-111111111111');

      // Act
      await bookingController.createBooking(req as any, res as any, mockNext);

      // Assert
      expect(sequelize.transaction).toHaveBeenCalled();
      expect(ScreeningModel.findByPk).toHaveBeenCalledWith('s-1', {
        transaction: mockTransaction,
      });
      expect(bookedSeatService.checkSeatsExist).toHaveBeenCalledWith(
        's-1',
        ['A1', 'A2'],
        mockTransaction
      );
      expect(bookedSeatService.checkSeatsAvailable).toHaveBeenCalledWith(
        's-1',
        ['A1', 'A2'],
        mockTransaction
      );
      expect(bookingService.createBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingId: '11111111-1111-1111-1111-111111111111',
          userId: 'u-1',
          screeningId: 's-1',
          seatsNumber: 2,
          status: 'pending',
          totalPrice: 20,
        }),
        mockTransaction
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Booking created successfully',
          booking: bookingResult,
          totalSeats: 2,
        })
      );
    });

    it('should call next with error if creation fails', async () => {
      (bookingService.createBooking as jest.Mock).mockRejectedValue(
        new Error('fail')
      );
      const req = mockRequest({ userId: 'bad' });
      req.user = { userId: 'bad' };
      const res = mockResponse();
      await bookingController.createBooking(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(res.status).not.toHaveBeenCalledWith(201);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('updateBooking', () => {
    it('should update and return a booking', async () => {
      const req = mockRequest({ status: 'used' }, { bookingId: 'b-1' });

      const res = mockResponse();
      const mockTransaction = { commit: jest.fn(), rollback: jest.fn() } as any;
      jest.spyOn(sequelize, 'transaction').mockResolvedValue(mockTransaction);

      // Mock booking existant (retourné par getBookingById)
      const booking = {
        bookingId: 'b-1',
        screeningId: 's-1',
        seatsNumber: 2,
        totalPrice: 10,
      };
      jest
        .spyOn(bookingService, 'getBookingById')
        .mockResolvedValue(booking as BookingModel);

      // Mock screening existant avec prix
      jest
        .spyOn(ScreeningModel, 'findByPk')
        .mockResolvedValue({ price: 10 } as any);

      // Mock updateBooking pour le retour final
      const updatedBooking = { ...booking, status: 'used' };
      jest
        .spyOn(bookingService, 'updateBooking')
        .mockResolvedValue(updatedBooking as BookingModel);

      // Act
      await bookingController.updateBooking(req as any, res as any, mockNext);

      // Assert
      expect(bookingService.updateBooking).toHaveBeenCalledWith(
        'b-1',
        req.body,
        mockTransaction
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Booking updated',
          data: expect.objectContaining({
            booking: updatedBooking,
            totalSeats: 2,
          }),
        })
      );
    });

    it('should call next with NotFoundError if not found', async () => {
      // @ts-expect-error intentionally returning undefined for this test
      jest.spyOn(bookingService, 'getBookingById').mockResolvedValue(undefined);

      const req = mockRequest({ status: 'used' }, { bookingId: 'bad' });
      const res = mockResponse();
      await bookingController.updateBooking(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('deleteBooking', () => {
    it('should delete a booking and return 204', async () => {
      (bookingService.deleteBooking as jest.Mock).mockResolvedValue(undefined);
      const req = mockRequest({}, { bookingId: 'b-1' });
      const res = mockResponse();
      await bookingController.deleteBooking(req, res, mockNext);
      expect(bookingService.deleteBooking).toHaveBeenCalledWith('b-1');
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalledWith(); // Changed from res.json to res.send with no arguments
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with NotFoundError if not found', async () => {
      (bookingService.deleteBooking as jest.Mock).mockRejectedValue(
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
      (bookingService.getAllBookings as jest.Mock).mockResolvedValue(
        mockBookings
      );
      const req = mockRequest();
      const res = mockResponse();
      await bookingController.getAllBookings(req, res, mockNext);
      expect(bookingService.getAllBookings).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        message: 'All bookings',
        data: mockBookings,
      });
      expect(mockNext).not.toHaveBeenCalled();
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

  describe('getBookingsByUser', () => {
    it('should return bookings for a user', async () => {
      (bookingService.getBookingsByUser as jest.Mock).mockResolvedValue(
        mockBookings
      );
      const req = mockRequest({}, { userId: 'u-1' });
      const res = mockResponse();
      await bookingController.getBookingsByUser(req, res, mockNext);
      expect(bookingService.getBookingsByUser).toHaveBeenCalledWith('u-1');
      expect(res.json).toHaveBeenCalledWith({
        message: 'Bookings for user',
        data: mockBookings,
      });
    });
  });

  describe('getBookingsByScreening', () => {
    it('should return bookings for a screening', async () => {
      (bookingService.getBookingsByScreening as jest.Mock).mockResolvedValue(
        mockBookings
      );
      const req = mockRequest({}, { screeningId: 's-1' });
      const res = mockResponse();
      await bookingController.getBookingsByScreening(req, res, mockNext);
      expect(bookingService.getBookingsByScreening).toHaveBeenCalledWith('s-1');
      expect(res.json).toHaveBeenCalledWith({
        message: 'Bookings for screening',
        data: mockBookings,
      });
    });
  });

  describe('getBookingsByStatus', () => {
    it('should return bookings by status', async () => {
      (bookingService.getBookingsByStatus as jest.Mock).mockResolvedValue(
        mockBookings
      );
      const req = mockRequest({}, { status: 'pending' });
      const res = mockResponse();
      await bookingController.getBookingsByStatus(req, res, mockNext);
      expect(bookingService.getBookingsByStatus).toHaveBeenCalledWith(
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
      (bookingService.searchBookingSimple as jest.Mock).mockResolvedValue(
        mockBookings
      );
      const req = mockRequest({}, {}, { q: 'alice' });
      const res = mockResponse();
      await bookingController.searchBooking(req, res, mockNext);

      // SUCCESS: returns bookings
      expect(bookingService.searchBookingSimple).toHaveBeenCalledWith('alice');
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
      (bookingService.searchBookingSimple as jest.Mock).mockRejectedValue(
        new Error('fail')
      );
      const req = mockRequest({}, {}, { q: 'fail' });
      const res = mockResponse();
      await bookingController.searchBooking(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
