/**
 *
 * Provides CRUD operations, poster image management, filtered searches,
 * and ensures transactional consistency using Sequelize.
 *
 * Features:
 * - Create movies with or without a poster image
 * - Read a movie by ID (throws NotFoundError if not found)
 * - Update a movie and optionally its poster image
 * - Delete a movie with poster cleanup
 * - Multi-criteria search (title, director, genre, classification, etc.)
 * - Retrieve all movies
 * - Retrieve upcoming releases
 * - Retrieve movies by theater
 * - Retrieve a movie by screening ID
 *
 */

import {
  MovieModel,
  MovieAttributes,
  MovieCreationAttributes,
} from '../models/movie.model.js';
import { NotFoundError } from '../errors/not-found-error.js';
import { ConflictError } from '../errors/conflict-error.js';
import { sequelize } from '../config/db.js';
import { Transaction, Op } from 'sequelize';
import { movieImageService } from './movie-image.service.js';
import { ScreeningModel } from '../models/screening.model.js';

export class MovieService {
  /**
   * Retrieves a movie by its ID.
   *
   * @param {string} movieId - The unique identifier of the movie.
   * @returns {Promise<MovieModel>} The found movie instance.
   * @throws {NotFoundError} If the movie does not exist.
   */
  async getMovieById(movieId: string): Promise<MovieModel> {
    const movie = await MovieModel.findByPk(movieId);
    if (!movie) {
      throw new NotFoundError(`Movie with id ${movieId} not found`);
    }
    return movie;
  }

  /**
   * Creates a new movie.
   *
   * @param {MovieCreationAttributes} payload - The data for the new movie.
   * @param {Express.Multer.File} [file] - Optional poster image file.
   * @returns {Promise<MovieModel>} The created movie instance.
   * @throws {ConflictError} If a movie with the same title and director already exists.
   */
  async createMovie(
    payload: MovieCreationAttributes,
    file?: Express.Multer.File
  ): Promise<MovieModel> {
    const existingMovie = await MovieModel.findOne({
      where: { title: payload.title, director: payload.director },
    });

    if (existingMovie) {
      throw new ConflictError('Movie already exists');
    }

    return await sequelize.transaction(async (t: Transaction) => {
      let posterUrl: string | undefined = undefined;
      if (file) {
        posterUrl = await movieImageService.saveMovieImage(file);
      }
      return await MovieModel.create(
        { ...payload, posterUrl },
        { transaction: t }
      );
    });
  }

  /**
   * Updates an existing movie and optionally its poster image.
   *
   * @param {string} movieId - The ID of the movie to update.
   * @param {Partial<MovieAttributes>} update - The fields to update.
   * @param {Express.Multer.File} [file] - Optional new poster image file.
   * @returns {Promise<MovieModel>} The updated movie instance.
   * @throws {NotFoundError} If the movie does not exist.
   */
  async updateMovie(
    movieId: string,
    update: Partial<MovieAttributes>,
    file?: Express.Multer.File
  ): Promise<MovieModel> {
    return await sequelize.transaction(async (t: Transaction) => {
      const movie = await MovieModel.findByPk(movieId, { transaction: t });
      if (!movie) {
        throw new NotFoundError(`Movie with id ${movieId} not found`);
      }

      let posterUrl = update.posterUrl;
      if (file) {
        posterUrl = await movieImageService.saveMovieImage(file);
      }

      await movie.update({ ...update, posterUrl }, { transaction: t });
      return movie;
    });
  }

  /**
   * Deletes a movie by its ID, including optional poster file cleanup.
   *
   * @param {string} movieId - The ID of the movie to delete.
   * @returns {Promise<void>}
   * @throws {NotFoundError} If the movie does not exist.
   */
  async deleteMovie(movieId: string): Promise<void> {
    return await sequelize.transaction(async (t: Transaction) => {
      const movie = await MovieModel.findByPk(movieId, { transaction: t });
      if (!movie) {
        throw new NotFoundError(`Movie with id ${movieId} not found`);
      }
      if (movie.posterUrl) {
        await movieImageService.deleteMovieImage(movie.posterUrl);
      }
      await movie.destroy({ transaction: t });
    });
  }

