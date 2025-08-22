// src/__tests__/routes/movie-theater.route.spec.ts
import { Op, Transaction } from 'sequelize';
import { sequelize } from '../../config/db.js';
import {
  MovieTheaterModel,
  MovieTheaterAttributes,
} from '../../models/movie-theater.model.js';
import { MovieTheaterService } from '../../services/movie-theater.service.js';
import { ConflictError } from '../../errors/conflict-error.js';
import { NotFoundError } from '../../errors/not-found-error.js';

const service = new MovieTheaterService();

const baseTheater: MovieTheaterAttributes = {
  theaterId: 'cinema-lyon-01',
  address: '1 Rue de la République',
  postalCode: '69001',
  city: 'Lyon',
  phone: '+33456789012',
  email: 'contact@cinema-lyon.fr',
};

let mockTxn: any;

beforeEach(() => {
  jest.clearAllMocks();

  // Minimal transaction mock returning the callback result
  mockTxn = { LOCK: { UPDATE: 'UPDATE' } } as unknown as Transaction;
  jest
    .spyOn(sequelize, 'transaction')
    .mockImplementation(async (cb: any) => cb(mockTxn));

  // Reset model method mocks
  (MovieTheaterModel.findByPk as any) = jest.fn();
  (MovieTheaterModel.create as any) = jest.fn();
  (MovieTheaterModel.update as any) = jest.fn();
  (MovieTheaterModel.destroy as any) = jest.fn();
  (MovieTheaterModel.findAll as any) = jest.fn();
  (MovieTheaterModel.bulkCreate as any) = jest.fn();
});

