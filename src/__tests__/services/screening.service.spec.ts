// Mock Sequelize transaction so service code using `sequelize.transaction()` can be tested safely
const transactionMock = jest.fn((cb) => cb('TRANSACTION_OBJ'));
jest.mock('../../config/db.js', () => ({
  sequelize: { transaction: transactionMock },
}));

// Mock models
jest.mock('../../models/screening.model.js');
jest.mock('../../models/movie.model.js');
jest.mock('../../models/movie-theater.model.js');
jest.mock('../../models/movie-hall.model.js');

import { screeningService } from '../../services/screening.service.js';
import { ScreeningModel } from '../../models/screening.model.js';
import { MovieModel } from '../../models/movie.model.js';
import { MovieTheaterModel } from '../../models/movie-theater.model.js';
import { MovieHallModel } from '../../models/movie-hall.model.js';
import { NotFoundError } from '../../errors/not-found-error.js';
import { ConflictError } from '../../errors/conflict-error.js';
import { v4 as uuidv4 } from 'uuid';

// Common mock screening object used across tests
const mockScreening = {
  screeningId: uuidv4(),
  movieId: uuidv4(),
  theaterId: 'theater1',
  hallId: 'hall1',
  startTime: new Date('2025-01-01T18:00:00Z'),
  price: 12.5,
  movie: { title: 'Inception', genre: 'Sci-Fi', director: 'Nolan' },
  theater: { city: 'Paris', address: '1 rue Test' },
  hall: { hallId: 'hall1', seatsLayout: [[1, 2, 3]] },
  update: jest.fn(),
  destroy: jest.fn(),
  toJSON: function () {
    return this;
  },
};

const mockScreeningList = [mockScreening];

beforeEach(() => {
  jest.clearAllMocks();
});

