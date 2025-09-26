/**
 * @module services/movie.service
 *
 * High-level operations for managing movies.
 * Returns safe DTOs instead of raw Sequelize instances.
 * Provides CRUD operations, poster image management, filtered searches,
 * and ensures transactional consistency using Sequelize.
 */

import { MovieModel } from '../models/movie.model.js';
import { ScreeningModel } from '../models/screening.model.js';
import type {
  CreateMovieDTO,
  UpdateMovieDTO,
  MovieDTO,
  MovieAttributes,
  PaginatedResponse,
} from '../interfaces/movie.js';
import { toMovieDTO } from '../interfaces/movie.js';
import type { Transaction } from 'sequelize';
import { NotFoundError } from '../errors/not-found-error.js';
import { ConflictError } from '../errors/conflict-error.js';
import { sequelize } from '../config/db.js';
import { movieImageService } from './movie-image.service.js';
import { buildMoviesByTheaterWhere, buildMovieWhere, buildOrder, buildUpcomingMoviesWhere, ListOptions, normalizeListOptions, SearchParams } from '../queries/movie.queries.js';

const DEFAULT_LIMIT = 20;

type ServiceOptions = {
  transaction?: Transaction;
};

export class MovieService {
  /* =============== CRUD =============== */

  /** Create a new movie and return a safe DTO */
  async create(
    payload: CreateMovieDTO,
    file?: Express.Multer.File,
    opts: ServiceOptions = {}
  ): Promise<MovieDTO> {
    // Check for existing movie with same title and director
    const existingMovie = await MovieModel.findOne({
      where: { title: payload.title, director: payload.director },
      transaction: opts.transaction,
    });

    if (existingMovie) {
      throw new ConflictError(
        'Movie with same title and director already exists'
      );
    }

    return await sequelize.transaction(async (t: Transaction) => {
      const transaction = opts.transaction || t;

      let posterUrl: string | undefined = undefined;
      if (file) {
        posterUrl = await movieImageService.saveMovieImage(file);
      }

      const movie = await MovieModel.create({ ...payload, posterUrl } as any, {
        transaction,
      });

      return toMovieDTO(this.pickForDTO(movie));
    });
  }

  /** Retrieve a movie by id (DTO or null) */
  async get(
    movieId: string,
    opts: ServiceOptions = {}
  ): Promise<MovieDTO | null> {
    const movie = await MovieModel.findByPk(movieId, {
      transaction: opts.transaction,
    });
    return movie ? toMovieDTO(this.pickForDTO(movie)) : null;
  }

  /** Get a movie by ID (throws if not found) */
  async getById(movieId: string, opts: ServiceOptions = {}): Promise<MovieDTO> {
    const movie = await this.get(movieId, opts);
    if (!movie) {
      throw new NotFoundError(`Movie with id ${movieId} not found`);
    }
    return movie;
  }

  /** Update selected fields of a movie and return DTO (or null if not found) */
  async update(
    movieId: string,
    dto: UpdateMovieDTO,
    file?: Express.Multer.File,
    opts: ServiceOptions = {}
  ): Promise<MovieDTO | null> {
    return await sequelize.transaction(async (t: Transaction) => {
      const transaction = opts.transaction || t;

      const movie = await MovieModel.findByPk(movieId, { transaction });
      if (!movie) return null;

      const updatable: UpdateMovieDTO = {} as UpdateMovieDTO;
      for (const key of Object.keys(dto) as (keyof UpdateMovieDTO)[]) {
        if (dto[key] !== undefined) (updatable as any)[key] = dto[key];
      }

      // Handle poster image update
      if (file) {
        updatable.posterUrl = await movieImageService.saveMovieImage(file);
      }

      movie.set(updatable as any);
      await movie.save({ transaction });

      return toMovieDTO(this.pickForDTO(movie));
    });
  }

  /** Permanently remove a movie (true if deleted) */
  async remove(movieId: string, opts: ServiceOptions = {}): Promise<boolean> {
    return await sequelize.transaction(async (t: Transaction) => {
      const transaction = opts.transaction || t;

      const movie = await MovieModel.findByPk(movieId, { transaction });
      if (!movie) return false;

      // Clean up poster image if exists
      if (movie.posterUrl) {
        await movieImageService.deleteMovieImage(movie.posterUrl);
      }

      const deleted = await MovieModel.destroy({
        where: { movieId },
        transaction,
      });

      return deleted > 0;
    });
  }

  /* =============== LIST / SEARCH =============== */

  /**
   * List movies with pagination, optional sorting, and filters.
   */
  async list(
    optsList: ListOptions = {},
    opts: ServiceOptions = {}
  ): Promise<PaginatedResponse<MovieDTO>> {
    const { page, limit, sortBy, sortDir } = normalizeListOptions(optsList);
    const where = buildMovieWhere(optsList.filters);

    const { rows, count } = await MovieModel.findAndCountAll({
      where,
      offset: (page - 1) * limit,
      limit,
      order: buildOrder(sortBy, sortDir),
      transaction: opts.transaction,
    });

    return this.paginate(rows, count, page, limit);
  }

