import { Op } from 'sequelize';
import { InitDbService } from '../../services/init-db.service.js';

// --- Mocks for Sequelize models used by the service ---
const findAllTheaters = jest.fn();
const findAllMovies = jest.fn();
const findAllHalls = jest.fn();
const destroyScreenings = jest.fn();
const bulkCreateScreenings = jest.fn();

jest.mock('../../models/movie-theater.model.js', () => ({
  MovieTheaterModel: {
    findAll: (...args: any[]) => findAllTheaters(...args),
  },
}));

jest.mock('../../models/movie.model.js', () => ({
  MovieModel: {
    findAll: (...args: any[]) => findAllMovies(...args),
  },
}));

jest.mock('../../models/movie-hall.model.js', () => ({
  MovieHallModel: {
    findAll: (...args: any[]) => findAllHalls(...args),
  },
}));

jest.mock('../../models/screening.model.js', () => ({
  ScreeningModel: {
    destroy: (...args: any[]) => destroyScreenings(...args),
    bulkCreate: (...args: any[]) => bulkCreateScreenings(...args),
  },
}));

// Mock uuid so generated IDs are predictable (not strictly required for these tests)
const v4 = jest.fn();
jest.mock('uuid', () => ({
  v4: (...args: any[]) => v4(...args),
}));

describe('InitDbService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addDaySchedule', () => {
    it('deletes existing screenings for the day, then creates 5 screenings spaced every 3 hours', async () => {
      const theaterId = 'T1';
      const hallId = 'H1';
      const movieId = 'M1';
      const date = new Date(2025, 3, 15); // Apr 15, 2025

      // make uuid deterministic (not required for logic assertions)
      v4.mockReturnValue('fixed-uuid');

      await InitDbService.addDaySchedule(theaterId, hallId, movieId, date);

      // 1) ensure destroy called with correct where, including date range boundaries
      expect(destroyScreenings).toHaveBeenCalledTimes(1);
      const destroyArg = (destroyScreenings as jest.Mock).mock.calls[0][0];
      expect(destroyArg.where.theaterId).toBe(theaterId);
      expect(destroyArg.where.hallId).toBe(hallId);
      const startTimeRange = destroyArg.where.startTime;
      // Op.gte should be start of day, Op.lt should be start of next day
      const gte: Date = startTimeRange[Op.gte];
      const lt: Date = startTimeRange[Op.lt];
      expect(gte).toBeInstanceOf(Date);
      expect(lt).toBeInstanceOf(Date);

      // Check boundaries: 00:00 and next day 00:00
      const startOfDay = new Date(2025, 3, 15, 0, 0, 0, 0);
      const startOfNextDay = new Date(2025, 3, 16, 0, 0, 0, 0);
      expect(gte.getTime()).toBe(startOfDay.getTime());
      expect(lt.getTime()).toBe(startOfNextDay.getTime());

      // 2) ensure 5 screenings created (10:00, 13:00, 16:00, 19:00, 22:00)
      expect(bulkCreateScreenings).toHaveBeenCalledTimes(1);
      const screenings = (bulkCreateScreenings as jest.Mock).mock.calls[0][0];
      expect(Array.isArray(screenings)).toBe(true);
      expect(screenings).toHaveLength(5);

      const expectedHours = [10, 13, 16, 19, 22];
      const expectedPrices = [10, 12, 15, 17, 20]; // cycles with index

      screenings.forEach((s: any, i: number) => {
        expect(s.theaterId).toBe(theaterId);
        expect(s.hallId).toBe(hallId);
        expect(s.movieId).toBe(movieId);
        expect(s.price).toBe(expectedPrices[i]);

        const st = new Date(s.startTime);
        expect(st.getFullYear()).toBe(2025);
        expect(st.getMonth()).toBe(3); // April
        expect(st.getDate()).toBe(15);
        expect(st.getHours()).toBe(expectedHours[i]);
        expect(st.getMinutes()).toBe(0);
      });
    });
  });

  describe('initMonth', () => {
    it('throws if no theaters or no movies are found', async () => {
      findAllTheaters.mockResolvedValue([]);
      findAllMovies.mockResolvedValue([]);
      await expect(InitDbService.initMonth(4, 2025)).rejects.toThrow(
        /No theaters or movies found/i
      );

      findAllTheaters.mockResolvedValue([{ theaterId: 'T1' }]);
      findAllMovies.mockResolvedValue([]);
      await expect(InitDbService.initMonth(4, 2025)).rejects.toThrow(
        /No theaters or movies found/i
      );

      findAllTheaters.mockResolvedValue([]);
      findAllMovies.mockResolvedValue([{ movieId: 'M1' }]);
      await expect(InitDbService.initMonth(4, 2025)).rejects.toThrow(
        /No theaters or movies found/i
      );
    });

    it('iterates theaters, halls, and days; calls addDaySchedule with cycling movies', async () => {
      // 1 theater, 1 hall, 2 movies → easier to assert movie cycling
      findAllTheaters.mockResolvedValue([{ theaterId: 'T1' }]);
      findAllHalls.mockResolvedValue([{ hallId: 'H1', theaterId: 'T1' }]);
      const movies = [{ movieId: 'M1' }, { movieId: 'M2' }];
      findAllMovies.mockResolvedValue(movies);

      // Spy on addDaySchedule so we don't actually create rows
      const spy = jest
        .spyOn(InitDbService as any, 'addDaySchedule')
        .mockResolvedValue(undefined);

      // Use a small month to keep calls light (February 2024 = 29 days okay,
      // or choose April = 30). We'll pick April 2025 = 30 days.
      await InitDbService.initMonth(4, 2025);

      // Expect called once per day (30 times) * per hall (1)
      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledTimes(30);

      // Check first two days to ensure movie cycling logic matches:
      // movie = movies[(day + halls.indexOf(hall)) % movies.length]
      // indexOf(hall) = 0 here; so day=1 -> movies[1] = M2, day=2 -> movies[0] = M1
      const firstCallArgs = (spy.mock.calls[0] || []) as any[];
      const secondCallArgs = (spy.mock.calls[1] || []) as any[];

      // Args: theaterId, hallId, movieId, date
      expect(firstCallArgs[0]).toBe('T1');
      expect(firstCallArgs[1]).toBe('H1');
      expect(['M1', 'M2']).toContain(firstCallArgs[2]);
      expect(secondCallArgs[0]).toBe('T1');
      expect(secondCallArgs[1]).toBe('H1');

      // Day 1 → M2, Day 2 → M1
      expect(firstCallArgs[2]).toBe('M2');
      expect(secondCallArgs[2]).toBe('M1');

      // Also assert that the date argument increments days properly
      const firstDate: Date = firstCallArgs[3];
      const secondDate: Date = secondCallArgs[3];
      expect(firstDate).toBeInstanceOf(Date);
      expect(secondDate).toBeInstanceOf(Date);
      expect(secondDate.getDate()).toBe(firstDate.getDate() + 1);

      spy.mockRestore();
    });
  });
});
