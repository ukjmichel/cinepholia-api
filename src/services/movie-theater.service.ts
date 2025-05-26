import {
  MovieTheaterModel,
  MovieTheaterAttributes,
} from '../models/movie-theater.model.js';
import { ConflictError } from '../errors/conflict-error.js';
import { NotFoundError } from '../errors/not-found-error.js';
import { Op } from 'sequelize';

/**
 * Service class for managing movie theaters in the database.
 */
export class MovieTheaterService {
  /**
   * Creates a new movie theater.
   * Throws a ConflictError if a theater with the same ID already exists.
   *
   * @param {MovieTheaterAttributes} theaterData - The data for the new movie theater.
   * @returns {Promise<MovieTheaterModel>} The created movie theater instance.
   * @throws {ConflictError} If a theater with the same ID already exists.
   */
  static async create(
    theaterData: MovieTheaterAttributes
  ): Promise<MovieTheaterModel> {
    const existing = await MovieTheaterModel.findByPk(theaterData.theaterId);
    if (existing) {
      throw new ConflictError(
        `A movie theater with ID "${theaterData.theaterId}" already exists.`
      );
    }
    return await MovieTheaterModel.create(theaterData);
  }

  /**
   * Retrieves a movie theater by its unique theaterId.
   * Throws a NotFoundError if the theater does not exist.
   *
   * @param {string} theaterId - The ID of the theater to retrieve.
   * @returns {Promise<MovieTheaterModel>} The found movie theater instance.
   * @throws {NotFoundError} If the theater is not found.
   */
  static async getById(theaterId: string): Promise<MovieTheaterModel> {
    const theater = await MovieTheaterModel.findByPk(theaterId);
    if (!theater) {
      throw new NotFoundError(
        `Movie theater with ID "${theaterId}" not found.`
      );
    }
    return theater;
  }

  /**
   * Retrieves all movie theaters.
   *
   * @returns {Promise<MovieTheaterModel[]>} An array of all movie theaters.
   */
  static async getAll(): Promise<MovieTheaterModel[]> {
    return await MovieTheaterModel.findAll();
  }

  /**
   * Updates a movie theater by its ID.
   * Throws a NotFoundError if the theater does not exist.
   *
   * @param {string} theaterId - The ID of the theater to update.
   * @param {Partial<MovieTheaterAttributes>} updateData - The data to update.
   * @returns {Promise<MovieTheaterModel>} The updated movie theater instance.
   * @throws {NotFoundError} If the theater is not found.
   */
  static async update(
    theaterId: string,
    updateData: Partial<MovieTheaterAttributes>
  ): Promise<MovieTheaterModel> {
    const theater = await MovieTheaterModel.findByPk(theaterId);
    if (!theater) {
      throw new NotFoundError(
        `Movie theater with ID "${theaterId}" not found.`
      );
    }
    // Optionally, capture the updated instance returned by update
    const updated = await theater.update(updateData);
    return updated;
  }

  /**
   * Deletes a movie theater by its ID.
   * Throws a NotFoundError if the theater does not exist.
   *
   * @param {string} theaterId - The ID of the theater to delete.
   * @returns {Promise<void>}
   * @throws {NotFoundError} If the theater is not found.
   */
  static async delete(theaterId: string): Promise<void> {
    const deletedRows = await MovieTheaterModel.destroy({
      where: { theaterId },
    });
    if (deletedRows === 0) {
      throw new NotFoundError(
        `Movie theater with ID "${theaterId}" not found.`
      );
    }
  }

  /**
   * Searches for movie theaters by filter criteria.
   * Supports partial matching on address, city, postalCode, or theaterId.
   *
   * @param {Partial<Pick<MovieTheaterAttributes, 'city' | 'address' | 'postalCode' | 'theaterId'>>} filters
   *   The search filters: city, address, postalCode, or theaterId.
   * @returns {Promise<MovieTheaterModel[]>} The list of matched movie theaters.
   */
  static async search(
    filters: Partial<
      Pick<
        MovieTheaterAttributes,
        'city' | 'address' | 'postalCode' | 'theaterId'
      >
    >
  ): Promise<MovieTheaterModel[]> {
    const where: any = {};

    if (filters.city) {
      where.city = { [Op.like]: `%${filters.city}%` }; // case-insensitive if collation is set
    }
    if (filters.address) {
      where.address = { [Op.like]: `%${filters.address}%` };
    }
    if (filters.postalCode) {
      where.postalCode = { [Op.like]: `%${filters.postalCode}%` };
    }
    if (filters.theaterId) {
      where.theaterId = { [Op.like]: `%${filters.theaterId}%` };
    }

    return await MovieTheaterModel.findAll({ where });
  }
}
