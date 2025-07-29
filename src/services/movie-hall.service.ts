/**
 * MovieHallService
 * ----------------
 * Service class for managing cinema halls (MovieHallModel) in the database.
 *
 * Features:
 * - Create, read, update, delete, and search cinema halls with strong validation.
 * - All mutating operations (create, update, delete, bulk create) use transactions for MySQL consistency.
 * - Finds always include associated MovieTheaterModel for richer API responses.
 * - Throws NotFoundError for client-friendly error handling.
 *
 * @module services/MovieHallService
 * @author  [Your Name]
 * @version 1.0
 * @since   2024-07
 */

import {
  MovieHallModel,
  MovieHallAttributes,
} from '../models/movie-hall.model.js';
import { MovieTheaterModel } from '../models/movie-theater.model.js';
import { Op, Transaction } from 'sequelize';
import { NotFoundError } from '../errors/not-found-error.js';
import { sequelize } from '../config/db.js';


/**
 * Service class for Movie Hall (MovieHallModel) business logic.
 * Handles all operations related to cinema halls, including transactional data modification.
 */
export class MovieHallService {
  /**
   * Create a new movie hall, only if the theater exists.
   * Uses a transaction to ensure consistency in MySQL.
   * @param {MovieHallAttributes} data - The movie hall attributes
   * @returns {Promise<MovieHallModel>} The created MovieHallModel instance
   * @throws {NotFoundError} If the theater does not exist
   */
  async create(data: MovieHallAttributes): Promise<MovieHallModel> {
    return await sequelize.transaction(async (t: Transaction) => {
      const theater = await MovieTheaterModel.findOne({
        where: { theaterId: data.theaterId },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!theater)
        throw new NotFoundError(
          `Theater not found for theaterId: ${data.theaterId}`
        );
      return await MovieHallModel.create(data, { transaction: t });
    });
  }

  /**
   * Retrieve all movie halls, optionally paginated.
   * Includes associated theater details.
   * @param {Object} [options] - Pagination options
   * @param {number} [options.limit] - Max number of records to return
   * @param {number} [options.offset] - Number of records to skip
   * @returns {Promise<MovieHallModel[]>} An array of MovieHallModel instances
   */
  async findAll(options?: {
    limit?: number;
    offset?: number;
  }): Promise<MovieHallModel[]> {
    return MovieHallModel.findAll({
      ...options,
      order: [
        ['theaterId', 'ASC'],
        ['hallId', 'ASC'],
      ],
      include: [{ model: MovieTheaterModel, as: 'theater' }],
    });
  }

  /**
   * Find all halls by a specific theaterId.
   * @param {string} theaterId - The ID of the theater
   * @returns {Promise<MovieHallModel[]>} Array of halls for the theater
   * @throws {NotFoundError} If no halls are found for the given theaterId
   */
  async findAllByTheaterId(theaterId: string): Promise<MovieHallModel[]> {
    const halls = await MovieHallModel.findAll({
      where: { theaterId },
      order: [['hallId', 'ASC']],
      include: [{ model: MovieTheaterModel, as: 'theater' }],
    });
    if (!halls.length) {
      throw new NotFoundError(`No halls found for theaterId: ${theaterId}`);
    }
    return halls;
  }

  /**
   * Find a movie hall by its composite primary key (theaterId + hallId).
   * @param {string} theaterId - The ID of the theater
   * @param {string} hallId - The ID of the hall
   * @param {Transaction} [transaction] - Optional Sequelize transaction
   * @returns {Promise<MovieHallModel>} The found MovieHallModel instance
   * @throws {NotFoundError} If the hall does not exist
   */
  async findByTheaterIdAndHallId(
    theaterId: string,
    hallId: string,
    transaction?: Transaction
  ): Promise<MovieHallModel> {
    const hall = await MovieHallModel.findOne({
      where: { theaterId, hallId },
      include: [{ model: MovieTheaterModel, as: 'theater' }],
      transaction, // << add this line
    });
    if (!hall)
      throw new NotFoundError(
        `Movie hall not found for theaterId=${theaterId}, hallId=${hallId}`
      );
    return hall;
  }

  /**
   * Update a movie hall by composite PK, only if the theater exists.
   * Uses a transaction for integrity.
   * @param {string} theaterId - The ID of the theater
   * @param {string} hallId - The ID of the hall
   * @param {Partial<MovieHallAttributes>} data - Attributes to update
   * @returns {Promise<MovieHallModel>} The updated MovieHallModel instance
   * @throws {NotFoundError} If the theater or hall does not exist
   */
  async updateByTheaterIdAndHallId(
    theaterId: string,
    hallId: string,
    data: Partial<MovieHallAttributes>
  ): Promise<MovieHallModel> {
    return await sequelize.transaction(async (t: Transaction) => {
      const theater = await MovieTheaterModel.findOne({
        where: { theaterId },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!theater)
        throw new NotFoundError(
          `Theater not found for theaterId: ${theaterId}`
        );

      const hall = await MovieHallModel.findOne({
        where: { theaterId, hallId },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!hall)
        throw new NotFoundError(
          `Movie hall not found for theaterId=${theaterId}, hallId=${hallId}`
        );

      await hall.update(data, { transaction: t });
      await hall.reload({
        transaction: t,
        include: [{ model: MovieTheaterModel, as: 'theater' }],
      });
      return hall;
    });
  }

  /**
   * Delete a movie hall by composite PK, only if the theater exists.
   * Uses a transaction for integrity.
   * @param {string} theaterId - The ID of the theater
   * @param {string} hallId - The ID of the hall
   * @returns {Promise<{ message: string }>} A success message
   * @throws {NotFoundError} If the theater or hall does not exist
   */
  async deleteByTheaterIdAndHallId(
    theaterId: string,
    hallId: string
  ): Promise<{ message: string }> {
    return await sequelize.transaction(async (t: Transaction) => {
      const theater = await MovieTheaterModel.findOne({
        where: { theaterId },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!theater)
        throw new NotFoundError(
          `Theater not found for theaterId: ${theaterId}`
        );

      const hall = await MovieHallModel.findOne({
        where: { theaterId, hallId },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!hall)
        throw new NotFoundError(
          `Movie hall not found for theaterId=${theaterId}, hallId=${hallId}`
        );

      await hall.destroy({ transaction: t });
      return { message: 'Movie hall deleted' };
    });
  }

  /**
   * Search halls by partial theaterId and/or hallId, with optional pagination.
   * @param {Object} query - Search parameters
   * @param {string} [query.theaterId] - Partial theaterId to search for
   * @param {string} [query.hallId] - Partial hallId to search for
   * @param {number} [query.limit] - Max number of results
   * @param {number} [query.offset] - Number of results to skip
   * @returns {Promise<MovieHallModel[]>} Array of matching halls
   * @throws {NotFoundError} If no halls match the search criteria
   */
  async searchByTheaterIdOrHallId(query: {
    theaterId?: string;
    hallId?: string;
    limit?: number;
    offset?: number;
  }): Promise<MovieHallModel[]> {
    const { theaterId, hallId, limit, offset } = query;
    const where: Record<string, any> = {};
    if (theaterId) where.theaterId = { [Op.like]: `%${theaterId}%` };
    if (hallId) where.hallId = { [Op.like]: `%${hallId}%` };

    const halls = await MovieHallModel.findAll({
      where,
      limit,
      offset,
      order: [
        ['theaterId', 'ASC'],
        ['hallId', 'ASC'],
      ],
      include: [{ model: MovieTheaterModel, as: 'theater' }],
    });
    if (!halls.length)
      throw new NotFoundError('No movie halls matched the search criteria.');
    return halls;
  }

  /**
   * Bulk create movie halls (for a new theater, etc.), with transaction.
   * @param {MovieHallAttributes[]} data - Array of movie hall attributes
   * @returns {Promise<MovieHallModel[]>} Array of created MovieHallModel instances
   * @throws {NotFoundError} If any referenced theater does not exist
   */
  async bulkCreate(data: MovieHallAttributes[]): Promise<MovieHallModel[]> {
    return await sequelize.transaction(async (t: Transaction) => {
      const theaterIds = [...new Set(data.map((d) => d.theaterId))];
      const theaters = await MovieTheaterModel.findAll({
        where: { theaterId: theaterIds },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (theaters.length !== theaterIds.length)
        throw new NotFoundError('One or more theaters do not exist.');
      return await MovieHallModel.bulkCreate(data, { transaction: t });
    });
  }
}
