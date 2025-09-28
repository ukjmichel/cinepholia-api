/**
 * @module services/screening.service
 *
 * High-level operations for managing movie screenings.
 * - Returns safe DTOs instead of raw Sequelize instances.
 * - Enforces scheduling constraints (overlap + minimum gap).
 * - Provides rich list/search utilities and analytics.
 */

/* ===================== External deps ===================== */
import { Op, type Transaction } from 'sequelize';

/* ===================== Internal models & mappers ===================== */
import { ScreeningModel } from '../models/screening.model.js';
import { toScreeningDTO } from '../interfaces/screening.js';

/* ===================== Types & DTOs ===================== */
import type {
  CreateScreeningDTO,
  UpdateScreeningDTO,
  ScreeningDTO,
  ScreeningAttributes,
  PaginatedResponse,
  ScreeningConflict,
  PriceRange,
  TimeSlot,
  HallQuality,
  TheaterSchedule,
  MovieShowtimes,
} from '../interfaces/screening.js';

import type {
  ListOptions,
  SearchParams,
  SortBy,
  SortDir,
} from '../queries/screening.queries.js';

/* ===================== Query builders ===================== */
import {
  buildOrder,
  buildScreeningWhere,
  normalizeListOptions,
  buildScreeningsByMovieWhere,
  buildScreeningsByTheaterWhere,
  buildScreeningsByHallWhere,
  buildSpecificScreeningWhere,
  buildMultipleScreeningsWhere,
  buildScreeningsByDateRangeWhere,
  buildScreeningsByDateWhere,
  buildUpcomingScreeningsWhere,
  buildPastScreeningsWhere,
  requiresHallJoin,
  buildHallQualityWhere,
} from '../queries/screening.queries.js';

/* ===================== Errors ===================== */
import { NotFoundError } from '../errors/not-found-error.js';
import { ConflictError } from '../errors/conflict-error.js';
import { ValidationError } from '../errors/validation-error.js';

/* ===================== Constants ===================== */
const DEFAULT_LIMIT = 20;
const DEFAULT_MOVIE_DURATION = 120; // minutes
const MIN_SCREENING_GAP = 30; // minutes between screenings in same hall

/* ===================== Local types ===================== */
type ServiceOptions = {
  transaction?: Transaction;
};

/**
 * ScreeningService
 * Encapsulates CRUD, search, scheduling, analytics and bulk operations.
 */
export class ScreeningService {
  /* =========================================================
   * CRUD
   * =======================================================*/

  /** Create a new screening and return a safe DTO */
  async create(
    payload: CreateScreeningDTO,
    opts: ServiceOptions = {}
  ): Promise<ScreeningDTO> {
    // Validate time + price constraints
    await this.validateScreeningTime(payload, opts);

    // Ensure the hall exists and belongs to the given theater
    await this.validateHallReference(payload.theaterId, payload.hallId, opts);

    // Check conflicts (same hall/theater around the target time)
    const conflicts = await this.checkSchedulingConflicts(
      payload.theaterId,
      payload.hallId,
      payload.startTime,
      undefined,
      opts
    );
    if (conflicts.length > 0) {
      throw new ConflictError(
        `Screening conflicts detected: ${conflicts.map((c) => c.conflictType).join(', ')}`
      );
    }

    const screening = await ScreeningModel.create(payload as any, {
      transaction: opts.transaction,
    });

    return toScreeningDTO(this.pickForDTO(screening));
  }

  /** Retrieve a screening by ID (DTO or null) */
  async get(
    screeningId: string,
    opts: ServiceOptions = {}
  ): Promise<ScreeningDTO | null> {
    const screening = await ScreeningModel.findOne({
      where: { screeningId },
      transaction: opts.transaction,
    });
    return screening ? toScreeningDTO(this.pickForDTO(screening)) : null;
  }

  /** Get a screening by ID (throws if not found) */
  async getById(
    screeningId: string,
    opts: ServiceOptions = {}
  ): Promise<ScreeningDTO> {
    const screening = await this.get(screeningId, opts);
    if (!screening) {
      throw new NotFoundError(`Screening ${screeningId} not found`);
    }
    return screening;
  }

  /** Update selected fields of a screening and return DTO (or null if not found) */
  async update(
    screeningId: string,
    dto: UpdateScreeningDTO,
    opts: ServiceOptions = {}
  ): Promise<ScreeningDTO | null> {
    const screening = await ScreeningModel.findOne({
      where: { screeningId },
      transaction: opts.transaction,
    });
    if (!screening) return null;

    // Merge current + incoming for validation purposes
    const updatedData = { ...screening.get(), ...dto } as CreateScreeningDTO;

    // If time/theater/hall changes, re-validate and re-check conflicts
    if (dto.startTime || dto.theaterId || dto.hallId) {
      await this.validateScreeningTime(updatedData, opts);

      const conflicts = await this.checkSchedulingConflicts(
        updatedData.theaterId,
        updatedData.hallId,
        updatedData.startTime,
        screeningId, // exclude current
        opts
      );
      if (conflicts.length > 0) {
        throw new ConflictError(
          `Screening update would create conflicts: ${conflicts.map((c) => c.conflictType).join(', ')}`
        );
      }
    }

    // Only set provided keys
    const updatable: UpdateScreeningDTO = {};
    for (const key of Object.keys(dto) as (keyof UpdateScreeningDTO)[]) {
      if (dto[key] !== undefined) (updatable as any)[key] = dto[key];
    }

    screening.set(updatable as any);
    await screening.save({ transaction: opts.transaction });
    return toScreeningDTO(this.pickForDTO(screening));
  }

