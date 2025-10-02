// src/__tests__/services/movie-hall.service.spec.ts
import { jest } from '@jest/globals';
import { MovieHallService } from '../../services/movie-hall.service.js';
import { MovieHallModel } from '../../models/movie-hall.model.js';
import * as queries from '../../queries/movie-hall.queries.js';
import type { MockedFunction } from 'jest-mock';
import { NotFoundError } from '../../errors/not-found-error.js';
import { ConflictError } from '../../errors/conflict-error.js';

describe('MovieHallService', () => {
  const svc = new MovieHallService();

  const baseHall = {
    theaterId: 'theater-1',
    hallId: 'hall-1',
    seatsLayout: [
      ['A1', 'A2', 'A3'],
      ['B1', 'B2', 'B3'],
    ] as (string | number)[][],
    quality: '2D' as '2D' | '3D' | 'IMAX' | '4DX',
    createdAt: new Date('2025-09-25T12:00:00Z'),
    updatedAt: new Date('2025-09-25T12:00:00Z'),
  };

  // Sequelize-like instance: only .get() is used by the service
  const makeRow = (over: Partial<typeof baseHall> = {}): MovieHallModel =>
    ({
      get: () => ({ ...baseHall, ...over }),
      set: jest.fn(),
      save: jest.fn(),
    }) as unknown as MovieHallModel;

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('create', () => {
    it('creates a hall and returns a safe DTO', async () => {
      const findOneSpy = jest
        .spyOn(MovieHallModel, 'findOne')
        .mockResolvedValue(null);

      const createSpy = jest
        .spyOn(MovieHallModel, 'create')
        .mockResolvedValue(makeRow());

      const dto = await svc.create({
        theaterId: baseHall.theaterId,
        hallId: baseHall.hallId,
        seatsLayout: baseHall.seatsLayout,
        quality: baseHall.quality,
      });

      expect(findOneSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            theaterId: baseHall.theaterId,
            hallId: baseHall.hallId,
          },
        })
      );
      expect(createSpy).toHaveBeenCalled();
      expect(dto).toEqual({
        theaterId: baseHall.theaterId,
        hallId: baseHall.hallId,
        seatsLayout: baseHall.seatsLayout,
        quality: baseHall.quality,
        createdAt: baseHall.createdAt,
        updatedAt: baseHall.updatedAt,
      });
    });

    it('throws ConflictError when hall already exists', async () => {
      const findOneSpy = jest
        .spyOn(MovieHallModel, 'findOne')
        .mockResolvedValue(makeRow());

      await expect(
        svc.create({
          theaterId: baseHall.theaterId,
          hallId: baseHall.hallId,
          seatsLayout: baseHall.seatsLayout,
          quality: baseHall.quality,
        })
      ).rejects.toThrow(ConflictError);

      expect(findOneSpy).toHaveBeenCalled();
    });
  });

  describe('get', () => {
    it('returns DTO when found', async () => {
      const spy = jest
        .spyOn(MovieHallModel, 'findOne')
        .mockResolvedValue(makeRow());

      const dto = await svc.get(baseHall.theaterId, baseHall.hallId);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { theaterId: baseHall.theaterId, hallId: baseHall.hallId },
        })
      );
      expect(dto?.theaterId).toBe(baseHall.theaterId);
      expect(dto?.hallId).toBe(baseHall.hallId);
      expect(dto?.quality).toBe(baseHall.quality);
    });

    it('returns null when not found', async () => {
      jest.spyOn(MovieHallModel, 'findOne').mockResolvedValue(null);
      const dto = await svc.get('theater-x', 'hall-x');
      expect(dto).toBeNull();
    });
  });

  describe('getById', () => {
    it('returns DTO when found', async () => {
      jest.spyOn(MovieHallModel, 'findOne').mockResolvedValue(makeRow());

      const dto = await svc.getById(baseHall.theaterId, baseHall.hallId);
      expect(dto.theaterId).toBe(baseHall.theaterId);
      expect(dto.hallId).toBe(baseHall.hallId);
    });

    it('throws NotFoundError when not found', async () => {
      jest.spyOn(MovieHallModel, 'findOne').mockResolvedValue(null);

      await expect(svc.getById('theater-x', 'hall-x')).rejects.toThrow(
        NotFoundError
      );
      await expect(svc.getById('theater-x', 'hall-x')).rejects.toThrow(
        'Hall hall-x not found in theater theater-x'
      );
    });
  });

  describe('update', () => {
    it('updates fields and returns DTO', async () => {
      const save = jest.fn(async () => {});
      const set = jest.fn();

      const findOneSpy = jest.spyOn(
        MovieHallModel,
        'findOne'
      ) as unknown as MockedFunction<typeof MovieHallModel.findOne>;

      findOneSpy.mockResolvedValue({
        set,
        save,
        get: () => ({ ...baseHall, quality: '3D' }),
      } as unknown as MovieHallModel);

      const dto = await svc.update(baseHall.theaterId, baseHall.hallId, {
        quality: '3D',
      });

      expect(set).toHaveBeenCalledWith({ quality: '3D' });
      expect(save).toHaveBeenCalled();
      expect(dto?.quality).toBe('3D');
      expect(dto?.theaterId).toBe(baseHall.theaterId);
    });

    it('updates seatsLayout', async () => {
      const save = jest.fn(async () => {});
      const set = jest.fn();
      const newLayout = [
        ['X1', 'X2'],
        ['Y1', 'Y2'],
      ];

      const findOneSpy = jest.spyOn(
        MovieHallModel,
        'findOne'
      ) as unknown as MockedFunction<typeof MovieHallModel.findOne>;

      findOneSpy.mockResolvedValue({
        set,
        save,
        get: () => ({ ...baseHall, seatsLayout: newLayout }),
      } as unknown as MovieHallModel);

      const dto = await svc.update(baseHall.theaterId, baseHall.hallId, {
        seatsLayout: newLayout,
      });

      expect(set).toHaveBeenCalledWith({ seatsLayout: newLayout });
      expect(save).toHaveBeenCalled();
      expect(dto?.seatsLayout).toEqual(newLayout);
    });

    it('returns null when not found', async () => {
      jest.spyOn(MovieHallModel, 'findOne').mockResolvedValue(null);
      const dto = await svc.update('theater-x', 'hall-x', { quality: '3D' });
      expect(dto).toBeNull();
    });

    it('filters undefined fields from update', async () => {
      const save = jest.fn(async () => {});
      const set = jest.fn();

      const findOneSpy = jest.spyOn(
        MovieHallModel,
        'findOne'
      ) as unknown as MockedFunction<typeof MovieHallModel.findOne>;

      findOneSpy.mockResolvedValue({
        set,
        save,
        get: () => ({ ...baseHall, quality: 'IMAX' }),
      } as unknown as MovieHallModel);

      await svc.update(baseHall.theaterId, baseHall.hallId, {
        quality: 'IMAX',
        seatsLayout: undefined,
      });

      expect(set).toHaveBeenCalledWith({ quality: 'IMAX' });
      expect(set).not.toHaveBeenCalledWith(
        expect.objectContaining({ seatsLayout: undefined })
      );
    });
  });

  describe('remove', () => {
    it('returns true when a row is deleted', async () => {
      const spy = jest
        .spyOn(MovieHallModel, 'destroy')
        .mockResolvedValue(1 as any);

      const ok = await svc.remove(baseHall.theaterId, baseHall.hallId);

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { theaterId: baseHall.theaterId, hallId: baseHall.hallId },
        })
      );
      expect(ok).toBe(true);
    });

    it('returns false when no row is deleted', async () => {
      jest.spyOn(MovieHallModel, 'destroy').mockResolvedValue(0 as any);
      const ok = await svc.remove('theater-x', 'hall-x');
      expect(ok).toBe(false);
    });
  });

  describe('list', () => {
    it('returns paginated response (empty clamped to totalPages=1)', async () => {
      const spy = jest
        .spyOn(MovieHallModel, 'findAndCountAll')
        .mockResolvedValue({
          rows: [] as unknown as MovieHallModel[],
          count: 0,
        } as any);

      const res = await svc.list({ page: 1, limit: 20 });
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ offset: 0, limit: 20 })
      );
      expect(res.items).toEqual([]);
      expect(res.page).toBe(1);
      expect(res.limit).toBe(20);
      expect(res.totalItems).toBe(0);
      expect(res.totalPages).toBe(1);
    });

    it('returns paginated halls with correct data', async () => {
      const facSpy = jest
        .spyOn(MovieHallModel, 'findAndCountAll')
        .mockResolvedValue({
          rows: [
            makeRow(),
            makeRow({
              theaterId: 'theater-1',
              hallId: 'hall-2',
              quality: '3D',
            }),
          ] as any,
          count: 2,
        } as any);

      const res = await svc.list({ page: 1, limit: 20 });

      expect(facSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          offset: 0,
          limit: 20,
        })
      );
      expect(res.items).toHaveLength(2);
      expect(res.totalItems).toBe(2);
      expect(res.page).toBe(1);
      expect(res.limit).toBe(20);
      expect(res.totalPages).toBe(1);
      expect(res.items[0].hallId).toBe(baseHall.hallId);
      expect(res.items[1].hallId).toBe('hall-2');
    });

    it('applies filters correctly', async () => {
      const whereMock = { theaterId: 'theater-1' } as any;
      const whereSpy = jest
        .spyOn(queries, 'buildMovieHallWhere')
        .mockReturnValue(whereMock);

      const facSpy = jest
        .spyOn(MovieHallModel, 'findAndCountAll')
        .mockResolvedValue({
          rows: [makeRow()] as any,
          count: 1,
        } as any);

      await svc.list({
        page: 1,
        limit: 10,
        filters: { theaterId: 'theater-1' },
      });

      expect(whereSpy).toHaveBeenCalledWith({ theaterId: 'theater-1' });
      expect(facSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: whereMock,
          offset: 0,
          limit: 10,
        })
      );

      whereSpy.mockRestore();
    });

    it('handles capacity filtering', async () => {
      // For findAll, return plain objects with seatsLayout directly accessible
      const halls = [
        {
          ...baseHall,
          seatsLayout: [['A1', 'A2']],
          get: () => ({ ...baseHall, seatsLayout: [['A1', 'A2']] }),
        }, // 2 seats
        {
          ...baseHall,
          hallId: 'hall-2',
          seatsLayout: [
            ['B1', 'B2', 'B3'],
            ['C1', 'C2', 'C3'],
          ],
          get: () => ({
            ...baseHall,
            hallId: 'hall-2',
            seatsLayout: [
              ['B1', 'B2', 'B3'],
              ['C1', 'C2', 'C3'],
            ],
          }),
        }, // 6 seats
        {
          ...baseHall,
          hallId: 'hall-3',
          seatsLayout: [['D1', 'D2', 'D3', 'D4']],
          get: () => ({
            ...baseHall,
            hallId: 'hall-3',
            seatsLayout: [['D1', 'D2', 'D3', 'D4']],
          }),
        }, // 4 seats
      ];

      const findAllSpy = jest
        .spyOn(MovieHallModel, 'findAll')
        .mockResolvedValue(halls as any);

      const res = await svc.list({
        page: 1,
        limit: 20,
        filters: { minCapacity: 3, maxCapacity: 6 },
      });

      expect(findAllSpy).toHaveBeenCalled();
      expect(res.items).toHaveLength(2); // halls with 4 and 6 seats
      expect(res.items[0].hallId).toBe('hall-2'); // 6 seats
      expect(res.items[1].hallId).toBe('hall-3'); // 4 seats
    });
  });

  describe('search', () => {
    it('uses buildMovieHallWhere(filters, q) and paginates', async () => {
      const whereMock = { some: 'where' } as any;
      const whereSpy = jest
        .spyOn(queries, 'buildMovieHallWhere')
        .mockReturnValue(whereMock);

      const facSpy = jest
        .spyOn(MovieHallModel, 'findAndCountAll')
        .mockResolvedValue({
          rows: [
            makeRow(),
            makeRow({ hallId: 'hall-2', quality: 'IMAX' }),
          ] as any,
          count: 2,
        } as any);

      const params = {
        page: 1,
        limit: 10,
        q: 'hall',
        filters: { quality: '2D' as '2D' | '3D' | 'IMAX' | '4DX' },
      };
      const res = await svc.search(params);

      expect(whereSpy).toHaveBeenCalledWith(params.filters, params.q);
      expect(facSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: whereMock,
          offset: 0,
          limit: 10,
        })
      );
      expect(res.items).toHaveLength(2);
      expect(res.totalItems).toBe(2);

      whereSpy.mockRestore();
    });
  });

  describe('getByTheater', () => {
    it('returns halls for a specific theater', async () => {
      const facSpy = jest
        .spyOn(MovieHallModel, 'findAndCountAll')
        .mockResolvedValue({
          rows: [makeRow(), makeRow({ hallId: 'hall-2' })] as any,
          count: 2,
        } as any);

      const res = await svc.getByTheater('theater-1', { page: 1, limit: 10 });

      expect(facSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { theaterId: 'theater-1' },
        })
      );
      expect(res.items).toHaveLength(2);
      expect(res.items.every((h) => h.theaterId === 'theater-1')).toBe(true);
    });
  });

  describe('getByQuality', () => {
    it('returns halls with specific quality', async () => {
      const facSpy = jest
        .spyOn(MovieHallModel, 'findAndCountAll')
        .mockResolvedValue({
          rows: [makeRow(), makeRow({ hallId: 'hall-2' })] as any,
          count: 2,
        } as any);

      const res = await svc.getByQuality('2D', { page: 1, limit: 10 });

      expect(facSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { quality: '2D' },
        })
      );
      expect(res.items).toHaveLength(2);
    });
  });

  describe('getByQualities', () => {
    it('returns halls with multiple qualities', async () => {
      const facSpy = jest
        .spyOn(MovieHallModel, 'findAndCountAll')
        .mockResolvedValue({
          rows: [
            makeRow({ quality: '2D' }),
            makeRow({ hallId: 'hall-2', quality: '3D' }),
          ] as any,
          count: 2,
        } as any);

      const res = await svc.getByQualities(['2D', '3D'], {
        page: 1,
        limit: 10,
      });

      expect(facSpy).toHaveBeenCalled();
      expect(res.items).toHaveLength(2);
    });
  });

  describe('getMultiple', () => {
    it('returns multiple specific halls', async () => {
      const halls = [
        { theaterId: 'theater-1', hallId: 'hall-1' },
        { theaterId: 'theater-1', hallId: 'hall-2' },
      ];

      const facSpy = jest
        .spyOn(MovieHallModel, 'findAndCountAll')
        .mockResolvedValue({
          rows: [makeRow(), makeRow({ hallId: 'hall-2' })] as any,
          count: 2,
        } as any);

      const res = await svc.getMultiple(halls, { page: 1, limit: 10 });

      expect(facSpy).toHaveBeenCalled();
      expect(res.items).toHaveLength(2);
    });
  });

  describe('getCapacityInfo', () => {
    it('returns capacity information for a hall', async () => {
      jest.spyOn(MovieHallModel, 'findOne').mockResolvedValue(makeRow());

      const info = await svc.getCapacityInfo(
        baseHall.theaterId,
        baseHall.hallId
      );

      expect(info).toEqual({
        theaterId: baseHall.theaterId,
        hallId: baseHall.hallId,
        totalSeats: 6, // 2 rows x 3 seats
        rows: 2,
        maxSeatsPerRow: 3,
        quality: baseHall.quality,
      });
    });

    it('returns null when hall not found', async () => {
      jest.spyOn(MovieHallModel, 'findOne').mockResolvedValue(null);

      const info = await svc.getCapacityInfo('theater-x', 'hall-x');
      expect(info).toBeNull();
    });
  });

  describe('getTheaterCapacities', () => {
    it('returns capacity info for all halls in theater', async () => {
      // Return plain objects with seatsLayout directly accessible
      const halls = [
        {
          ...baseHall,
          seatsLayout: [['A1', 'A2']],
          get: () => ({ ...baseHall, seatsLayout: [['A1', 'A2']] }),
        },
        {
          ...baseHall,
          hallId: 'hall-2',
          seatsLayout: [['B1', 'B2', 'B3']],
          get: () => ({
            ...baseHall,
            hallId: 'hall-2',
            seatsLayout: [['B1', 'B2', 'B3']],
          }),
        },
      ];

      jest.spyOn(MovieHallModel, 'findAll').mockResolvedValue(halls as any);

      const capacities = await svc.getTheaterCapacities('theater-1');

      expect(capacities).toHaveLength(2);
      expect(capacities[0].totalSeats).toBe(2);
      expect(capacities[1].totalSeats).toBe(3);
    });
  });

  describe('exists', () => {
    it('returns true when hall exists', async () => {
      jest.spyOn(MovieHallModel, 'count').mockResolvedValue(1);

      const exists = await svc.exists(baseHall.theaterId, baseHall.hallId);
      expect(exists).toBe(true);
    });

    it('returns false when hall does not exist', async () => {
      jest.spyOn(MovieHallModel, 'count').mockResolvedValue(0);

      const exists = await svc.exists('theater-x', 'hall-x');
      expect(exists).toBe(false);
    });
  });

  describe('getAllSeatIds', () => {
    it('returns all seat IDs from layout', async () => {
      jest.spyOn(MovieHallModel, 'findOne').mockResolvedValue(makeRow());

      const seatIds = await svc.getAllSeatIds(
        baseHall.theaterId,
        baseHall.hallId
      );

      expect(seatIds).toEqual(['A1', 'A2', 'A3', 'B1', 'B2', 'B3']);
    });
  });

  describe('getStats', () => {
    it('returns comprehensive statistics', async () => {
      // Mock Sequelize instance
      const mockSequelize = {
        fn: jest.fn((funcName: string, col: any) => `fn:${funcName}`),
        col: jest.fn((colName: string) => `col:${colName}`),
      };

      Object.defineProperty(MovieHallModel, 'sequelize', {
        get: () => mockSequelize,
        configurable: true,
      });

      const countSpy = jest
        .spyOn(MovieHallModel, 'count')
        .mockResolvedValue(10);

      let findAllCallCount = 0;
      const findAllSpy = jest
        .spyOn(MovieHallModel, 'findAll')
        .mockImplementation((options?: any) => {
          findAllCallCount++;

          const attrs = options?.attributes || [];
          const isAggregateQuery = Array.isArray(attrs[1]);

          // By quality grouping
          if (attrs[0] === 'quality' && isAggregateQuery) {
            return Promise.resolve([
              { quality: '2D', count: '5' },
              { quality: '3D', count: '3' },
              { quality: 'IMAX', count: '2' },
            ] as any);
          }

          // By theater grouping
          if (attrs[0] === 'theaterId' && isAggregateQuery) {
            return Promise.resolve([
              { theaterId: 'theater-1', count: '6' },
              { theaterId: 'theater-2', count: '4' },
            ] as any);
          }

          // All halls for capacity calculation
          return Promise.resolve([
            { seatsLayout: [['A1', 'A2']] }, // 2 seats
            { seatsLayout: [['B1', 'B2', 'B3']] }, // 3 seats
            { seatsLayout: [['C1', 'C2', 'C3', 'C4', 'C5']] }, // 5 seats
          ] as any);
        });

      const stats = await svc.getStats();

      expect(countSpy).toHaveBeenCalled();
      expect(findAllSpy).toHaveBeenCalledTimes(3);

      expect(stats.total).toBe(10);
      expect(stats.byQuality['2D']).toBe(5);
      expect(stats.byQuality['3D']).toBe(3);
      expect(stats.byQuality.IMAX).toBe(2);
      expect(stats.byQuality['4DX']).toBe(0);

      expect(stats.byTheater).toHaveLength(2);
      expect(stats.byTheater[0]).toEqual({ theaterId: 'theater-1', count: 6 });

      expect(stats.totalCapacity).toBe(10); // 2 + 3 + 5
      expect(stats.averageCapacity).toBeCloseTo(3.33, 2);
    });

    it('handles empty database', async () => {
      const mockSequelize = {
        fn: jest.fn(),
        col: jest.fn(),
      };

      Object.defineProperty(MovieHallModel, 'sequelize', {
        get: () => mockSequelize,
        configurable: true,
      });

      jest.spyOn(MovieHallModel, 'count').mockResolvedValue(0);
      jest.spyOn(MovieHallModel, 'findAll').mockResolvedValue([] as any);

      const stats = await svc.getStats();

      expect(stats.total).toBe(0);
      expect(stats.byQuality['2D']).toBe(0);
      expect(stats.byTheater).toEqual([]);
      expect(stats.totalCapacity).toBe(0);
      expect(stats.averageCapacity).toBe(0);
    });
  });

  describe('updateLayout', () => {
    it('updates hall layout', async () => {
      const newLayout = [['X1', 'X2', 'X3']];
      const save = jest.fn(async () => {});
      const set = jest.fn();

      jest.spyOn(MovieHallModel, 'findOne').mockResolvedValue({
        set,
        save,
        get: () => ({ ...baseHall, seatsLayout: newLayout }),
      } as unknown as MovieHallModel);

      const dto = await svc.updateLayout(
        baseHall.theaterId,
        baseHall.hallId,
        newLayout
      );

      expect(set).toHaveBeenCalledWith({ seatsLayout: newLayout });
      expect(dto?.seatsLayout).toEqual(newLayout);
    });
  });

  describe('validateLayout', () => {
    it('validates correct layout', () => {
      const layout = [
        ['A1', 'A2'],
        ['B1', 'B2'],
      ];

      const result = svc.validateLayout(layout);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('rejects empty layout', () => {
      const result = svc.validateLayout([]);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Layout must be a non-empty 2D array');
    });

    it('rejects layout with empty row', () => {
      const layout = [['A1'], []];

      const result = svc.validateLayout(layout);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Row 1 must be a non-empty array');
    });

    it('rejects layout with invalid seat types', () => {
      const layout = [['A1', null as any]];

      const result = svc.validateLayout(layout);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('must be a string or number');
    });

    it('rejects layout with empty string seats', () => {
      const layout = [['A1', '']];

      const result = svc.validateLayout(layout);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('cannot be an empty string');
    });

    it('rejects layout with negative number seats', () => {
      const layout = [['A1', -1]];

      const result = svc.validateLayout(layout);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain(
        'must be a non-negative finite number'
      );
    });

    it('accepts layout with number seats', () => {
      const layout = [[1, 2, 3]];

      const result = svc.validateLayout(layout);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('private methods', () => {
    describe('calculateCapacity', () => {
      it('calculates total capacity correctly', () => {
        const layout = [
          ['A1', 'A2', 'A3'],
          ['B1', 'B2'],
        ];

        const capacity = (svc as any).calculateCapacity(layout);
        expect(capacity).toBe(5);
      });
    });

    describe('extractSeatIds', () => {
      it('extracts all seat IDs', () => {
        const layout = [
          ['A1', 'A2'],
          ['B1', 'B2'],
        ];

        const seatIds = (svc as any).extractSeatIds(layout);
        expect(seatIds).toEqual(['A1', 'A2', 'B1', 'B2']);
      });

      it('converts number seats to strings', () => {
        const layout = [
          [1, 2],
          [3, 4],
        ];

        const seatIds = (svc as any).extractSeatIds(layout);
        expect(seatIds).toEqual(['1', '2', '3', '4']);
      });
    });

    describe('paginate', () => {
      it('falls back to DEFAULT_LIMIT when limit is falsy', () => {
        const result = (svc as any).paginate([makeRow()] as any, 25, 1, 0);

        expect(result.totalPages).toBe(2); // 25/20 = 2
        expect(result.items).toHaveLength(1);
      });

      it('calculates correct pagination metadata', () => {
        const halls = [makeRow(), makeRow({ hallId: 'hall-2' })];
        const result = (svc as any).paginate(halls as any, 50, 2, 20);

        expect(result.items).toHaveLength(2);
        expect(result.page).toBe(2);
        expect(result.limit).toBe(20);
        expect(result.total).toBe(50);
        expect(result.totalPages).toBe(3);
      });
    });

    describe('pickForDTO', () => {
      it('extracts only safe fields for DTO mapping', () => {
        const mockModel = makeRow({
          theaterId: 'test-theater',
          hallId: 'test-hall',
        });

        const result = (svc as any).pickForDTO(mockModel);

        expect(result).toEqual({
          theaterId: 'test-theater',
          hallId: 'test-hall',
          seatsLayout: baseHall.seatsLayout,
          quality: baseHall.quality,
          createdAt: baseHall.createdAt,
          updatedAt: baseHall.updatedAt,
        });
      });
    });
  });

  describe('transaction support', () => {
    it('passes transaction to create operation', async () => {
      const mockTransaction = {} as any;
      jest.spyOn(MovieHallModel, 'findOne').mockResolvedValue(null);
      const createSpy = jest
        .spyOn(MovieHallModel, 'create')
        .mockResolvedValue(makeRow());

      await svc.create(
        {
          theaterId: baseHall.theaterId,
          hallId: baseHall.hallId,
          seatsLayout: baseHall.seatsLayout,
          quality: baseHall.quality,
        },
        { transaction: mockTransaction }
      );

      expect(createSpy).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ transaction: mockTransaction })
      );
    });

    it('passes transaction to list operation', async () => {
      const mockTransaction = {} as any;
      const facSpy = jest
        .spyOn(MovieHallModel, 'findAndCountAll')
        .mockResolvedValue({
          rows: [] as any,
          count: 0,
        } as any);

      await svc.list({ page: 1, limit: 10 }, { transaction: mockTransaction });

      expect(facSpy).toHaveBeenCalledWith(
        expect.objectContaining({ transaction: mockTransaction })
      );
    });
  });
});
