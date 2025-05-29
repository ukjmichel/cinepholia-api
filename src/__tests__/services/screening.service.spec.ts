const transactionMock = jest.fn((cb) => cb('TRANSACTION_OBJ'));
jest.mock('../../config/db.js', () => ({
  sequelize: { transaction: transactionMock },
}));

jest.mock('../../models/screening.model.js');
jest.mock('../../models/movie.model.js');
jest.mock('../../models/movie-theater.model.js');
jest.mock('../../models/movie-hall.model.js');

import { ScreeningService } from '../../services/screening.service.js';
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

describe('ScreeningService', () => {
  describe('getScreeningById', () => {
    it('should return a screening by id', async () => {
      (ScreeningModel.findByPk as jest.Mock).mockResolvedValue(mockScreening);
      const result = await ScreeningService.getScreeningById(
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
      await expect(ScreeningService.getScreeningById('bad-id')).rejects.toThrow(
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
      startTime: new Date('2025-01-01T18:00:00Z'), // <-- Date object here
      price: 12.5,
      quality: 'IMAX',
    };

    it('should create and return a screening if no overlap', async () => {
      (MovieModel.findByPk as jest.Mock).mockResolvedValue({ duration: 120 }); // 2 hours
      (ScreeningModel.findAll as jest.Mock).mockResolvedValue([]);
      (ScreeningModel.create as jest.Mock).mockResolvedValue(mockScreening);

      const result = await ScreeningService.createScreening(payload);
      expect(MovieModel.findByPk).toHaveBeenCalledWith(payload.movieId, {
        transaction: 'TRANSACTION_OBJ',
      });
      expect(ScreeningModel.findAll).toHaveBeenCalledWith({
        where: { hallId: payload.hallId, theaterId: payload.theaterId },
        include: [{ model: MovieModel }],
        transaction: 'TRANSACTION_OBJ',
      });
      expect(ScreeningModel.create).toHaveBeenCalledWith(payload, {
        transaction: 'TRANSACTION_OBJ',
      });
      expect(result).toBe(mockScreening);
    });

    it('should throw ConflictError if there is an overlapping screening', async () => {
      // Mock the movie lookup first - this was missing!
      (MovieModel.findByPk as jest.Mock).mockResolvedValue({
        durationMinutes: 120, // 2 hours for the new screening
      });

      // Mock overlapping screening with proper movie details
      (ScreeningModel.findAll as jest.Mock).mockResolvedValue([
        {
          startTime: new Date('2025-01-01T19:00:00Z'),
          movie: {
            durationMinutes: 120,
            title: 'Overlapping Movie',
          },
        },
      ]);

      const payload = {
        screeningId: 'new-id',
        movieId: 'movie-id',
        theaterId: 'theater1',
        hallId: 'hall1',
        startTime: new Date('2025-01-01T18:30:00Z'), // overlaps with above screening
        price: 10,
        quality: 'IMAX',
      };

      await expect(ScreeningService.createScreening(payload)).rejects.toThrow(
        ConflictError
      );

      expect(ScreeningModel.create).not.toHaveBeenCalled();
    });

    
    it('should throw NotFoundError if movie not found', async () => {
      (MovieModel.findByPk as jest.Mock).mockResolvedValue(null);
      await expect(ScreeningService.createScreening(payload)).rejects.toThrow(
        NotFoundError
      );
    });

    // Add a test for no overlap if you want to check edge cases
    it('should allow creation if new screening does not overlap', async () => {
      (MovieModel.findByPk as jest.Mock).mockResolvedValue({ duration: 120 });
      // Existing screening from 15:00 to 17:00, new starts at 18:00
      const existing = {
        startTime: '2025-01-01T15:00:00Z',
        movie: { duration: 120, title: 'EarlyMovie' },
      };
      (ScreeningModel.findAll as jest.Mock).mockResolvedValue([existing]);
      (ScreeningModel.create as jest.Mock).mockResolvedValue(mockScreening);

      const result = await ScreeningService.createScreening(payload);
      expect(result).toBe(mockScreening);
    });
  });

  describe('updateScreening', () => {
    it('should update and return a screening', async () => {
      (ScreeningModel.findByPk as jest.Mock).mockResolvedValue(mockScreening);
      mockScreening.update.mockResolvedValue(mockScreening);

      const update = { quality: '3D' };
      const result = await ScreeningService.updateScreening(
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
        ScreeningService.updateScreening('bad-id', {})
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteScreening', () => {
    it('should delete a screening', async () => {
      (ScreeningModel.findByPk as jest.Mock).mockResolvedValue(mockScreening);
      mockScreening.destroy.mockResolvedValue(true);
      await expect(
        ScreeningService.deleteScreening(mockScreening.screeningId)
      ).resolves.toBeUndefined();
      expect(mockScreening.destroy).toHaveBeenCalled();
    });

    it('should throw NotFoundError if not found', async () => {
      (ScreeningModel.findByPk as jest.Mock).mockResolvedValue(null);
      await expect(ScreeningService.deleteScreening('bad-id')).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('getAllScreenings', () => {
    it('should return all screenings', async () => {
      (ScreeningModel.findAll as jest.Mock).mockResolvedValue(
        mockScreeningList
      );
      const result = await ScreeningService.getAllScreenings();
      expect(result).toEqual(mockScreeningList);
    });
  });

  describe('getScreeningsByMovieId', () => {
    it('should return screenings for a movie', async () => {
      (ScreeningModel.findAll as jest.Mock).mockResolvedValue(
        mockScreeningList
      );
      const result = await ScreeningService.getScreeningsByMovieId(
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
      const result = await ScreeningService.getScreeningsByTheaterId(
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
      const result = await ScreeningService.getScreeningsByHallId(
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
      const result = await ScreeningService.getScreeningsByDate(date);
      expect(result).toEqual(mockScreeningList);
      expect(ScreeningModel.findAll).toHaveBeenCalled();
    });
  });

  describe('searchScreenings', () => {
    it('should search screenings by multiple fields', async () => {
      (ScreeningModel.findAll as jest.Mock).mockResolvedValue(
        mockScreeningList
      );
      const result = await ScreeningService.searchScreenings('Inception');
      expect(result).toEqual(mockScreeningList);
      expect(ScreeningModel.findAll).toHaveBeenCalled();
    });
  });
});
