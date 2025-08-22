/**
 * @fileoverview Service for managing movie screenings (CRUD, conflict detection, search).
 *
 * Features:
 * - Create, read, update, delete screenings with transactional integrity
 * - Check time overlap per hall to prevent scheduling conflicts
 * - Rich queries and filters (by movie, theater, hall, date, text, etc.)
 *
 */ 

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
  // === CRUD ===

  /**
   * Get a screening by its ID, including related movie, theater, and hall.
   *
   * @param {string} screeningId - Screening unique identifier.
   * @param {Transaction} [transaction] - Optional Sequelize transaction.
   * @returns {Promise<ScreeningModel>} The found screening with relations.
   * @throws {NotFoundError} If the screening does not exist.
   */
  async getScreeningById(
    screeningId: string,
    transaction?: Transaction
  ): Promise<ScreeningModel> {
    const screening = await ScreeningModel.findByPk(screeningId, {
      include: [MovieModel, MovieTheaterModel, MovieHallModel],
      transaction,
    });
    if (!screening) {
      throw new NotFoundError(`Screening with id ${screeningId} not found`);
    }
    return screening;
  }

  /**
   * Create a new screening, ensuring no overlap in the same hall.
   *
   * @param {ScreeningCreationAttributes} payload - Screening details.
   * @returns {Promise<ScreeningModel>} The created screening.
   * @throws {NotFoundError} If the movie or hall does not exist.
   * @throws {ConflictError} If there is a schedule conflict in the hall.
   */
  async createScreening(
    payload: ScreeningCreationAttributes
  ): Promise<ScreeningModel> {
    return await sequelize.transaction(async (t: Transaction) => {
      const movie = await this.getMovieOrThrow(payload.movieId, t);
      await this.ensureHallExists(payload.theaterId, payload.hallId, t);
      await this.assertNoOverlap({
        hallId: payload.hallId,
        theaterId: payload.theaterId,
        startTime: payload.startTime,
        durationMinutes: movie.durationMinutes,
        t,
      });
      return await ScreeningModel.create(payload, { transaction: t });
    });
  }

  /**
   * Update an existing screening and re-check for time overlap (excluding itself).
   *
   * @param {string} screeningId - Screening unique identifier.
   * @param {Partial<ScreeningAttributes>} update - Fields to update.
   * @returns {Promise<ScreeningModel>} The updated screening.
   * @throws {NotFoundError} If the screening, movie, or hall does not exist.
   * @throws {ConflictError} If there is a schedule conflict in the hall.
   */
  async updateScreening(
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

      // Determine values to validate: prefer update payload, fallback to current
      const movieId = update.movieId ?? screening.movieId;
      const theaterId = update.theaterId ?? screening.theaterId;
      const hallId = update.hallId ?? screening.hallId;
      const startTime = update.startTime ?? screening.startTime;

      const movie = await this.getMovieOrThrow(movieId, t);
      await this.ensureHallExists(theaterId, hallId, t);

      await this.assertNoOverlap({
        hallId,
        theaterId,
        startTime,
        durationMinutes: movie.durationMinutes,
        t,
        screeningIdToExclude: screeningId,
      });

      await screening.update(update, { transaction: t });
      return screening;
    });
  }

  /**
   * Delete a screening by its ID.
   *
   * @param {string} screeningId - Screening unique identifier.
   * @param {Transaction} [transaction] - Optional Sequelize transaction.
   * @returns {Promise<void>}
   * @throws {NotFoundError} If the screening does not exist.
   */
  async deleteScreening(
    screeningId: string,
    transaction?: Transaction
  ): Promise<void> {
    const run = async (t: Transaction) => {
      const screening = await ScreeningModel.findByPk(screeningId, {
        transaction: t,
      });
      if (!screening) {
        throw new NotFoundError(`Screening with id ${screeningId} not found`);
      }
      await screening.destroy({ transaction: t });
    };

    if (transaction) {
      return run(transaction);
    } else {
      return await sequelize.transaction(run);
    }
  }

  // === FILTERS / GETTERS ===

  /**
   * Get all screenings, ordered by start time (ascending).
   *
   * @param {Transaction} [transaction] - Optional Sequelize transaction.
   * @returns {Promise<ScreeningModel[]>} List of screenings with related movie, theater, and hall.
   */
  async getAllScreenings(transaction?: Transaction): Promise<ScreeningModel[]> {
    return ScreeningModel.findAll({
      include: [MovieModel, MovieTheaterModel, MovieHallModel],
      order: [['startTime', 'ASC']],
      transaction,
    });
  }

  /**
   * Get all screenings for a given movie.
   *
   * @param {string} movieId - Movie unique identifier.
   * @param {Transaction} [transaction] - Optional Sequelize transaction.
   * @returns {Promise<ScreeningModel[]>} List of screenings for the movie.
   */
  async getScreeningsByMovieId(
    movieId: string,
    transaction?: Transaction
  ): Promise<ScreeningModel[]> {
    return ScreeningModel.findAll({
      where: { movieId },
      include: [MovieModel, MovieTheaterModel, MovieHallModel],
      order: [['startTime', 'ASC']],
      transaction,
    });
  }

  /**
   * Get all screenings for a given theater.
   *
   * @param {string} theaterId - Theater unique identifier.
   * @param {Transaction} [transaction] - Optional Sequelize transaction.
   * @returns {Promise<ScreeningModel[]>} List of screenings for the theater.
   */
  async getScreeningsByTheaterId(
    theaterId: string,
    transaction?: Transaction
  ): Promise<ScreeningModel[]> {
    return ScreeningModel.findAll({
      where: { theaterId },
      include: [MovieModel, MovieTheaterModel, MovieHallModel],
      order: [['startTime', 'ASC']],
      transaction,
    });
  }

  /**
   * Get all screenings for a given hall (optionally filtered by theater).
   *
   * @param {string} hallId - Hall unique identifier.
   * @param {string} [theaterId] - Optional theater unique identifier.
   * @param {Transaction} [transaction] - Optional Sequelize transaction.
   * @returns {Promise<ScreeningModel[]>} List of screenings for the hall.
   */
  async getScreeningsByHallId(
    hallId: string,
    theaterId?: string,
    transaction?: Transaction
  ): Promise<ScreeningModel[]> {
    return ScreeningModel.findAll({
      where: theaterId ? { hallId, theaterId } : { hallId },
      include: [MovieModel, MovieTheaterModel, MovieHallModel],
      order: [['startTime', 'ASC']],
      transaction,
    });
  }

  /**
   * Get all screenings for a specific date (server time, 00:00:00–23:59:59.999).
   *
   * @param {Date} date - The date to filter by.
   * @param {Transaction} [transaction] - Optional Sequelize transaction.
   * @returns {Promise<ScreeningModel[]>} List of screenings on the date.
   */
  async getScreeningsByDate(
    date: Date,
    transaction?: Transaction
  ): Promise<ScreeningModel[]> {
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
      transaction,
    });
  }

  /**
   * Global search for screenings (multi-criteria & text).
   *
   * Supported filters:
   * - movieId, theaterId, hallId
   * - startTime or date (YYYY-MM-DD, expands to the day range)
   * - priceMin, priceMax
   * - quality (LIKE)
   * - recommended (boolean string 'true'|'false'|'1'|'0')
   * - q (global LIKE across movie, theater, hall fields)
   *
   * @param {any} filters - Filter and query parameters.
   * @param {Transaction} [transaction] - Optional Sequelize transaction.
   * @returns {Promise<ScreeningModel[]>} List of matching screenings.
   */
  async searchScreenings(
    filters: any,
    transaction?: Transaction
  ): Promise<ScreeningModel[]> {
    const where: any = {};

    if (filters.movieId) where.movieId = filters.movieId;
    if (filters.hallId) where.hallId = filters.hallId;
    if (filters.theaterId) where.theaterId = filters.theaterId;
    if (filters.startTime) where.startTime = filters.startTime;
    if (filters.quality) where.quality = { [Op.like]: `%${filters.quality}%` };

    if (filters.priceMin)
      where.price = {
        ...(where.price || {}),
        [Op.gte]: Number(filters.priceMin),
      };
    if (filters.priceMax)
      where.price = {
        ...(where.price || {}),
        [Op.lte]: Number(filters.priceMax),
      };

    if (filters.date) {
      const date = filters.date;
      where.startTime = {
        [Op.gte]: `${date}T00:00:00.000Z`,
        [Op.lt]: `${date}T23:59:59.999Z`,
      };
    } else if (filters.startTime) {
      where.startTime = filters.startTime;
    }

    if (filters.recommended !== undefined)
      where.recommended =
        filters.recommended === 'true' || filters.recommended === '1';

    if (filters.q && typeof filters.q === 'string' && filters.q.trim() !== '') {
      const q = filters.q.trim();
      where[Op.or] = [
        { quality: { [Op.like]: `%${q}%` } },
        { '$movie.title$': { [Op.like]: `%${q}%` } },
        { '$movie.genre$': { [Op.like]: `%${q}%` } },
        { '$movie.director$': { [Op.like]: `%${q}%` } },
        { '$movie.description$': { [Op.like]: `%${q}%` } },
        { '$theater.city$': { [Op.like]: `%${q}%` } },
        { '$theater.address$': { [Op.like]: `%${q}%` } },
        { '$theater.name$': { [Op.like]: `%${q}%` } },
        { '$hall.hallId$': { [Op.like]: `%${q}%` } },
        { '$hall.name$': { [Op.like]: `%${q}%` } },
      ];
    }

    return ScreeningModel.findAll({
      where,
      include: [
        { model: MovieModel, as: 'movie', required: false },
        { model: MovieTheaterModel, as: 'theater', required: false },
        { model: MovieHallModel, as: 'hall', required: false },
      ],
      order: [['startTime', 'ASC']],
      transaction,
    });
  }

  // === PRIVATE HELPERS ===

  /**
   * Ensure the movie exists or throw.
   *
   * @private
   * @param {string} movieId - Movie ID to check.
   * @param {Transaction} t - Transaction.
   * @returns {Promise<MovieModel>} The found movie.
   * @throws {NotFoundError} If the movie is not found.
   */
  private async getMovieOrThrow(movieId: string, t: Transaction) {
    const movie = await MovieModel.findByPk(movieId, { transaction: t });
    if (!movie) throw new NotFoundError('Movie not found');
    return movie;
  }

  /**
   * Ensure the hall exists for the given theater or throw.
   *
   * @private
   * @param {string} theaterId - Theater ID.
   * @param {string} hallId - Hall ID.
   * @param {Transaction} t - Transaction.
   * @returns {Promise<MovieHallModel>} The found hall.
   * @throws {NotFoundError} If the hall is not found.
   */
  private async ensureHallExists(
    theaterId: string,
    hallId: string,
    t: Transaction
  ) {
    const hall = await MovieHallModel.findOne({
      where: { theaterId, hallId },
      transaction: t,
    });
    if (!hall) throw new NotFoundError('Hall not found');
    return hall;
  }

  /**
   * Check for overlapping screenings in the same hall/time window.
   * Throws ConflictError if an overlap is found.
   *
   * If updating, pass `screeningIdToExclude` to ignore the current screening.
   *
   * @private
   * @param {object} params - Overlap params.
   * @param {string} params.hallId - Hall ID.
   * @param {string} params.theaterId - Theater ID.
   * @param {Date} params.startTime - Proposed start time.
   * @param {number} params.durationMinutes - Duration of the movie (minutes).
   * @param {Transaction} params.t - Transaction.
   * @param {string} [params.screeningIdToExclude] - Screening ID to ignore during update.
   * @returns {Promise<void>}
   * @throws {ConflictError} If an overlap is detected.
   */
  private async assertNoOverlap({
    hallId,
    theaterId,
    startTime,
    durationMinutes,
    t,
    screeningIdToExclude,
  }: {
    hallId: string;
    theaterId: string;
    startTime: Date;
    durationMinutes: number;
    t: Transaction;
    screeningIdToExclude?: string;
  }) {
    const newStart = new Date(startTime);
    const newEnd = new Date(newStart.getTime() + durationMinutes * 60 * 1000);

    const where: any = { hallId, theaterId };
    if (screeningIdToExclude) {
      where.screeningId = { [Op.ne]: screeningIdToExclude };
    }

    const overlappingScreenings = await ScreeningModel.findAll({
      where,
      include: [{ model: MovieModel }],
      transaction: t,
    });

    for (const screening of overlappingScreenings) {
      const existingStart = new Date(screening.startTime);
      const existingDuration = screening.movie.durationMinutes;
      const existingEnd = new Date(
        existingStart.getTime() + existingDuration * 60 * 1000
      );
      if (existingStart < newEnd && existingEnd > newStart) {
        throw new ConflictError(
          `Hall is occupied: overlaps with screening '${screening.movie.title}' from ${existingStart.toISOString()} to ${existingEnd.toISOString()}`
        );
      }
    }
  }
}

export const screeningService = new ScreeningService();