  /** Permanently remove a screening (true if deleted) */
  async remove(
    screeningId: string,
    opts: ServiceOptions = {}
  ): Promise<boolean> {
    const deleted = await ScreeningModel.destroy({
      where: { screeningId },
      transaction: opts.transaction,
    });
    return deleted > 0;
  }

  /* =========================================================
   * LIST / SEARCH
   * =======================================================*/

  /**
   * List screenings with pagination, optional sorting, and filters.
   * - Supports conditional join on hall to filter by quality.
   */
  async list(
    optsList: ListOptions = {},
    opts: ServiceOptions = {}
  ): Promise<PaginatedResponse<ScreeningDTO>> {
    const { page, limit, sortBy, sortDir } = normalizeListOptions(optsList);
    const where = buildScreeningWhere(optsList.filters);

    // Conditional include for hall quality
    const needsHallJoin = requiresHallJoin(optsList.filters);
    const includeOptions: any[] = [];

    if (needsHallJoin) {
      const { MovieHallModel } = await import('../models/movie-hall.model.js');
      const hallWhere = buildHallQualityWhere(optsList.filters?.quality);

      includeOptions.push({
        model: MovieHallModel,
        as: 'hall',
        where: hallWhere,
        attributes: [],
        required: true,
        // Composite-key join (theaterId, hallId)
        on: {
          [Op.and]: [
            { '$ScreeningModel.theaterId$': { [Op.col]: 'hall.theaterId' } },
            { '$ScreeningModel.hallId$': { [Op.col]: 'hall.hallId' } },
          ],
        },
      });
    }

    const queryOptions: any = {
      where,
      offset: (page - 1) * limit,
      limit,
      order: buildOrder(sortBy as SortBy, sortDir as SortDir),
      transaction: opts.transaction,
    };

    if (includeOptions.length) queryOptions.include = includeOptions;

    const { rows, count } = await ScreeningModel.findAndCountAll(queryOptions);
    return this.paginate(rows, count, page, limit);
  }

  /**
   * Search by free-text query (q) plus structured filters.
   * - Mirrors `list` but accepts a query string.
   */
  async search(
    params: SearchParams,
    opts: ServiceOptions = {}
  ): Promise<PaginatedResponse<ScreeningDTO>> {
    const { page, limit, sortBy, sortDir } = normalizeListOptions(params);
    const where = buildScreeningWhere(params.filters, params.q);

    const needsHallJoin = requiresHallJoin(params.filters);
    const includeOptions: any[] = [];

    if (needsHallJoin) {
      const { MovieHallModel } = await import('../models/movie-hall.model.js');
      const hallWhere = buildHallQualityWhere(params.filters?.quality);
      includeOptions.push({
        model: MovieHallModel,
        as: 'hall',
        where: hallWhere,
        attributes: [],
        required: true,
        // Ensure composite-key join here too (consistent with list)
        on: {
          [Op.and]: [
            { '$ScreeningModel.theaterId$': { [Op.col]: 'hall.theaterId' } },
            { '$ScreeningModel.hallId$': { [Op.col]: 'hall.hallId' } },
          ],
        },
      });
    }

    const queryOptions: any = {
      where,
      offset: (page - 1) * limit,
      limit,
      order: buildOrder(sortBy as SortBy, sortDir as SortDir),
      transaction: opts.transaction,
    };

    if (includeOptions.length) queryOptions.include = includeOptions;

    const { rows, count } = await ScreeningModel.findAndCountAll(queryOptions);
    return this.paginate(rows, count, page, limit);
  }

  /* =========================================================
   * SPECIALIZED QUERIES
   * =======================================================*/

  /** Get screenings by movie */
  async getByMovie(
    movieId: string,
    optsList: Omit<ListOptions, 'filters'> = {},
    opts: ServiceOptions = {}
  ): Promise<PaginatedResponse<ScreeningDTO>> {
    const { page, limit, sortBy, sortDir } = normalizeListOptions(optsList);
    const where = buildScreeningsByMovieWhere(movieId);

    const { rows, count } = await ScreeningModel.findAndCountAll({
      where,
      offset: (page - 1) * limit,
      limit,
      order: buildOrder(sortBy as SortBy, sortDir as SortDir),
      transaction: opts.transaction,
    });

    return this.paginate(rows, count, page, limit);
  }

