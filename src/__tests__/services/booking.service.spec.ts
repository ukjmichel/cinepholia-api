// src/__tests__/services/booking.service.spec.ts
import { jest } from '@jest/globals';
import { BookingService } from '../../services/booking.service.js';
import { BookingModel } from '../../models/booking.model.js';
import { BookedSeatModel } from '../../models/booked-seat.model.js';
import { UserModel } from '../../models/user.model.js';
import { ScreeningModel } from '../../models/screening.model.js';
import { MovieModel } from '../../models/movie.model.js';
import { NotFoundError } from '../../errors/not-found-error.js';
import { sequelize } from '../../config/db.js';

// Mock the booked-seat service
const mockCreateMultipleSeatBookings = jest.fn();
jest.mock('../../services/booked-seat.service.js', () => ({
  bookedSeatService: {
    createMultipleSeatBookings: mockCreateMultipleSeatBookings,
  },
}));

describe('BookingService', () => {
  const svc = new BookingService();

  const mockUser = {
    userId: 'user-123',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
  };

  const mockMovie = {
    movieId: 'movie-123',
    title: 'Test Movie',
    description: 'A test movie',
    ageRating: 'PG-13',
    genre: 'Action',
    releaseDate: new Date('2025-01-01'),
    director: 'Test Director',
    durationMinutes: 120,
    posterUrl: 'https://example.com/poster.jpg',
    recommended: true,
  };

  const mockScreening = {
    screeningId: 'screening-123',
    movieId: 'movie-123',
    theaterId: 'theater-123',
    hallId: 'hall-123',
    startTime: new Date('2025-10-15T19:00:00Z'),
    price: '12.50',
    movie: mockMovie,
  };

  const mockBookedSeats: any[] = [
    { bookingId: 'booking-123', screeningId: 'screening-123', seatId: 'A1' },
    { bookingId: 'booking-123', screeningId: 'screening-123', seatId: 'A2' },
  ];

  const baseBooking = {
    bookingId: 'booking-123',
    userId: 'user-123',
    screeningId: 'screening-123',
    seatsNumber: 2,
    totalPrice: 25.0,
    status: 'PENDING' as const,
    bookingDate: new Date('2025-10-01T10:00:00Z'),
    createdAt: new Date('2025-10-01T10:00:00Z'),
    updatedAt: new Date('2025-10-01T10:00:00Z'),
  };

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a booking successfully', async () => {
      const mockTransaction = {} as any;
      jest
        .spyOn(sequelize, 'transaction')
        .mockImplementation(async (fn: any) => {
          return fn(mockTransaction);
        });

      const mockCreatedBooking = {
        ...baseBooking,
        get: jest.fn().mockReturnValue(baseBooking),
      };

      jest
        .spyOn(BookingModel, 'create')
        .mockResolvedValue(mockCreatedBooking as any);

      const mockBookingWithAssoc = {
        ...mockCreatedBooking,
        user: mockUser,
        screening: mockScreening,
        bookedSeats: mockBookedSeats,
        get: jest.fn().mockReturnValue(baseBooking),
      };

      jest
        .spyOn(BookingModel, 'findByPk')
        .mockResolvedValue(mockBookingWithAssoc as any);

      const result = await svc.create({
        userId: 'user-123',
        screeningId: 'screening-123',
        seatsNumber: 2,
        totalPrice: 25.0,
      });

      expect(result).toBeDefined();
      expect(result.bookingId).toBe('booking-123');
      expect(result.userId).toBe('user-123');
      expect(result.user).toEqual(mockUser);
      expect(BookingModel.create).toHaveBeenCalled();
    });
  });

  describe('createBookingWithSeats', () => {
    it('creates a booking with seats successfully', async () => {
      const mockTransaction = {} as any;
      jest
        .spyOn(sequelize, 'transaction')
        .mockImplementation(async (fn: any) => {
          return fn(mockTransaction);
        });

      const mockCreatedBooking = {
        ...baseBooking,
        get: jest.fn().mockReturnValue(baseBooking),
      };

      jest
        .spyOn(BookingModel, 'create')
        .mockResolvedValue(mockCreatedBooking as any);

      // Setup the mocked bookedSeatService
      (mockCreateMultipleSeatBookings as any).mockResolvedValue(
        mockBookedSeats
      );

      const mockBookingWithAssoc = {
        ...mockCreatedBooking,
        user: mockUser,
        screening: mockScreening,
        bookedSeats: mockBookedSeats,
        get: jest.fn().mockReturnValue(baseBooking),
      };

      jest
        .spyOn(BookingModel, 'findByPk')
        .mockResolvedValue(mockBookingWithAssoc as any);

      const result = await svc.createBookingWithSeats(
        {
          userId: 'user-123',
          screeningId: 'screening-123',
          seatsNumber: 2,
          totalPrice: 25.0,
        },
        ['A1', 'A2']
      );

      expect(result).toBeDefined();
      expect(result.bookingId).toBe('booking-123');
      expect(BookingModel.create).toHaveBeenCalled();
      expect(mockCreateMultipleSeatBookings).toHaveBeenCalledWith(
        [
          {
            bookingId: 'booking-123',
            screeningId: 'screening-123',
            seatId: 'A1',
          },
          {
            bookingId: 'booking-123',
            screeningId: 'screening-123',
            seatId: 'A2',
          },
        ],
        mockTransaction
      );
    });
  });

  describe('get', () => {
    it('returns booking when found', async () => {
      const mockBooking = {
        ...baseBooking,
        user: mockUser,
        screening: mockScreening,
        bookedSeats: mockBookedSeats,
        get: jest.fn().mockReturnValue(baseBooking),
      };

      jest
        .spyOn(BookingModel, 'findByPk')
        .mockResolvedValue(mockBooking as any);

      const result = await svc.get('booking-123');

      expect(result).toBeDefined();
      expect(result?.bookingId).toBe('booking-123');
      expect(result?.user).toEqual(mockUser);
      expect(BookingModel.findByPk).toHaveBeenCalledWith(
        'booking-123',
        expect.any(Object)
      );
    });

    it('returns null when booking not found', async () => {
      jest.spyOn(BookingModel, 'findByPk').mockResolvedValue(null);

      const result = await svc.get('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getById', () => {
    it('returns booking when found', async () => {
      const mockBooking = {
        ...baseBooking,
        user: mockUser,
        screening: mockScreening,
        bookedSeats: mockBookedSeats,
        get: jest.fn().mockReturnValue(baseBooking),
      };

      jest
        .spyOn(BookingModel, 'findByPk')
        .mockResolvedValue(mockBooking as any);

      const result = await svc.getById('booking-123');

      expect(result).toBeDefined();
      expect(result.bookingId).toBe('booking-123');
    });

    it('throws NotFoundError when booking not found', async () => {
      jest.spyOn(BookingModel, 'findByPk').mockResolvedValue(null);

      await expect(svc.getById('nonexistent')).rejects.toThrow(NotFoundError);
      await expect(svc.getById('nonexistent')).rejects.toThrow(
        'Booking with id nonexistent not found'
      );
    });
  });

  describe('update', () => {
    it('updates booking successfully', async () => {
      const mockTransaction = {} as any;
      jest
        .spyOn(sequelize, 'transaction')
        .mockImplementation(async (fn: any) => {
          return fn(mockTransaction);
        });

      const mockBooking = {
        ...baseBooking,
        set: jest.fn(),
        save: jest.fn(),
        reload: jest.fn(),
        user: mockUser,
        screening: mockScreening,
        bookedSeats: mockBookedSeats,
        get: jest.fn().mockReturnValue({ ...baseBooking, status: 'USED' }),
      };

      jest
        .spyOn(BookingModel, 'findByPk')
        .mockResolvedValue(mockBooking as any);

      const result = await svc.update('booking-123', { status: 'USED' });

      expect(result).toBeDefined();
      expect(mockBooking.set).toHaveBeenCalledWith({ status: 'USED' });
      expect(mockBooking.save).toHaveBeenCalled();
      expect(mockBooking.reload).toHaveBeenCalled();
    });

    it('returns null when booking not found', async () => {
      const mockTransaction = {} as any;
      jest
        .spyOn(sequelize, 'transaction')
        .mockImplementation(async (fn: any) => {
          return fn(mockTransaction);
        });

      jest.spyOn(BookingModel, 'findByPk').mockResolvedValue(null);

      const result = await svc.update('nonexistent', { status: 'USED' });

      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    it('removes booking successfully', async () => {
      const mockTransaction = {} as any;
      jest
        .spyOn(sequelize, 'transaction')
        .mockImplementation(async (fn: any) => {
          return fn(mockTransaction);
        });

      const mockBooking = { ...baseBooking };
      jest
        .spyOn(BookingModel, 'findByPk')
        .mockResolvedValue(mockBooking as any);
      jest.spyOn(BookingModel, 'destroy').mockResolvedValue(1);

      const result = await svc.remove('booking-123');

      expect(result).toBe(true);
      expect(BookingModel.destroy).toHaveBeenCalledWith({
        where: { bookingId: 'booking-123' },
        transaction: mockTransaction,
      });
    });

    it('returns false when booking not found', async () => {
      const mockTransaction = {} as any;
      jest
        .spyOn(sequelize, 'transaction')
        .mockImplementation(async (fn: any) => {
          return fn(mockTransaction);
        });

      jest.spyOn(BookingModel, 'findByPk').mockResolvedValue(null);

      const result = await svc.remove('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('list', () => {
    it('returns paginated list of bookings', async () => {
      const mockBookings = [
        {
          ...baseBooking,
          user: mockUser,
          screening: mockScreening,
          bookedSeats: mockBookedSeats,
          get: jest.fn().mockReturnValue(baseBooking),
        },
      ];

      jest.spyOn(BookingModel, 'findAndCountAll').mockResolvedValue({
        rows: mockBookings as any,
        count: 1,
      } as any);

      const result = await svc.list({ page: 1, limit: 20 });

      expect(result).toBeDefined();
      expect(result.items).toHaveLength(1);
      expect(result.page).toBe(1);
      expect(result.totalItems).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('handles filters correctly', async () => {
      jest.spyOn(BookingModel, 'findAndCountAll').mockResolvedValue({
        rows: [],
        count: 0,
      } as any);

      await svc.list({
        page: 1,
        limit: 20,
        filters: { status: 'PENDING', userId: 'user-123' },
      });

      expect(BookingModel.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'PENDING',
            userId: 'user-123',
          }),
        })
      );
    });
  });

  describe('search', () => {
    it('searches bookings with query string', async () => {
      const mockBookings = [
        {
          ...baseBooking,
          user: mockUser,
          screening: mockScreening,
          bookedSeats: mockBookedSeats,
          get: jest.fn().mockReturnValue(baseBooking),
        },
      ];

      jest.spyOn(BookingModel, 'findAndCountAll').mockResolvedValue({
        rows: mockBookings as any,
        count: 1,
      } as any);

      const result = await svc.search({ q: 'pending', page: 1, limit: 20 });

      expect(result).toBeDefined();
      expect(result.items).toHaveLength(1);
      expect(BookingModel.findAndCountAll).toHaveBeenCalled();
    });

    it('combines query and filters', async () => {
      jest.spyOn(BookingModel, 'findAndCountAll').mockResolvedValue({
        rows: [],
        count: 0,
      } as any);

      await svc.search({
        q: 'test',
        filters: { status: 'USED' },
        page: 1,
        limit: 20,
      });

      expect(BookingModel.findAndCountAll).toHaveBeenCalled();
    });
  });

  describe('getByUser', () => {
    it('returns bookings for specific user', async () => {
      const mockBookings = [
        {
          ...baseBooking,
          screening: mockScreening,
          bookedSeats: mockBookedSeats,
          get: jest.fn().mockReturnValue(baseBooking),
        },
      ];

      jest.spyOn(BookingModel, 'findAndCountAll').mockResolvedValue({
        rows: mockBookings as any,
        count: 1,
      } as any);

      const result = await svc.getByUser('user-123', { page: 1, limit: 20 });

      expect(result).toBeDefined();
      expect(result.items).toHaveLength(1);
      expect(BookingModel.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-123' },
        })
      );
    });
  });

  describe('getByScreening', () => {
    it('returns bookings for specific screening', async () => {
      const mockBookings = [
        {
          ...baseBooking,
          user: mockUser,
          screening: mockScreening,
          bookedSeats: mockBookedSeats,
          get: jest.fn().mockReturnValue(baseBooking),
        },
      ];

      jest.spyOn(BookingModel, 'findAndCountAll').mockResolvedValue({
        rows: mockBookings as any,
        count: 1,
      } as any);

      const result = await svc.getByScreening('screening-123', {
        page: 1,
        limit: 20,
      });

      expect(result).toBeDefined();
      expect(result.items).toHaveLength(1);
      expect(BookingModel.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { screeningId: 'screening-123' },
        })
      );
    });
  });

  describe('getByStatus', () => {
    it('returns bookings filtered by status', async () => {
      const mockBookings = [
        {
          ...baseBooking,
          user: mockUser,
          screening: mockScreening,
          bookedSeats: mockBookedSeats,
          get: jest.fn().mockReturnValue(baseBooking),
        },
      ];

      jest.spyOn(BookingModel, 'findAndCountAll').mockResolvedValue({
        rows: mockBookings as any,
        count: 1,
      } as any);

      const result = await svc.getByStatus('PENDING', { page: 1, limit: 20 });

      expect(result).toBeDefined();
      expect(result.items).toHaveLength(1);
      expect(BookingModel.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'PENDING' },
        })
      );
    });
  });

  describe('getUpcomingByUser', () => {
    it('returns upcoming bookings for user', async () => {
      const futureDate = new Date('2025-10-15T19:00:00Z');
      const mockBookings = [
        {
          ...baseBooking,
          screening: { ...mockScreening, startTime: futureDate },
          bookedSeats: mockBookedSeats,
          get: jest.fn().mockReturnValue(baseBooking),
        },
      ];

      jest.spyOn(BookingModel, 'findAndCountAll').mockResolvedValue({
        rows: mockBookings as any,
        count: 1,
      } as any);

      const fromDate = new Date('2025-10-01T00:00:00Z');
      const result = await svc.getUpcomingByUser('user-123', fromDate, {
        page: 1,
        limit: 20,
      });

      expect(result).toBeDefined();
      expect(result.items).toHaveLength(1);
      expect(BookingModel.findAndCountAll).toHaveBeenCalled();
    });
  });

  describe('Legacy methods', () => {
    describe('getBookingById', () => {
      it('returns booking when found', async () => {
        const mockBooking = {
          ...baseBooking,
          user: mockUser,
          screening: mockScreening,
          bookedSeats: mockBookedSeats,
        };

        jest
          .spyOn(BookingModel, 'findByPk')
          .mockResolvedValue(mockBooking as any);

        const result = await svc.getBookingById('booking-123');

        expect(result).toBeDefined();
        expect(result?.bookingId).toBe('booking-123');
      });

      it('throws NotFoundError when not found', async () => {
        jest.spyOn(BookingModel, 'findByPk').mockResolvedValue(null);

        await expect(svc.getBookingById('nonexistent')).rejects.toThrow(
          NotFoundError
        );
      });
    });

    describe('createBooking', () => {
      it('creates booking successfully', async () => {
        const mockBooking = { ...baseBooking };
        jest
          .spyOn(BookingModel, 'create')
          .mockResolvedValue(mockBooking as any);

        const result = await svc.createBooking({
          userId: 'user-123',
          screeningId: 'screening-123',
          seatsNumber: 2,
          totalPrice: 25.0,
        });

        expect(result).toBeDefined();
        expect(result.bookingId).toBe('booking-123');
      });
    });

    describe('updateBooking', () => {
      it('updates booking successfully', async () => {
        const mockBooking = {
          ...baseBooking,
          update: jest.fn(),
          reload: jest.fn(),
        };

        jest
          .spyOn(BookingModel, 'findByPk')
          .mockResolvedValue(mockBooking as any);

        const result = await svc.updateBooking('booking-123', {
          status: 'USED',
        });

        expect(mockBooking.update).toHaveBeenCalledWith(
          { status: 'USED' },
          expect.any(Object)
        );
        expect(mockBooking.reload).toHaveBeenCalled();
      });

      it('throws NotFoundError when not found', async () => {
        jest.spyOn(BookingModel, 'findByPk').mockResolvedValue(null);

        await expect(
          svc.updateBooking('nonexistent', { status: 'USED' })
        ).rejects.toThrow(NotFoundError);
      });
    });

    describe('deleteBooking', () => {
      it('deletes booking successfully', async () => {
        const mockTransaction = {} as any;
        jest
          .spyOn(sequelize, 'transaction')
          .mockImplementation(async (fn: any) => {
            return fn(mockTransaction);
          });

        const mockBooking = {
          ...baseBooking,
          destroy: jest.fn(),
        };

        jest
          .spyOn(BookingModel, 'findByPk')
          .mockResolvedValue(mockBooking as any);

        await svc.deleteBooking('booking-123');

        expect(mockBooking.destroy).toHaveBeenCalled();
      });

      it('throws NotFoundError when not found', async () => {
        const mockTransaction = {} as any;
        jest
          .spyOn(sequelize, 'transaction')
          .mockImplementation(async (fn: any) => {
            return fn(mockTransaction);
          });

        jest.spyOn(BookingModel, 'findByPk').mockResolvedValue(null);

        await expect(svc.deleteBooking('nonexistent')).rejects.toThrow(
          NotFoundError
        );
      });
    });

    describe('getAllBookings', () => {
      it('returns all bookings', async () => {
        const mockBookings = [
          { ...baseBooking, user: mockUser, screening: mockScreening },
        ];

        jest
          .spyOn(BookingModel, 'findAll')
          .mockResolvedValue(mockBookings as any);

        const result = await svc.getAllBookings();

        expect(result).toHaveLength(1);
        expect(BookingModel.findAll).toHaveBeenCalled();
      });
    });

    describe('getBookingsByUser', () => {
      it('returns bookings for user', async () => {
        const mockBookings = [{ ...baseBooking, screening: mockScreening }];

        jest
          .spyOn(BookingModel, 'findAll')
          .mockResolvedValue(mockBookings as any);

        const result = await svc.getBookingsByUser('user-123');

        expect(result).toHaveLength(1);
        expect(BookingModel.findAll).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { userId: 'user-123' },
          })
        );
      });
    });
  });
});
