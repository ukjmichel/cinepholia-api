/**
 * Movie theater halls management service (MovieHall).
 *
 * This service performs CRUD operations on theater halls associated with cinemas.
 * It ensures that halls can only be created or modified if the associated cinema exists.
 *
 * Main features:
 * - Creation of a movie theater hall after verifying the existence of the cinema.
 * - Reading all halls or by cinema.
 * - Search by composite identifier (theaterId + hallId).
 * - Secure update and deletion after verifying the existence of the cinema.
 * - Partial search of halls by identifiers (theater and/or hall).
 *
 * Explicitly managed errors:
 * - NotFoundError if the cinema or hall does not exist.
 */

import {
  MovieHallModel,
  MovieHallAttributes,
} from '../models/movie-hall.model.js';
import { MovieTheaterModel } from '../models/movie-theater.model.js';
import { Op } from 'sequelize';
import { NotFoundError } from '../errors/not-found-error.js';
import { ConflictError } from '../errors/conflict-error.js';

/**
 * Service class to manage movie theater halls.
 */
export class MovieHallService {
  async getMovieHall(theaterId: string, hallId: string) {
    const hall = await MovieHallModel.findOne({
      where: { theaterId, hallId },
    });
    if (!hall) {
      throw new NotFoundError(
        `Movie hall not found for theaterId=${theaterId}, hallId=${hallId}`
      );
    }
    return hall;
  }
  /**
   * Creates a new movie theater hall after verifying that the cinema exists.
   *
   * @param data - Data of the hall to create
   * @returns {Promise<MovieHallModel>} Created hall
   * @throws {NotFoundError} If the associated cinema does not exist
   */
  async create(data: MovieHallAttributes): Promise<MovieHallModel> {
    const theater = await MovieTheaterModel.findOne({
      where: { theaterId: data.theaterId },
    });
    if (!theater) {
      throw new NotFoundError(
        `Theater not found for theaterId: ${data.theaterId}`
      );
    }

    const existingHall = await MovieHallModel.findOne({
      where: {
        theaterId: data.theaterId,
        hallId: data.hallId,
      },
    });
    if (existingHall) {
      throw new ConflictError(
        `Hall with hallId ${data.hallId} already exists in theater ${data.theaterId}`
      );
    }

    return MovieHallModel.create(data);
  }

  /**
   * Retrieves all halls, optionally paginated.
   *
   * @param options - Pagination options (limit, offset)
   * @returns {Promise<MovieHallModel[]>} List of halls
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
    });
  }

  /**
   * Retrieves all halls of a specific cinema.
   *
   * @param theaterId - Cinema identifier
   * @returns {Promise<MovieHallModel[]>} List of cinema halls
   * @throws {NotFoundError} If no halls exist for this cinema
   */
  async findAllByTheaterId(theaterId: string): Promise<MovieHallModel[]> {
    const halls = await MovieHallModel.findAll({
      where: { theaterId },
      order: [['hallId', 'ASC']],
    });
    if (!halls.length) {
      throw new NotFoundError(`No halls found for theaterId: ${theaterId}`);
    }
    return halls;
  }

  /**
   * Retrieves a specific hall by composite identifier (theaterId + hallId).
   *
   * @param theaterId - Cinema identifier
   * @param hallId - Hall identifier
   * @returns {Promise<MovieHallModel>} Found hall
   * @throws {NotFoundError} If the hall does not exist
   */
  async findByTheaterIdAndHallId(
    theaterId: string,
    hallId: string
  ): Promise<MovieHallModel> {
    const hall = await MovieHallModel.findOne({
      where: { theaterId, hallId },
    });
    if (!hall)
      throw new NotFoundError(
        `Movie hall not found for theaterId=${theaterId}, hallId=${hallId}`
      );
    return hall;
  }

  /**
   * Updates an existing hall after verifying the existence of the associated cinema.
   *
   * @param theaterId - Cinema identifier (must exist)
   * @param hallId - Hall identifier
   * @param data - Partial data of the hall to update
   * @returns {Promise<MovieHallModel>} Updated hall
   * @throws {NotFoundError} If the cinema or hall do not exist
   */
  async updateByTheaterIdAndHallId(
    theaterId: string,
    hallId: string,
    data: Partial<MovieHallAttributes>
  ): Promise<MovieHallModel> {
    const theater = await MovieTheaterModel.findOne({ where: { theaterId } });
    if (!theater)
      throw new NotFoundError(`Theater not found for theaterId: ${theaterId}`);

    const hall = await this.findByTheaterIdAndHallId(theaterId, hallId);
    return hall.update(data);
  }

  /**
   * Deletes a hall after verifying that the associated cinema exists.
   *
   * @param theaterId - Cinema identifier (must exist)
   * @param hallId - Hall identifier
   * @returns {Promise<{message: string}>} Confirmation message of deletion
   * @throws {NotFoundError} If the cinema or hall do not exist
   */
  async deleteByTheaterIdAndHallId(
    theaterId: string,
    hallId: string
  ): Promise<{ message: string }> {
    // Check the existence of the cinema
    const theater = await MovieTheaterModel.findOne({ where: { theaterId } });
    if (!theater) {
      throw new NotFoundError(`Theater not found for theaterId: ${theaterId}`);
    }

    // Check the existence of the hall
    const hall = await this.findByTheaterIdAndHallId(theaterId, hallId);
    if (!hall) {
      throw new NotFoundError(
        `Hall not found for theaterId: ${theaterId}, hallId: ${hallId}`
      );
    }

    // Delete the hall
    await hall.destroy();

    // Return a confirmation message
    return {
      message: `Movie hall (hallId: ${hallId}) deleted from theater (theaterId: ${theaterId})`,
    };
  }

  /**
   * Searches for halls by partial identifiers (theater and/or hall).
   *
   * @param query - Partial search parameters
   * @returns {Promise<MovieHallModel[]>} List of halls matching the criteria
   * @throws {NotFoundError} If no halls match the criteria
   */
  async searchByTheaterIdOrHallId(query: {
    theaterId?: string;
    hallId?: string;
  }): Promise<MovieHallModel[]> {
    const where: any = {};

    if (query.theaterId)
      where.theaterId = { [Op.like]: `%${query.theaterId}%` };
    if (query.hallId) where.hallId = { [Op.like]: `%${query.hallId}%` };

    const halls = await MovieHallModel.findAll({ where });

    if (!halls.length)
      throw new NotFoundError('No movie halls matched the search criteria.');

    return halls;
  }
}

export const movieHallService = new MovieHallService();
