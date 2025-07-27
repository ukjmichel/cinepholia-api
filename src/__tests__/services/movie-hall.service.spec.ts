// --- Import dependencies ---
import { MovieHallService } from '../../services/movie-hall.service.js';
import { MovieHallModel } from '../../models/movie-hall.model.js';
import { MovieTheaterModel } from '../../models/movie-theater.model.js';
import { NotFoundError } from '../../errors/not-found-error.js';

// ✅ Mock sequelize to provide a fake transaction wrapper
jest.mock('../../config/db.js', () => ({
  sequelize: {
    transaction: jest.fn((cb) => cb({ LOCK: { UPDATE: 'UPDATE' } })), // <- prevents TypeError
  },
}));

// --- Mock Sequelize models ---
jest.mock('../../models/movie-hall.model.js');
jest.mock('../../models/movie-theater.model.js');

const movieHallService = new MovieHallService();

const mockTheater = { theaterId: 'theater-1' };
const mockHall = {
  theaterId: 'theater-1',
  hallId: 'hall-1',
  seatsLayout: [['A1', 'A2']],
  quality: '2D',
  update: jest.fn(),
  reload: jest.fn(),
  destroy: jest.fn(),
  toJSON() {
    return this;
  },
} as unknown as MovieHallModel;

describe('MovieHallService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ✅ Create
  describe('create', () => {
    it('creates a hall if theater exists', async () => {
      (MovieTheaterModel.findOne as jest.Mock).mockResolvedValue(mockTheater);
      (MovieHallModel.create as jest.Mock).mockResolvedValue(mockHall);

      const result = await movieHallService.create({
        theaterId: 'theater-1',
        hallId: 'hall-1',
        seatsLayout: [['A1']],
        quality: '2D',
      });

      expect(result).toEqual(mockHall);
      expect(MovieHallModel.create).toHaveBeenCalled();
    });

    it('throws NotFoundError if theater does not exist', async () => {
      (MovieTheaterModel.findOne as jest.Mock).mockResolvedValue(null);
      await expect(
        movieHallService.create({
          theaterId: 'unknown',
          hallId: 'hall-1',
          seatsLayout: [['A1']],
          quality: '2D',
        })
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ✅ findAll
  describe('findAll', () => {
    it('returns all halls with pagination', async () => {
      (MovieHallModel.findAll as jest.Mock).mockResolvedValue([mockHall]);
      const halls = await movieHallService.findAll({ limit: 10, offset: 0 });
      expect(halls).toEqual([mockHall]);
      expect(MovieHallModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 10, offset: 0 })
      );
    });
  });

  // ✅ findAllByTheaterId
  describe('findAllByTheaterId', () => {
    it('returns halls for a theater', async () => {
      (MovieHallModel.findAll as jest.Mock).mockResolvedValue([mockHall]);
      const halls = await movieHallService.findAllByTheaterId('theater-1');
      expect(halls).toEqual([mockHall]);
    });

    it('throws NotFoundError if no halls found', async () => {
      (MovieHallModel.findAll as jest.Mock).mockResolvedValue([]);
      await expect(
        movieHallService.findAllByTheaterId('empty')
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ✅ findByTheaterIdAndHallId
  describe('findByTheaterIdAndHallId', () => {
    it('returns hall if found', async () => {
      (MovieHallModel.findOne as jest.Mock).mockResolvedValue(mockHall);
      const hall = await movieHallService.findByTheaterIdAndHallId(
        'theater-1',
        'hall-1'
      );
      expect(hall).toEqual(mockHall);
    });

    it('throws NotFoundError if hall not found', async () => {
      (MovieHallModel.findOne as jest.Mock).mockResolvedValue(null);
      await expect(
        movieHallService.findByTheaterIdAndHallId('theater-1', 'missing')
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ✅ updateByTheaterIdAndHallId
  describe('updateByTheaterIdAndHallId', () => {
    it('updates hall successfully', async () => {
      (MovieTheaterModel.findOne as jest.Mock).mockResolvedValue(mockTheater);
      (MovieHallModel.findOne as jest.Mock).mockResolvedValue(mockHall);
      mockHall.update = jest.fn().mockResolvedValue(mockHall);
      mockHall.reload = jest.fn().mockResolvedValue(mockHall);

      const updated = await movieHallService.updateByTheaterIdAndHallId(
        'theater-1',
        'hall-1',
        { quality: 'IMAX' }
      );
      expect(updated).toEqual(mockHall);
      expect(mockHall.update).toHaveBeenCalledWith(
        { quality: 'IMAX' },
        expect.anything()
      );
    });

    it('throws NotFoundError if theater does not exist', async () => {
      (MovieTheaterModel.findOne as jest.Mock).mockResolvedValue(null);
      await expect(
        movieHallService.updateByTheaterIdAndHallId('unknown', 'hall-1', {})
      ).rejects.toThrow(NotFoundError);
    });

    it('throws NotFoundError if hall does not exist', async () => {
      (MovieTheaterModel.findOne as jest.Mock).mockResolvedValue(mockTheater);
      (MovieHallModel.findOne as jest.Mock).mockResolvedValue(null);
      await expect(
        movieHallService.updateByTheaterIdAndHallId('theater-1', 'missing', {})
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ✅ deleteByTheaterIdAndHallId
  describe('deleteByTheaterIdAndHallId', () => {
    it('deletes hall successfully', async () => {
      (MovieTheaterModel.findOne as jest.Mock).mockResolvedValue(mockTheater);
      (MovieHallModel.findOne as jest.Mock).mockResolvedValue(mockHall);
      mockHall.destroy = jest.fn().mockResolvedValue(true);

      const result = await movieHallService.deleteByTheaterIdAndHallId(
        'theater-1',
        'hall-1'
      );
      expect(result).toEqual({ message: 'Movie hall deleted' });
      expect(mockHall.destroy).toHaveBeenCalled();
    });

    it('throws NotFoundError if theater missing', async () => {
      (MovieTheaterModel.findOne as jest.Mock).mockResolvedValue(null);
      await expect(
        movieHallService.deleteByTheaterIdAndHallId('unknown', 'hall-1')
      ).rejects.toThrow(NotFoundError);
    });

    it('throws NotFoundError if hall missing', async () => {
      (MovieTheaterModel.findOne as jest.Mock).mockResolvedValue(mockTheater);
      (MovieHallModel.findOne as jest.Mock).mockResolvedValue(null);
      await expect(
        movieHallService.deleteByTheaterIdAndHallId('theater-1', 'missing')
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ✅ searchByTheaterIdOrHallId
  describe('searchByTheaterIdOrHallId', () => {
    it('returns matching halls', async () => {
      (MovieHallModel.findAll as jest.Mock).mockResolvedValue([mockHall]);
      const halls = await movieHallService.searchByTheaterIdOrHallId({
        hallId: 'hall',
      });
      expect(halls).toEqual([mockHall]);
    });

    it('throws NotFoundError if no halls match', async () => {
      (MovieHallModel.findAll as jest.Mock).mockResolvedValue([]);
      await expect(
        movieHallService.searchByTheaterIdOrHallId({ hallId: 'none' })
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ✅ bulkCreate
  describe('bulkCreate', () => {
    it('creates halls when all theaters exist', async () => {
      (MovieTheaterModel.findAll as jest.Mock).mockResolvedValue([mockTheater]);
      (MovieHallModel.bulkCreate as jest.Mock).mockResolvedValue([mockHall]);
      const result = await movieHallService.bulkCreate([mockHall]);
      expect(result).toEqual([mockHall]);
    });

    it('throws NotFoundError if some theaters are missing', async () => {
      (MovieTheaterModel.findAll as jest.Mock).mockResolvedValue([]);
      await expect(movieHallService.bulkCreate([mockHall])).rejects.toThrow(
        NotFoundError
      );
    });
  });
});
