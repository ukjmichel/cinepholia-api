// src/__tests__/services/movie.service.spec.ts
import { jest } from '@jest/globals';
import { MovieService } from '../../services/movie.service.js';
import { MovieModel } from '../../models/movie.model.js';
import { ScreeningModel } from '../../models/screening.model.js';
import { movieImageService } from '../../services/movie-image.service.js';
import * as queries from '../../queries/movie.queries.js';
import { NotFoundError } from '../../errors/not-found-error.js';
import { ConflictError } from '../../errors/conflict-error.js';
import { sequelize } from '../../config/db.js';
import type { MockedFunction } from 'jest-mock';
import type { Transaction } from 'sequelize';

describe('MovieService', () => {
  const svc = new MovieService();

  const baseMovie = {
    movieId: 'm-1',
    title: 'Test Movie',
    description: 'A great test movie',
    ageRating: 'PG-13',
    genre: 'Action',
    releaseDate: new Date('2025-12-01'),
    director: 'John Director',
    durationMinutes: 120,
    posterUrl: 'https://example.com/poster.jpg',
    recommended: true,
    createdAt: new Date('2025-09-25T12:00:00Z'),
    updatedAt: new Date('2025-09-25T12:00:00Z'),
  };

  // Sequelize-like instance: .get() and direct property access
  const makeRow = (over: Partial<typeof baseMovie> = {}): MovieModel => {
    const data = { ...baseMovie, ...over };
    return {
      ...data, // Spread properties for direct access (e.g., movie.posterUrl)
      get: () => data,
      set: jest.fn(),
      save: jest.fn(async () => {}),
    } as unknown as MovieModel;
  };

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('create', () => {
    it('creates a movie and returns a safe DTO', async () => {
      const findOneSpy = jest
        .spyOn(MovieModel, 'findOne')
        .mockResolvedValue(null);

      const createSpy = jest
        .spyOn(MovieModel, 'create')
        .mockResolvedValue(makeRow());

      const transactionSpy = jest
        .spyOn(sequelize, 'transaction')
        .mockImplementation(async (callback: any) => {
          return await callback({} as Transaction);
        });

      const dto = await svc.create({
        title: baseMovie.title,
        description: baseMovie.description,
        ageRating: baseMovie.ageRating,
        genre: baseMovie.genre,
        releaseDate: baseMovie.releaseDate,
        director: baseMovie.director,
        durationMinutes: baseMovie.durationMinutes,
        recommended: baseMovie.recommended,
      });

      expect(findOneSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { title: baseMovie.title, director: baseMovie.director },
        })
      );
      expect(createSpy).toHaveBeenCalled();
      expect(transactionSpy).toHaveBeenCalled();
      expect(dto).toEqual({
        movieId: baseMovie.movieId,
        title: baseMovie.title,
        description: baseMovie.description,
        ageRating: baseMovie.ageRating,
        genre: baseMovie.genre,
        releaseDate: baseMovie.releaseDate,
        director: baseMovie.director,
        durationMinutes: baseMovie.durationMinutes,
        posterUrl: baseMovie.posterUrl,
        recommended: baseMovie.recommended,
        createdAt: baseMovie.createdAt,
        updatedAt: baseMovie.updatedAt,
      });
    });

    it('throws ConflictError when movie with same title and director exists', async () => {
      jest.spyOn(MovieModel, 'findOne').mockResolvedValue(makeRow());

      await expect(
        svc.create({
          title: baseMovie.title,
          description: baseMovie.description,
          ageRating: baseMovie.ageRating,
          genre: baseMovie.genre,
          releaseDate: baseMovie.releaseDate,
          director: baseMovie.director,
          durationMinutes: baseMovie.durationMinutes,
        })
      ).rejects.toThrow(ConflictError);
    });

    it('saves movie image when file is provided', async () => {
      jest.spyOn(MovieModel, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(MovieModel, 'create')
        .mockResolvedValue(
          makeRow({ posterUrl: 'https://example.com/uploaded.jpg' })
        );

      const saveImageSpy = jest
        .spyOn(movieImageService, 'saveMovieImage')
        .mockResolvedValue('https://example.com/uploaded.jpg');

      jest
        .spyOn(sequelize, 'transaction')
        .mockImplementation(async (callback: any) => {
          return await callback({} as Transaction);
        });

      const mockFile = { filename: 'test.jpg' } as Express.Multer.File;

      const dto = await svc.create(
        {
          title: baseMovie.title,
          description: baseMovie.description,
          ageRating: baseMovie.ageRating,
          genre: baseMovie.genre,
          releaseDate: baseMovie.releaseDate,
          director: baseMovie.director,
          durationMinutes: baseMovie.durationMinutes,
        },
        mockFile
      );

      expect(saveImageSpy).toHaveBeenCalledWith(mockFile);
      expect(dto.posterUrl).toBe('https://example.com/uploaded.jpg');
    });
  });

  describe('get', () => {
    it('returns DTO when found', async () => {
      const spy = jest
        .spyOn(MovieModel, 'findByPk')
        .mockResolvedValue(makeRow());

      const dto = await svc.get(baseMovie.movieId);
      expect(spy).toHaveBeenCalledWith(baseMovie.movieId, expect.any(Object));
      expect(dto?.title).toBe(baseMovie.title);
      expect(dto?.director).toBe(baseMovie.director);
    });

    it('returns null when not found', async () => {
      jest.spyOn(MovieModel, 'findByPk').mockResolvedValue(null);
      const dto = await svc.get('nope');
      expect(dto).toBeNull();
    });
  });

  describe('getById', () => {
    it('returns DTO when found', async () => {
      jest.spyOn(MovieModel, 'findByPk').mockResolvedValue(makeRow());

      const dto = await svc.getById(baseMovie.movieId);
      expect(dto.title).toBe(baseMovie.title);
    });

    it('throws NotFoundError when not found', async () => {
      jest.spyOn(MovieModel, 'findByPk').mockResolvedValue(null);

      await expect(svc.getById('missing')).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    it('updates fields and returns DTO', async () => {
      const save = jest.fn(async () => {});
      const set = jest.fn();

      const findByPkSpy = jest.spyOn(
        MovieModel,
        'findByPk'
      ) as unknown as MockedFunction<typeof MovieModel.findByPk>;

      findByPkSpy.mockResolvedValue({
        set,
        save,
        get: () => ({ ...baseMovie, title: 'Updated Title' }),
      } as unknown as MovieModel);

      jest
        .spyOn(sequelize, 'transaction')
        .mockImplementation(async (callback: any) => {
          return await callback({} as Transaction);
        });

      const dto = await svc.update(baseMovie.movieId, {
        title: 'Updated Title',
      });

      expect(set).toHaveBeenCalledWith({ title: 'Updated Title' });
      expect(save).toHaveBeenCalled();
      expect(dto?.title).toBe('Updated Title');
    });

    it('returns null when not found', async () => {
      jest.spyOn(MovieModel, 'findByPk').mockResolvedValue(null);
      jest
        .spyOn(sequelize, 'transaction')
        .mockImplementation(async (callback: any) => {
          return await callback({} as Transaction);
        });

      const dto = await svc.update('missing', { title: 'Updated' });
      expect(dto).toBeNull();
    });

    it('updates poster image when file is provided', async () => {
      const save = jest.fn(async () => {});
      const set = jest.fn();

      jest.spyOn(MovieModel, 'findByPk').mockResolvedValue({
        set,
        save,
        get: () => ({ ...baseMovie, posterUrl: 'https://example.com/new.jpg' }),
      } as unknown as MovieModel);

      const saveImageSpy = jest
        .spyOn(movieImageService, 'saveMovieImage')
        .mockResolvedValue('https://example.com/new.jpg');

      jest
        .spyOn(sequelize, 'transaction')
        .mockImplementation(async (callback: any) => {
          return await callback({} as Transaction);
        });

      const mockFile = { filename: 'new.jpg' } as Express.Multer.File;

      const dto = await svc.update(
        baseMovie.movieId,
        { title: 'Updated' },
        mockFile
      );

      expect(saveImageSpy).toHaveBeenCalledWith(mockFile);
      expect(set).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Updated',
          posterUrl: 'https://example.com/new.jpg',
        })
      );
    });
  });

  describe('remove', () => {
    it('returns true when a movie is deleted', async () => {
      const findByPkSpy = jest
        .spyOn(MovieModel, 'findByPk')
        .mockResolvedValue(makeRow());

      const destroySpy = jest
        .spyOn(MovieModel, 'destroy')
        .mockResolvedValue(1 as any);

      const deleteImageSpy = jest
        .spyOn(movieImageService, 'deleteMovieImage')
        .mockResolvedValue(undefined);

      jest
        .spyOn(sequelize, 'transaction')
        .mockImplementation(async (callback: any) => {
          return await callback({} as Transaction);
        });

      const ok = await svc.remove(baseMovie.movieId);

      expect(findByPkSpy).toHaveBeenCalled();
      expect(deleteImageSpy).toHaveBeenCalledWith(baseMovie.posterUrl);
      expect(destroySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { movieId: baseMovie.movieId },
        })
      );
      expect(ok).toBe(true);
    });

    it('returns false when no movie is deleted', async () => {
      jest.spyOn(MovieModel, 'findByPk').mockResolvedValue(null);
      jest
        .spyOn(sequelize, 'transaction')
        .mockImplementation(async (callback: any) => {
          return await callback({} as Transaction);
        });

      const ok = await svc.remove(baseMovie.movieId);
      expect(ok).toBe(false);
    });

    it('deletes movie without poster image cleanup if no posterUrl', async () => {
      jest
        .spyOn(MovieModel, 'findByPk')
        .mockResolvedValue(makeRow({ posterUrl: undefined }));

      const destroySpy = jest
        .spyOn(MovieModel, 'destroy')
        .mockResolvedValue(1 as any);

      const deleteImageSpy = jest.spyOn(movieImageService, 'deleteMovieImage');

      jest
        .spyOn(sequelize, 'transaction')
        .mockImplementation(async (callback: any) => {
          return await callback({} as Transaction);
        });

      await svc.remove(baseMovie.movieId);

      expect(deleteImageSpy).not.toHaveBeenCalled();
      expect(destroySpy).toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('returns paginated response', async () => {
      const spy = jest.spyOn(MovieModel, 'findAndCountAll').mockResolvedValue({
        rows: [makeRow()] as unknown as MovieModel[],
        count: 1,
      } as any);

      const res = await svc.list({ page: 1, limit: 20 });

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ offset: 0, limit: 20 })
      );
      expect(res.items).toHaveLength(1);
      expect(res.page).toBe(1);
      expect(res.limit).toBe(20);
      expect(res.totalItems).toBe(1);
      expect(res.totalPages).toBe(1);
    });

    it('returns empty paginated response (clamped to totalPages=1)', async () => {
      jest.spyOn(MovieModel, 'findAndCountAll').mockResolvedValue({
        rows: [] as unknown as MovieModel[],
        count: 0,
      } as any);

      const res = await svc.list({ page: 1, limit: 20 });
      expect(res.items).toEqual([]);
      expect(res.totalPages).toBe(1);
    });

    it('applies filters correctly', async () => {
      const whereMock = { genre: 'Action' } as any;
      const whereSpy = jest
        .spyOn(queries, 'buildMovieWhere')
        .mockReturnValue(whereMock);

      jest.spyOn(MovieModel, 'findAndCountAll').mockResolvedValue({
        rows: [makeRow()] as any,
        count: 1,
      } as any);

      await svc.list({ filters: { genre: 'Action' } });

      expect(whereSpy).toHaveBeenCalledWith({ genre: 'Action' });
    });
  });

  describe('search', () => {
    it('uses buildMovieWhere(filters, q) and paginates', async () => {
      const whereMock = { some: 'where' } as any;
      const whereSpy = jest
        .spyOn(queries, 'buildMovieWhere')
        .mockReturnValue(whereMock);

      const facSpy = jest
        .spyOn(MovieModel, 'findAndCountAll')
        .mockResolvedValue({
          rows: [
            makeRow(),
            makeRow({
              movieId: 'm-2',
              title: 'Another Movie',
            }),
          ] as any,
          count: 2,
        } as any);

      const params = {
        page: 1,
        limit: 2,
        q: 'test',
        filters: { genre: 'Action' },
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
      expect(res.page).toBe(1);
      expect(res.limit).toBe(2);
      expect(res.totalPages).toBe(1);
    });
  });

  describe('getUpcoming', () => {
    it('retrieves upcoming movies with default sort', async () => {
      const whereMock = { releaseDate: { $gt: expect.any(Date) } } as any;
      const whereSpy = jest
        .spyOn(queries, 'buildUpcomingMoviesWhere')
        .mockReturnValue(whereMock);

      jest.spyOn(MovieModel, 'findAndCountAll').mockResolvedValue({
        rows: [makeRow({ releaseDate: new Date('2026-01-01') })] as any,
        count: 1,
      } as any);

      const res = await svc.getUpcoming();

      expect(whereSpy).toHaveBeenCalled();
      expect(res.items).toHaveLength(1);
      expect(res.items[0].releaseDate).toEqual(new Date('2026-01-01'));
    });

    it('applies custom pagination options', async () => {
      jest
        .spyOn(queries, 'buildUpcomingMoviesWhere')
        .mockReturnValue({} as any);

      const facSpy = jest
        .spyOn(MovieModel, 'findAndCountAll')
        .mockResolvedValue({
          rows: [] as any,
          count: 0,
        } as any);

      await svc.getUpcoming({ page: 2, limit: 10 });

      expect(facSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          offset: 10,
          limit: 10,
        })
      );
    });
  });

  describe('getByTheater', () => {
    it('retrieves movies screened in a theater', async () => {
      const screeningSpy = jest
        .spyOn(ScreeningModel, 'findAll')
        .mockResolvedValue([{ movieId: 'm-1' }, { movieId: 'm-2' }] as any);

      const whereMock = { movieId: { $in: ['m-1', 'm-2'] } } as any;
      const whereSpy = jest
        .spyOn(queries, 'buildMoviesByTheaterWhere')
        .mockReturnValue(whereMock);

      jest.spyOn(MovieModel, 'findAndCountAll').mockResolvedValue({
        rows: [makeRow(), makeRow({ movieId: 'm-2' })] as any,
        count: 2,
      } as any);

      const res = await svc.getByTheater('t-1');

      expect(screeningSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { theaterId: 't-1' },
        })
      );
      expect(whereSpy).toHaveBeenCalledWith(['m-1', 'm-2']);
      expect(res.items).toHaveLength(2);
    });

    it('handles theater with no screenings', async () => {
      jest.spyOn(ScreeningModel, 'findAll').mockResolvedValue([] as any);

      jest
        .spyOn(queries, 'buildMoviesByTheaterWhere')
        .mockReturnValue({ movieId: { $in: [] } } as any);

      jest.spyOn(MovieModel, 'findAndCountAll').mockResolvedValue({
        rows: [] as any,
        count: 0,
      } as any);

      const res = await svc.getByTheater('empty-theater');

      expect(res.items).toEqual([]);
      expect(res.totalItems).toBe(0);
    });
  });

  describe('getByScreeningId', () => {
    it('retrieves movie for a screening', async () => {
      jest.spyOn(ScreeningModel, 'findByPk').mockResolvedValue({
        movieId: baseMovie.movieId,
      } as any);

      jest.spyOn(MovieModel, 'findByPk').mockResolvedValue(makeRow());

      const dto = await svc.getByScreeningId('s-1');

      expect(dto.movieId).toBe(baseMovie.movieId);
      expect(dto.title).toBe(baseMovie.title);
    });

    it('throws NotFoundError when screening not found', async () => {
      jest.spyOn(ScreeningModel, 'findByPk').mockResolvedValue(null);

      await expect(svc.getByScreeningId('missing')).rejects.toThrow(
        NotFoundError
      );
    });

    it('throws NotFoundError when movie not found', async () => {
      jest.spyOn(ScreeningModel, 'findByPk').mockResolvedValue({
        movieId: 'missing-movie',
      } as any);

      jest.spyOn(MovieModel, 'findByPk').mockResolvedValue(null);

      await expect(svc.getByScreeningId('s-1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('paginate', () => {
    it('handles edge case with limit=0 falling back to DEFAULT_LIMIT', () => {
      const result = (svc as any).paginate([makeRow()] as any, 25, 1, 0);
      // DEFAULT_LIMIT is 20, so 25/20 = 2 pages
      expect(result.totalPages).toBe(2);
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('ensures totalPages is at least 1 even with 0 items', () => {
      const result = (svc as any).paginate([], 0, 1, 20);
      expect(result.totalPages).toBe(1);
      expect(result.totalItems).toBe(0);
    });
  });

  describe('pickForDTO', () => {
    it('includes all expected fields', () => {
      const model = makeRow();
      const picked = (svc as any).pickForDTO(model);

      expect(picked).toHaveProperty('movieId');
      expect(picked).toHaveProperty('title');
      expect(picked).toHaveProperty('description');
      expect(picked).toHaveProperty('ageRating');
      expect(picked).toHaveProperty('genre');
      expect(picked).toHaveProperty('releaseDate');
      expect(picked).toHaveProperty('director');
      expect(picked).toHaveProperty('durationMinutes');
      expect(picked).toHaveProperty('posterUrl');
      expect(picked).toHaveProperty('recommended');
      expect(picked).toHaveProperty('createdAt');
      expect(picked).toHaveProperty('updatedAt');
    });

    it('defaults recommended to false when undefined', () => {
      const model = makeRow({ recommended: undefined });
      const picked = (svc as any).pickForDTO(model);
      const dto = require('../../interfaces/movie.js').toMovieDTO(picked);

      expect(dto.recommended).toBe(false);
    });
  });
});
