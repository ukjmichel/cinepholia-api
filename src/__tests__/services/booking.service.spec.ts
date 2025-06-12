// src/__tests__/services/booking.service.spec.ts

const transactionMock = jest.fn((cb) => cb('TRANSACTION_OBJ'));
jest.mock('../../config/db.js', () => ({
  sequelize: { transaction: transactionMock },
}));

jest.mock('../../models/booking.model.js');
jest.mock('../../models/user.model.js');
jest.mock('../../models/screening.model.js');
jest.mock('../../models/movie-hall.model.js');

import { bookingService } from '../../services/booking.service.js';
import { BookingModel, BookingStatus } from '../../models/booking.model.js';
import { UserModel } from '../../models/user.model.js';
import { ScreeningModel } from '../../models/screening.model.js';
import { MovieHallModel } from '../../models/movie-hall.model.js';
import { NotFoundError } from '../../errors/not-found-error.js';
import { ConflictError } from '../../errors/conflict-error.js';
import { Op } from 'sequelize';

const mockBooking = {
  bookingId: 'booking-1',
  userId: 'user-1',
  screeningId: 'screening-1',
  seatsNumber: 3,
  status: 'pending',
  bookingDate: new Date('2025-06-09T18:00:00Z'),
  update: jest.fn(),
  destroy: jest.fn(),
  reload: jest.fn(),
  toJSON: function () {
    return this;
  },
};
// Then add:
mockBooking.reload.mockResolvedValue(mockBooking);

const mockBookingList = [mockBooking];

beforeEach(() => {
  jest.clearAllMocks();
});

