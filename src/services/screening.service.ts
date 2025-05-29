import {
  ScreeningModel,
  ScreeningAttributes,
  ScreeningCreationAttributes,
} from '../models/screening.model.js';
import { NotFoundError } from '../errors/not-found-error.js';
import { sequelize } from '../config/db.js';
import { Transaction, Op } from 'sequelize';
import { MovieModel } from '../models/movie.model.js';
import { MovieTheaterModel } from '../models/movie-theater.model.js';
import { MovieHallModel } from '../models/movie-hall.model.js';
import { ConflictError } from '../errors/conflict-error.js';

export class ScreeningService {
  // CRUD

  static async getScreeningById(screeningId: string): Promise<ScreeningModel> {
    const screening = await ScreeningModel.findByPk(screeningId, {
      include: [MovieModel, MovieTheaterModel, MovieHallModel],
    });
    if (!screening) {
      throw new NotFoundError(`Screening with id ${screeningId} not found`);
    }
    return screening;
  }

  static async createScreening(
    payload: ScreeningCreationAttributes
  ): Promise<ScreeningModel> {
    return await sequelize.transaction(async (t: Transaction) => {
      // 1. Get movie to fetch its duration
      const movie = await MovieModel.findByPk(payload.movieId, {
        transaction: t,
      });
      if (!movie) throw new NotFoundError('Movie not found');
      const duration = movie.durationMinutes; // e.g., in minutes

      // 2. Calculate start and end time for the new screening
      const newStart = new Date(payload.startTime);
      const newEnd = new Date(newStart.getTime() + duration * 60 * 1000);

      // 3. Find potentially overlapping screenings in the same hall
      const overlappingScreenings = await ScreeningModel.findAll({
        where: {
          hallId: payload.hallId,
          theaterId: payload.theaterId,
        },
        include: [
          {
            model: MovieModel,
          },
        ],
        transaction: t,
      });

      // 4. Check for time overlap
      for (const screening of overlappingScreenings) {
        const existingStart = new Date(screening.startTime);
        const existingDuration = screening.movie.durationMinutes;
        const existingEnd = new Date(
          existingStart.getTime() + existingDuration * 60 * 1000
        );

        // If intervals overlap: (existingStart < newEnd && existingEnd > newStart)
        if (existingStart < newEnd && existingEnd > newStart) {
          throw new ConflictError(
            `Hall is occupied: overlaps with screening '${screening.movie.title}' from ${existingStart.toISOString()} to ${existingEnd.toISOString()}`
          );
        }
      }

      // 5. No overlap found, create the screening
      return await ScreeningModel.create(payload, { transaction: t });
    });
  }

  static async updateScreening(
    screeningId: string,
    update: Partial<ScreeningAttributes>
  ): Promise<ScreeningModel> {
    return await sequelize.transaction(async (t: Transaction) => {
      const screening = await ScreeningModel.findByPk(screeningId, {
        transaction: t,
      });
      if (!screening) {
        throw new NotFoundError(`Screening with id ${screeningId} not found`);
      }
      await screening.update(update, { transaction: t });
      return screening;
    });
  }

  static async deleteScreening(screeningId: string): Promise<void> {
    return await sequelize.transaction(async (t: Transaction) => {
      const screening = await ScreeningModel.findByPk(screeningId, {
        transaction: t,
      });
      if (!screening) {
        throw new NotFoundError(`Screening with id ${screeningId} not found`);
      }
      await screening.destroy({ transaction: t });
    });
  }

  static async getAllScreenings(): Promise<ScreeningModel[]> {
    return ScreeningModel.findAll({
      include: [MovieModel, MovieTheaterModel, MovieHallModel],
      order: [['startTime', 'ASC']],
    });
  }

  // Find by X
  static async getScreeningsByMovieId(
    movieId: string
  ): Promise<ScreeningModel[]> {
    return ScreeningModel.findAll({
      where: { movieId },
      include: [MovieModel, MovieTheaterModel, MovieHallModel],
      order: [['startTime', 'ASC']],
    });
  }

  static async getScreeningsByTheaterId(
    theaterId: string
  ): Promise<ScreeningModel[]> {
    return ScreeningModel.findAll({
      where: { theaterId },
      include: [MovieModel, MovieTheaterModel, MovieHallModel],
      order: [['startTime', 'ASC']],
    });
  }

  static async getScreeningsByHallId(
    hallId: string,
    theaterId?: string
  ): Promise<ScreeningModel[]> {
    return ScreeningModel.findAll({
      where: theaterId ? { hallId, theaterId } : { hallId },
      include: [MovieModel, MovieTheaterModel, MovieHallModel],
      order: [['startTime', 'ASC']],
    });
  }

  static async getScreeningsByDate(date: Date): Promise<ScreeningModel[]> {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    return ScreeningModel.findAll({
      where: {
        startTime: { [Op.between]: [start, end] },
      },
      include: [MovieModel, MovieTheaterModel, MovieHallModel],
      order: [['startTime', 'ASC']],
    });
  }

  /**
   * Search screenings by multiple fields: movie title, genre, theater city, hall id, or quality
   * @param query Search string (partial match)
   */
  static async searchScreenings(query: string): Promise<ScreeningModel[]> {
    return ScreeningModel.findAll({
      include: [
        {
          model: MovieModel,
          as: 'movie', // important !
          where: {
            [Op.or]: [
              { title: { [Op.like]: `%${query}%` } },
              { genre: { [Op.like]: `%${query}%` } },
              { director: { [Op.like]: `%${query}%` } },
            ],
          },
          required: false,
        },
        {
          model: MovieTheaterModel,
          as: 'theater', // important !
          where: {
            [Op.or]: [{ city: { [Op.like]: `%${query}%` } }],
          },
          required: false,
        },
        {
          model: MovieHallModel,
          as: 'hall', // important !
          where: {
            hallId: { [Op.like]: `%${query}%` },
          },
          required: false,
        },
      ],
      where: {
        [Op.or]: [
          { quality: { [Op.like]: `%${query}%` } },
          { '$movie.title$': { [Op.like]: `%${query}%` } },
          { '$movie.genre$': { [Op.like]: `%${query}%` } },
          { '$movie.director$': { [Op.like]: `%${query}%` } },
          { '$movie.description$': { [Op.like]: `%${query}%` } },
          { '$theater.city$': { [Op.like]: `%${query}%` } },
          { '$theater.address$': { [Op.like]: `%${query}%` } },
          { '$hall.hallId$': { [Op.like]: `%${query}%` } },
        ],
      },
      order: [['startTime', 'ASC']],
    });
  }
}