  /** Get screenings by theater */
  async getByTheater(
    theaterId: string,
    optsList: Omit<ListOptions, 'filters'> = {},
    opts: ServiceOptions = {}
  ): Promise<PaginatedResponse<ScreeningDTO>> {
    const { page, limit, sortBy, sortDir } = normalizeListOptions(optsList);
    const where = buildScreeningsByTheaterWhere(theaterId);

    const { rows, count } = await ScreeningModel.findAndCountAll({
      where,
      offset: (page - 1) * limit,
      limit,
      order: buildOrder(sortBy as SortBy, sortDir as SortDir),
      transaction: opts.transaction,
    });

    return this.paginate(rows, count, page, limit);
  }

  /** Get screenings by hall */
  async getByHall(
    theaterId: string,
    hallId: string,
    optsList: Omit<ListOptions, 'filters'> = {},
    opts: ServiceOptions = {}
  ): Promise<PaginatedResponse<ScreeningDTO>> {
    const { page, limit, sortBy, sortDir } = normalizeListOptions(optsList);
    const where = buildScreeningsByHallWhere(theaterId, hallId);

    const { rows, count } = await ScreeningModel.findAndCountAll({
      where,
      offset: (page - 1) * limit,
      limit,
      order: buildOrder(sortBy as SortBy, sortDir as SortDir),
      transaction: opts.transaction,
    });

    return this.paginate(rows, count, page, limit);
  }

  /** Get screenings by hall quality */
  async getByQuality(
    quality: HallQuality,
    optsList: Omit<ListOptions, 'filters'> = {},
    opts: ServiceOptions = {}
  ): Promise<PaginatedResponse<ScreeningDTO>> {
    const { page, limit, sortBy, sortDir } = normalizeListOptions(optsList);
    const { MovieHallModel } = await import('../models/movie-hall.model.js');

    const { rows, count } = await ScreeningModel.findAndCountAll({
      include: [
        {
          model: MovieHallModel,
          as: 'hall',
          where: { quality },
          attributes: [],
          required: true,
          on: {
            [Op.and]: [
              { '$ScreeningModel.theaterId$': { [Op.col]: 'hall.theaterId' } },
              { '$ScreeningModel.hallId$': { [Op.col]: 'hall.hallId' } },
            ],
          },
        },
      ],
      offset: (page - 1) * limit,
      limit,
      order: buildOrder(sortBy as SortBy, sortDir as SortDir),
      transaction: opts.transaction,
    });

    return this.paginate(rows, count, page, limit);
  }

  /** Get screenings by multiple hall qualities */
  async getByQualities(
    qualities: HallQuality[],
    optsList: Omit<ListOptions, 'filters'> = {},
    opts: ServiceOptions = {}
  ): Promise<PaginatedResponse<ScreeningDTO>> {
    const { page, limit, sortBy, sortDir } = normalizeListOptions(optsList);
    const { MovieHallModel } = await import('../models/movie-hall.model.js');

    const { rows, count } = await ScreeningModel.findAndCountAll({
      include: [
        {
          model: MovieHallModel,
          as: 'hall',
          where: { quality: { [Op.in]: qualities } },
          attributes: [],
          required: true,
          on: {
            [Op.and]: [
              { '$ScreeningModel.theaterId$': { [Op.col]: 'hall.theaterId' } },
              { '$ScreeningModel.hallId$': { [Op.col]: 'hall.hallId' } },
            ],
          },
        },
      ],
      offset: (page - 1) * limit,
      limit,
      order: buildOrder(sortBy as SortBy, sortDir as SortDir),
      transaction: opts.transaction,
    });

    return this.paginate(rows, count, page, limit);
  }

  /** Get screenings by date range */
  async getByDateRange(
    startDate: Date,
    endDate: Date,
    optsList: Omit<ListOptions, 'filters'> = {},
    opts: ServiceOptions = {}
  ): Promise<PaginatedResponse<ScreeningDTO>> {
    const { page, limit, sortBy, sortDir } = normalizeListOptions(optsList);
    const where = buildScreeningsByDateRangeWhere(startDate, endDate);

    const { rows, count } = await ScreeningModel.findAndCountAll({
      where,
      offset: (page - 1) * limit,
      limit,
      order: buildOrder(sortBy as SortBy, sortDir as SortDir),
      transaction: opts.transaction,
    });

    return this.paginate(rows, count, page, limit);
  }

  /** Get screenings on a specific date */
  async getByDate(
    date: Date,
    optsList: Omit<ListOptions, 'filters'> = {},
    opts: ServiceOptions = {}
  ): Promise<PaginatedResponse<ScreeningDTO>> {
    const { page, limit, sortBy, sortDir } = normalizeListOptions(optsList);
    const where = buildScreeningsByDateWhere(date);

    const { rows, count } = await ScreeningModel.findAndCountAll({
      where,
      offset: (page - 1) * limit,
      limit,
      order: buildOrder(sortBy as SortBy, sortDir as SortDir),
      transaction: opts.transaction,
    });

    return this.paginate(rows, count, page, limit);
  }