describe('bookingService', () => {
  describe('getBookingById', () => {
    it('should return a booking by id', async () => {
      (BookingModel.findByPk as jest.Mock).mockResolvedValue(mockBooking);
      const result = await bookingService.getBookingById(mockBooking.bookingId);
      expect(result).toBe(mockBooking);
      expect(BookingModel.findByPk).toHaveBeenCalledWith(
        mockBooking.bookingId,
        {
          include: [UserModel, ScreeningModel],
        }
      );
    });

    it('should throw NotFoundError if not found', async () => {
      (BookingModel.findByPk as jest.Mock).mockResolvedValue(null);
      await expect(bookingService.getBookingById('bad-id')).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('createBooking', () => {
    const payload = {
      userId: 'user-1',
      screeningId: 'screening-1',
      seatsNumber: 5,
      status: 'pending' as BookingStatus,
      bookingDate: new Date(),
      totalPrice: 25.5,
    };

    it('should create and return a booking if enough seats', async () => {
      (ScreeningModel.findByPk as jest.Mock).mockResolvedValue({
        $get: jest.fn().mockResolvedValue({
          seatsLayout: [
            [1, 2, 3],
            [4, 5, 6],
          ], // 6 seats total
        }),
      });
      (BookingModel.sum as jest.Mock).mockResolvedValue(0); // no booked seats yet
      (BookingModel.create as jest.Mock).mockResolvedValue(mockBooking);

      const result = await bookingService.createBooking(payload);
      expect(result).toBe(mockBooking);
      expect(BookingModel.create).toHaveBeenCalledWith(payload, {
        transaction: 'TRANSACTION_OBJ',
      });
    });

    it('should throw NotFoundError if screening not found', async () => {
      (ScreeningModel.findByPk as jest.Mock).mockResolvedValue(null);
      await expect(bookingService.createBooking(payload)).rejects.toThrow(
        NotFoundError
      );
    });

    it('should throw NotFoundError if hall not found', async () => {
      (ScreeningModel.findByPk as jest.Mock).mockResolvedValue({
        $get: jest.fn().mockResolvedValue(null),
      });
      await expect(bookingService.createBooking(payload)).rejects.toThrow(
        NotFoundError
      );
    });

    it('should throw ConflictError if not enough seats left', async () => {
      (ScreeningModel.findByPk as jest.Mock).mockResolvedValue({
        $get: jest.fn().mockResolvedValue({
          seatsLayout: [
            [1, 2],
            [3, 4],
          ], // 4 seats
        }),
      });
      (BookingModel.sum as jest.Mock).mockResolvedValue(3); // already 3 seats booked
      const badPayload = { ...payload, seatsNumber: 2 };
      await expect(bookingService.createBooking(badPayload)).rejects.toThrow(
        ConflictError
      );
    });
  });

  describe('updateBooking', () => {
    it('should update and return a booking', async () => {
      (BookingModel.findByPk as jest.Mock).mockResolvedValue(mockBooking);
      mockBooking.update.mockResolvedValue(mockBooking);

      const update = { status: 'used' as BookingStatus };
      const result = await bookingService.updateBooking(
        mockBooking.bookingId,
        update
      );
      expect(result).toBe(mockBooking);
      expect(mockBooking.update).toHaveBeenCalledWith(update, {
        transaction: expect.anything(),
      });
      expect(mockBooking.reload).toHaveBeenCalled();
    });

    it('should throw NotFoundError if not found', async () => {
      (BookingModel.findByPk as jest.Mock).mockResolvedValue(null);
      await expect(bookingService.updateBooking('bad-id', {})).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('deleteBooking', () => {
    it('should delete a booking', async () => {
      (BookingModel.findByPk as jest.Mock).mockResolvedValue(mockBooking);
      mockBooking.destroy.mockResolvedValue(true);
      await expect(
        bookingService.deleteBooking(mockBooking.bookingId)
      ).resolves.toBeUndefined();
      expect(mockBooking.destroy).toHaveBeenCalled();
    });

    it('should throw NotFoundError if not found', async () => {
      (BookingModel.findByPk as jest.Mock).mockResolvedValue(null);
      await expect(bookingService.deleteBooking('bad-id')).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('getAllBookings', () => {
    it('should return all bookings', async () => {
      (BookingModel.findAll as jest.Mock).mockResolvedValue(mockBookingList);
      const result = await bookingService.getAllBookings();
      expect(result).toEqual(mockBookingList);
      expect(BookingModel.findAll).toHaveBeenCalledWith({
        include: [UserModel, ScreeningModel],
        order: [['bookingDate', 'DESC']],
      });
    });
  });

  describe('getBookingsByUser', () => {
    it('should return bookings for a user', async () => {
      (BookingModel.findAll as jest.Mock).mockResolvedValue(mockBookingList);
      const result = await bookingService.getBookingsByUser('user-1');
      expect(result).toEqual(mockBookingList);
      expect(BookingModel.findAll).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: [ScreeningModel],
        order: [['bookingDate', 'DESC']],
      });
    });
  });

  describe('getBookingsByScreening', () => {
    it('should return bookings for a screening', async () => {
      (BookingModel.findAll as jest.Mock).mockResolvedValue(mockBookingList);
      const result = await bookingService.getBookingsByScreening('screening-1');
      expect(result).toEqual(mockBookingList);
      expect(BookingModel.findAll).toHaveBeenCalledWith({
        where: { screeningId: 'screening-1' },
        include: [UserModel],
        order: [['bookingDate', 'DESC']],
      });
    });
  });

  describe('getBookingsByStatus', () => {
    it('should return bookings for a status', async () => {
      (BookingModel.findAll as jest.Mock).mockResolvedValue(mockBookingList);
      const result = await bookingService.getBookingsByStatus('pending');
      expect(result).toEqual(mockBookingList);
      expect(BookingModel.findAll).toHaveBeenCalledWith({
        where: { status: 'pending' },
        include: [UserModel, ScreeningModel],
        order: [['bookingDate', 'DESC']],
      });
    });
  });

  describe('searchBookingSimple', () => {
    it('should search bookings by status, screeningId, or userId (with join)', async () => {
      (BookingModel.findAll as jest.Mock).mockResolvedValue(mockBookingList);
      const result = await bookingService.searchBookingSimple('pending');
      expect(result).toEqual(mockBookingList);
      expect(BookingModel.findAll).toHaveBeenCalledWith({
        where: {
          [Op.or]: [
            { status: { [Op.like]: '%pending%' } },
            { screeningId: { [Op.like]: '%pending%' } },
            { userId: { [Op.like]: '%pending%' } },
          ],
        },
        include: [
          { model: UserModel, as: 'user', required: false },
          { model: ScreeningModel, as: 'screening', required: false },
        ],
        order: [['bookingDate', 'DESC']],
      });
    });
  });

  describe('searchBookingVerySimple', () => {
    it('should search bookings by status, screeningId, or userId (no join)', async () => {
      (BookingModel.findAll as jest.Mock).mockResolvedValue(mockBookingList);
      const result = await bookingService.searchBookingVerySimple('canceled');
      expect(result).toEqual(mockBookingList);
      expect(BookingModel.findAll).toHaveBeenCalledWith({
        where: {
          [Op.or]: [
            { status: { [Op.like]: '%canceled%' } },
            { screeningId: { [Op.like]: '%canceled%' } },
            { userId: { [Op.like]: '%canceled%' } },
          ],
        },
        order: [['bookingDate', 'DESC']],
      });
    });
  });
});
