// --- Import dependencies and modules ---
import { MovieHallService } from '../../services/movie-hall.service.js';
import { MovieHallModel } from '../../models/movie-hall.model.js';
import { MovieTheaterModel } from '../../models/movie-theater.model.js';
import { NotFoundError } from '../../errors/not-found-error.js';

// --- Mock Sequelize models ---
jest.mock('../../models/movie-hall.model.js');
jest.mock('../../models/movie-theater.model.js');

// --- Initialize the service ---
const movieHallService = new MovieHallService();

// --- Define mock data used in tests ---
const mockTheater = { theaterId: 'theater-1' };
const mockHall = {
  theaterId: 'theater-1',
  hallId: 'hall-1',
  seatsLayout: [
    ['A1', 'A2'],
    ['B1', 'B2'],
  ],
  quality: '2D',
  update: jest.fn(),
  destroy: jest.fn(),
  toJSON() {
    return this;
  },
} as unknown as MovieHallModel;

describe('MovieHallService', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Reset mocks before each test
  });

  // --- Test: Create Movie Hall ---
  describe('create', () => {
    it('creates a hall if theater exists', async () => {
      (MovieTheaterModel.findOne as jest.Mock).mockResolvedValue(mockTheater);
      (MovieHallModel.create as jest.Mock).mockResolvedValue(mockHall);

      const hall = await movieHallService.create({
        theaterId: 'theater-1',
        hallId: 'hall-1',
        seatsLayout: [['A1']],
        quality: '2D',
      });

      expect(hall).toEqual(mockHall);
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

  // --- Test: Get All Halls by Theater ID ---
  describe('findAllByTheaterId', () => {
    it('returns halls for a given theater', async () => {
      (MovieHallModel.findAll as jest.Mock).mockResolvedValue([mockHall]);
      const halls = await movieHallService.findAllByTheaterId('theater-1');
      expect(halls).toEqual([mockHall]);
    });

    it('throws NotFoundError if no halls found', async () => {
      (MovieHallModel.findAll as jest.Mock).mockResolvedValue([]);
      await expect(
        movieHallService.findAllByTheaterId('empty-theater')
      ).rejects.toThrow(NotFoundError);
    });
  });

  // --- Test: Find One Hall by Theater ID + Hall ID ---
  describe('findByTheaterIdAndHallId', () => {
    it('returns hall if found', async () => {
      (MovieHallModel.findOne as jest.Mock).mockResolvedValue(mockHall);
      const hall = await movieHallService.findByTheaterIdAndHallId(
        'theater-1',
        'hall-1'
      );
      expect(hall).toEqual(mockHall);
    });

    it('throws NotFoundError if not found', async () => {
      (MovieHallModel.findOne as jest.Mock).mockResolvedValue(null);
      await expect(
        movieHallService.findByTheaterIdAndHallId('theater-1', 'not-found')
      ).rejects.toThrow(NotFoundError);
    });
  });

  // --- Test: Update Hall ---
  describe('updateByTheaterIdAndHallId', () => {
    it('updates hall if theater and hall exist', async () => {
      (MovieTheaterModel.findOne as jest.Mock).mockResolvedValue(mockTheater);
      // Mock the internal method
      jest
        .spyOn(movieHallService, 'findByTheaterIdAndHallId')
        .mockResolvedValue(mockHall);
      mockHall.update = jest.fn().mockResolvedValue(mockHall);

      const updated = await movieHallService.updateByTheaterIdAndHallId(
        'theater-1',
        'hall-1',
        { seatsLayout: [['A1', 'A2']] }
      );

      expect(updated).toEqual(mockHall);
      expect(mockHall.update).toHaveBeenCalledWith({
        seatsLayout: [['A1', 'A2']],
      });
    });

    it('throws NotFoundError if theater does not exist', async () => {
      (MovieTheaterModel.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        movieHallService.updateByTheaterIdAndHallId('unknown', 'hall-1', {
          seatsLayout: [['A1']],
        })
      ).rejects.toThrow(NotFoundError);
    });
  });

  // --- Test: Delete Hall ---
  describe('deleteByTheaterIdAndHallId', () => {
    it('deletes hall if theater and hall exist', async () => {
      (MovieTheaterModel.findOne as jest.Mock).mockResolvedValue(mockTheater);
      jest
        .spyOn(movieHallService, 'findByTheaterIdAndHallId')
        .mockResolvedValue(mockHall);
      mockHall.destroy = jest.fn().mockResolvedValue(true);

      const result = await movieHallService.deleteByTheaterIdAndHallId(
        'theater-1',
        'hall-1'
      );

      expect(result).toEqual({
        message:
          'Movie hall (hallId: hall-1) deleted from theater (theaterId: theater-1)',
      });
      expect(mockHall.destroy).toHaveBeenCalled();
    });

    it('throws NotFoundError if theater does not exist', async () => {
      (MovieTheaterModel.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        movieHallService.deleteByTheaterIdAndHallId('unknown', 'hall-1')
      ).rejects.toThrow(NotFoundError);
    });

    it('throws NotFoundError if hall does not exist', async () => {
      (MovieTheaterModel.findOne as jest.Mock).mockResolvedValue(mockTheater);
      jest
        .spyOn(movieHallService, 'findByTheaterIdAndHallId')
        .mockResolvedValue(null as any);

      await expect(
        movieHallService.deleteByTheaterIdAndHallId('theater-1', 'notfound')
      ).rejects.toThrow(NotFoundError);
    });
  });

  // --- Test: Search Movie Halls ---
  describe('searchByTheaterIdOrHallId', () => {
    it('returns matching halls', async () => {
      (MovieHallModel.findAll as jest.Mock).mockResolvedValue([mockHall]);
      const halls = await movieHallService.searchByTheaterIdOrHallId({
        theaterId: 'theater-1',
      });
      expect(halls).toEqual([mockHall]);
    });

    it('throws NotFoundError if no matches', async () => {
      (MovieHallModel.findAll as jest.Mock).mockResolvedValue([]);
      await expect(
        movieHallService.searchByTheaterIdOrHallId({ hallId: 'none' })
      ).rejects.toThrow(NotFoundError);
    });
  });
});