  /** Get upcoming screenings */
  async getUpcoming(
    fromTime: Date = new Date(),
    optsList: Omit<ListOptions, 'filters'> = {},
    opts: ServiceOptions = {}
  ): Promise<PaginatedResponse<ScreeningDTO>> {
    const { page, limit, sortBy, sortDir } = normalizeListOptions(optsList);
    const where = buildUpcomingScreeningsWhere(fromTime);

    const { rows, count } = await ScreeningModel.findAndCountAll({
      where,
      offset: (page - 1) * limit,
      limit,
      order: buildOrder(sortBy as SortBy, sortDir as SortDir),
      transaction: opts.transaction,
    });

    return this.paginate(rows, count, page, limit);
  }

  /** Get past screenings */
  async getPast(
    beforeTime: Date = new Date(),
    optsList: Omit<ListOptions, 'filters'> = {},
    opts: ServiceOptions = {}
  ): Promise<PaginatedResponse<ScreeningDTO>> {
    const { page, limit, sortBy, sortDir } = normalizeListOptions(optsList);
    const where = buildPastScreeningsWhere(beforeTime);

    const { rows, count } = await ScreeningModel.findAndCountAll({
      where,
      offset: (page - 1) * limit,
      limit,
      order: buildOrder(sortBy as SortBy, sortDir as SortDir),
      transaction: opts.transaction,
    });

    return this.paginate(rows, count, page, limit);
  }

  /** Get multiple specific screenings */
  async getMultiple(
    screeningIds: string[],
    optsList: Omit<ListOptions, 'filters'> = {},
    opts: ServiceOptions = {}
  ): Promise<PaginatedResponse<ScreeningDTO>> {
    const { page, limit, sortBy, sortDir } = normalizeListOptions(optsList);
    const where = buildMultipleScreeningsWhere(screeningIds);

    const { rows, count } = await ScreeningModel.findAndCountAll({
      where,
      offset: (page - 1) * limit,
      limit,
      order: buildOrder(sortBy as SortBy, sortDir as SortDir),
      transaction: opts.transaction,
    });

    return this.paginate(rows, count, page, limit);
  }

  /* =========================================================
   * SCHEDULING & AVAILABILITY
   * =======================================================*/

  /** Check for scheduling conflicts in a hall around a given start time */
  async checkSchedulingConflicts(
    theaterId: string,
    hallId: string,
    startTime: Date,
    excludeScreeningId?: string,
    opts: ServiceOptions = {}
  ): Promise<ScreeningConflict[]> {
    const endTime = this.calculateEndTime(startTime, DEFAULT_MOVIE_DURATION);

    // Fetch potentially conflicting screenings in a 6-hour window
    const potentialConflicts = await ScreeningModel.findAll({
      where: {
        theaterId,
        hallId,
        ...(excludeScreeningId
          ? { screeningId: { [Op.ne]: excludeScreeningId } }
          : {}),
        startTime: {
          [Op.between]: [
            new Date(startTime.getTime() - 6 * 60 * 60 * 1000),
            new Date(startTime.getTime() + 6 * 60 * 60 * 1000),
          ],
        },
      },
      transaction: opts.transaction,
    });

    const conflicts: ScreeningConflict[] = [];

    for (const existing of potentialConflicts) {
      const existingEnd = this.calculateEndTime(
        existing.startTime,
        DEFAULT_MOVIE_DURATION
      );

      // Overlap checks
      const overlaps =
        (startTime >= existing.startTime && startTime < existingEnd) ||
        (endTime > existing.startTime && endTime <= existingEnd) ||
        (startTime <= existing.startTime && endTime >= existingEnd);

      if (overlaps) {
        conflicts.push({
          theaterId,
          hallId,
          conflictType: 'overlap',
          existingScreening: {
            screeningId: existing.screeningId,
            startTime: existing.startTime,
            endTime: existingEnd,
          },
          proposedScreening: { startTime, endTime },
        });
        continue; // If overlapping, no need to check gap
      }

      // Minimum gap checks
      const gapBefore =
        Math.abs(startTime.getTime() - existingEnd.getTime()) / (1000 * 60);
      const gapAfter =
        Math.abs(existing.startTime.getTime() - endTime.getTime()) /
        (1000 * 60);

      if (
        (gapBefore < MIN_SCREENING_GAP && gapBefore > 0) ||
        (gapAfter < MIN_SCREENING_GAP && gapAfter > 0)
      ) {
        conflicts.push({
          theaterId,
          hallId,
          conflictType: 'insufficient_gap',
          existingScreening: {
            screeningId: existing.screeningId,
            startTime: existing.startTime,
            endTime: existingEnd,
          },
          proposedScreening: { startTime, endTime },
          minimumGap: MIN_SCREENING_GAP,
        });
      }
    }

    return conflicts;
  }

  /** Fast boolean availability check using conflict detector */
  async isSlotAvailable(
    theaterId: string,
    hallId: string,
    startTime: Date,
    excludeScreeningId?: string,
    opts: ServiceOptions = {}
  ): Promise<boolean> {
    const conflicts = await this.checkSchedulingConflicts(
      theaterId,
      hallId,
      startTime,
      excludeScreeningId,
      opts
    );
    return conflicts.length === 0;
  }

