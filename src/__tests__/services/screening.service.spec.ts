// src/__tests__/services/screening.service.spec.ts
import { jest } from '@jest/globals';
import { ScreeningService } from '../../services/screening.service.js';
import { ScreeningModel } from '../../models/screening.model.js';
import * as queries from '../../queries/screening.queries.js';
import { NotFoundError } from '../../errors/not-found-error.js';
import { ConflictError } from '../../errors/conflict-error.js';
import { ValidationError } from '../../errors/validation-error.js';
import type { MockedFunction } from 'jest-mock';
import type { HallQuality } from '../../interfaces/screening.js';

describe('ScreeningService', () => {
  const svc = new ScreeningService();

  const baseScreening = {
    screeningId: 's-1',
    movieId: 'm-1',
    theaterId: 't-1',
    hallId: 'h-1',
    startTime: new Date('2025-12-15T14:00:00Z'),
    price: 12.5,
    createdAt: new Date('2025-09-25T12:00:00Z'),
    updatedAt: new Date('2025-09-25T12:00:00Z'),
  };

  // Mock MovieHallModel that will be dynamically imported
const mockMovieHallModel = {
  findOne: jest.fn() as jest.MockedFunction<any>,
  findAll: jest.fn() as jest.MockedFunction<any>,
};

  // Sequelize-like instance with hall support
  const makeRow = (
    over: Partial<typeof baseScreening> = {},
    hallQuality: HallQuality = '2D'
  ): ScreeningModel => {
    const data = { ...baseScreening, ...over };
    const hallData = { quality: hallQuality };
    return {
      ...data,
      hall: hallData,
      get: () => ({ ...data, hall: hallData }),
      set: jest.fn(),
      save: jest.fn(async () => {}),
      reload: jest.fn(async () => {}),
    } as unknown as ScreeningModel;
  };

  beforeEach(() => {
    jest.restoreAllMocks();
    // Reset the dynamic import mock
    jest.resetModules();
  });

  describe('create', () => {
    it('creates a screening and returns a safe DTO with quality', async () => {
      // Mock validateHallReference (dynamic import)
      jest.doMock('../../models/movie-hall.model.js', () => ({
        MovieHallModel: mockMovieHallModel,
      }));

      mockMovieHallModel.findOne.mockResolvedValue({ quality: '2D' });

      const createSpy = jest
        .spyOn(ScreeningModel, 'create')
        .mockResolvedValue(makeRow());

      const findAllSpy = jest
        .spyOn(ScreeningModel, 'findAll')
        .mockResolvedValue([]);

      const dto = await svc.create({
        movieId: baseScreening.movieId,
        theaterId: baseScreening.theaterId,
        hallId: baseScreening.hallId,
        startTime: baseScreening.startTime,
        price: baseScreening.price,
      });

      expect(findAllSpy).toHaveBeenCalled(); // conflict check
      expect(createSpy).toHaveBeenCalled();
      expect(dto).toEqual({
        screeningId: baseScreening.screeningId,
        movieId: baseScreening.movieId,
        theaterId: baseScreening.theaterId,
        hallId: baseScreening.hallId,
        startTime: baseScreening.startTime,
        price: baseScreening.price,
        createdAt: baseScreening.createdAt,
        updatedAt: baseScreening.updatedAt,
        quality: '2D',
      });
    });

    it('throws ValidationError for past screening time', async () => {
      const pastTime = new Date('2020-01-01T10:00:00Z');

      await expect(
        svc.create({
          movieId: baseScreening.movieId,
          theaterId: baseScreening.theaterId,
          hallId: baseScreening.hallId,
          startTime: pastTime,
          price: baseScreening.price,
        })
      ).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError for invalid hour (between 2 AM and 6 AM)', async () => {
      const invalidTime = new Date('2025-12-15T03:00:00Z');

      await expect(
        svc.create({
          movieId: baseScreening.movieId,
          theaterId: baseScreening.theaterId,
          hallId: baseScreening.hallId,
          startTime: invalidTime,
          price: baseScreening.price,
        })
      ).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError for negative price', async () => {
      await expect(
        svc.create({
          movieId: baseScreening.movieId,
          theaterId: baseScreening.theaterId,
          hallId: baseScreening.hallId,
          startTime: new Date('2025-12-15T14:00:00Z'),
          price: -5,
        })
      ).rejects.toThrow(ValidationError);
    });

    it('throws ConflictError when scheduling conflicts exist', async () => {
      jest.doMock('../../models/movie-hall.model.js', () => ({
        MovieHallModel: mockMovieHallModel,
      }));

      mockMovieHallModel.findOne.mockResolvedValue({ quality: '2D' });

      const conflictingScreening = makeRow({
        screeningId: 's-2',
        startTime: new Date('2025-12-15T14:30:00Z'),
      });

      jest
        .spyOn(ScreeningModel, 'findAll')
        .mockResolvedValue([conflictingScreening] as any);

      await expect(
        svc.create({
          movieId: baseScreening.movieId,
          theaterId: baseScreening.theaterId,
          hallId: baseScreening.hallId,
          startTime: new Date('2025-12-15T14:00:00Z'),
          price: baseScreening.price,
        })
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('get', () => {
    it('returns DTO with quality when found', async () => {
      const spy = jest
        .spyOn(ScreeningModel, 'findOne')
        .mockResolvedValue(makeRow());

      const dto = await svc.get(baseScreening.screeningId);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { screeningId: baseScreening.screeningId },
        })
      );
      expect(dto?.screeningId).toBe(baseScreening.screeningId);
      expect(dto?.quality).toBe('2D');
    });

    it('returns null when not found', async () => {
      jest.spyOn(ScreeningModel, 'findOne').mockResolvedValue(null);
      const dto = await svc.get('nope');
      expect(dto).toBeNull();
    });
  });

  describe('getById', () => {
    it('returns DTO when found', async () => {
      jest.spyOn(ScreeningModel, 'findOne').mockResolvedValue(makeRow());

      const dto = await svc.getById(baseScreening.screeningId);
      expect(dto.screeningId).toBe(baseScreening.screeningId);
    });

    it('throws NotFoundError when not found', async () => {
      jest.spyOn(ScreeningModel, 'findOne').mockResolvedValue(null);

      await expect(svc.getById('missing')).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    it('updates fields and returns DTO with quality', async () => {
      const save = jest.fn(async () => {});
      const set = jest.fn();
      const reload = jest.fn(async () => {});

      const findOneSpy = jest
        .spyOn(ScreeningModel, 'findOne')
        .mockResolvedValue({
          ...makeRow(),
          set,
          save,
          reload,
          get: () => ({ ...baseScreening, price: 15.0 }),
        } as any);

      jest.spyOn(ScreeningModel, 'findAll').mockResolvedValue([]);

      const dto = await svc.update(baseScreening.screeningId, {
        price: 15.0,
      });

      expect(set).toHaveBeenCalledWith({ price: 15.0 });
      expect(save).toHaveBeenCalled();
      expect(reload).toHaveBeenCalled();
      expect(dto?.price).toBe(15.0);
    });

    it('returns null when not found', async () => {
      jest.spyOn(ScreeningModel, 'findOne').mockResolvedValue(null);

      const dto = await svc.update('missing', { price: 15.0 });
      expect(dto).toBeNull();
    });

    it('checks for conflicts when updating time or hall', async () => {
      const save = jest.fn(async () => {});
      const set = jest.fn();
      const reload = jest.fn(async () => {});

      jest.spyOn(ScreeningModel, 'findOne').mockResolvedValue({
        ...makeRow(),
        set,
        save,
        reload,
        get: () => ({ ...baseScreening }),
      } as any);

      const findAllSpy = jest
        .spyOn(ScreeningModel, 'findAll')
        .mockResolvedValue([]);

      await svc.update(baseScreening.screeningId, {
        startTime: new Date('2025-12-15T16:00:00Z'),
      });

      expect(findAllSpy).toHaveBeenCalled(); // conflict check
    });
  });

  describe('remove', () => {
    it('returns true when a screening is deleted', async () => {
      const spy = jest
        .spyOn(ScreeningModel, 'destroy')
        .mockResolvedValue(1 as any);

      const ok = await svc.remove(baseScreening.screeningId);

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { screeningId: baseScreening.screeningId },
        })
      );
      expect(ok).toBe(true);
    });

    it('returns false when no screening is deleted', async () => {
      jest.spyOn(ScreeningModel, 'destroy').mockResolvedValue(0 as any);

      const ok = await svc.remove(baseScreening.screeningId);
      expect(ok).toBe(false);
    });
  });

  describe('list', () => {
    it('returns paginated response with quality', async () => {
      const spy = jest
        .spyOn(ScreeningModel, 'findAndCountAll')
        .mockResolvedValue({
          rows: [makeRow()] as unknown as ScreeningModel[],
          count: 1,
        } as any);

      const res = await svc.list({ page: 1, limit: 20 });

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ offset: 0, limit: 20 })
      );
      expect(res.items).toHaveLength(1);
      expect(res.items[0].quality).toBe('2D');
      expect(res.page).toBe(1);
      expect(res.limit).toBe(20);
      expect(res.totalItems).toBe(1);
      expect(res.totalPages).toBe(1);
    });

    it('applies filters correctly', async () => {
      const whereMock = { movieId: 'm-1' } as any;
      const whereSpy = jest
        .spyOn(queries, 'buildScreeningWhere')
        .mockReturnValue(whereMock);

      jest.spyOn(ScreeningModel, 'findAndCountAll').mockResolvedValue({
        rows: [makeRow()] as any,
        count: 1,
      } as any);

      await svc.list({ filters: { movieId: 'm-1' } });

      expect(whereSpy).toHaveBeenCalledWith({ movieId: 'm-1' });
    });

    it('uses INNER join when filtering by quality', async () => {
      const requiresHallJoinSpy = jest
        .spyOn(queries, 'requiresHallJoin')
        .mockReturnValue(true);

      const facSpy = jest
        .spyOn(ScreeningModel, 'findAndCountAll')
        .mockResolvedValue({
          rows: [makeRow()] as any,
          count: 1,
        } as any);

      await svc.list({ filters: { quality: 'IMAX' } });

      expect(requiresHallJoinSpy).toHaveBeenCalledWith({ quality: 'IMAX' });

      const callArg = facSpy.mock.calls[0][0] as any;
      expect(callArg.include).toBeDefined();
    });
  });

  describe('search', () => {
    it('uses buildScreeningWhere(filters, q) and paginates', async () => {
      const whereMock = { some: 'where' } as any;
      const whereSpy = jest
        .spyOn(queries, 'buildScreeningWhere')
        .mockReturnValue(whereMock);

      const facSpy = jest
        .spyOn(ScreeningModel, 'findAndCountAll')
        .mockResolvedValue({
          rows: [makeRow(), makeRow({ screeningId: 's-2' })] as any,
          count: 2,
        } as any);

      const params = {
        page: 1,
        limit: 2,
        q: 'test',
        filters: { movieId: 'm-1' },
      };
      const res = await svc.search(params);

      expect(whereSpy).toHaveBeenCalledWith(params.filters, params.q);
      expect(facSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: whereMock,
          offset: 0,
          limit: 2,
        })
      );
      expect(res.items).toHaveLength(2);
      expect(res.totalItems).toBe(2);
    });
  });

  describe('getByMovie', () => {
    it('retrieves screenings for a movie', async () => {
      const whereMock = { movieId: 'm-1' } as any;
      const whereSpy = jest
        .spyOn(queries, 'buildScreeningsByMovieWhere')
        .mockReturnValue(whereMock);

      jest.spyOn(ScreeningModel, 'findAndCountAll').mockResolvedValue({
        rows: [makeRow()] as any,
        count: 1,
      } as any);

      const res = await svc.getByMovie('m-1');

      expect(whereSpy).toHaveBeenCalledWith('m-1');
      expect(res.items).toHaveLength(1);
      expect(res.items[0].movieId).toBe('m-1');
    });
  });

  describe('getByTheater', () => {
    it('retrieves screenings for a theater', async () => {
      const whereMock = { theaterId: 't-1' } as any;
      const whereSpy = jest
        .spyOn(queries, 'buildScreeningsByTheaterWhere')
        .mockReturnValue(whereMock);

      jest.spyOn(ScreeningModel, 'findAndCountAll').mockResolvedValue({
        rows: [makeRow()] as any,
        count: 1,
      } as any);

      const res = await svc.getByTheater('t-1');

      expect(whereSpy).toHaveBeenCalledWith('t-1');
      expect(res.items).toHaveLength(1);
    });
  });

  describe('getByHall', () => {
    it('retrieves screenings for a specific hall', async () => {
      const whereMock = { theaterId: 't-1', hallId: 'h-1' } as any;
      const whereSpy = jest
        .spyOn(queries, 'buildScreeningsByHallWhere')
        .mockReturnValue(whereMock);

      jest.spyOn(ScreeningModel, 'findAndCountAll').mockResolvedValue({
        rows: [makeRow()] as any,
        count: 1,
      } as any);

      const res = await svc.getByHall('t-1', 'h-1');

      expect(whereSpy).toHaveBeenCalledWith('t-1', 'h-1');
      expect(res.items).toHaveLength(1);
    });
  });

  describe('getByQuality', () => {
    it('retrieves screenings by quality using INNER join', async () => {
      const facSpy = jest
        .spyOn(ScreeningModel, 'findAndCountAll')
        .mockResolvedValue({
          rows: [makeRow(undefined, 'IMAX')] as any,
          count: 1,
        } as any);

      const res = await svc.getByQuality('IMAX');

      const callArg = facSpy.mock.calls[0][0] as any;
      expect(callArg.include).toBeDefined();
      expect(res.items).toHaveLength(1);
      expect(res.items[0].quality).toBe('IMAX');
    });
  });

  describe('getUpcoming', () => {
    it('retrieves upcoming screenings', async () => {
      const whereMock = { startTime: { $gte: expect.any(Date) } } as any;
      const whereSpy = jest
        .spyOn(queries, 'buildUpcomingScreeningsWhere')
        .mockReturnValue(whereMock);

      jest.spyOn(ScreeningModel, 'findAndCountAll').mockResolvedValue({
        rows: [makeRow({ startTime: new Date('2026-01-01T14:00:00Z') })] as any,
        count: 1,
      } as any);

      const res = await svc.getUpcoming();

      expect(whereSpy).toHaveBeenCalled();
      expect(res.items).toHaveLength(1);
    });
  });

  describe('getPast', () => {
    it('retrieves past screenings', async () => {
      const whereMock = { startTime: { $lt: expect.any(Date) } } as any;
      const whereSpy = jest
        .spyOn(queries, 'buildPastScreeningsWhere')
        .mockReturnValue(whereMock);

      jest.spyOn(ScreeningModel, 'findAndCountAll').mockResolvedValue({
        rows: [makeRow({ startTime: new Date('2024-01-01T14:00:00Z') })] as any,
        count: 1,
      } as any);

      const res = await svc.getPast();

      expect(whereSpy).toHaveBeenCalled();
      expect(res.items).toHaveLength(1);
    });
  });

  describe('checkSchedulingConflicts', () => {
    it('detects overlapping screenings', async () => {
      const conflictingScreening = makeRow({
        screeningId: 's-2',
        startTime: new Date('2025-12-15T14:30:00Z'),
      });

      jest
        .spyOn(ScreeningModel, 'findAll')
        .mockResolvedValue([conflictingScreening] as any);

      const conflicts = await svc.checkSchedulingConflicts(
        't-1',
        'h-1',
        new Date('2025-12-15T14:00:00Z')
      );

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].conflictType).toBe('overlap');
    });

    it('detects insufficient gap between screenings', async () => {
      const existingScreening = makeRow({
        screeningId: 's-2',
        startTime: new Date('2025-12-15T12:00:00Z'),
      });

      jest
        .spyOn(ScreeningModel, 'findAll')
        .mockResolvedValue([existingScreening] as any);

      const conflicts = await svc.checkSchedulingConflicts(
        't-1',
        'h-1',
        new Date('2025-12-15T14:10:00Z')
      );

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].conflictType).toBe('insufficient_gap');
    });

    it('returns empty array when no conflicts', async () => {
      jest.spyOn(ScreeningModel, 'findAll').mockResolvedValue([]);

      const conflicts = await svc.checkSchedulingConflicts(
        't-1',
        'h-1',
        new Date('2025-12-15T14:00:00Z')
      );

      expect(conflicts).toHaveLength(0);
    });

    it('excludes specified screening when checking conflicts', async () => {
      const findAllSpy = jest
        .spyOn(ScreeningModel, 'findAll')
        .mockResolvedValue([]);

      await svc.checkSchedulingConflicts(
        't-1',
        'h-1',
        new Date('2025-12-15T14:00:00Z'),
        's-1'
      );

      expect(findAllSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            screeningId: expect.anything(),
          }),
        })
      );
    });
  });

  describe('isSlotAvailable', () => {
    it('returns true when no conflicts exist', async () => {
      jest.spyOn(ScreeningModel, 'findAll').mockResolvedValue([]);

      const available = await svc.isSlotAvailable(
        't-1',
        'h-1',
        new Date('2025-12-15T14:00:00Z')
      );

      expect(available).toBe(true);
    });

    it('returns false when conflicts exist', async () => {
      const conflictingScreening = makeRow({
        startTime: new Date('2025-12-15T14:30:00Z'),
      });

      jest
        .spyOn(ScreeningModel, 'findAll')
        .mockResolvedValue([conflictingScreening] as any);

      const available = await svc.isSlotAvailable(
        't-1',
        'h-1',
        new Date('2025-12-15T14:00:00Z')
      );

      expect(available).toBe(false);
    });
  });

  describe('findAvailableSlots', () => {
    it('finds available time slots between existing screenings', async () => {
      const existingScreenings = [
        makeRow({ startTime: new Date('2025-12-15T10:00:00Z') }),
        makeRow({ startTime: new Date('2025-12-15T16:00:00Z') }),
      ];

      jest
        .spyOn(ScreeningModel, 'findAll')
        .mockResolvedValue(existingScreenings as any);

      const slots = await svc.findAvailableSlots(
        't-1',
        'h-1',
        new Date('2025-12-15')
      );

      expect(slots.length).toBeGreaterThan(0);
      expect(slots[0]).toHaveProperty('startTime');
      expect(slots[0]).toHaveProperty('endTime');
    });
  });

  describe('exists', () => {
    it('returns true when screening exists', async () => {
      jest.spyOn(ScreeningModel, 'count').mockResolvedValue(1);

      const exists = await svc.exists('s-1');
      expect(exists).toBe(true);
    });

    it('returns false when screening does not exist', async () => {
      jest.spyOn(ScreeningModel, 'count').mockResolvedValue(0);

      const exists = await svc.exists('missing');
      expect(exists).toBe(false);
    });
  });

  describe('getTheaterSchedule', () => {
    it('returns theater schedule with quality for a date', async () => {
      const screenings = [
        makeRow({ startTime: new Date('2025-12-15T10:00:00Z') }),
        makeRow({ startTime: new Date('2025-12-15T14:00:00Z') }),
      ];

      jest
        .spyOn(ScreeningModel, 'findAll')
        .mockResolvedValue(screenings as any);

      const schedule = await svc.getTheaterSchedule(
        't-1',
        new Date('2025-12-15')
      );

      expect(schedule.theaterId).toBe('t-1');
      expect(schedule.screenings).toHaveLength(2);
      expect(schedule.screenings[0].quality).toBe('2D');
    });
  });

  describe('getMovieShowtimes', () => {
    it('returns movie showtimes with quality', async () => {
      const screenings = [
        makeRow({ movieId: 'm-1' }),
        makeRow({ movieId: 'm-1', screeningId: 's-2' }),
      ];

      jest
        .spyOn(ScreeningModel, 'findAll')
        .mockResolvedValue(screenings as any);

      const showtimes = await svc.getMovieShowtimes('m-1');

      expect(showtimes.movieId).toBe('m-1');
      expect(showtimes.screenings).toHaveLength(2);
      expect(showtimes.screenings[0].quality).toBe('2D');
    });
  });

  describe('paginate', () => {
    it('handles edge case with limit=0 falling back to DEFAULT_LIMIT', () => {
      const result = (svc as any).paginate([makeRow()] as any, 25, 1, 0);
      expect(result.totalPages).toBe(2); // 25/20 = 2
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('ensures totalPages is at least 1 even with 0 items', () => {
      const result = (svc as any).paginate([], 0, 1, 20);
      expect(result.totalPages).toBe(1);
      expect(result.totalItems).toBe(0);
    });
  });

  describe('pickForDTO', () => {
    it('includes all expected fields including quality', () => {
      const model = makeRow();
      const picked = (svc as any).pickForDTO(model);

      expect(picked).toHaveProperty('screeningId');
      expect(picked).toHaveProperty('movieId');
      expect(picked).toHaveProperty('theaterId');
      expect(picked).toHaveProperty('hallId');
      expect(picked).toHaveProperty('startTime');
      expect(picked).toHaveProperty('price');
      expect(picked).toHaveProperty('createdAt');
      expect(picked).toHaveProperty('updatedAt');
      expect(picked).toHaveProperty('quality');
      expect(picked.quality).toBe('2D');
    });
  });
});
