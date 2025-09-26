/**
 * @module services/movie-hall.service
 *
 * High-level operations for managing movie halls.
 * Returns safe DTOs instead of raw Sequelize instances.
 */

import { MovieHallModel } from '../models/movie-hall.model.js';
import type {
  CreateMovieHallDTO,
  UpdateMovieHallDTO,
  MovieHallDTO,
  MovieHallAttributes,
  PaginatedResponse,
  HallCapacityInfo,
  HallAvailability,
  HallIdentifier,
  HallQuality,
} from '../interfaces/movie-hall.js';
import { toMovieHallDTO } from '../interfaces/movie-hall.js';
import type {
  ListOptions,
  SearchParams,
} from '../queries/movie-hall.queries.js';
import {
  buildOrder,
  buildMovieHallWhere,
  normalizeListOptions,
  buildHallsByTheaterWhere,
  buildHallsByQualityWhere,
  buildSpecificHallWhere,
  buildMultipleHallsWhere,
  buildHallsByQualitiesWhere,
} from '../queries/movie-hall.queries.js';
import type { Transaction } from 'sequelize';
import { NotFoundError } from '../errors/not-found-error.js';
import { ConflictError } from '../errors/conflict-error.js';

const DEFAULT_LIMIT = 20;

type ServiceOptions = {
  transaction?: Transaction;
};

export class MovieHallService {
  /* =============== CRUD =============== */

  /** Create a new movie hall and return a safe DTO */
  async create(
    payload: CreateMovieHallDTO,
    opts: ServiceOptions = {}
  ): Promise<MovieHallDTO> {
    // Check if hall already exists in theater
    const existingHall = await MovieHallModel.findOne({
      where: {
        theaterId: payload.theaterId,
        hallId: payload.hallId,
      },
      transaction: opts.transaction,
    });

    if (existingHall) {
      throw new ConflictError(
        `Hall ${payload.hallId} already exists in theater ${payload.theaterId}`
      );
    }

    const hall = await MovieHallModel.create(payload as any, {
      transaction: opts.transaction,
    });
    return toMovieHallDTO(this.pickForDTO(hall));
  }

  /** Retrieve a hall by composite key (DTO or null) */
  async get(
    theaterId: string,
    hallId: string,
    opts: ServiceOptions = {}
  ): Promise<MovieHallDTO | null> {
    const hall = await MovieHallModel.findOne({
      where: { theaterId, hallId },
      transaction: opts.transaction,
    });
    return hall ? toMovieHallDTO(this.pickForDTO(hall)) : null;
  }

  /** Get a hall by composite key (throws if not found) */
  async getById(
    theaterId: string,
    hallId: string,
    opts: ServiceOptions = {}
  ): Promise<MovieHallDTO> {
    const hall = await this.get(theaterId, hallId, opts);
    if (!hall) {
      throw new NotFoundError(
        `Hall ${hallId} not found in theater ${theaterId}`
      );
    }
    return hall;
  }

  /** Update selected fields of a hall and return DTO (or null if not found) */
  async update(
    theaterId: string,
    hallId: string,
    dto: UpdateMovieHallDTO,
    opts: ServiceOptions = {}
  ): Promise<MovieHallDTO | null> {
    const hall = await MovieHallModel.findOne({
      where: { theaterId, hallId },
      transaction: opts.transaction,
    });
    if (!hall) return null;

    const updatable: UpdateMovieHallDTO = {} as UpdateMovieHallDTO;
    for (const key of Object.keys(dto) as (keyof UpdateMovieHallDTO)[]) {
      if (dto[key] !== undefined) (updatable as any)[key] = dto[key];
    }

    hall.set(updatable as any);
    await hall.save({ transaction: opts.transaction });
    return toMovieHallDTO(this.pickForDTO(hall));
  }

  /** Permanently remove a hall (true if deleted) */
  async remove(
    theaterId: string,
    hallId: string,
    opts: ServiceOptions = {}
  ): Promise<boolean> {
    const deleted = await MovieHallModel.destroy({
      where: { theaterId, hallId },
      transaction: opts.transaction,
    });
    return deleted > 0;
  }

