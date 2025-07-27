import { movieTheaterService } from '../../services/movie-theater.service.js';
import { MovieTheaterModel } from '../../models/movie-theater.model.js';
import { ConflictError } from '../../errors/conflict-error.js';
import { NotFoundError } from '../../errors/not-found-error.js';
import { Op } from 'sequelize';

// ✅ Mock Sequelize transaction
const mockTransaction = { LOCK: { UPDATE: 'UPDATE' } };
jest.mock('../../config/db.js', () => ({
  sequelize: { transaction: (cb: any) => cb(mockTransaction) },
}));

// ✅ Mock Model
jest.mock('../../models/movie-theater.model.js', () => ({
  MovieTheaterModel: {
    findByPk: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
    destroy: jest.fn(),
    bulkCreate: jest.fn(),
  },
}));

const mockTheater = {
  theaterId: 'theater-1',
  address: '1 Main St',
  postalCode: '75001',
  city: 'Paris',
  phone: '+33123456789',
  email: 'paris1@cinema.fr',
  update: jest
    .fn()
    .mockImplementation(async (data) => ({ ...mockTheater, ...data })),
  toJSON() {
    return this;
  },
};

describe('MovieTheaterService', () => {
  beforeEach(() => jest.clearAllMocks());

  // ✅ CREATE
  describe('create', () => {
    it('creates a theater when not exists', async () => {
      (MovieTheaterModel.findByPk as jest.Mock).mockResolvedValue(null);
      (MovieTheaterModel.create as jest.Mock).mockResolvedValue(mockTheater);
      expect(await movieTheaterService.create(mockTheater)).toEqual(
        mockTheater
      );
    });

    it('throws ConflictError if exists', async () => {
      (MovieTheaterModel.findByPk as jest.Mock).mockResolvedValue(mockTheater);
      await expect(movieTheaterService.create(mockTheater)).rejects.toThrow(
        ConflictError
      );
    });
  });

  // ✅ GET BY ID
  describe('getById', () => {
    it('returns theater if found', async () => {
      (MovieTheaterModel.findByPk as jest.Mock).mockResolvedValue(mockTheater);
      expect(await movieTheaterService.getById('theater-1')).toBe(mockTheater);
    });

    it('throws NotFoundError if not found', async () => {
      (MovieTheaterModel.findByPk as jest.Mock).mockResolvedValue(null);
      await expect(movieTheaterService.getById('bad')).rejects.toThrow(
        NotFoundError
      );
    });
  });

  // ✅ GET ALL
  describe('getAll', () => {
    it('returns all theaters', async () => {
      (MovieTheaterModel.findAll as jest.Mock).mockResolvedValue([mockTheater]);
      expect(await movieTheaterService.getAll()).toEqual([mockTheater]);
    });
  });

  // ✅ UPDATE
  describe('update', () => {
    it('updates and returns updated object', async () => {
      (MovieTheaterModel.findByPk as jest.Mock).mockResolvedValue(mockTheater);
      const result = await movieTheaterService.update('theater-1', {
        city: 'Lyon',
      });
      expect(result.city).toBe('Lyon');
    });

    it('throws NotFoundError if not found', async () => {
      (MovieTheaterModel.findByPk as jest.Mock).mockResolvedValue(null);
      await expect(
        movieTheaterService.update('bad', { city: 'Nice' })
      ).rejects.toThrow(NotFoundError);
    });

    it('uses transaction and lock', async () => {
      (MovieTheaterModel.findByPk as jest.Mock).mockResolvedValue(mockTheater);
      await movieTheaterService.update('theater-1', { city: 'Paris' });
      expect(MovieTheaterModel.findByPk).toHaveBeenCalledWith(
        'theater-1',
        expect.objectContaining({
          transaction: mockTransaction,
          lock: mockTransaction.LOCK.UPDATE,
        })
      );
    });
  });

  // ✅ DELETE
  describe('delete', () => {
    it('deletes theater if exists', async () => {
      (MovieTheaterModel.destroy as jest.Mock).mockResolvedValue(1);
      await expect(
        movieTheaterService.delete('theater-1')
      ).resolves.toBeUndefined();
    });

    it('throws NotFoundError if not found', async () => {
      (MovieTheaterModel.destroy as jest.Mock).mockResolvedValue(0);
      await expect(movieTheaterService.delete('bad')).rejects.toThrow(
        NotFoundError
      );
    });

    it('ensures transaction is used', async () => {
      (MovieTheaterModel.destroy as jest.Mock).mockResolvedValue(1);
      await movieTheaterService.delete('theater-1');
      expect(MovieTheaterModel.destroy).toHaveBeenCalledWith(
        expect.objectContaining({ transaction: mockTransaction })
      );
    });
  });

  // ✅ SEARCH
  describe('search', () => {
    it('returns matched theaters', async () => {
      (MovieTheaterModel.findAll as jest.Mock).mockResolvedValue([mockTheater]);
      const result = await movieTheaterService.search({ city: 'Paris' });
      expect(result).toEqual([mockTheater]);
    });

    it('handles empty filters', async () => {
      (MovieTheaterModel.findAll as jest.Mock).mockResolvedValue([]);
      await movieTheaterService.search({});
      expect(MovieTheaterModel.findAll).toHaveBeenCalledWith({ where: {} });
    });

    it('handles multiple filters combined', async () => {
      (MovieTheaterModel.findAll as jest.Mock).mockResolvedValue([mockTheater]);
      await movieTheaterService.search({
        city: 'Paris',
        postalCode: '75001',
        theaterId: 'theater-1',
      });
      expect(MovieTheaterModel.findAll).toHaveBeenCalledWith({
        where: expect.objectContaining({
          city: { [Op.like]: '%Paris%' },
          postalCode: { [Op.like]: '%75001%' },
          theaterId: { [Op.like]: '%theater-1%' },
        }),
      });
    });
  });

  // ✅ BULK CREATE
  describe('bulkCreate', () => {
    it('creates theaters if none exist', async () => {
      (MovieTheaterModel.findAll as jest.Mock).mockResolvedValue([]);
      (MovieTheaterModel.bulkCreate as jest.Mock).mockResolvedValue([
        mockTheater,
      ]);
      expect(await movieTheaterService.bulkCreate([mockTheater])).toEqual([
        mockTheater,
      ]);
    });

    it('throws ConflictError if any exists', async () => {
      (MovieTheaterModel.findAll as jest.Mock).mockResolvedValue([mockTheater]);
      await expect(
        movieTheaterService.bulkCreate([mockTheater])
      ).rejects.toThrow(ConflictError);
    });

    it('returns empty array when input is empty', async () => {
      expect(await movieTheaterService.bulkCreate([])).toEqual([]);
    });
  });
});
