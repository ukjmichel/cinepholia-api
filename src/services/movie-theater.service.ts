/**
 * @module services/movie-theater.service
 *
 * High-level operations for managing movie theaters.
 * Returns safe DTOs instead of raw Sequelize instances.
 */

import { MovieTheaterModel } from '../models/movie-theater.model.js';
import type {
  CreateMovieTheaterDTO,
  UpdateMovieTheaterDTO,
  MovieTheaterDTO,
  MovieTheaterAttributes,
  PaginatedResponse,
  TheaterLocationResult,
} from '../interfaces/movie-theater.js';
import { toMovieTheaterDTO } from '../interfaces/movie-theater.js';
import type {
  ListOptions,
  SearchParams,
} from '../queries/movie-theater.queries.js';
import {
  buildOrder,
  buildMovieTheaterWhere,
  normalizeListOptions,
  buildTheatersByCityWhere,
  buildTheatersByPostalCodeWhere,
  buildTheatersByLocationWhere,
} from '../queries/movie-theater.queries.js';
import type { Transaction } from 'sequelize';
import { NotFoundError } from '../errors/not-found-error.js';
import { ConflictError } from '../errors/conflict-error.js';

const DEFAULT_LIMIT = 20;

type ServiceOptions = {
  transaction?: Transaction;
};

export class MovieTheaterService {
  /* =============== CRUD =============== */

  /** Create a new movie theater and return a safe DTO */
  async create(
    payload: CreateMovieTheaterDTO,
    opts: ServiceOptions = {}
  ): Promise<MovieTheaterDTO> {
    // Check if theater ID already exists
    const existingTheater = await MovieTheaterModel.findByPk(
      payload.theaterId,
      {
        transaction: opts.transaction,
      }
    );

    if (existingTheater) {
      throw new ConflictError(
        `Theater with ID ${payload.theaterId} already exists`
      );
    }

    const theater = await MovieTheaterModel.create(payload as any, {
      transaction: opts.transaction,
    });
    return toMovieTheaterDTO(this.pickForDTO(theater));
  }

  /** Retrieve a theater by id (DTO or null) */
  async get(
    theaterId: string,
    opts: ServiceOptions = {}
  ): Promise<MovieTheaterDTO | null> {
    const theater = await MovieTheaterModel.findByPk(theaterId, {
      transaction: opts.transaction,
    });
    return theater ? toMovieTheaterDTO(this.pickForDTO(theater)) : null;
  }

  /** Get a theater by ID (throws if not found) */
  async getById(
    theaterId: string,
    opts: ServiceOptions = {}
  ): Promise<MovieTheaterDTO> {
    const theater = await this.get(theaterId, opts);
    if (!theater) {
      throw new NotFoundError(`Theater with id ${theaterId} not found`);
    }
    return theater;
  }

  /** Update selected fields of a theater and return DTO (or null if not found) */
  async update(
    theaterId: string,
    dto: UpdateMovieTheaterDTO,
    opts: ServiceOptions = {}
  ): Promise<MovieTheaterDTO | null> {
    const theater = await MovieTheaterModel.findByPk(theaterId, {
      transaction: opts.transaction,
    });
    if (!theater) return null;

    const updatable: UpdateMovieTheaterDTO = {} as UpdateMovieTheaterDTO;
    for (const key of Object.keys(dto) as (keyof UpdateMovieTheaterDTO)[]) {
      if (dto[key] !== undefined) (updatable as any)[key] = dto[key];
    }

    theater.set(updatable as any);
    await theater.save({ transaction: opts.transaction });
    return toMovieTheaterDTO(this.pickForDTO(theater));
  }

  /** Permanently remove a theater (true if deleted) */
  async remove(theaterId: string, opts: ServiceOptions = {}): Promise<boolean> {
    const deleted = await MovieTheaterModel.destroy({
      where: { theaterId },
      transaction: opts.transaction,
    });
    return deleted > 0;
  }

  /* =============== LIST / SEARCH =============== */