  /**
   * Retrieves all movies.
   *
   * @returns {Promise<MovieModel[]>} Array of all movies.
   */
  async getAllMovies(): Promise<MovieModel[]> {
    return MovieModel.findAll();
  }

  /**
   * Searches for movies using a global search string or advanced filters.
   *
   * @param {string|Object} filters - Search string or filter object.
   * @returns {Promise<MovieModel[]>} Array of matching movies.
   *
   * @example
   * await movieService.searchMovie('Inception');
   * await movieService.searchMovie({ title: 'Inception', recommended: true });
   */
  async searchMovie(filters: any): Promise<MovieModel[]> {
    const where: any = {};

    if (typeof filters === 'string' && filters.trim() !== '') {
      const value = `%${filters.trim()}%`;
      where[Op.or] = [
        { title: { [Op.like]: value } },
        { director: { [Op.like]: value } },
        { genre: { [Op.like]: value } },
      ];
    } else if (typeof filters === 'object' && filters !== null) {
      const orArr: any[] = [];
      if (filters.q?.trim()) {
        const q = `%${filters.q.trim()}%`;
        orArr.push(
          { title: { [Op.like]: q } },
          { director: { [Op.like]: q } },
          { genre: { [Op.like]: q } }
        );
      }
      if (filters.title)
        orArr.push({ title: { [Op.like]: `%${filters.title}%` } });
      if (filters.director)
        orArr.push({ director: { [Op.like]: `%${filters.director}%` } });
      if (filters.genre)
        orArr.push({ genre: { [Op.like]: `%${filters.genre}%` } });
      if (orArr.length > 0) where[Op.or] = orArr;

      if (filters.ageRating) where.ageRating = filters.ageRating;
      if (filters.releaseDate) where.releaseDate = filters.releaseDate;
      if (filters.recommended !== undefined) {
        where.recommended =
          filters.recommended === 'true' || filters.recommended === '1';
      }
      if (filters.movieId) where.movieId = filters.movieId;
    }

    return MovieModel.findAll({ where });
  }

  /**
   * Retrieves all upcoming movies with release dates in the future.
   *
   * @returns {Promise<MovieModel[]>} Array of future-release movies.
   */
  async getUpcomingMovies(): Promise<MovieModel[]> {
    const today = new Date().toISOString().split('T')[0];
    return MovieModel.findAll({
      where: { releaseDate: { [Op.gt]: today } },
      order: [['releaseDate', 'ASC']],
    });
  }

  /**
   * Retrieves all unique movies screened in a given theater.
   *
   * @param {string} theaterId - Theater ID to search for.
   * @returns {Promise<MovieModel[]>} Array of movies in the theater.
   */
  async getMoviesByTheater(theaterId: string): Promise<MovieModel[]> {
    const screenings = await ScreeningModel.findAll({
      where: { theaterId },
      attributes: ['movieId'],
      group: ['movieId'],
      raw: true,
    });
    const movieIds = screenings.map((s) => s.movieId);
    if (!movieIds.length) return [];
    return MovieModel.findAll({ where: { movieId: movieIds } });
  }

  /**
   * Retrieves the movie for a given screening ID.
   *
   * @param {string} screeningId - The screening ID.
   * @returns {Promise<MovieModel>} The associated movie.
   * @throws {NotFoundError} If the screening or movie does not exist.
   */
  async getMovieByScreeningId(screeningId: string): Promise<MovieModel> {
    const screening = await ScreeningModel.findByPk(screeningId);
    if (!screening) {
      throw new NotFoundError(`Screening with id ${screeningId} not found`);
    }
    const movie = await MovieModel.findByPk(screening.movieId);
    if (!movie) {
      throw new NotFoundError(`Movie with id ${screening.movieId} not found`);
    }
    return movie;
  }
}

export const movieService = new MovieService();