  /** Find available time slots for a hall on a given date */
  async findAvailableSlots(
    theaterId: string,
    hallId: string,
    date: Date,
    duration: number = DEFAULT_MOVIE_DURATION,
    opts: ServiceOptions = {}
  ): Promise<TimeSlot[]> {
    // All screenings that day for the hall, ordered by time
    const existingScreenings = await ScreeningModel.findAll({
      where: {
        ...buildScreeningsByHallWhere(theaterId, hallId),
        ...buildScreeningsByDateWhere(date),
      },
      order: [['startTime', 'asc']],
      transaction: opts.transaction,
    });

    const available: TimeSlot[] = [];

    // Theater opening/closing assumptions (tweak if needed)
    const dayStart = new Date(date);
    dayStart.setHours(8, 0, 0, 0); // 08:00
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 0, 0, 0); // 23:00

    let current = dayStart;

    for (const screening of existingScreenings) {
      const gapMinutes =
        (screening.startTime.getTime() - current.getTime()) / (1000 * 60);

      // If we can fit a slot of `duration` + minimum gap before the next screening
      if (gapMinutes >= duration + MIN_SCREENING_GAP) {
        const slotEnd = new Date(
          screening.startTime.getTime() - MIN_SCREENING_GAP * 60 * 1000
        );
        if (slotEnd.getTime() - current.getTime() >= duration * 60 * 1000) {
          available.push({ startTime: new Date(current), endTime: slotEnd });
        }
      }

      // Move current pointer to end-of-this-screening + gap
      current = this.calculateEndTime(
        screening.startTime,
        DEFAULT_MOVIE_DURATION
      );
      current = new Date(current.getTime() + MIN_SCREENING_GAP * 60 * 1000);
    }

    // Tail slot until closing
    if (current < dayEnd) {
      const remain = (dayEnd.getTime() - current.getTime()) / (1000 * 60);
      if (remain >= duration) {
        available.push({ startTime: new Date(current), endTime: dayEnd });
      }
    }