  /**
   * List theaters with pagination, optional sorting, and filters.
   */
  async list(
    optsList: ListOptions = {},
    opts: ServiceOptions = {}
  ): Promise<PaginatedResponse<MovieTheaterDTO>> {
    const { page, limit, sortBy, sortDir } = normalizeListOptions(optsList);
    const where = buildMovieTheaterWhere(optsList.filters);

    const { rows, count } = await MovieTheaterModel.findAndCountAll({
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
  ): Promise<PaginatedResponse<MovieTheaterDTO>> {
    const { page, limit, sortBy, sortDir } = normalizeListOptions(params);
    const where = buildMovieTheaterWhere(params.filters, params.q);

    const { rows, count } = await MovieTheaterModel.findAndCountAll({
      where,
      offset: (page - 1) * limit,
      limit,
      order: buildOrder(sortBy, sortDir),
      transaction: opts.transaction,
    });

    return this.paginate(rows, count, page, limit);
  }

  /**
   * Get all theaters (without pagination)
   */
  async getAll(opts: ServiceOptions = {}): Promise<MovieTheaterDTO[]> {
    const theaters = await MovieTheaterModel.findAll({
      transaction: opts.transaction,
      order: [
        ['city', 'ASC'],
        ['theaterId', 'ASC'],
      ],
    });

    return theaters.map((theater) =>
      toMovieTheaterDTO(this.pickForDTO(theater))
    );
  }

  /* =============== LOCATION-BASED QUERIES =============== */

  /**
   * Get theaters by city
   */
  async getByCity(
    city: string,
    optsList: Omit<ListOptions, 'filters'> = {},
    opts: ServiceOptions = {}
  ): Promise<PaginatedResponse<MovieTheaterDTO>> {
    const { page, limit, sortBy, sortDir } = normalizeListOptions(optsList);
    const where = buildTheatersByCityWhere(city);

    const { rows, count } = await MovieTheaterModel.findAndCountAll({
      where,
      offset: (page - 1) * limit,
      limit,
      order: buildOrder(sortBy, sortDir),
      transaction: opts.transaction,
    });

    return this.paginate(rows, count, page, limit);
  }

  /**
   * Get theaters by postal code
   */
  async getByPostalCode(
    postalCode: string,
    optsList: Omit<ListOptions, 'filters'> = {},
    opts: ServiceOptions = {}
  ): Promise<PaginatedResponse<MovieTheaterDTO>> {
    const { page, limit, sortBy, sortDir } = normalizeListOptions(optsList);
    const where = buildTheatersByPostalCodeWhere(postalCode);

    const { rows, count } = await MovieTheaterModel.findAndCountAll({
      where,
      offset: (page - 1) * limit,
      limit,
      order: buildOrder(sortBy, sortDir),
      transaction: opts.transaction,
    });

    return this.paginate(rows, count, page, limit);
  }

  /**
   * Get theaters by location (city or postal code)
   */
  async getByLocation(
    location: string,
    optsList: Omit<ListOptions, 'filters'> = {},
    opts: ServiceOptions = {}
  ): Promise<PaginatedResponse<MovieTheaterDTO>> {
    const { page, limit, sortBy, sortDir } = normalizeListOptions(optsList);
    const where = buildTheatersByLocationWhere(location);

    const { rows, count } = await MovieTheaterModel.findAndCountAll({
      where,
      offset: (page - 1) * limit,
      limit,
      order: buildOrder(sortBy, sortDir),
      transaction: opts.transaction,
    });

    return this.paginate(rows, count, page, limit);
  }

  /**
   * Get unique cities where theaters are located
   */
  async getCities(opts: ServiceOptions = {}): Promise<string[]> {
    const cities = await MovieTheaterModel.findAll({
      attributes: ['city'],
      group: ['city'],
      order: [['city', 'ASC']],
      transaction: opts.transaction,
      raw: true,
    });

    return cities.map((row) => row.city);
  }

  /**
   * Get theater locations for mapping/geographic display
   */
  async getLocations(
    optsList: Omit<ListOptions, 'filters'> = {},
    opts: ServiceOptions = {}
  ): Promise<TheaterLocationResult[]> {
    const { limit, sortBy, sortDir } = normalizeListOptions(optsList);

    const theaters = await MovieTheaterModel.findAll({
      attributes: ['theaterId', 'city', 'postalCode', 'address'],
      limit,
      order: buildOrder(sortBy || 'city', sortDir),
      transaction: opts.transaction,
      raw: true,
    });

    return theaters.map((theater) => ({
      theaterId: theater.theaterId,
      city: theater.city,
      postalCode: theater.postalCode,
      address: theater.address,
    }));
  }

  /* =============== ANALYTICS =============== */

  /**
   * Get theater statistics
   */
  async getStats(opts: ServiceOptions = {}): Promise<{
    total: number;
    byCities: Array<{ city: string; count: number }>;
    byPostalCodes: Array<{ postalCode: string; count: number }>;
  }> {
    const [total, byCitiesResults, byPostalCodesResults] = await Promise.all([
      MovieTheaterModel.count({ transaction: opts.transaction }),
      MovieTheaterModel.findAll({
        attributes: [
          'city',
          [
            MovieTheaterModel.sequelize!.fn(
              'COUNT',
              MovieTheaterModel.sequelize!.col('theaterId')
            ),
            'count',
          ],
        ],
        group: ['city'],
        order: [['city', 'ASC']],
        transaction: opts.transaction,
        raw: true,
      }),
      MovieTheaterModel.findAll({
        attributes: [
          'postalCode',
          [
            MovieTheaterModel.sequelize!.fn(
              'COUNT',
              MovieTheaterModel.sequelize!.col('theaterId')
            ),
            'count',
          ],
        ],
        group: ['postalCode'],
        order: [['postalCode', 'ASC']],
        transaction: opts.transaction,
        raw: true,
      }),
    ]);

    const byCities = (byCitiesResults as any[]).map((row) => ({
      city: row.city,
      count: parseInt(row.count),
    }));

    const byPostalCodes = (byPostalCodesResults as any[]).map((row) => ({
      postalCode: row.postalCode,
      count: parseInt(row.count),
    }));

    return {
      total,
      byCities,
      byPostalCodes,
    };
  }

  /* =============== Helpers =============== */

  /** Convert raw rows into a paginated DTO response */
  private paginate(
    rows: MovieTheaterModel[],
    count: number,
    page: number,
    limit: number
  ): PaginatedResponse<MovieTheaterDTO> {
    const items = rows.map((theater) =>
      toMovieTheaterDTO(this.pickForDTO(theater))
    );
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
  private pickForDTO(model: MovieTheaterModel) {
    const theater = model.get() as MovieTheaterAttributes;
    return {
      theaterId: theater.theaterId,
      address: theater.address,
      postalCode: theater.postalCode,
      city: theater.city,
      phone: theater.phone,
      email: theater.email,
      createdAt: theater.createdAt,
      updatedAt: theater.updatedAt,
    };
  }
}

/** Singleton instance for app-wide use */
const movieTheaterService = new MovieTheaterService();
export default movieTheaterService;