  /* =============== LIST / SEARCH =============== */

  /**
   * List halls with pagination, optional sorting, and filters.
   */
  async list(
    optsList: ListOptions = {},
    opts: ServiceOptions = {}
  ): Promise<PaginatedResponse<MovieHallDTO>> {
    const { page, limit, sortBy, sortDir } = normalizeListOptions(optsList);
    let where = buildMovieHallWhere(optsList.filters);

    // Handle capacity filters at the service level since they require JSON processing
    if (optsList.filters?.minCapacity || optsList.filters?.maxCapacity) {
      // For now, we'll get all results and filter in memory
      // In production, consider using raw SQL for better performance
      const allHalls = await MovieHallModel.findAll({
        where,
        transaction: opts.transaction,
      });

      const filteredHalls = allHalls.filter((hall) => {
        const capacity = this.calculateCapacity(hall.seatsLayout);
        const minCapacity = optsList.filters?.minCapacity || 0;
        const maxCapacity = optsList.filters?.maxCapacity || Infinity;
        return capacity >= minCapacity && capacity <= maxCapacity;
      });

      // Manual pagination
      const offset = (page - 1) * limit;
      const paginatedHalls = filteredHalls.slice(offset, offset + limit);

      return this.paginate(paginatedHalls, filteredHalls.length, page, limit);
    }

    const { rows, count } = await MovieHallModel.findAndCountAll({
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
  ): Promise<PaginatedResponse<MovieHallDTO>> {
    const { page, limit, sortBy, sortDir } = normalizeListOptions(params);
    const where = buildMovieHallWhere(params.filters, params.q);

    const { rows, count } = await MovieHallModel.findAndCountAll({
      where,
      offset: (page - 1) * limit,
      limit,
      order: buildOrder(sortBy, sortDir),
      transaction: opts.transaction,
    });

    return this.paginate(rows, count, page, limit);
  }

  /* =============== SPECIALIZED QUERIES =============== */

  /**
   * Get halls by theater
   */
  async getByTheater(
    theaterId: string,
    optsList: Omit<ListOptions, 'filters'> = {},
    opts: ServiceOptions = {}
  ): Promise<PaginatedResponse<MovieHallDTO>> {
    const { page, limit, sortBy, sortDir } = normalizeListOptions(optsList);
    const where = buildHallsByTheaterWhere(theaterId);

    const { rows, count } = await MovieHallModel.findAndCountAll({
      where,
      offset: (page - 1) * limit,
      limit,
      order: buildOrder(sortBy, sortDir),
      transaction: opts.transaction,
    });

    return this.paginate(rows, count, page, limit);
  }

  /**
   * Get halls by quality
   */
  async getByQuality(
    quality: HallQuality,
    optsList: Omit<ListOptions, 'filters'> = {},
    opts: ServiceOptions = {}
  ): Promise<PaginatedResponse<MovieHallDTO>> {
    const { page, limit, sortBy, sortDir } = normalizeListOptions(optsList);
    const where = buildHallsByQualityWhere(quality);

    const { rows, count } = await MovieHallModel.findAndCountAll({
      where,
      offset: (page - 1) * limit,
      limit,
      order: buildOrder(sortBy, sortDir),
      transaction: opts.transaction,
    });

    return this.paginate(rows, count, page, limit);
  }

  /**
   * Get halls by multiple qualities
   */
  async getByQualities(
    qualities: HallQuality[],
    optsList: Omit<ListOptions, 'filters'> = {},
    opts: ServiceOptions = {}
  ): Promise<PaginatedResponse<MovieHallDTO>> {
    const { page, limit, sortBy, sortDir } = normalizeListOptions(optsList);
    const where = buildHallsByQualitiesWhere(qualities);

    const { rows, count } = await MovieHallModel.findAndCountAll({
      where,
      offset: (page - 1) * limit,
      limit,
      order: buildOrder(sortBy, sortDir),
      transaction: opts.transaction,
    });

    return this.paginate(rows, count, page, limit);
  }

  /**
   * Get multiple specific halls
   */
  async getMultiple(
    halls: HallIdentifier[],
    optsList: Omit<ListOptions, 'filters'> = {},
    opts: ServiceOptions = {}
  ): Promise<PaginatedResponse<MovieHallDTO>> {
    const { page, limit, sortBy, sortDir } = normalizeListOptions(optsList);
    const where = buildMultipleHallsWhere(halls);

    const { rows, count } = await MovieHallModel.findAndCountAll({
      where,
      offset: (page - 1) * limit,
      limit,
      order: buildOrder(sortBy, sortDir),
      transaction: opts.transaction,
    });

    return this.paginate(rows, count, page, limit);
  }

  /* =============== CAPACITY & AVAILABILITY =============== */

  /**
   * Get hall capacity information
   */
  async getCapacityInfo(
    theaterId: string,
    hallId: string,
    opts: ServiceOptions = {}
  ): Promise<HallCapacityInfo | null> {
    const hall = await this.get(theaterId, hallId, opts);
    if (!hall) return null;

    const totalSeats = this.calculateCapacity(hall.seatsLayout);
    const rows = hall.seatsLayout.length;
    const maxSeatsPerRow = Math.max(
      ...hall.seatsLayout.map((row) => row.length)
    );

    return {
      theaterId: hall.theaterId,
      hallId: hall.hallId,
      totalSeats,
      rows,
      maxSeatsPerRow,
      quality: hall.quality,
    };
  }

  /**
   * Get capacity information for all halls in a theater
   */
  async getTheaterCapacities(
    theaterId: string,
    opts: ServiceOptions = {}
  ): Promise<HallCapacityInfo[]> {
    const halls = await MovieHallModel.findAll({
      where: buildHallsByTheaterWhere(theaterId),
      transaction: opts.transaction,
    });

    return halls.map((hall) => {
      const totalSeats = this.calculateCapacity(hall.seatsLayout);
      const rows = hall.seatsLayout.length;
      const maxSeatsPerRow = Math.max(
        ...hall.seatsLayout.map((row) => row.length)
      );

      return {
        theaterId: hall.theaterId,
        hallId: hall.hallId,
        totalSeats,
        rows,
        maxSeatsPerRow,
        quality: hall.quality,
      };
    });
  }

  /**
   * Check if hall exists
   */
  async exists(
    theaterId: string,
    hallId: string,
    opts: ServiceOptions = {}
  ): Promise<boolean> {
    const count = await MovieHallModel.count({
      where: buildSpecificHallWhere(theaterId, hallId),
      transaction: opts.transaction,
    });
    return count > 0;
  }

  /**
   * Get all seat IDs from a hall's layout
   */
  async getAllSeatIds(
    theaterId: string,
    hallId: string,
    opts: ServiceOptions = {}
  ): Promise<string[]> {
    const hall = await this.getById(theaterId, hallId, opts);
    return this.extractSeatIds(hall.seatsLayout);
  }

  /* =============== ANALYTICS =============== */

  /**
   * Get hall statistics
   */
  async getStats(opts: ServiceOptions = {}): Promise<{
    total: number;
    byQuality: Record<HallQuality, number>;
    byTheater: Array<{ theaterId: string; count: number }>;
    averageCapacity: number;
    totalCapacity: number;
  }> {
    const [total, byQualityResults, byTheaterResults, allHalls] =
      await Promise.all([
        MovieHallModel.count({ transaction: opts.transaction }),
        MovieHallModel.findAll({
          attributes: [
            'quality',
            [
              MovieHallModel.sequelize!.fn(
                'COUNT',
                MovieHallModel.sequelize!.col('hallId')
              ),
              'count',
            ],
          ],
          group: ['quality'],
          transaction: opts.transaction,
          raw: true,
        }),
        MovieHallModel.findAll({
          attributes: [
            'theaterId',
            [
              MovieHallModel.sequelize!.fn(
                'COUNT',
                MovieHallModel.sequelize!.col('hallId')
              ),
              'count',
            ],
          ],
          group: ['theaterId'],
          transaction: opts.transaction,
          raw: true,
        }),
        MovieHallModel.findAll({
          attributes: ['seatsLayout'],
          transaction: opts.transaction,
          raw: true,
        }),
      ]);

    const byQuality = {} as Record<HallQuality, number>;
    const qualities: HallQuality[] = ['2D', '3D', 'IMAX', '4DX'];
    qualities.forEach((quality) => {
      byQuality[quality] = 0;
    });

    (byQualityResults as any[]).forEach((row) => {
      const quality = row.quality;
      if (['2D', '3D', 'IMAX', '4DX'].includes(quality)) {
        byQuality[quality as HallQuality] = parseInt(row.count);
      }
    });

    const byTheater = (byTheaterResults as any[]).map((row) => ({
      theaterId: row.theaterId,
      count: parseInt(row.count),
    }));

    // Calculate capacity statistics
    const capacities = (allHalls as any[]).map((hall) =>
      this.calculateCapacity(hall.seatsLayout)
    );
    const totalCapacity = capacities.reduce((sum, cap) => sum + cap, 0);
    const averageCapacity =
      capacities.length > 0 ? totalCapacity / capacities.length : 0;

    return {
      total,
      byQuality,
      byTheater,
      averageCapacity,
      totalCapacity,
    };
  }

  /* =============== LAYOUT MANAGEMENT =============== */

  /**
   * Update hall layout
   */
  async updateLayout(
    theaterId: string,
    hallId: string,
    newLayout: (string | number)[][],
    opts: ServiceOptions = {}
  ): Promise<MovieHallDTO | null> {
    return this.update(theaterId, hallId, { seatsLayout: newLayout }, opts);
  }

  /**
   * Validate seat layout
   */
  validateLayout(layout: (string | number)[][]): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!Array.isArray(layout) || layout.length === 0) {
      errors.push('Layout must be a non-empty 2D array');
      return { isValid: false, errors };
    }

    layout.forEach((row, rowIndex) => {
      if (!Array.isArray(row) || row.length === 0) {
        errors.push(`Row ${rowIndex} must be a non-empty array`);
        return;
      }

      row.forEach((seat, seatIndex) => {
        if (typeof seat !== 'string' && typeof seat !== 'number') {
          errors.push(
            `Seat at row ${rowIndex}, position ${seatIndex} must be a string or number`
          );
        } else if (typeof seat === 'string' && seat.length === 0) {
          errors.push(
            `Seat at row ${rowIndex}, position ${seatIndex} cannot be an empty string`
          );
        } else if (
          typeof seat === 'number' &&
          (!Number.isFinite(seat) || seat < 0)
        ) {
          errors.push(
            `Seat at row ${rowIndex}, position ${seatIndex} must be a non-negative finite number`
          );
        }
      });
    });

    return { isValid: errors.length === 0, errors };
  }