describe('MovieTheaterService', () => {
  // ------- create -------
  describe('create', () => {
    it('creates a theater when it does not exist', async () => {
      (MovieTheaterModel.findByPk as jest.Mock).mockResolvedValueOnce(null);
      (MovieTheaterModel.create as jest.Mock).mockResolvedValueOnce(
        baseTheater
      );

      const created = await service.create(baseTheater);

      expect(MovieTheaterModel.findByPk).toHaveBeenCalledWith(
        baseTheater.theaterId,
        { transaction: mockTxn, lock: mockTxn.LOCK.UPDATE }
      );
      expect(MovieTheaterModel.create).toHaveBeenCalledWith(baseTheater, {
        transaction: mockTxn,
      });
      expect(created).toBe(baseTheater);
    });

    it('throws ConflictError if theater already exists', async () => {
      (MovieTheaterModel.findByPk as jest.Mock).mockResolvedValueOnce(
        baseTheater
      );

      await expect(service.create(baseTheater)).rejects.toBeInstanceOf(
        ConflictError
      );
    });
  });

  // ------- getById -------
  describe('getById', () => {
    it('returns a theater when found', async () => {
      (MovieTheaterModel.findByPk as jest.Mock).mockResolvedValueOnce(
        baseTheater
      );

      const found = await service.getById(baseTheater.theaterId);

      expect(MovieTheaterModel.findByPk).toHaveBeenCalledWith(
        baseTheater.theaterId
      );
      expect(found).toBe(baseTheater);
    });

    it('throws NotFoundError when theater is not found', async () => {
      (MovieTheaterModel.findByPk as jest.Mock).mockResolvedValueOnce(null);

      await expect(service.getById('not-exist')).rejects.toBeInstanceOf(
        NotFoundError
      );
    });
  });

  // ------- getAll -------
  describe('getAll', () => {
    it('returns all theaters', async () => {
      const rows = [baseTheater];
      (MovieTheaterModel.findAll as jest.Mock).mockResolvedValueOnce(rows);

      const result = await service.getAll();

      expect(MovieTheaterModel.findAll).toHaveBeenCalledWith();
      expect(result).toBe(rows);
    });
  });

  // ------- update -------
  describe('update', () => {
    it('updates a theater when it exists', async () => {
      const updateData = { city: 'Paris' };
      const mockInstance = {
        update: jest.fn().mockResolvedValue({ ...baseTheater, ...updateData }),
      };
      (MovieTheaterModel.findByPk as jest.Mock).mockResolvedValueOnce(
        mockInstance
      );

      const updated = await service.update(baseTheater.theaterId, updateData);

      expect(MovieTheaterModel.findByPk).toHaveBeenCalledWith(
        baseTheater.theaterId,
        { transaction: mockTxn, lock: mockTxn.LOCK.UPDATE }
      );
      expect(mockInstance.update).toHaveBeenCalledWith(updateData, {
        transaction: mockTxn,
      });
      expect(updated.city).toBe('Paris');
    });

    it('throws NotFoundError when theater does not exist', async () => {
      (MovieTheaterModel.findByPk as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        service.update(baseTheater.theaterId, { city: 'Paris' })
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  // ------- delete -------
  describe('delete', () => {
    it('deletes a theater when it exists', async () => {
      (MovieTheaterModel.destroy as jest.Mock).mockResolvedValueOnce(1);

      await expect(
        service.delete(baseTheater.theaterId)
      ).resolves.toBeUndefined();

      expect(MovieTheaterModel.destroy).toHaveBeenCalledWith({
        where: { theaterId: baseTheater.theaterId },
        transaction: mockTxn,
      });
    });

    it('throws NotFoundError when nothing is deleted', async () => {
      (MovieTheaterModel.destroy as jest.Mock).mockResolvedValueOnce(0);

      await expect(service.delete('not-exist')).rejects.toBeInstanceOf(
        NotFoundError
      );
    });
  });

  // ------- search -------
  describe('search', () => {
    it('builds partial-like filters for city, address, postalCode, theaterId', async () => {
      const filters = {
        city: 'Ly',
        address: 'République',
        postalCode: '6900',
        theaterId: 'cinema-',
      };

      const rows = [baseTheater];
      (MovieTheaterModel.findAll as jest.Mock).mockResolvedValueOnce(rows);

      const result = await service.search(filters);

      // Assert we passed proper LIKE conditions (Symbol keys!) to findAll
      const callArg = (MovieTheaterModel.findAll as jest.Mock).mock.calls[0][0];
      const where = callArg.where;

      expect(where.city[Op.like]).toBe(`%${filters.city}%`);
      expect(where.address[Op.like]).toBe(`%${filters.address}%`);
      expect(where.postalCode[Op.like]).toBe(`%${filters.postalCode}%`);
      expect(where.theaterId[Op.like]).toBe(`%${filters.theaterId}%`);

      expect(result).toBe(rows);
    });

    it('returns all when no filters provided', async () => {
      const rows = [baseTheater];
      (MovieTheaterModel.findAll as jest.Mock).mockResolvedValueOnce(rows);

      const result = await service.search({});

      expect(MovieTheaterModel.findAll).toHaveBeenCalledWith({ where: {} });
      expect(result).toBe(rows);
    });
  });

  // ------- bulkCreate -------
  describe('bulkCreate', () => {
    it('returns [] when input is empty', async () => {
      const result = await service.bulkCreate([]);
      expect(result).toEqual([]);
      expect(sequelize.transaction).not.toHaveBeenCalled(); // short-circuit
    });

    it('creates theaters when none exist already', async () => {
      const batch = [
        baseTheater,
        { ...baseTheater, theaterId: 'cinema-paris-01', city: 'Paris' },
      ];
      (MovieTheaterModel.findAll as jest.Mock).mockResolvedValueOnce([]);
      (MovieTheaterModel.bulkCreate as jest.Mock).mockResolvedValueOnce(batch);

      const result = await service.bulkCreate(batch);

      expect(MovieTheaterModel.findAll).toHaveBeenCalledWith({
        where: { theaterId: batch.map((t) => t.theaterId) },
        transaction: mockTxn,
        lock: mockTxn.LOCK.UPDATE,
      });
      expect(MovieTheaterModel.bulkCreate).toHaveBeenCalledWith(batch, {
        transaction: mockTxn,
      });
      expect(result).toBe(batch);
    });

    it('throws ConflictError if any provided IDs already exist', async () => {
      const batch = [
        baseTheater,
        { ...baseTheater, theaterId: 'cinema-paris-01', city: 'Paris' },
      ];
      (MovieTheaterModel.findAll as jest.Mock).mockResolvedValueOnce([
        { theaterId: 'cinema-paris-01' },
      ]);

      await expect(service.bulkCreate(batch)).rejects.toBeInstanceOf(
        ConflictError
      );
    });
  });
});
