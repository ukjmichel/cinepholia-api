const transactionMock = jest.fn((cb) => cb('TRANSACTION_OBJ'));
jest.mock('../../config/db.js', () => ({
  sequelize: { transaction: transactionMock },
}));

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
import { v4 as uuidv4 } from 'uuid';
import { ConflictError } from '../../errors/conflict-error.js';

const mockScreening = {
  screeningId: uuidv4(),
  movieId: uuidv4(),
  theaterId: 'theater1',
  hallId: 'hall1',
  startTime: new Date('2025-01-01T18:00:00Z'),
  price: 12.5,
  quality: 'IMAX',
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
        { include: [MovieModel, MovieTheaterModel, MovieHallModel] }
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
      quality: 'IMAX',
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
      expect(MovieModel.findByPk).toHaveBeenCalledWith(payload.movieId, {
        transaction: 'TRANSACTION_OBJ',
      });
      expect(MovieHallModel.findOne).toHaveBeenCalledWith({
        where: { theaterId: payload.theaterId, hallId: payload.hallId },
        transaction: 'TRANSACTION_OBJ',
      });
      const findAllCall = (ScreeningModel.findAll as jest.Mock).mock
        .calls[0][0];
      expect(findAllCall.where).toEqual({
        hallId: payload.hallId,
        theaterId: payload.theaterId,
      });
      expect(findAllCall.transaction).toEqual('TRANSACTION_OBJ');
      expect(findAllCall.include[0].model).toBe(MovieModel);
      expect(ScreeningModel.create).toHaveBeenCalledWith(payload, {
        transaction: 'TRANSACTION_OBJ',
      });
      expect(result).toBe(mockScreening);
    });

    it('should throw ConflictError if there is an overlapping screening', async () => {
      (MovieModel.findByPk as jest.Mock).mockResolvedValue({
        durationMinutes: 120,
      });
      (MovieHallModel.findOne as jest.Mock).mockResolvedValue({
        hallId: payload.hallId,
        theaterId: payload.theaterId,
      });
      // Overlaps: 19:00 (existing) - 21:00, 18:30 (new) - 20:30
      (ScreeningModel.findAll as jest.Mock).mockResolvedValue([
        {
          startTime: new Date('2025-01-01T19:00:00Z'),
          movie: {
            durationMinutes: 120,
            title: 'Overlapping Movie',
          },
        },
      ]);

      const overlappingPayload = {
        ...payload,
        startTime: new Date('2025-01-01T18:30:00Z'),
      };

      await expect(
        screeningService.createScreening(overlappingPayload)
      ).rejects.toThrow(ConflictError);
      expect(ScreeningModel.create).not.toHaveBeenCalled();
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
      expect(MovieHallModel.findOne).toHaveBeenCalledWith({
        where: { theaterId: payload.theaterId, hallId: payload.hallId },
        transaction: 'TRANSACTION_OBJ',
      });
      expect(ScreeningModel.create).not.toHaveBeenCalled();
    });

    it('should allow creation if new screening does not overlap', async () => {
      (MovieModel.findByPk as jest.Mock).mockResolvedValue({
        durationMinutes: 120,
      });
      (MovieHallModel.findOne as jest.Mock).mockResolvedValue({
        hallId: payload.hallId,
        theaterId: payload.theaterId,
      });
      // Existing screening: 15:00-17:00, new: 18:00
      const existing = {
        startTime: new Date('2025-01-01T15:00:00Z'),
        movie: { durationMinutes: 120, title: 'EarlyMovie' },
      };
      (ScreeningModel.findAll as jest.Mock).mockResolvedValue([existing]);
      (ScreeningModel.create as jest.Mock).mockResolvedValue(mockScreening);

      const result = await screeningService.createScreening(payload);
      expect(result).toBe(mockScreening);
      expect(ScreeningModel.create).toHaveBeenCalled();
    });
  });

  describe('updateScreening', () => {
    it('should update and return a screening', async () => {
      (ScreeningModel.findByPk as jest.Mock).mockResolvedValue(mockScreening);
      mockScreening.update.mockResolvedValue(mockScreening);

      const update = { quality: '3D' };
      const result = await screeningService.updateScreening(
        mockScreening.screeningId,
        update
      );
      expect(result).toBe(mockScreening);
      expect(mockScreening.update).toHaveBeenCalledWith(update, {
        transaction: expect.anything(),
      });
    });

    it('should throw NotFoundError if not found', async () => {
      (ScreeningModel.findByPk as jest.Mock).mockResolvedValue(null);
      await expect(
        screeningService.updateScreening('bad-id', {})
      ).rejects.toThrow(NotFoundError);
    });
    it('should throw NotFoundError if new movie does not exist', async () => {
      (ScreeningModel.findByPk as jest.Mock).mockResolvedValue(mockScreening);
      (MovieModel.findByPk as jest.Mock).mockResolvedValue(null);
      const update = { movieId: 'missing-movie' };
      await expect(
        screeningService.updateScreening(mockScreening.screeningId, update)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if new hall does not exist', async () => {
      (ScreeningModel.findByPk as jest.Mock).mockResolvedValue(mockScreening);
      (MovieModel.findByPk as jest.Mock).mockResolvedValue({
        durationMinutes: 100,
      });
      (MovieHallModel.findOne as jest.Mock).mockResolvedValue(null);
      const update = {
        hallId: 'missing-hall',
        theaterId: mockScreening.theaterId,
      };
      await expect(
        screeningService.updateScreening(mockScreening.screeningId, update)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ConflictError if update causes overlapping screening', async () => {
      (ScreeningModel.findByPk as jest.Mock).mockResolvedValue(mockScreening);
      (MovieModel.findByPk as jest.Mock).mockResolvedValue({
        durationMinutes: 120,
        title: 'Updated Movie',
      });
      (MovieHallModel.findOne as jest.Mock).mockResolvedValue({
        hallId: mockScreening.hallId,
        theaterId: mockScreening.theaterId,
      });
      // Simulate one conflicting screening in the same hall/theater
      (ScreeningModel.findAll as jest.Mock).mockResolvedValue([
        {
          screeningId: 'other-id',
          startTime: new Date('2025-01-01T18:30:00Z'),
          movie: {
            durationMinutes: 120,
            title: 'Overlap',
          },
        },
      ]);
      const update = {
        startTime: new Date('2025-01-01T18:30:00Z'),
        hallId: mockScreening.hallId,
        theaterId: mockScreening.theaterId,
        movieId: 'new-movie-id',
      };
      await expect(
        screeningService.updateScreening(mockScreening.screeningId, update)
      ).rejects.toThrow(ConflictError);
    });

    it('should update if no overlap and movie/hall exist', async () => {
      (ScreeningModel.findByPk as jest.Mock).mockResolvedValue(mockScreening);
      (MovieModel.findByPk as jest.Mock).mockResolvedValue({
        durationMinutes: 120,
        title: 'No Overlap Movie',
      });
      (MovieHallModel.findOne as jest.Mock).mockResolvedValue({
        hallId: mockScreening.hallId,
        theaterId: mockScreening.theaterId,
      });
      // Existing screening far enough not to overlap
      (ScreeningModel.findAll as jest.Mock).mockResolvedValue([
        {
          screeningId: 'another-id',
          startTime: new Date('2025-01-01T12:00:00Z'),
          movie: {
            durationMinutes: 60,
            title: 'Morning Show',
          },
        },
      ]);
      mockScreening.update.mockResolvedValue(mockScreening);

      const update = {
        startTime: new Date('2025-01-01T18:00:00Z'),
        hallId: mockScreening.hallId,
        theaterId: mockScreening.theaterId,
        movieId: 'valid-movie-id',
        quality: '4DX',
      };
      const result = await screeningService.updateScreening(
        mockScreening.screeningId,
        update
      );
      expect(result).toBe(mockScreening);
      expect(mockScreening.update).toHaveBeenCalledWith(update, {
        transaction: 'TRANSACTION_OBJ',
      });
    });
  });

  describe('deleteScreening', () => {
    it('should delete a screening', async () => {
      (ScreeningModel.findByPk as jest.Mock).mockResolvedValue(mockScreening);
      mockScreening.destroy.mockResolvedValue(true);
      await expect(
        screeningService.deleteScreening(mockScreening.screeningId)
      ).resolves.toBeUndefined();
      expect(mockScreening.destroy).toHaveBeenCalled();
    });

    it('should throw NotFoundError if not found', async () => {
      (ScreeningModel.findByPk as jest.Mock).mockResolvedValue(null);
      await expect(screeningService.deleteScreening('bad-id')).rejects.toThrow(
        NotFoundError
      );
    });
  });

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
    it('should return screenings for a movie', async () => {
      (ScreeningModel.findAll as jest.Mock).mockResolvedValue(
        mockScreeningList
      );
      const result = await screeningService.getScreeningsByMovieId(
        mockScreening.movieId
      );
      expect(result).toEqual(mockScreeningList);
      expect(ScreeningModel.findAll).toHaveBeenCalledWith({
        where: { movieId: mockScreening.movieId },
        include: [MovieModel, MovieTheaterModel, MovieHallModel],
        order: [['startTime', 'ASC']],
      });
    });
  });

  describe('getScreeningsByTheaterId', () => {
    it('should return screenings for a theater', async () => {
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
    it('should return screenings for a hall', async () => {
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
    it('should return screenings for a date', async () => {
      (ScreeningModel.findAll as jest.Mock).mockResolvedValue(
        mockScreeningList
      );
      const date = new Date('2025-01-01');
      const result = await screeningService.getScreeningsByDate(date);
      expect(result).toEqual(mockScreeningList);
      expect(ScreeningModel.findAll).toHaveBeenCalled();
    });
  });

  describe('searchScreenings', () => {
    it('should search screenings by multiple fields', async () => {
      (ScreeningModel.findAll as jest.Mock).mockResolvedValue(
        mockScreeningList
      );
      const result = await screeningService.searchScreenings('Inception');
      expect(result).toEqual(mockScreeningList);
      expect(ScreeningModel.findAll).toHaveBeenCalled();
    });
  });
});
