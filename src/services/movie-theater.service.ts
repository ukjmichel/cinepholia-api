/**
 *
 * Provides transactional CRUD and search operations for `MovieTheaterModel`,
 * ensuring data integrity and meaningful error handling.
 *
 * Features:
 * - Create a theater (throws ConflictError if already exists)
 * - Retrieve a theater by ID (throws NotFoundError if not found)
 * - Retrieve all theaters
 * - Update a theater by ID (throws NotFoundError if not found)
 * - Delete a theater by ID (throws NotFoundError if not found)
 * - Search theaters by city, address, postal code, or theaterId (partial match)
 * - Bulk create multiple theaters in one transaction (throws ConflictError if duplicates exist)
 *
 */

import {
  MovieTheaterModel,
  MovieTheaterAttributes,
} from '../models/movie-theater.model.js';
import { ConflictError } from '../errors/conflict-error.js';
import { NotFoundError } from '../errors/not-found-error.js';
import { Op, Transaction } from 'sequelize';
import { param } from 'express-validator';
import { sequelize } from '../config/db.js';

export class MovieTheaterService {
  /**
   * Creates a new movie theater.
   *
   * @param {MovieTheaterAttributes} theaterData - Data for the new movie theater.
   * @returns {Promise<MovieTheaterModel>} The created movie theater instance.
   * @throws {ConflictError} If a theater with the same ID already exists.
   */
  async create(
    theaterData: MovieTheaterAttributes
  ): Promise<MovieTheaterModel> {
    return await sequelize.transaction(async (t: Transaction) => {
      const existing = await MovieTheaterModel.findByPk(theaterData.theaterId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (existing) {
        throw new ConflictError(
          `A movie theater with ID "${theaterData.theaterId}" already exists.`
        );
      }
      return await MovieTheaterModel.create(theaterData, { transaction: t });
    });
  }

  /**
   * Retrieves a movie theater by its unique theaterId.
   *
   * @param {string} theaterId - The ID of the theater to retrieve.
   * @returns {Promise<MovieTheaterModel>} The found movie theater instance.
   * @throws {NotFoundError} If the theater is not found.
   */
  async getById(theaterId: string): Promise<MovieTheaterModel> {
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
  async getAll(): Promise<MovieTheaterModel[]> {
    return await MovieTheaterModel.findAll();
  }

  /**
   * Updates a movie theater by its ID.
   *
   * @param {string} theaterId - The ID of the theater to update.
   * @param {Partial<MovieTheaterAttributes>} updateData - Data to update.
   * @returns {Promise<MovieTheaterModel>} The updated movie theater instance.
   * @throws {NotFoundError} If the theater is not found.
   */
  async update(
    theaterId: string,
    updateData: Partial<MovieTheaterAttributes>
  ): Promise<MovieTheaterModel> {
    return await sequelize.transaction(async (t: Transaction) => {
      const theater = await MovieTheaterModel.findByPk(theaterId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!theater) {
        throw new NotFoundError(
          `Movie theater with ID "${theaterId}" not found.`
        );
      }
      return await theater.update(updateData, { transaction: t });
    });
  }

  /**
   * Deletes a movie theater by its ID.
   *
   * @param {string} theaterId - The ID of the theater to delete.
   * @returns {Promise<void>}
   * @throws {NotFoundError} If the theater is not found.
   */
  async delete(theaterId: string): Promise<void> {
    return await sequelize.transaction(async (t: Transaction) => {
      const deletedRows = await MovieTheaterModel.destroy({
        where: { theaterId },
        transaction: t,
      });
      if (deletedRows === 0) {
        throw new NotFoundError(
          `Movie theater with ID "${theaterId}" not found.`
        );
      }
    });
  }

  /**
   * Searches for movie theaters by filter criteria.
   * Supports partial matching on `address`, `city`, `postalCode`, or `theaterId`.
   *
   * @param {Partial<Pick<MovieTheaterAttributes, 'city' | 'address' | 'postalCode' | 'theaterId'>>} filters
   *   Search filters.
   * @returns {Promise<MovieTheaterModel[]>} List of matched movie theaters.
   */
  async search(
    filters: Partial<
      Pick<
        MovieTheaterAttributes,
        'city' | 'address' | 'postalCode' | 'theaterId'
      >
    >
  ): Promise<MovieTheaterModel[]> {
    const where: any = {};

    if (filters.city) {
      where.city = { [Op.like]: `%${filters.city}%` };
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

  /**
   * Bulk-creates multiple movie theaters in a single transaction.
   *
   * @param {MovieTheaterAttributes[]} theatersData - Array of theaters to create.
   * @returns {Promise<MovieTheaterModel[]>} The created movie theaters.
   * @throws {ConflictError} If any theater with the same ID already exists.
   */
  async bulkCreate(
    theatersData: MovieTheaterAttributes[]
  ): Promise<MovieTheaterModel[]> {
    if (!theatersData || theatersData.length === 0) {
      return [];
    }

    return await sequelize.transaction(async (t: Transaction) => {
      const theaterIds = theatersData.map((t) => t.theaterId);

      const existing = await MovieTheaterModel.findAll({
        where: { theaterId: theaterIds },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (existing.length > 0) {
        const existingIds = existing.map((t) => t.theaterId).join(', ');
        throw new ConflictError(
          `One or more movie theaters already exist with IDs: ${existingIds}`
        );
      }

      return await MovieTheaterModel.bulkCreate(theatersData, {
        transaction: t,
      });
    });
  }
}

/**
 * Validator for the `theaterId` route parameter.
 *
 * Ensures `theaterId` exists, is a string, and is not empty.
 */
export const theaterIdParamValidator = [
  param('theaterId')
    .exists()
    .withMessage('Theater ID is required')
    .bail()
    .isString()
    .withMessage('Theater ID must be a string')
    .bail()
    .notEmpty()
    .withMessage('Theater ID cannot be empty'),
  // Optional: Add regex to restrict format
  // .matches(/^[a-zA-Z0-9\-]+$/).withMessage('Invalid theater ID format')
];

export const movieTheaterService = new MovieTheaterService();