    return available;
  }

  /* =========================================================
   * ANALYTICS & REPORTING
   * =======================================================*/

  /** Get theater schedule for a specific date */
  async getTheaterSchedule(
    theaterId: string,
    date: Date,
    opts: ServiceOptions = {}
  ): Promise<TheaterSchedule> {
    const screenings = await ScreeningModel.findAll({
      where: {
        ...buildScreeningsByTheaterWhere(theaterId),
        ...buildScreeningsByDateWhere(date),
      },
      order: [['startTime', 'asc']],
      transaction: opts.transaction,
    });

    return {
      theaterId,
      date,
      screenings: screenings.map((s) => ({
        screeningId: s.screeningId,
        movieId: s.movieId,
        hallId: s.hallId,
        startTime: s.startTime,
        endTime: this.calculateEndTime(s.startTime, DEFAULT_MOVIE_DURATION),
        price: s.price,
      })),
    };
  }

  /** Get movie showtimes across all theaters (optional date window) */
  async getMovieShowtimes(
    movieId: string,
    dateFrom?: Date,
    dateTo?: Date,
    opts: ServiceOptions = {}
  ): Promise<MovieShowtimes> {
    const where: any = buildScreeningsByMovieWhere(movieId);

    if (dateFrom || dateTo) {
      where.startTime = {
        ...(dateFrom ? { [Op.gte]: dateFrom } : {}),
        ...(dateTo ? { [Op.lte]: dateTo } : {}),
      };
    }

    const screenings = await ScreeningModel.findAll({
      where,
      order: [['startTime', 'asc']],
      transaction: opts.transaction,
    });

    return {
      movieId,
      screenings: screenings.map((s) => ({
        screeningId: s.screeningId,
        theaterId: s.theaterId,
        hallId: s.hallId,
        startTime: s.startTime,
        price: s.price,
      })),
    };
  }

  /** Aggregate stats (counts, price range, busy hours, etc.) */
  async getStats(opts: ServiceOptions = {}): Promise<{
    total: number;
    upcoming: number;
    past: number;
    byTheater: Array<{ theaterId: string; count: number }>;
    byMovie: Array<{ movieId: string; count: number }>;
    averagePrice: number;
    priceRange: PriceRange;
    busyHours: Array<{ hour: number; count: number }>;
  }> {
    const now = new Date();

    const [
      total,
      upcoming,
      past,
      byTheaterResults,
      byMovieResults,
      priceStats,
      hourlyStats,
    ] = await Promise.all([
      ScreeningModel.count({ transaction: opts.transaction }),
      ScreeningModel.count({
        where: buildUpcomingScreeningsWhere(now),
        transaction: opts.transaction,
      }),
      ScreeningModel.count({
        where: buildPastScreeningsWhere(now),
        transaction: opts.transaction,
      }),
      ScreeningModel.findAll({
        attributes: [
          'theaterId',
          [
            ScreeningModel.sequelize!.fn(
              'COUNT',
              ScreeningModel.sequelize!.col('screeningId')
            ),
            'count',
          ],
        ],
        group: ['theaterId'],
        transaction: opts.transaction,
        raw: true,
      }),
      ScreeningModel.findAll({
        attributes: [
          'movieId',
          [
            ScreeningModel.sequelize!.fn(
              'COUNT',
              ScreeningModel.sequelize!.col('screeningId')
            ),
            'count',
          ],
        ],
        group: ['movieId'],
        transaction: opts.transaction,
        raw: true,
      }),
      ScreeningModel.findAll({
        attributes: [
          [
            ScreeningModel.sequelize!.fn(
              'AVG',
              ScreeningModel.sequelize!.col('price')
            ),
            'avg',
          ],
          [
            ScreeningModel.sequelize!.fn(
              'MIN',
              ScreeningModel.sequelize!.col('price')
            ),
            'min',
          ],
          [
            ScreeningModel.sequelize!.fn(
              'MAX',
              ScreeningModel.sequelize!.col('price')
            ),
            'max',
          ],
        ],
        transaction: opts.transaction,
        raw: true,
      }),
      ScreeningModel.findAll({
        attributes: [
          [
            ScreeningModel.sequelize!.fn(
              'HOUR',
              ScreeningModel.sequelize!.col('startTime')
            ),
            'hour',
          ],
          [
            ScreeningModel.sequelize!.fn(
              'COUNT',
              ScreeningModel.sequelize!.col('screeningId')
            ),
            'count',
          ],
        ],
        group: [
          ScreeningModel.sequelize!.fn(
            'HOUR',
            ScreeningModel.sequelize!.col('startTime')
          ),
        ],
        transaction: opts.transaction,
        raw: true,
      }),
    ]);

    const byTheater = (byTheaterResults as any[]).map((row) => ({
      theaterId: row.theaterId,
      count: Number(row.count),
    }));

    const byMovie = (byMovieResults as any[]).map((row) => ({
      movieId: row.movieId,
      count: Number(row.count),
    }));

    const priceStatsRow = (priceStats as any[])[0] || {};
    const averagePrice = Number(priceStatsRow.avg) || 0;
    const priceRange: PriceRange = {
      min: Number(priceStatsRow.min) || 0,
      max: Number(priceStatsRow.max) || 0,
    };

    const busyHours = (hourlyStats as any[]).map((row) => ({
      hour: Number(row.hour),
      count: Number(row.count),
    }));

    return {
      total,
      upcoming,
      past,
      byTheater,
      byMovie,
      averagePrice,
      priceRange,
      busyHours,
    };
  }

  /** Check if screening exists */
  async exists(
    screeningId: string,
    opts: ServiceOptions = {}
  ): Promise<boolean> {
    const count = await ScreeningModel.count({
      where: buildSpecificScreeningWhere(screeningId),
      transaction: opts.transaction,
    });
    return count > 0;
  }

  /* =========================================================
   * BULK OPERATIONS
   * =======================================================*/

  /**
   * Initialize database with screenings for all theaters and halls
   * - Optionally clears existing month data.
   * - Generates evenly spaced daily shows with basic pricing logic.
   */
  async initializeDatabase(
    options: {
      year?: number;
      month?: number; // 1-12
      screeningsPerDay?: number;
      startHour?: number;
      basePrice?: number;
      clearExisting?: boolean;
    } = {},
    opts: ServiceOptions = {}
  ): Promise<{
    totalScreenings: number;
    theaterResults: Array<{
      theaterId: string;
      hallResults: Array<{
        hallId: string;
        screenings: number;
        success: boolean;
        error?: string;
      }>;
    }>;
  }> {
    const {
      year = new Date().getFullYear(),
      month = new Date().getMonth() + 1,
      screeningsPerDay = 4,
      startHour = 10,
      basePrice = 12.5,
      clearExisting = true,
    } = options;

    // Movie pool
    const availableMovieIds = await this.getDefaultMovieIds(opts);
    if (availableMovieIds.length === 0) {
      throw new ValidationError(
        'No movies found in database. Please add movies first.'
      );
    }

    // Theater + halls
    const theaters = await this.getAllTheatersWithHalls(opts);
    if (theaters.length === 0) {
      throw new ValidationError(
        'No theaters or halls found in database. Please add theaters and halls first.'
      );
    }

    const theaterResults: Array<{
      theaterId: string;
      hallResults: Array<{
        hallId: string;
        screenings: number;
        success: boolean;
        error?: string;
      }>;
    }> = [];

    let totalScreenings = 0;

    // Optionally clear existing screenings in month across all halls
    if (clearExisting) {
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0);
      await ScreeningModel.destroy({
        where: { startTime: { [Op.gte]: monthStart, [Op.lte]: monthEnd } },
        transaction: opts.transaction,
      });
    }

    // Generate per hall
    for (const theater of theaters) {
      const theaterResult = {
        theaterId: theater.theaterId,
        hallResults: [] as Array<{
          hallId: string;
          screenings: number;
          success: boolean;
          error?: string;
        }>,
      };

      for (const hall of theater.halls) {
        try {
          const screenings = await this.generateMonthlySchedule(
            theater.theaterId,
            hall.hallId,
            year,
            month,
            {
              screeningsPerDay,
              startHour,
              movieIds: availableMovieIds,
              basePrice,
              skipConflictCheck: true,
            },
            opts
          );

          theaterResult.hallResults.push({
            hallId: hall.hallId,
            screenings: screenings.length,
            success: true,
          });
          totalScreenings += screenings.length;
        } catch (error) {
          theaterResult.hallResults.push({
            hallId: hall.hallId,
            screenings: 0,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      theaterResults.push(theaterResult);
    }

    return { totalScreenings, theaterResults };
  }

  /**
   * Generate screenings for a month for a specific theater and hall
   * - Clears existing month data for that hall first.
   * - Spreads shows by 3h gaps from a starting hour.
   */
  async generateMonthlySchedule(
    theaterId: string,
    hallId: string,
    year: number,
    month: number, // 1-12
    options: {
      screeningsPerDay?: number;
      startHour?: number;
      movieIds?: string[];
      basePrice?: number;
      skipConflictCheck?: boolean;
    } = {},
    opts: ServiceOptions = {}
  ): Promise<ScreeningDTO[]> {
    const {
      screeningsPerDay = 4,
      startHour = 10,
      movieIds = [],
      basePrice = 12.5,
      skipConflictCheck = true, // in bulk, skip per-item conflict checks
    } = options;

    // Basic guards
    if (month < 1 || month > 12)
      throw new ValidationError('Month must be between 1 and 12');
    if (
      year < new Date().getFullYear() - 1 ||
      year > new Date().getFullYear() + 2
    ) {
      throw new ValidationError('Year must be within reasonable range');
    }

    // Clear existing month for this hall
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);
    await ScreeningModel.destroy({
      where: {
        theaterId,
        hallId,
        startTime: { [Op.gte]: monthStart, [Op.lte]: monthEnd },
      },
      transaction: opts.transaction,
    });

    // Determine movie pool
    let moviePool = movieIds;
    if (moviePool.length === 0) moviePool = await this.getDefaultMovieIds(opts);
    if (moviePool.length === 0)
      throw new ValidationError('No movies available for scheduling');

    const screeningsToCreate: Array<{
      movieId: string;
      theaterId: string;
      hallId: string;
      startTime: Date;
      price: number;
    }> = [];

    const now = new Date();

    // Iterate days of the target month
    for (let day = 1; day <= monthEnd.getDate(); day++) {
      const currentDate = new Date(year, month - 1, day);

      // Skip fully past days (but allow same-month past hours filtering below)
      if (
        currentDate < now &&
        !(
          currentDate.getMonth() === now.getMonth() &&
          currentDate.getFullYear() === now.getFullYear()
        )
      ) {
        continue;
      }

      // Create N shows (default 4) spaced by ~3 hours
      for (let i = 0; i < screeningsPerDay; i++) {
        const hourOffset = i * 3;
        const startTime = new Date(currentDate);
        startTime.setHours(startHour + hourOffset, 0, 0, 0);

        // Guard late shows (>22:00)
        if (startTime.getHours() > 22) continue;

        // Skip if in the past (same-day/hour constraint)
        if (startTime < now) continue;

        // Round-robin movie selection
        const movieId = moviePool[i % moviePool.length];

        // Basic pricing strategy: matinee < base < evening
        let price = basePrice;
        const hour = startTime.getHours();
        if (hour >= 18) price = basePrice * 1.3;
        else if (hour <= 12) price = basePrice * 0.8;
        price = Math.round(price * 100) / 100;

        // Sanity guard for price range
        if (price < 0 || price > 1000) {
          console.warn(
            `Invalid price ${price} for screening at ${startTime.toISOString()}`
          );
          continue;
        }

        screeningsToCreate.push({
          movieId,
          theaterId,
          hallId,
          startTime,
          price,
        });
      }
    }

    // Bulk insert for performance (optionally skipping per-item validation/conflict checks)
    let created: ScreeningModel[] = [];
    try {
      if (skipConflictCheck) {
        created = await ScreeningModel.bulkCreate(screeningsToCreate as any[], {
          transaction: opts.transaction,
          returning: true,
        });
      } else {
        for (const data of screeningsToCreate) {
          try {
            const dto = await this.create(data as any, opts);
            created.push(dto as any);
          } catch (e) {
            console.warn(
              `Failed to create screening for ${data.startTime.toISOString()}:`,
              e
            );
          }
        }
      }
    } catch (error) {
      console.error('Failed to bulk create screenings:', error);
      throw new ValidationError('Failed to create monthly schedule');
    }

    // Map to DTOs
    return created.map((m) => toScreeningDTO(this.pickForDTO(m)));
  }

  /** Clear all screenings for a specific month/hall */
  async clearMonthlySchedule(
    theaterId: string,
    hallId: string,
    year: number,
    month: number,
    opts: ServiceOptions = {}
  ): Promise<number> {
    if (month < 1 || month > 12)
      throw new ValidationError('Month must be between 1 and 12');

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);

    return await ScreeningModel.destroy({
      where: {
        theaterId,
        hallId,
        startTime: { [Op.gte]: monthStart, [Op.lte]: monthEnd },
      },
      transaction: opts.transaction,
    });
  }

  /* =========================================================
   * VALIDATION
   * =======================================================*/

  /** Validate screening constraints (time window, price range) */
  private async validateScreeningTime(
    screening: CreateScreeningDTO,
    _opts: ServiceOptions = {}
  ): Promise<void> {
    const now = new Date();
    const minutesDiff =
      (screening.startTime.getTime() - now.getTime()) / (1000 * 60);

    // Allow up to 30 minutes in the past (for slight delays/updates), else reject
    if (minutesDiff < -30) {
      throw new ValidationError('Screening start time cannot be in the past');
    }

    // Valid hours: 06:00–23:59 and 00:00–01:59 (i.e., invalid if 02:00–05:59)
    // FIXED: previous condition used an impossible &&; correct is hour >= 2 && hour < 6
    const hour = screening.startTime.getHours();
    if (hour >= 2 && hour < 6) {
      throw new ValidationError(
        'Screening start time must be between 6 AM and 2 AM'
      );
    }

    // Price guards
    if (screening.price < 0)
      throw new ValidationError('Screening price cannot be negative');
    if (screening.price > 1000)
      throw new ValidationError('Screening price cannot exceed $1000');
  }

  /* =========================================================
   * HELPERS
   * =======================================================*/

  /** Compute end time from start + duration (minutes) */
  private calculateEndTime(startTime: Date, durationMinutes: number): Date {
    return new Date(startTime.getTime() + durationMinutes * 60 * 1000);
  }

  /** Compute duration in minutes */
  private calculateDuration(startTime: Date, endTime: Date): number {
    return (endTime.getTime() - startTime.getTime()) / (1000 * 60);
  }

  /** Convert raw rows into a paginated DTO response */
  private paginate(
    rows: ScreeningModel[],
    count: number,
    page: number,
    limit: number
  ): PaginatedResponse<ScreeningDTO> {
    const items = rows.map((m) => toScreeningDTO(this.pickForDTO(m)));
    const totalPages = Math.max(
      1,
      Math.ceil(count / Math.max(1, limit || DEFAULT_LIMIT))
    );
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
  private pickForDTO(model: ScreeningModel) {
    const s = model.get() as ScreeningAttributes;
    return {
      screeningId: s.screeningId,
      movieId: s.movieId,
      theaterId: s.theaterId,
      hallId: s.hallId,
      startTime: s.startTime,
      price: s.price,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }

  /** Validate that a hall reference exists and belongs to the theater */
  private async validateHallReference(
    theaterId: string,
    hallId: string,
    opts: ServiceOptions = {}
  ): Promise<void> {
    try {
      const { MovieHallModel } = await import('../models/movie-hall.model.js');
      const hall = await MovieHallModel.findOne({
        where: { theaterId, hallId },
        transaction: opts.transaction,
      });
      if (!hall) {
        throw new ValidationError(
          `Hall ${hallId} does not exist in theater ${theaterId}`
        );
      }
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      throw new ValidationError(
        `Failed to validate hall reference: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /* =========================================================
   * SUPPORTING LOOKUPS (internal)
   * =======================================================*/

  /** Resolve a small pool of movie IDs for schedule generation */
  private async getDefaultMovieIds(
    opts: ServiceOptions = {}
  ): Promise<string[]> {
    try {
      const { MovieModel } = await import('../models/movie.model.js');
      const movies = await MovieModel.findAll({
        attributes: ['movieId'],
        limit: 10,
        transaction: opts.transaction,
        raw: true,
      });
      return movies.map((m: any) => m.movieId);
    } catch (error) {
      console.warn('Could not fetch movies from database, using fallback IDs');
      // Replace with real IDs in non-dev environments
      return [
        'a1b2c3d4-e5f6-4789-a012-b3c4d5e6f789',
        'f8e7d6c5-b4a3-4921-8765-432109876543',
        'b9c8d7e6-f5a4-4321-0987-654321098765',
      ];
    }
  }

  /** Fetch all theaters with their halls */
  private async getAllTheatersWithHalls(
    opts: ServiceOptions = {}
  ): Promise<Array<{ theaterId: string; halls: Array<{ hallId: string }> }>> {
    try {
      const { MovieTheaterModel } = await import(
        '../models/movie-theater.model.js'
      );
      const { MovieHallModel } = await import('../models/movie-hall.model.js');

      const theaters = await MovieTheaterModel.findAll({
        attributes: ['theaterId'],
        transaction: opts.transaction,
        raw: true,
      });

      const result: Array<{
        theaterId: string;
        halls: Array<{ hallId: string }>;
      }> = [];

      for (const theater of theaters) {
        const halls = await MovieHallModel.findAll({
          attributes: ['hallId'],
          where: { theaterId: theater.theaterId },
          transaction: opts.transaction,
          raw: true,
        });

        if (halls.length > 0) {
          result.push({
            theaterId: theater.theaterId,
            halls: halls.map((h: any) => ({ hallId: h.hallId })),
          });
        }
      }

      return result;
    } catch (error) {
      console.error('Failed to fetch theaters and halls:', error);
      return [];
    }
  }
}

/** Singleton instance for app-wide use */
const screeningService = new ScreeningService();
export default screeningService;
