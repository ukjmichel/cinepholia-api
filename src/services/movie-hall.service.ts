import {
  MovieHallModel,
  MovieHallAttributes,
} from '../models/movie-hall.model.js';
import { MovieTheaterModel } from '../models/movie-theater.model.js';
import { Op } from 'sequelize';
import { NotFoundError } from '../errors/not-found-error.js';

export class MovieHallService {
  /**
   * Create a new movie hall, only if the theater exists.
   * @param data - The movie hall attributes
   * @returns The created MovieHallModel instance
   * @throws {NotFoundError} If the theater does not exist
   */
  async create(data: MovieHallAttributes): Promise<MovieHallModel> {
    const theater = await MovieTheaterModel.findOne({
      where: { theaterId: data.theaterId },
    });
    if (!theater)
      throw new NotFoundError(
        `Theater not found for theaterId: ${data.theaterId}`
      );
    return MovieHallModel.create(data);
  }

  /**
   * Find all movie halls, optionally paginated.
   * @param options - Optional pagination options
   * @returns An array of MovieHallModel instances
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
   * Find all halls by theaterId.
   * @param theaterId - The ID of the theater
   * @returns An array of MovieHallModel instances
   * @throws {NotFoundError} If no halls are found for the theaterId
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
   * Find a movie hall by composite primary key (theaterId + hallId).
   * @param theaterId - The ID of the theater
   * @param hallId - The ID of the hall
   * @returns The found MovieHallModel instance
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
   * Update a movie hall by composite PK, only if the theater exists.
   * @param theaterId - The ID of the theater (must exist)
   * @param hallId - The ID of the hall
   * @param data - Partial movie hall attributes for update
   * @returns The updated MovieHallModel instance
   * @throws {NotFoundError} If the theater or hall does not exist
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
   * Delete a movie hall by composite PK, only if the theater exists.
   * @param theaterId - The ID of the theater (must exist)
   * @param hallId - The ID of the hall
   * @returns An object with a success message
   * @throws {NotFoundError} If the theater or hall does not exist
   */
  async deleteByTheaterIdAndHallId(
    theaterId: string,
    hallId: string
  ): Promise<{ message: string }> {
    const theater = await MovieTheaterModel.findOne({ where: { theaterId } });
    if (!theater)
      throw new NotFoundError(`Theater not found for theaterId: ${theaterId}`);
    const hall = await this.findByTheaterIdAndHallId(theaterId, hallId);
    await hall.destroy();
    return { message: 'Movie hall deleted' };
  }

  /**
   * Search halls by partial theaterId and/or hallId.
   * @param query - Theater and/or hallId query parameters
   * @returns An array of matching MovieHallModel instances
   * @throws {NotFoundError} If no halls match the search criteria
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