  /**
   * Search by free-text query (q) plus structured filters.
   */
  async search(
    params: SearchParams,
    opts: ServiceOptions = {}
  ): Promise<PaginatedResponse<MovieDTO>> {
    const { page, limit, sortBy, sortDir } = normalizeListOptions(params);
    const where = buildMovieWhere(params.filters, params.q);

    const { rows, count } = await MovieModel.findAndCountAll({
      where,
      offset: (page - 1) * limit,
      limit,
      order: buildOrder(sortBy, sortDir),
      transaction: opts.transaction,
    });

    return this.paginate(rows, count, page, limit);
  }

  /**
   * Get all movies (without pagination)
   */
  async getAll(opts: ServiceOptions = {}): Promise<MovieDTO[]> {
    const movies = await MovieModel.findAll({
      transaction: opts.transaction,
      order: [['createdAt', 'DESC']],
    });

    return movies.map((movie) => toMovieDTO(this.pickForDTO(movie)));
  }

  /* =============== SPECIALIZED QUERIES =============== */

  /**
   * Retrieve all upcoming movies with release dates in the future.
   */
  async getUpcoming(
    optsList: Omit<ListOptions, 'filters'> = {},
    opts: ServiceOptions = {}
  ): Promise<PaginatedResponse<MovieDTO>> {
    const { page, limit, sortBy, sortDir } = normalizeListOptions({
      ...optsList,
      sortBy: optsList.sortBy || 'releaseDate', // Default to release date for upcoming
      sortDir: optsList.sortDir || 'asc', // Earliest first
    });

    const where = buildUpcomingMoviesWhere();

    const { rows, count } = await MovieModel.findAndCountAll({
      where,
      offset: (page - 1) * limit,
      limit,
      order: buildOrder(sortBy, sortDir),
      transaction: opts.transaction,
    });

    return this.paginate(rows, count, page, limit);
  }

  /**
   * Retrieve all unique movies screened in a given theater.
   */
  async getByTheater(
    theaterId: string,
    optsList: Omit<ListOptions, 'filters'> = {},
    opts: ServiceOptions = {}
  ): Promise<PaginatedResponse<MovieDTO>> {
    // First get unique movie IDs from screenings
    const screenings = await ScreeningModel.findAll({
      where: { theaterId },
      attributes: ['movieId'],
      group: ['movieId'],
      raw: true,
      transaction: opts.transaction,
    });

    const movieIds = screenings.map((s) => s.movieId);

    const { page, limit, sortBy, sortDir } = normalizeListOptions(optsList);
    const where = buildMoviesByTheaterWhere(movieIds);

    const { rows, count } = await MovieModel.findAndCountAll({
      where,
      offset: (page - 1) * limit,
      limit,
      order: buildOrder(sortBy, sortDir),
      transaction: opts.transaction,
    });

    return this.paginate(rows, count, page, limit);
  }

  /**
   * Retrieve the movie for a given screening ID.
   */
  async getByScreeningId(
    screeningId: string,
    opts: ServiceOptions = {}
  ): Promise<MovieDTO> {
    const screening = await ScreeningModel.findByPk(screeningId, {
      transaction: opts.transaction,
    });

    if (!screening) {
      throw new NotFoundError(`Screening with id ${screeningId} not found`);
    }

    const movie = await MovieModel.findByPk(screening.movieId, {
      transaction: opts.transaction,
    });

    if (!movie) {
      throw new NotFoundError(`Movie with id ${screening.movieId} not found`);
    }

    return toMovieDTO(this.pickForDTO(movie));
  }

  /* =============== Helpers =============== */

  /** Convert raw rows into a paginated DTO response */
  private paginate(
    rows: MovieModel[],
    count: number,
    page: number,
    limit: number
  ): PaginatedResponse<MovieDTO> {
    const items = rows.map((movie) => toMovieDTO(this.pickForDTO(movie)));
    const pagesRaw = Math.ceil(count / Math.max(1, limit || DEFAULT_LIMIT));
    const totalPages = Math.max(1, pagesRaw);

    return {
      items,
      page,
      limit,
      total: count,
      totalItems: count,
      totalPages,
    };
  }

  /** Pick only safe fields for DTO mapping */
  private pickForDTO(model: MovieModel) {
    const movie = model.get() as MovieAttributes;
    return {
      movieId: movie.movieId,
      title: movie.title,
      description: movie.description,
      ageRating: movie.ageRating,
      genre: movie.genre,
      releaseDate: movie.releaseDate,
      director: movie.director,
      durationMinutes: movie.durationMinutes,
      posterUrl: movie.posterUrl,
      recommended: movie.recommended,
      createdAt: movie.createdAt,
      updatedAt: movie.updatedAt,
    };
  }
}

/** Singleton instance for app-wide use */
const movieService = new MovieService();
export default movieService;
