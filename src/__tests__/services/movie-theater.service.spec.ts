// src/__tests__/services/movie-theater.service.spec.ts
import { jest } from '@jest/globals';
import { MovieTheaterService } from '../../services/movie-theater.service.js';
import { MovieTheaterModel } from '../../models/movie-theater.model.js';
import * as queries from '../../queries/movie-theater.queries.js';
import type { MockedFunction } from 'jest-mock';
import { NotFoundError } from '../../errors/not-found-error.js';
import { ConflictError } from '../../errors/conflict-error.js';

describe('MovieTheaterService', () => {
  const svc = new MovieTheaterService();

  const baseTheater = {
    theaterId: 'theater-1',
    name: 'Cinema Paradiso',
    address: '123 Main Street',
    postalCode: '75001',
    city: 'Paris',
    phone: '+33 1 42 86 57 50',
    email: 'contact@cinema-paradiso.fr',
    createdAt: new Date('2025-09-25T12:00:00Z'),
    updatedAt: new Date('2025-09-25T12:00:00Z'),
  };

  // Sequelize-like instance: only .get() is used by the service
  const makeRow = (over: Partial<typeof baseTheater> = {}): MovieTheaterModel =>
    ({
      get: () => ({ ...baseTheater, ...over }),
    }) as unknown as MovieTheaterModel;

  beforeEach(() => {
    jest.restoreAllMocks(); // clears + restores spyOn
  });

  describe('create', () => {
    it('creates a theater and returns a safe DTO', async () => {
      const findByPkSpy = jest
        .spyOn(MovieTheaterModel, 'findByPk')
        .mockResolvedValue(null);

      const createSpy = jest
        .spyOn(MovieTheaterModel, 'create')
        .mockResolvedValue(makeRow());

      const dto = await svc.create({
        theaterId: baseTheater.theaterId,
        name: baseTheater.name,
        address: baseTheater.address,
        postalCode: baseTheater.postalCode,
        city: baseTheater.city,
        phone: baseTheater.phone,
        email: baseTheater.email,
      });

      expect(findByPkSpy).toHaveBeenCalledWith(
        baseTheater.theaterId,
        expect.any(Object)
      );
      expect(createSpy).toHaveBeenCalled();
      expect(dto).toEqual({
        theaterId: baseTheater.theaterId,
        name: baseTheater.name,
        address: baseTheater.address,
        postalCode: baseTheater.postalCode,
        city: baseTheater.city,
        phone: baseTheater.phone,
        email: baseTheater.email,
        createdAt: baseTheater.createdAt,
        updatedAt: baseTheater.updatedAt,
      });
    });

    it('throws ConflictError when theater ID already exists', async () => {
      const findByPkSpy = jest
        .spyOn(MovieTheaterModel, 'findByPk')
        .mockResolvedValue(makeRow());

      await expect(
        svc.create({
          theaterId: baseTheater.theaterId,
          name: baseTheater.name,
          address: baseTheater.address,
          postalCode: baseTheater.postalCode,
          city: baseTheater.city,
          phone: baseTheater.phone,
          email: baseTheater.email,
        })
      ).rejects.toThrow(ConflictError);

      expect(findByPkSpy).toHaveBeenCalledWith(
        baseTheater.theaterId,
        expect.any(Object)
      );
    });
  });

  describe('get', () => {
    it('returns DTO when found', async () => {
      const spy = jest
        .spyOn(MovieTheaterModel, 'findByPk')
        .mockResolvedValue(makeRow());

      const dto = await svc.get(baseTheater.theaterId);
      expect(spy).toHaveBeenCalledWith(
        baseTheater.theaterId,
        expect.any(Object)
      );
      expect(dto?.theaterId).toBe(baseTheater.theaterId);
      expect(dto?.name).toBe(baseTheater.name);
      expect(dto?.email).toBe(baseTheater.email);
    });

    it('returns null when not found', async () => {
      jest.spyOn(MovieTheaterModel, 'findByPk').mockResolvedValue(null);
      const dto = await svc.get('non-existent');
      expect(dto).toBeNull();
    });
  });

  describe('getById', () => {
    it('returns DTO when found', async () => {
      jest.spyOn(MovieTheaterModel, 'findByPk').mockResolvedValue(makeRow());

      const dto = await svc.getById(baseTheater.theaterId);
      expect(dto.theaterId).toBe(baseTheater.theaterId);
      expect(dto.name).toBe(baseTheater.name);
    });

    it('throws NotFoundError when not found', async () => {
      jest.spyOn(MovieTheaterModel, 'findByPk').mockResolvedValue(null);

      await expect(svc.getById('non-existent')).rejects.toThrow(NotFoundError);
      await expect(svc.getById('non-existent')).rejects.toThrow(
        'Theater with id non-existent not found'
      );
    });
  });

  describe('update', () => {
    it('updates fields and returns DTO', async () => {
      const save = jest.fn(async () => {});
      const set = jest.fn();

      const findByPkSpy = jest.spyOn(
        MovieTheaterModel,
        'findByPk'
      ) as unknown as MockedFunction<typeof MovieTheaterModel.findByPk>;

      findByPkSpy.mockResolvedValue({
        set,
        save,
        get: () => ({ ...baseTheater, name: 'Grand Rex' }),
      } as unknown as MovieTheaterModel);

      const dto = await svc.update(baseTheater.theaterId, {
        name: 'Grand Rex',
      });

      expect(set).toHaveBeenCalledWith({ name: 'Grand Rex' });
      expect(save).toHaveBeenCalled();
      expect(dto?.name).toBe('Grand Rex');
      expect(dto?.theaterId).toBe(baseTheater.theaterId);
    });

    it('updates multiple fields', async () => {
      const save = jest.fn(async () => {});
      const set = jest.fn();

      const findByPkSpy = jest.spyOn(
        MovieTheaterModel,
        'findByPk'
      ) as unknown as MockedFunction<typeof MovieTheaterModel.findByPk>;

      findByPkSpy.mockResolvedValue({
        set,
        save,
        get: () => ({
          ...baseTheater,
          name: 'Grand Rex',
          phone: '+33 1 45 08 93 89',
          email: 'info@grand-rex.fr',
        }),
      } as unknown as MovieTheaterModel);

      const dto = await svc.update(baseTheater.theaterId, {
        name: 'Grand Rex',
        phone: '+33 1 45 08 93 89',
        email: 'info@grand-rex.fr',
      });

      expect(set).toHaveBeenCalledWith({
        name: 'Grand Rex',
        phone: '+33 1 45 08 93 89',
        email: 'info@grand-rex.fr',
      });
      expect(save).toHaveBeenCalled();
      expect(dto?.name).toBe('Grand Rex');
    });

    it('returns null when not found', async () => {
      jest.spyOn(MovieTheaterModel, 'findByPk').mockResolvedValue(null);
      const dto = await svc.update('missing', { name: 'New Name' });
      expect(dto).toBeNull();
    });

    it('filters undefined fields from update', async () => {
      const save = jest.fn(async () => {});
      const set = jest.fn();

      const findByPkSpy = jest.spyOn(
        MovieTheaterModel,
        'findByPk'
      ) as unknown as MockedFunction<typeof MovieTheaterModel.findByPk>;

      findByPkSpy.mockResolvedValue({
        set,
        save,
        get: () => ({ ...baseTheater, name: 'Updated' }),
      } as unknown as MovieTheaterModel);

      await svc.update(baseTheater.theaterId, {
        name: 'Updated',
        address: undefined,
        city: undefined,
      });

      expect(set).toHaveBeenCalledWith({ name: 'Updated' });
      expect(set).not.toHaveBeenCalledWith(
        expect.objectContaining({ address: undefined })
      );
    });
  });

  describe('remove', () => {
    it('returns true when a row is deleted', async () => {
      const spy = jest
        .spyOn(MovieTheaterModel, 'destroy')
        .mockResolvedValue(1 as any);
      const ok = await svc.remove(baseTheater.theaterId);
      expect(spy).toHaveBeenCalledWith({
        where: { theaterId: baseTheater.theaterId },
        transaction: undefined,
      });
      expect(ok).toBe(true);
    });

    it('returns false when no row is deleted', async () => {
      jest.spyOn(MovieTheaterModel, 'destroy').mockResolvedValue(0 as any);
      const ok = await svc.remove(baseTheater.theaterId);
      expect(ok).toBe(false);
    });
  });

  describe('list', () => {
    it('returns paginated response (empty clamped to totalPages=1)', async () => {
      const spy = jest
        .spyOn(MovieTheaterModel, 'findAndCountAll')
        .mockResolvedValue({
          rows: [] as unknown as MovieTheaterModel[],
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

    it('returns paginated theaters with correct data', async () => {
      const facSpy = jest
        .spyOn(MovieTheaterModel, 'findAndCountAll')
        .mockResolvedValue({
          rows: [
            makeRow(),
            makeRow({
              theaterId: 'theater-2',
              name: 'Grand Rex',
              city: 'Paris',
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
      expect(res.items[0].theaterId).toBe(baseTheater.theaterId);
      expect(res.items[1].theaterId).toBe('theater-2');
    });

    it('applies filters correctly', async () => {
      const whereMock = { city: 'Paris' } as any;
      const whereSpy = jest
        .spyOn(queries, 'buildMovieTheaterWhere')
        .mockReturnValue(whereMock);

      const facSpy = jest
        .spyOn(MovieTheaterModel, 'findAndCountAll')
        .mockResolvedValue({
          rows: [makeRow()] as any,
          count: 1,
        } as any);

      await svc.list({
        page: 1,
        limit: 10,
        filters: { city: 'Paris' },
      });

      expect(whereSpy).toHaveBeenCalledWith({ city: 'Paris' });
      expect(facSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: whereMock,
          offset: 0,
          limit: 10,
        })
      );

      whereSpy.mockRestore();
    });

    it('handles pagination with multiple pages', async () => {
      jest.spyOn(MovieTheaterModel, 'findAndCountAll').mockResolvedValue({
        rows: [makeRow()] as any,
        count: 45,
      } as any);

      const res = await svc.list({ page: 2, limit: 20 });

      expect(res.page).toBe(2);
      expect(res.limit).toBe(20);
      expect(res.totalItems).toBe(45);
      expect(res.totalPages).toBe(3); // ceil(45/20) = 3
    });
  });

  describe('search', () => {
    it('uses buildMovieTheaterWhere(filters, q) and paginates', async () => {
      const whereMock = { some: 'where' } as any;
      const whereSpy = jest
        .spyOn(queries, 'buildMovieTheaterWhere')
        .mockReturnValue(whereMock);

      const facSpy = jest
        .spyOn(MovieTheaterModel, 'findAndCountAll')
        .mockResolvedValue({
          rows: [
            makeRow(),
            makeRow({
              theaterId: 'theater-2',
              name: 'UGC Ciné Cité',
              city: 'Lyon',
            }),
          ] as any,
          count: 2,
        } as any);

      const params = {
        page: 1,
        limit: 10,
        q: 'cinema',
        filters: { city: 'Paris' },
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
      expect(res.page).toBe(1);
      expect(res.limit).toBe(10);
      expect(res.totalPages).toBe(1);

      whereSpy.mockRestore();
    });

    it('searches with query string only (no filters)', async () => {
      const whereMock = {} as any;
      const whereSpy = jest
        .spyOn(queries, 'buildMovieTheaterWhere')
        .mockReturnValue(whereMock);

      jest.spyOn(MovieTheaterModel, 'findAndCountAll').mockResolvedValue({
        rows: [makeRow()] as any,
        count: 1,
      } as any);

      await svc.search({ page: 1, limit: 10, q: 'Paradiso' });

      expect(whereSpy).toHaveBeenCalledWith(undefined, 'Paradiso');

      whereSpy.mockRestore();
    });

    it('handles empty search results', async () => {
      jest.spyOn(queries, 'buildMovieTheaterWhere').mockReturnValue({} as any);
      jest.spyOn(MovieTheaterModel, 'findAndCountAll').mockResolvedValue({
        rows: [] as any,
        count: 0,
      } as any);

      const res = await svc.search({ page: 1, limit: 10, q: 'nonexistent' });

      expect(res.items).toEqual([]);
      expect(res.totalItems).toBe(0);
      expect(res.totalPages).toBe(1);
    });
  });

  describe('getAll', () => {
    it('returns all theaters without pagination', async () => {
      const theaters = [
        makeRow(),
        makeRow({ theaterId: 'theater-2', name: 'Grand Rex', city: 'Paris' }),
        makeRow({ theaterId: 'theater-3', name: 'UGC', city: 'Lyon' }),
      ];

      const spy = jest
        .spyOn(MovieTheaterModel, 'findAll')
        .mockResolvedValue(theaters as any);

      const result = await svc.getAll();

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          order: [
            ['name', 'ASC'],
            ['city', 'ASC'],
            ['theaterId', 'ASC'],
          ],
        })
      );
      expect(result).toHaveLength(3);
      expect(result[0].theaterId).toBe(baseTheater.theaterId);
      expect(result[1].theaterId).toBe('theater-2');
      expect(result[2].theaterId).toBe('theater-3');
    });

    it('returns empty array when no theaters exist', async () => {
      jest.spyOn(MovieTheaterModel, 'findAll').mockResolvedValue([] as any);

      const result = await svc.getAll();

      expect(result).toEqual([]);
    });
  });

  describe('getStats', () => {
    it('returns comprehensive statistics', async () => {
      // Mock Sequelize instance with fn and col methods
      const mockSequelize = {
        fn: jest.fn((funcName: string, col: any) => `fn:${funcName}`),
        col: jest.fn((colName: string) => `col:${colName}`),
      };

      Object.defineProperty(MovieTheaterModel, 'sequelize', {
        get: () => mockSequelize,
        configurable: true,
      });

      const countSpy = jest
        .spyOn(MovieTheaterModel, 'count')
        .mockResolvedValue(10);

      const findAllSpy = jest
        .spyOn(MovieTheaterModel, 'findAll')
        .mockImplementation((options?: any) => {
          const attrs = options?.attributes || [];

          // Check if second attribute is an array (indicates aggregate query with COUNT)
          const isAggregateQuery = Array.isArray(attrs[1]);

          // Theater names query: simple attributes only (all strings)
          if (
            attrs.includes('name') &&
            attrs.includes('theaterId') &&
            !isAggregateQuery
          ) {
            return Promise.resolve([
              {
                name: 'Cinema Paradiso',
                city: 'Paris',
                theaterId: 'theater-1',
              },
              { name: 'Grand Rex', city: 'Paris', theaterId: 'theater-2' },
              { name: 'UGC', city: 'Lyon', theaterId: 'theater-3' },
            ] as any);
          }

          // City grouping query: first attr is 'city' and is aggregate
          if (attrs[0] === 'city' && isAggregateQuery) {
            return Promise.resolve([
              { city: 'Paris', count: '5' },
              { city: 'Lyon', count: '3' },
              { city: 'Marseille', count: '2' },
            ] as any);
          }

          // Postal code grouping query: first attr is 'postalCode' and is aggregate
          if (attrs[0] === 'postalCode' && isAggregateQuery) {
            return Promise.resolve([
              { postalCode: '75001', count: '3' },
              { postalCode: '69001', count: '2' },
              { postalCode: '13001', count: '2' },
            ] as any);
          }

          // Fallback
          return Promise.resolve([] as any);
        });

      const stats = await svc.getStats();

      expect(countSpy).toHaveBeenCalled();
      expect(findAllSpy).toHaveBeenCalledTimes(3);

      expect(stats.total).toBe(10);
      expect(stats.byCities).toHaveLength(3);
      expect(stats.byCities[0]).toEqual({ city: 'Paris', count: 5 });
      expect(stats.byCities[1]).toEqual({ city: 'Lyon', count: 3 });
      expect(stats.byCities[2]).toEqual({ city: 'Marseille', count: 2 });

      expect(stats.byPostalCodes).toHaveLength(3);
      expect(stats.byPostalCodes[0]).toEqual({ postalCode: '75001', count: 3 });

      expect(stats.byNames).toHaveLength(3);
      expect(stats.byNames[0]).toEqual({
        name: 'Cinema Paradiso',
        city: 'Paris',
        theaterId: 'theater-1',
      });
    });

    it('handles empty database', async () => {
      // Mock Sequelize instance with fn and col methods
      const mockSequelize = {
        fn: jest.fn((funcName: string, col: any) => `fn:${funcName}`),
        col: jest.fn((colName: string) => `col:${colName}`),
      };

      Object.defineProperty(MovieTheaterModel, 'sequelize', {
        get: () => mockSequelize,
        configurable: true,
      });

      jest.spyOn(MovieTheaterModel, 'count').mockResolvedValue(0);
      jest.spyOn(MovieTheaterModel, 'findAll').mockResolvedValue([] as any);

      const stats = await svc.getStats();

      expect(stats.total).toBe(0);
      expect(stats.byCities).toEqual([]);
      expect(stats.byPostalCodes).toEqual([]);
      expect(stats.byNames).toEqual([]);
    });
  });

  describe('paginate (private method)', () => {
    it('falls back to DEFAULT_LIMIT when limit is falsy', () => {
      // Access private method for testing
      const result = (svc as any).paginate(
        [makeRow()] as any,
        25,
        1,
        0 // falsy limit
      );

      // DEFAULT_LIMIT is 20, so 25/20 => ceil = 2
      expect(result.totalPages).toBe(2);
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items).toHaveLength(1);
    });

    it('calculates correct pagination metadata', () => {
      const theaters = [makeRow(), makeRow({ theaterId: 'theater-2' })];
      const result = (svc as any).paginate(theaters as any, 50, 2, 20);

      expect(result.items).toHaveLength(2);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(20);
      expect(result.total).toBe(50);
      expect(result.totalItems).toBe(50);
      expect(result.totalPages).toBe(3); // ceil(50/20)
    });

    it('ensures totalPages is at least 1', () => {
      const result = (svc as any).paginate([] as any, 0, 1, 20);

      expect(result.totalPages).toBe(1);
      expect(result.items).toEqual([]);
    });
  });

  describe('pickForDTO (private method)', () => {
    it('extracts only safe fields for DTO mapping', () => {
      const mockModel = makeRow({
        theaterId: 'test-theater',
        name: 'Test Cinema',
      });

      const result = (svc as any).pickForDTO(mockModel);

      expect(result).toEqual({
        theaterId: 'test-theater',
        name: 'Test Cinema',
        address: baseTheater.address,
        postalCode: baseTheater.postalCode,
        city: baseTheater.city,
        phone: baseTheater.phone,
        email: baseTheater.email,
        createdAt: baseTheater.createdAt,
        updatedAt: baseTheater.updatedAt,
      });
    });
  });

  describe('transaction support', () => {
    it('passes transaction to create operation', async () => {
      const mockTransaction = {} as any;
      jest.spyOn(MovieTheaterModel, 'findByPk').mockResolvedValue(null);
      const createSpy = jest
        .spyOn(MovieTheaterModel, 'create')
        .mockResolvedValue(makeRow());

      await svc.create(
        {
          theaterId: baseTheater.theaterId,
          name: baseTheater.name,
          address: baseTheater.address,
          postalCode: baseTheater.postalCode,
          city: baseTheater.city,
          phone: baseTheater.phone,
          email: baseTheater.email,
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
        .spyOn(MovieTheaterModel, 'findAndCountAll')
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
