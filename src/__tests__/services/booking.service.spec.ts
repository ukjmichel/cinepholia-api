/**
 * Unit tests for BookingService using Jest.
 * - Mocks Sequelize, models, and db connection.
 * - Covers CRUD operations, transaction handling, and search/filter logic.
 * - Skips business logic not present in current BookingService (see skipped tests).
 */

// --- Mocking dependencies ---
// Mock sequelize's transaction method to simulate transactional operations in tests.
const transactionMock = jest.fn((cb) => cb('TRANSACTION_OBJ'));
jest.mock('../../config/db.js', () => ({
  sequelize: { transaction: transactionMock },
}));

// Mock all related Sequelize models
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
import { Op, Transaction } from 'sequelize';

// --- Shared mocks used in all tests ---
// A mock booking instance with dummy data and all methods mocked.
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
// For .reload() chain
mockBooking.reload.mockResolvedValue(mockBooking);
const mockBookingList = [mockBooking];

// Clear mocks before each test for isolation
beforeEach(() => {
  jest.clearAllMocks();
});

describe('bookingService', () => {
  // --- getBookingById ---
  describe('getBookingById', () => {
    it('should return a booking by id', async () => {
      (BookingModel.findByPk as jest.Mock).mockResolvedValue(mockBooking);
      const result = await bookingService.getBookingById(mockBooking.bookingId);
      expect(result).toBe(mockBooking);
      expect(BookingModel.findByPk).toHaveBeenCalledWith(
        mockBooking.bookingId,
        { include: [UserModel, ScreeningModel] }
      );
    });

    it('should throw NotFoundError if not found', async () => {
      (BookingModel.findByPk as jest.Mock).mockResolvedValue(null);
      await expect(bookingService.getBookingById('bad-id')).rejects.toThrow(
        NotFoundError
      );
    });
  });

  // --- createBooking ---
  describe('createBooking', () => {
    const payload = {
      userId: 'user-1',
      screeningId: 'screening-1',
      seatsNumber: 5,
      status: 'pending' as BookingStatus,
      bookingDate: new Date(),
      totalPrice: 25.5,
    };

    it('should create and return a booking (with transaction argument)', async () => {
      (BookingModel.create as jest.Mock).mockResolvedValue(mockBooking);
      // Passes explicit transaction
      const result = await bookingService.createBooking(
        payload,
        'TRANSACTION_OBJ' as unknown as Transaction
      );
      expect(result).toBe(mockBooking);
      expect(BookingModel.create).toHaveBeenCalledWith(payload, {
        transaction: 'TRANSACTION_OBJ',
      });
    });

    it('should create and return a booking (without transaction)', async () => {
      (BookingModel.create as jest.Mock).mockResolvedValue(mockBooking);
      const result = await bookingService.createBooking(payload);
      expect(result).toBe(mockBooking);
      expect(BookingModel.create).toHaveBeenCalledWith(payload, {
        transaction: undefined,
      });
    });

    // Skipped tests for future business rules (screening/hall/seats checks).
    it.skip('should throw NotFoundError if screening not found', async () => {});
    it.skip('should throw NotFoundError if hall not found', async () => {});
    it.skip('should throw ConflictError if not enough seats left', async () => {});
  });

  // --- updateBooking ---
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
        transaction: undefined,
      });
      expect(mockBooking.reload).toHaveBeenCalledWith({
        transaction: undefined,
      });
    });

    it('should update and return a booking (with transaction)', async () => {
      (BookingModel.findByPk as jest.Mock).mockResolvedValue(mockBooking);
      mockBooking.update.mockResolvedValue(mockBooking);

      const update = { status: 'used' as BookingStatus };
      const result = await bookingService.updateBooking(
        mockBooking.bookingId,
        update,
        'TRANSACTION_OBJ' as unknown as Transaction
      );
      expect(result).toBe(mockBooking);
      expect(mockBooking.update).toHaveBeenCalledWith(update, {
        transaction: 'TRANSACTION_OBJ',
      });
      expect(mockBooking.reload).toHaveBeenCalledWith({
        transaction: 'TRANSACTION_OBJ',
      });
    });

    it('should throw NotFoundError if not found', async () => {
      (BookingModel.findByPk as jest.Mock).mockResolvedValue(null);
      await expect(bookingService.updateBooking('bad-id', {})).rejects.toThrow(
        NotFoundError
      );
    });
  });

  // --- deleteBooking ---
  describe('deleteBooking', () => {
    it('should delete a booking (with transaction)', async () => {
      (BookingModel.findByPk as jest.Mock).mockResolvedValue(mockBooking);
      mockBooking.destroy.mockResolvedValue(true);

      // Call with a transaction
      await expect(
        bookingService.deleteBooking(
          mockBooking.bookingId,
          'TRANSACTION_OBJ' as unknown as Transaction
        )
      ).resolves.toBeUndefined();
      expect(BookingModel.findByPk).toHaveBeenCalledWith(
        mockBooking.bookingId,
        { transaction: 'TRANSACTION_OBJ' }
      );
      expect(mockBooking.destroy).toHaveBeenCalledWith({
        transaction: 'TRANSACTION_OBJ',
      });
    });

    it('should delete a booking (auto transaction)', async () => {
      (BookingModel.findByPk as jest.Mock).mockResolvedValue(mockBooking);
      mockBooking.destroy.mockResolvedValue(true);

      // Call without a transaction
      await expect(
        bookingService.deleteBooking(mockBooking.bookingId)
      ).resolves.toBeUndefined();
      // Should use the sequelize.transaction (see mock)
      expect(transactionMock).toHaveBeenCalled();
      expect(BookingModel.findByPk).toHaveBeenCalledWith(
        mockBooking.bookingId,
        { transaction: 'TRANSACTION_OBJ' }
      );
      expect(mockBooking.destroy).toHaveBeenCalledWith({
        transaction: 'TRANSACTION_OBJ',
      });
    });

    it('should throw NotFoundError if not found', async () => {
      (BookingModel.findByPk as jest.Mock).mockResolvedValue(null);
      await expect(
        bookingService.deleteBooking(
          'bad-id',
          'TRANSACTION_OBJ' as unknown as Transaction
        )
      ).rejects.toThrow(NotFoundError);
    });
  });

  // --- getAllBookings ---
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

  // --- getBookingsByUser ---
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

  // --- getBookingsByScreening ---
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

  // --- getBookingsByStatus ---
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

  // --- searchBooking ---
 describe('searchBooking', () => {
   it('should search with filters and includeJoins = true', async () => {
     (BookingModel.findAll as jest.Mock).mockResolvedValue(mockBookingList);
     const filters = { userId: 'user-1', status: 'pending' };
     const result = await bookingService.searchBooking(filters, true);
     expect(result).toEqual(mockBookingList);
     expect(BookingModel.findAll).toHaveBeenCalledWith({
       where: { userId: 'user-1', status: 'pending' },
       order: [['bookingDate', 'DESC']],
       include: [
         { model: UserModel, as: 'user', required: false },
         { model: ScreeningModel, as: 'screening', required: false },
       ],
     });
   });

   it('should search with filters and includeJoins = false', async () => {
     (BookingModel.findAll as jest.Mock).mockResolvedValue(mockBookingList);
     const filters = { userId: 'user-1', status: 'pending' };
     const result = await bookingService.searchBooking(filters, false);
     expect(result).toEqual(mockBookingList);
     expect(BookingModel.findAll).toHaveBeenCalledWith({
       where: { userId: 'user-1', status: 'pending' },
       order: [['bookingDate', 'DESC']],
     });
   });
 });
});