describe('screeningService', () => {
  describe('getScreeningById', () => {
    it('should return a screening by id', async () => {
      (ScreeningModel.findByPk as jest.Mock).mockResolvedValue(mockScreening);
      const result = await screeningService.getScreeningById(
        mockScreening.screeningId
      );
      expect(result).toBe(mockScreening);
      expect(ScreeningModel.findByPk).toHaveBeenCalledWith(
        mockScreening.screeningId,
        {
          include: [MovieModel, MovieTheaterModel, MovieHallModel],
        }
      );
    });

    it('should throw NotFoundError if not found', async () => {
      (ScreeningModel.findByPk as jest.Mock).mockResolvedValue(null);
      await expect(screeningService.getScreeningById('bad-id')).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('createScreening', () => {
    const payload = {
      screeningId: uuidv4(),
      movieId: uuidv4(),
      theaterId: 'theater1',
      hallId: 'hall1',
      startTime: new Date('2025-01-01T18:00:00Z'),
      price: 12.5,
    };

    it('should create and return a screening if no overlap', async () => {
      (MovieModel.findByPk as jest.Mock).mockResolvedValue({
        durationMinutes: 120,
      });
      (MovieHallModel.findOne as jest.Mock).mockResolvedValue({
        hallId: payload.hallId,
        theaterId: payload.theaterId,
      });
      (ScreeningModel.findAll as jest.Mock).mockResolvedValue([]);
      (ScreeningModel.create as jest.Mock).mockResolvedValue(mockScreening);

      const result = await screeningService.createScreening(payload);
      expect(result).toBe(mockScreening);
      expect(ScreeningModel.create).toHaveBeenCalledWith(payload, {
        transaction: 'TRANSACTION_OBJ',
      });
    });

    it('should throw ConflictError if there is an overlapping screening', async () => {
      (MovieModel.findByPk as jest.Mock).mockResolvedValue({
        durationMinutes: 120,
      });
      (MovieHallModel.findOne as jest.Mock).mockResolvedValue({
        hallId: payload.hallId,
        theaterId: payload.theaterId,
      });
      (ScreeningModel.findAll as jest.Mock).mockResolvedValue([
        {
          startTime: new Date('2025-01-01T19:00:00Z'),
          movie: { durationMinutes: 120 },
        },
      ]);

      const overlappingPayload = {
        ...payload,
        startTime: new Date('2025-01-01T18:30:00Z'),
      };
      await expect(
        screeningService.createScreening(overlappingPayload)
      ).rejects.toThrow(ConflictError);
    });

    it('should throw NotFoundError if movie not found', async () => {
      (MovieModel.findByPk as jest.Mock).mockResolvedValue(null);
      await expect(screeningService.createScreening(payload)).rejects.toThrow(
        NotFoundError
      );
    });

    it('should throw NotFoundError if hall not found', async () => {
      (MovieModel.findByPk as jest.Mock).mockResolvedValue({
        durationMinutes: 120,
      });
      (MovieHallModel.findOne as jest.Mock).mockResolvedValue(null);
      await expect(screeningService.createScreening(payload)).rejects.toThrow(
        NotFoundError
      );
    });

    it('should allow creation if new screening does not overlap', async () => {
      (MovieModel.findByPk as jest.Mock).mockResolvedValue({
        durationMinutes: 120,
      });
      (MovieHallModel.findOne as jest.Mock).mockResolvedValue({
        hallId: payload.hallId,
        theaterId: payload.theaterId,
      });
      (ScreeningModel.findAll as jest.Mock).mockResolvedValue([
        {
          startTime: new Date('2025-01-01T15:00:00Z'),
          movie: { durationMinutes: 120 },
        },
      ]);
      (ScreeningModel.create as jest.Mock).mockResolvedValue(mockScreening);
      const result = await screeningService.createScreening(payload);
      expect(result).toBe(mockScreening);
    });
  });

  describe('updateScreening', () => {
    it('should update and return a screening', async () => {
      (ScreeningModel.findByPk as jest.Mock).mockResolvedValue(mockScreening);
      mockScreening.update.mockResolvedValue(mockScreening);
      const update = { price: 14.5 };
      const result = await screeningService.updateScreening(
        mockScreening.screeningId,
        update
      );
      expect(result).toBe(mockScreening);
    });

    it('should throw NotFoundError if not found', async () => {
      (ScreeningModel.findByPk as jest.Mock).mockResolvedValue(null);
      await expect(
        screeningService.updateScreening('bad-id', {})
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if new movie not found', async () => {
      (ScreeningModel.findByPk as jest.Mock).mockResolvedValue(mockScreening);
      (MovieModel.findByPk as jest.Mock).mockResolvedValue(null);
      await expect(
        screeningService.updateScreening(mockScreening.screeningId, {
          movieId: 'bad-movie',
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if hall not found', async () => {
      (ScreeningModel.findByPk as jest.Mock).mockResolvedValue(mockScreening);
      (MovieModel.findByPk as jest.Mock).mockResolvedValue({
        durationMinutes: 90,
      });
      (MovieHallModel.findOne as jest.Mock).mockResolvedValue(null);
      await expect(
        screeningService.updateScreening(mockScreening.screeningId, {
          hallId: 'bad-hall',
          theaterId: mockScreening.theaterId,
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ConflictError if update causes overlapping screening', async () => {
      (ScreeningModel.findByPk as jest.Mock).mockResolvedValue(mockScreening);
      (MovieModel.findByPk as jest.Mock).mockResolvedValue({
        durationMinutes: 120,
      });
      (MovieHallModel.findOne as jest.Mock).mockResolvedValue({
        hallId: mockScreening.hallId,
        theaterId: mockScreening.theaterId,
      });
      (ScreeningModel.findAll as jest.Mock).mockResolvedValue([
        {
          screeningId: 'other-id',
          startTime: new Date('2025-01-01T18:30:00Z'),
          movie: { durationMinutes: 120 },
        },
      ]);
      await expect(
        screeningService.updateScreening(mockScreening.screeningId, {
          startTime: new Date('2025-01-01T18:30:00Z'),
          hallId: mockScreening.hallId,
          theaterId: mockScreening.theaterId,
          movieId: 'new-movie',
        })
      ).rejects.toThrow(ConflictError);
    });

    it('should allow update if no conflict and related resources exist', async () => {
      (ScreeningModel.findByPk as jest.Mock).mockResolvedValue(mockScreening);
      (MovieModel.findByPk as jest.Mock).mockResolvedValue({
        durationMinutes: 120,
      });
      (MovieHallModel.findOne as jest.Mock).mockResolvedValue({
        hallId: mockScreening.hallId,
        theaterId: mockScreening.theaterId,
      });
      (ScreeningModel.findAll as jest.Mock).mockResolvedValue([
        {
          screeningId: 'other-id',
          startTime: new Date('2025-01-01T12:00:00Z'),
          movie: { durationMinutes: 60 },
        },
      ]);
      mockScreening.update.mockResolvedValue(mockScreening);
      const result = await screeningService.updateScreening(
        mockScreening.screeningId,
        {
          startTime: new Date('2025-01-01T18:00:00Z'),
          movieId: 'valid-id',
          hallId: mockScreening.hallId,
          theaterId: mockScreening.theaterId,
        }
      );
      expect(result).toBe(mockScreening);
    });
  });

  describe('deleteScreening', () => {
    it('should delete a screening if found', async () => {
      (ScreeningModel.findByPk as jest.Mock).mockResolvedValue(mockScreening);
      mockScreening.destroy.mockResolvedValue(true);
      await expect(
        screeningService.deleteScreening(mockScreening.screeningId)
      ).resolves.toBeUndefined();
    });

    it('should throw NotFoundError if not found', async () => {
      (ScreeningModel.findByPk as jest.Mock).mockResolvedValue(null);
      await expect(screeningService.deleteScreening('bad-id')).rejects.toThrow(
        NotFoundError
      );
    });
  });

  // Additional screeningService queries

  describe('getAllScreenings', () => {
    it('should return all screenings', async () => {
      (ScreeningModel.findAll as jest.Mock).mockResolvedValue(
        mockScreeningList
      );
      const result = await screeningService.getAllScreenings();
      expect(result).toEqual(mockScreeningList);
    });
  });

  describe('getScreeningsByMovieId', () => {
    it('should return screenings by movie ID', async () => {
      (ScreeningModel.findAll as jest.Mock).mockResolvedValue(
        mockScreeningList
      );
      const result = await screeningService.getScreeningsByMovieId(
        mockScreening.movieId
      );
      expect(result).toEqual(mockScreeningList);
    });
  });

  describe('getScreeningsByTheaterId', () => {
    it('should return screenings by theater ID', async () => {
      (ScreeningModel.findAll as jest.Mock).mockResolvedValue(
        mockScreeningList
      );
      const result = await screeningService.getScreeningsByTheaterId(
        mockScreening.theaterId
      );
      expect(result).toEqual(mockScreeningList);
    });
  });

  describe('getScreeningsByHallId', () => {
    it('should return screenings by hall and theater ID', async () => {
      (ScreeningModel.findAll as jest.Mock).mockResolvedValue(
        mockScreeningList
      );
      const result = await screeningService.getScreeningsByHallId(
        mockScreening.hallId,
        mockScreening.theaterId
      );
      expect(result).toEqual(mockScreeningList);
    });
  });

  describe('getScreeningsByDate', () => {
    it('should return screenings by date', async () => {
      (ScreeningModel.findAll as jest.Mock).mockResolvedValue(
        mockScreeningList
      );
      const result = await screeningService.getScreeningsByDate(
        new Date('2025-01-01')
      );
      expect(result).toEqual(mockScreeningList);
    });
  });

  describe('searchScreenings', () => {
    it('should search screenings by keyword', async () => {
      (ScreeningModel.findAll as jest.Mock).mockResolvedValue(
        mockScreeningList
      );
      const result = await screeningService.searchScreenings('Inception');
      expect(result).toEqual(mockScreeningList);
    });
  });
});
