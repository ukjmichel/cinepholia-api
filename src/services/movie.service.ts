/**
 * Movie management service.
 *
 * This service provides CRUD operations for movies,
 * management of posters (image uploads), filtered search,
 * and ensures transactional consistency via Sequelize.
 *
 * Main features:
 * - Creation of movies with or without a poster image.
 * - Reading a movie by identifier (with NotFound error handling).
 * - Updating a movie and its poster.
 * - Transactional deletion of a movie.
 * - Multi-criteria search (title, director, genre, classification, etc.).
 * - Retrieval of all movies.
 *
 * Explicitly managed errors:
 * - NotFoundError: if the movie does not exist during reading, modification, or deletion.
 *
 * Dependencies:
 * - MovieImageService for image upload management.
 * - Sequelize for transactional management.
 *
 */
import {
  MovieModel,
  MovieAttributes,
  MovieCreationAttributes,
} from '../models/movie.model.js';
import { NotFoundError } from '../errors/not-found-error.js';
import { sequelize } from '../config/db.js';
import { Transaction, Op } from 'sequelize';
import { movieImageService, MovieImageService } from './movie-image.service.js'; // Must exist!
import { ConflictError } from '../errors/conflict-error.js';

export class MovieService {
  /**
   * Get a movie by its ID.
   * @param {string} movieId - The unique identifier of the movie.
   * @returns {Promise<MovieModel>} The movie instance.
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
   * Create a new movie.
   * @param {MovieCreationAttributes} payload - The data for creating the movie.
   * @param {Express.Multer.File} [file] - Optional poster image file.
   * @returns {Promise<MovieModel>} The created movie.
   */
  async createMovie(
    payload: MovieCreationAttributes,
    file?: Express.Multer.File
  ): Promise<MovieModel> {
    // Check for existing movie by title and director
    const existingMovie = await MovieModel.findOne({
      where: {
        title: payload.title,
        director: payload.director,
      },
    });

    if (existingMovie) {
      throw new ConflictError('Movie already exists');
    }

    // Transaction for creation (including poster image)
    return await sequelize.transaction(async (t: Transaction) => {
      let posterUrl: string | undefined = undefined;

      if (file) {
        posterUrl = await movieImageService.saveMovieImage(file);
      }

      const movie = await MovieModel.create(
        { ...payload, posterUrl },
        { transaction: t }
      );
      return movie;
    });
  }

  /**
   * Update an existing movie and optionally its poster image.
   * @param {string} movieId - The unique identifier of the movie.
   * @param {Partial<MovieAttributes>} update - The fields to update.
   * @param {Express.Multer.File} [file] - Optional new poster image file.
   * @returns {Promise<MovieModel>} The updated movie.
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
   * Transactionally delete a movie by its ID.
   * @param {string} movieId - The unique identifier of the movie.
   * @returns {Promise<void>}
   * @throws {NotFoundError} If the movie does not exist.
   */
  async deleteMovie(movieId: string): Promise<void> {
    return await sequelize.transaction(async (t: Transaction) => {
      const movie = await MovieModel.findByPk(movieId, { transaction: t });
      if (!movie) {
        throw new NotFoundError(`Movie with id ${movieId} not found`);
      }
      // Delete poster file if exists
      if (movie.posterUrl) {
        await movieImageService.deleteMovieImage(movie.posterUrl); // Optional cleanup
      }
      await movie.destroy({ transaction: t });
    });
  }

  /**
   * Get all movies.
   * @returns {Promise<MovieModel[]>} Array of all movies.
   */
  async getAllMovies(): Promise<MovieModel[]> {
    return MovieModel.findAll();
  }

  /**
   * Search movies using either a global search string or an advanced multi-field filter object.
   *
   * - If a string is provided, it will search for the value in the movie's title, director, or genre (case-insensitive, partial match, OR logic).
   * - If an object is provided, it supports:
   *    - Global search with the `q` property (searches title, director, genre, OR logic)
   *    - Field-specific partial searches for `title`, `director`, or `genre` (each will be included as an OR condition)
   *    - Exact filtering by `ageRating`, `releaseDate`, `movieId`
   *    - Filtering by recommendation status with `recommended`
   *
   * All string matches for title, director, or genre use a SQL `LIKE` query for partial matching.
   * Additional filters are applied with SQL equality unless otherwise noted.
   *
   * @param {string|Object} filters - Either a search string, or a filter object with specific fields.
   * @param {string} [filters.q] - Global search text (applies to title, director, and genre).
   * @param {string} [filters.title] - Filter by movie title (partial match).
   * @param {string} [filters.director] - Filter by director name (partial match).
   * @param {string} [filters.genre] - Filter by genre (partial match).
   * @param {string} [filters.ageRating] - Filter by age rating (exact match).
   * @param {string} [filters.releaseDate] - Filter by release date (exact match).
   * @param {boolean|string} [filters.recommended] - Filter by recommended status (true/false, or 'true'/'false').
   * @param {string} [filters.movieId] - Filter by specific movie ID (exact match).
   *
   * @returns {Promise<MovieModel[]>} Array of movie instances matching the search criteria.
   *
   * @example
   * // Global search by string
   * await MovieService.searchMovie('Inception');
   *
   * @example
   * // Advanced search by fields
   * await MovieService.searchMovie({
   *   title: 'Inception',
   *   director: 'Nolan',
   *   ageRating: 'PG-13',
   *   recommended: true
   * });
   *
   * @example
   * // Global search using the 'q' property
   * await MovieService.searchMovie({ q: 'action' });
   */
  async searchMovie(filters: any): Promise<MovieModel[]> {
    const where: any = {};

    // If filters is a string, treat it as global search text
    if (typeof filters === 'string' && filters.trim() !== '') {
      const value = `%${filters.trim()}%`;
      where[Op.or] = [
        { title: { [Op.like]: value } },
        { director: { [Op.like]: value } },
        { genre: { [Op.like]: value } },
      ];
    } else if (typeof filters === 'object' && filters !== null) {
      // If filters is an object, build OR for title/director/genre, or use q
      const orArr: any[] = [];

      if (
        filters.q &&
        typeof filters.q === 'string' &&
        filters.q.trim() !== ''
      ) {
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
      if (filters.recommended !== undefined)
        where.recommended =
          filters.recommended === 'true' || filters.recommended === '1';
      if (filters.movieId) where.movieId = filters.movieId;
    }

    return MovieModel.findAll({ where });
  }

  /**
   * Retrieve all upcoming movies with a release date in the future (strictly greater than today).
   *
   * This method fetches movies whose `releaseDate` is after the current date.
   * The results are ordered in ascending order of release date, so the soonest releases come first.
   *
   * @returns {Promise<MovieModel[]>} Array of movie instances with future release dates.
   *
   * @example
   * // Get all upcoming movies
   * const upcoming = await movieService.getUpcomingMovies();
   */
  async getUpcomingMovies(): Promise<MovieModel[]> {
    const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
    return MovieModel.findAll({
      where: {
        releaseDate: {
          [Op.gt]: today,
        },
      },
      order: [['releaseDate', 'ASC']], // Optional: soonest first
    });
  }
}

export const movieService = new MovieService();