  /* =============== Helpers =============== */

  /** Calculate total capacity from seats layout */
  private calculateCapacity(seatsLayout: (string | number)[][]): number {
    return seatsLayout.reduce((total, row) => total + row.length, 0);
  }

  /** Extract all seat IDs from layout */
  private extractSeatIds(seatsLayout: (string | number)[][]): string[] {
    const seatIds: string[] = [];
    seatsLayout.forEach((row) => {
      row.forEach((seat) => {
        seatIds.push(String(seat));
      });
    });
    return seatIds;
  }

  /** Convert raw rows into a paginated DTO response */
  private paginate(
    rows: MovieHallModel[],
    count: number,
    page: number,
    limit: number
  ): PaginatedResponse<MovieHallDTO> {
    const items = rows.map((hall) => toMovieHallDTO(this.pickForDTO(hall)));
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
  private pickForDTO(model: MovieHallModel) {
    const hall = model.get() as MovieHallAttributes;
    return {
      theaterId: hall.theaterId,
      hallId: hall.hallId,
      seatsLayout: hall.seatsLayout,
      quality: hall.quality,
      createdAt: hall.createdAt,
      updatedAt: hall.updatedAt,
    };
  }
}

/** Singleton instance for app-wide use */
const movieHallService = new MovieHallService();
export default movieHallService;
