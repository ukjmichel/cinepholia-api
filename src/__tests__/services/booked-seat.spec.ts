// src/__tests__/services/booked-seat.service.spec.ts
import { jest } from '@jest/globals';
import { BookedSeatService } from '../../services/booked-seat.service.js';
import { BookedSeatModel } from '../../models/booked-seat.model.js';
import { ScreeningModel } from '../../models/screening.model.js';
import { NotFoundError } from '../../errors/not-found-error.js';
import { BadRequestError } from '../../errors/bad-request-error.js';
import { ConflictError } from '../../errors/conflict-error.js';
import type { MockedFunction } from 'jest-mock';
import { Op } from 'sequelize';

describe('BookedSeatService', () => {
  const svc = new BookedSeatService();

  const baseSeat = {
    screeningId: 'screening-1',
    seatId: 'A1',
    bookingId: 'booking-1',
    createdAt: new Date('2025-09-25T12:00:00Z'),
    updatedAt: new Date('2025-09-25T12:00:00Z'),
  };

  const makeRow = (over: Partial<typeof baseSeat> = {}): BookedSeatModel =>
    ({ get: () => ({ ...baseSeat, ...over }) }) as unknown as BookedSeatModel;

  const makeScreening = (hallData?: any): ScreeningModel =>
    ({
      screeningId: 'screening-1',
      hall: hallData || { capacity: 100 },
      get: () => ({ hall: hallData || { capacity: 100 } }),
    }) as unknown as ScreeningModel;

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('validateSeatsExist', () => {
    it('throws NotFoundError if screening does not exist', async () => {
      jest.spyOn(ScreeningModel, 'findByPk').mockResolvedValue(null);

      await expect(
        svc.validateSeatsExist('missing-screening', ['A1'])
      ).rejects.toThrow(NotFoundError);
      await expect(
        svc.validateSeatsExist('missing-screening', ['A1'])
      ).rejects.toThrow('Screening with id missing-screening not found');
    });

    it('throws NotFoundError if hall information is missing', async () => {
      const screeningWithoutHall = {
        screeningId: 'screening-1',
        get: () => ({ hall: null }),
      } as unknown as ScreeningModel;

      jest
        .spyOn(ScreeningModel, 'findByPk')
        .mockResolvedValue(screeningWithoutHall);

      await expect(
        svc.validateSeatsExist('screening-1', ['A1'])
      ).rejects.toThrow(NotFoundError);
      await expect(
        svc.validateSeatsExist('screening-1', ['A1'])
      ).rejects.toThrow('Hall information not found for screening screening-1');
    });

    it('throws BadRequestError for invalid seat identifier', async () => {
      jest.spyOn(ScreeningModel, 'findByPk').mockResolvedValue(makeScreening());

      await expect(svc.validateSeatsExist('screening-1', [''])).rejects.toThrow(
        BadRequestError
      );
      await expect(svc.validateSeatsExist('screening-1', [''])).rejects.toThrow(
        'Invalid seat identifier: '
      );
    });

    it('validates successfully when all seats are valid', async () => {
      jest.spyOn(ScreeningModel, 'findByPk').mockResolvedValue(makeScreening());

      await expect(
        svc.validateSeatsExist('screening-1', ['A1', 'A2', 'B1'])
      ).resolves.not.toThrow();
    });

    it('passes transaction to findByPk', async () => {
      const spy = jest
        .spyOn(ScreeningModel, 'findByPk')
        .mockResolvedValue(makeScreening());
      const transaction = {} as any;

      await svc.validateSeatsExist('screening-1', ['A1'], transaction);

      expect(spy).toHaveBeenCalledWith(
        'screening-1',
        expect.objectContaining({ transaction })
      );
    });
  });

  describe('validateSeatsAvailable', () => {
    it('throws ConflictError if seats are already booked', async () => {
      // Create mocks that have seatId directly accessible
      const mockSeats = [
        { seatId: 'A1', get: () => ({ ...baseSeat, seatId: 'A1' }) },
        { seatId: 'A2', get: () => ({ ...baseSeat, seatId: 'A2' }) },
      ];

      jest
        .spyOn(BookedSeatModel, 'findAll')
        .mockResolvedValue(mockSeats as any);

      await expect(
        svc.validateSeatsAvailable('screening-1', ['A1', 'A2', 'A3'])
      ).rejects.toThrow(ConflictError);
      await expect(
        svc.validateSeatsAvailable('screening-1', ['A1', 'A2', 'A3'])
      ).rejects.toThrow('The following seats are already booked: A1, A2');
    });

    it('does not throw if all seats are available', async () => {
      jest.spyOn(BookedSeatModel, 'findAll').mockResolvedValue([] as any);

      await expect(
        svc.validateSeatsAvailable('screening-1', ['A1', 'A2'])
      ).resolves.not.toThrow();
    });

    it('queries with correct where clause using Op.in', async () => {
      const spy = jest
        .spyOn(BookedSeatModel, 'findAll')
        .mockResolvedValue([] as any);

      await svc.validateSeatsAvailable('screening-1', ['A1', 'B2', 'C3']);

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            screeningId: 'screening-1',
            seatId: { [Op.in]: ['A1', 'B2', 'C3'] },
          },
        })
      );
    });

    it('passes transaction to findAll', async () => {
      const spy = jest
        .spyOn(BookedSeatModel, 'findAll')
        .mockResolvedValue([] as any);
      const transaction = {} as any;

      await svc.validateSeatsAvailable('screening-1', ['A1'], transaction);

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ transaction })
      );
    });
  });

  describe('createSeatBooking', () => {
    it('creates a single seat booking', async () => {
      const spy = jest
        .spyOn(BookedSeatModel, 'create')
        .mockResolvedValue(makeRow() as any);

      const seatData = {
        screeningId: 'screening-1',
        seatId: 'A1',
        bookingId: 'booking-1',
      };

      const result = await svc.createSeatBooking(seatData);

      expect(spy).toHaveBeenCalledWith(seatData, { transaction: undefined });
      expect(result.get()).toMatchObject(baseSeat);
    });

    it('passes transaction to create', async () => {
      const spy = jest
        .spyOn(BookedSeatModel, 'create')
        .mockResolvedValue(makeRow() as any);
      const transaction = {} as any;

      await svc.createSeatBooking(
        {
          screeningId: 'screening-1',
          seatId: 'A1',
          bookingId: 'booking-1',
        },
        transaction
      );

      expect(spy).toHaveBeenCalledWith(expect.any(Object), { transaction });
    });
  });

  describe('createMultipleSeatBookings', () => {
    it('creates multiple seat bookings atomically', async () => {
      const spy = jest
        .spyOn(BookedSeatModel, 'bulkCreate')
        .mockResolvedValue([
          makeRow({ seatId: 'A1' }),
          makeRow({ seatId: 'A2' }),
          makeRow({ seatId: 'A3' }),
        ] as any);

      const seatsData = [
        { screeningId: 'screening-1', seatId: 'A1', bookingId: 'booking-1' },
        { screeningId: 'screening-1', seatId: 'A2', bookingId: 'booking-1' },
        { screeningId: 'screening-1', seatId: 'A3', bookingId: 'booking-1' },
      ];

      const result = await svc.createMultipleSeatBookings(seatsData);

      expect(spy).toHaveBeenCalledWith(seatsData, { transaction: undefined });
      expect(result).toHaveLength(3);
    });

    it('passes transaction to bulkCreate', async () => {
      const spy = jest
        .spyOn(BookedSeatModel, 'bulkCreate')
        .mockResolvedValue([] as any);
      const transaction = {} as any;

      await svc.createMultipleSeatBookings([], transaction);

      expect(spy).toHaveBeenCalledWith([], { transaction });
    });
  });

  describe('deleteSeatBookingsByBookingId', () => {
    it('deletes all seats for a booking and returns count', async () => {
      const spy = jest
        .spyOn(BookedSeatModel, 'destroy')
        .mockResolvedValue(3 as any);

      const count = await svc.deleteSeatBookingsByBookingId('booking-1');

      expect(spy).toHaveBeenCalledWith({
        where: { bookingId: 'booking-1' },
        transaction: undefined,
      });
      expect(count).toBe(3);
    });

    it('returns 0 when no seats are deleted', async () => {
      jest.spyOn(BookedSeatModel, 'destroy').mockResolvedValue(0 as any);

      const count = await svc.deleteSeatBookingsByBookingId('nonexistent');

      expect(count).toBe(0);
    });

    it('passes transaction to destroy', async () => {
      const spy = jest
        .spyOn(BookedSeatModel, 'destroy')
        .mockResolvedValue(2 as any);
      const transaction = {} as any;

      await svc.deleteSeatBookingsByBookingId('booking-1', transaction);

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ transaction })
      );
    });
  });

  describe('deleteSeatBookings', () => {
    it('deletes specific seats and returns count', async () => {
      const spy = jest
        .spyOn(BookedSeatModel, 'destroy')
        .mockResolvedValue(2 as any);

      const count = await svc.deleteSeatBookings('screening-1', ['A1', 'A2']);

      expect(spy).toHaveBeenCalledWith({
        where: {
          screeningId: 'screening-1',
          seatId: { [Op.in]: ['A1', 'A2'] },
        },
        transaction: undefined,
      });
      expect(count).toBe(2);
    });

    it('passes transaction to destroy', async () => {
      const spy = jest
        .spyOn(BookedSeatModel, 'destroy')
        .mockResolvedValue(1 as any);
      const transaction = {} as any;

      await svc.deleteSeatBookings('screening-1', ['A1'], transaction);

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ transaction })
      );
    });
  });

  describe('getBookedSeatsByScreening', () => {
    it('returns all booked seats for a screening', async () => {
      const spy = jest
        .spyOn(BookedSeatModel, 'findAll')
        .mockResolvedValue([
          makeRow({ seatId: 'A1' }),
          makeRow({ seatId: 'A2' }),
        ] as any);

      const result = await svc.getBookedSeatsByScreening('screening-1');

      expect(spy).toHaveBeenCalledWith({
        where: { screeningId: 'screening-1' },
        include: ['booking'],
        transaction: undefined,
      });
      expect(result).toHaveLength(2);
    });

    it('passes transaction to findAll', async () => {
      const spy = jest
        .spyOn(BookedSeatModel, 'findAll')
        .mockResolvedValue([] as any);
      const transaction = {} as any;

      await svc.getBookedSeatsByScreening('screening-1', transaction);

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ transaction })
      );
    });
  });

  describe('getBookedSeatsByBooking', () => {
    it('returns all seats for a booking', async () => {
      const spy = jest
        .spyOn(BookedSeatModel, 'findAll')
        .mockResolvedValue([
          makeRow({ seatId: 'A1' }),
          makeRow({ seatId: 'B1' }),
        ] as any);

      const result = await svc.getBookedSeatsByBooking('booking-1');

      expect(spy).toHaveBeenCalledWith({
        where: { bookingId: 'booking-1' },
        include: ['screening'],
        transaction: undefined,
      });
      expect(result).toHaveLength(2);
    });

    it('passes transaction to findAll', async () => {
      const spy = jest
        .spyOn(BookedSeatModel, 'findAll')
        .mockResolvedValue([] as any);
      const transaction = {} as any;

      await svc.getBookedSeatsByBooking('booking-1', transaction);

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ transaction })
      );
    });
  });

  describe('getAvailableSeats', () => {
    it('returns available seats by filtering out booked ones', async () => {
      // Mock the internal getBookedSeatsByScreening call
      jest.spyOn(svc, 'getBookedSeatsByScreening').mockResolvedValue([
        { seatId: 'A1', get: () => ({ ...baseSeat, seatId: 'A1' }) },
        { seatId: 'B2', get: () => ({ ...baseSeat, seatId: 'B2' }) },
      ] as any);

      const screening = makeScreening({ capacity: 20 });
      jest.spyOn(ScreeningModel, 'findByPk').mockResolvedValue(screening);

      const available = await svc.getAvailableSeats('screening-1');

      // Should filter out A1 and B2
      expect(available).not.toContain('A1');
      expect(available).not.toContain('B2');
      expect(available.length).toBe(18); // 20 - 2 booked = 18
    });

    it('throws NotFoundError if screening not found', async () => {
      jest.spyOn(BookedSeatModel, 'findAll').mockResolvedValue([] as any);
      jest.spyOn(ScreeningModel, 'findByPk').mockResolvedValue(null);

      await expect(svc.getAvailableSeats('missing-screening')).rejects.toThrow(
        NotFoundError
      );
    });

    it('passes transaction to queries', async () => {
      const findAllSpy = jest
        .spyOn(BookedSeatModel, 'findAll')
        .mockResolvedValue([] as any);
      const findByPkSpy = jest
        .spyOn(ScreeningModel, 'findByPk')
        .mockResolvedValue(makeScreening());
      const transaction = {} as any;

      await svc.getAvailableSeats('screening-1', transaction);

      expect(findAllSpy).toHaveBeenCalledWith(
        expect.objectContaining({ transaction })
      );
      expect(findByPkSpy).toHaveBeenCalledWith(
        'screening-1',
        expect.objectContaining({ transaction })
      );
    });
  });

  describe('countAvailableSeats', () => {
    it('returns the count of available seats', async () => {
      // Mock getAvailableSeats to return 9 seats directly
      jest
        .spyOn(svc, 'getAvailableSeats')
        .mockResolvedValue([
          'A2',
          'A3',
          'A4',
          'A5',
          'A6',
          'A7',
          'A8',
          'A9',
          'A10',
        ]);

      const count = await svc.countAvailableSeats('screening-1');

      // 9 available seats
      expect(count).toBe(9);
    });

    it('passes transaction to getAvailableSeats', async () => {
      const spy = jest.spyOn(svc, 'getAvailableSeats').mockResolvedValue([]);
      const transaction = {} as any;

      await svc.countAvailableSeats('screening-1', transaction);

      expect(spy).toHaveBeenCalledWith('screening-1', transaction);
    });
  });

  describe('Legacy methods (deprecated)', () => {
    it('checkSeatsExist delegates to validateSeatsExist', async () => {
      const spy = jest
        .spyOn(svc, 'validateSeatsExist')
        .mockResolvedValue(undefined);

      await svc.checkSeatsExist('screening-1', ['A1']);

      expect(spy).toHaveBeenCalledWith('screening-1', ['A1'], undefined);
    });

    it('checkSeatsAvailable delegates to validateSeatsAvailable', async () => {
      const spy = jest
        .spyOn(svc, 'validateSeatsAvailable')
        .mockResolvedValue(undefined);

      await svc.checkSeatsAvailable('screening-1', ['A1']);

      expect(spy).toHaveBeenCalledWith('screening-1', ['A1'], undefined);
    });
  });

  describe('generateSeatIds (private helper)', () => {
    it('generates correct number of seats based on capacity', () => {
      const hall = { capacity: 25 };
      const seats = (svc as any).generateSeatIds(hall);

      // 25 seats => 3 rows (A1-A10, B1-B10, C1-C5)
      expect(seats).toHaveLength(25);
      expect(seats).toContain('A1');
      expect(seats).toContain('A10');
      expect(seats).toContain('B1');
      expect(seats).toContain('C5');
      expect(seats).not.toContain('C6');
    });

    it('handles small capacity correctly', () => {
      const hall = { capacity: 5 };
      const seats = (svc as any).generateSeatIds(hall);

      // 5 seats => 1 row (A1-A5)
      expect(seats).toHaveLength(5);
      expect(seats).toEqual(['A1', 'A2', 'A3', 'A4', 'A5']);
    });

    it('defaults to 100 capacity when not provided', () => {
      const hall = {};
      const seats = (svc as any).generateSeatIds(hall);

      // Default 100 seats
      expect(seats).toHaveLength(100);
    });

    it('generates correct row letters', () => {
      const hall = { capacity: 30 };
      const seats = (svc as any).generateSeatIds(hall);

      // Should have rows A, B, C
      const firstRow = seats.filter((s: string) => s.startsWith('A'));
      const secondRow = seats.filter((s: string) => s.startsWith('B'));
      const thirdRow = seats.filter((s: string) => s.startsWith('C'));

      expect(firstRow).toHaveLength(10);
      expect(secondRow).toHaveLength(10);
      expect(thirdRow).toHaveLength(10);
    });
  });
});
