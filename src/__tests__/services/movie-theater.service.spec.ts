import { MovieTheaterService } from '../../services/movie-theater.service.js';
import { MovieTheaterModel } from '../../models/movie-theater.model.js';
import { ConflictError } from '../../errors/conflict-error.js';
import { NotFoundError } from '../../errors/not-found-error.js';
import { Op } from 'sequelize';

jest.mock('../../models/movie-theater.model.js');

const mockTheater = {
  theaterId: 'theater-1',
  address: '1 Main St',
  postalCode: '75001',
  city: 'Paris',
  phone: '+33123456789',
  email: 'paris1@cinema.fr',
  update: jest.fn().mockResolvedValue(this),
  toJSON() {
    return this;
  },
};

describe('MovieTheaterService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a new movie theater if it does not exist', async () => {
      (MovieTheaterModel.findByPk as jest.Mock).mockResolvedValue(null);
      (MovieTheaterModel.create as jest.Mock).mockResolvedValue(mockTheater);

      const result = await MovieTheaterService.create(mockTheater);
      expect(MovieTheaterModel.findByPk).toHaveBeenCalledWith('theater-1');
      expect(MovieTheaterModel.create).toHaveBeenCalledWith(mockTheater);
      expect(result).toEqual(mockTheater);
    });

    it('throws ConflictError if theater already exists', async () => {
      (MovieTheaterModel.findByPk as jest.Mock).mockResolvedValue(mockTheater);

      await expect(MovieTheaterService.create(mockTheater)).rejects.toThrow(
        ConflictError
      );
    });
  });

  describe('getById', () => {
    it('returns theater if found', async () => {
      (MovieTheaterModel.findByPk as jest.Mock).mockResolvedValue(mockTheater);

      const result = await MovieTheaterService.getById('theater-1');
      expect(result).toBe(mockTheater);
    });

    it('throws NotFoundError if not found', async () => {
      (MovieTheaterModel.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(MovieTheaterService.getById('not-exist')).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('getAll', () => {
    it('returns all movie theaters', async () => {
      (MovieTheaterModel.findAll as jest.Mock).mockResolvedValue([mockTheater]);
      const result = await MovieTheaterService.getAll();
      expect(result).toEqual([mockTheater]);
    });
  });

  describe('update', () => {
    it('updates and returns the movie theater', async () => {
      const mockUpdate = jest.fn().mockImplementation((updateObj) => ({
        ...mockTheater,
        ...updateObj,
      }));
      (MovieTheaterModel.findByPk as jest.Mock).mockResolvedValue({
        ...mockTheater,
        update: mockUpdate,
      });

      const result = await MovieTheaterService.update('theater-1', {
        city: 'Lyon',
      });
      expect(mockUpdate).toHaveBeenCalledWith({ city: 'Lyon' });
      expect(result.city).toBe('Lyon');
    });

    it('throws NotFoundError if not found', async () => {
      (MovieTheaterModel.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(
        MovieTheaterService.update('not-exist', { city: 'Nice' })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('deletes the movie theater if exists', async () => {
      (MovieTheaterModel.destroy as jest.Mock).mockResolvedValue(1);

      await expect(
        MovieTheaterService.delete('theater-1')
      ).resolves.toBeUndefined();
      expect(MovieTheaterModel.destroy).toHaveBeenCalledWith({
        where: { theaterId: 'theater-1' },
      });
    });

    it('throws NotFoundError if not found', async () => {
      (MovieTheaterModel.destroy as jest.Mock).mockResolvedValue(0);

      await expect(MovieTheaterService.delete('not-exist')).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('search', () => {
    it('returns matched theaters', async () => {
      (MovieTheaterModel.findAll as jest.Mock).mockResolvedValue([mockTheater]);
      const result = await MovieTheaterService.search({ city: 'Paris' });

      expect(MovieTheaterModel.findAll).toHaveBeenCalledWith({
        where: expect.objectContaining({
          city: expect.objectContaining({
            [Op.like]: '%Paris%',
          }),
        }),
      });
      expect(result).toEqual([mockTheater]);
    });
  });
});
