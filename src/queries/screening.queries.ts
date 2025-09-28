// src/queries/screening.queries.ts

import {
  Op,
  type WhereOptions,
  type OrderItem,
  col,
  fn,
  where as sqlWhere,
} from 'sequelize';
import type {
  ScreeningAttributes,
  PriceRange,
  TimeSlot,
  HallReference,
  HallQuality,
} from '../interfaces/screening';

/** Sorting config */
export type SortBy =
  | 'createdAt'
  | 'updatedAt'
  | 'startTime'
  | 'price'
  | 'movieId'
  | 'theaterId'
  | 'hallId'
  | 'screeningId';

export type SortDir = 'asc' | 'desc';

export const SORTABLE: Record<SortBy, true> = {
  createdAt: true,
  updatedAt: true,
  startTime: true,
  price: true,
  movieId: true,
  theaterId: true,
  hallId: true,
  screeningId: true,
};

export type DateLike = string | Date;

export interface BaseList {
  page?: number; // 1-based
  limit?: number; // default: 20
  sortBy?: SortBy; // default: startTime
  sortDir?: SortDir; // default: asc
}

export interface ScreeningFilters {
  // Entity filters
  movieId?: string | string[];
  theaterId?: string | string[];
  hallId?: string | string[];
  screeningId?: string | string[];

  // Hall quality filter (requires join with MovieHallModel)
  quality?: HallQuality | HallQuality[];

  // Price filters
  minPrice?: number;
  maxPrice?: number;
  priceRange?: PriceRange;

  // Time filters
  startTimeFrom?: DateLike;
  startTimeTo?: DateLike;
  timeSlot?: TimeSlot;

  // Date-only filters (for finding screenings on specific dates)
  screeningDate?: DateLike; // find screenings on this specific date
  dateFrom?: DateLike; // find screenings from this date onwards
  dateTo?: DateLike; // find screenings up to this date

  // Time-of-day filters
  timeFrom?: string; // format: "HH:MM" (e.g., "14:30")
  timeTo?: string; // format: "HH:MM" (e.g., "22:00")

  // Combination filters
  hallReferences?: HallReference[]; // specific theater-hall combinations

  // Record management filters
  createdFrom?: DateLike;
  createdTo?: DateLike;
  updatedFrom?: DateLike;
  updatedTo?: DateLike;
}

export interface ListOptions extends BaseList {
  filters?: ScreeningFilters;
}

export interface SearchParams extends BaseList {
  q?: string; // free-text search across screening ID, movie ID, theater ID
  filters?: ScreeningFilters;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/** Escape %, _ and \ for LIKE patterns (MySQL uses \ as default ESCAPE) */
function escapeLike(val: string) {
  return val.replace(/[\\%_]/g, '\\$&');
}

/** Parse DateLike safely */
function toDate(d?: DateLike): Date | undefined {
  if (!d) return undefined;
  const dt = d instanceof Date ? d : new Date(d);
  return isNaN(dt.getTime()) ? undefined : dt;
}

/** Parse time string (HH:MM) to minutes since midnight */
function parseTimeToMinutes(timeStr?: string): number | undefined {
  if (!timeStr) return undefined;
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return undefined;

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return undefined;

  return hours * 60 + minutes;
}

/** Case-insensitive LIKE for MySQL using LOWER(column) LIKE '%term%' */
export function lcLike<K extends keyof ScreeningAttributes>(
  column: K,
  lowerTermWithPercents: string
) {
  return sqlWhere(fn('LOWER', col(String(column))), {
    [Op.like]: lowerTermWithPercents,
  });
}

/** Get start and end of day for a given date */
function getDayBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/** Check if filters require joining with MovieHallModel */
export function requiresHallJoin(filters?: ScreeningFilters): boolean {
  return !!filters?.quality;
}

/** Build WHERE clause for hall quality filtering (used in JOIN) */
export function buildHallQualityWhere(
  quality?: HallQuality | HallQuality[]
): WhereOptions {
  if (!quality) return {};

  if (Array.isArray(quality)) {
    return { quality: { [Op.in]: quality } };
  } else {
    return { quality };
  }
}

/** Build a WHERE object from structured filters + optional free-text q (MySQL friendly). */
export function buildScreeningWhere(
  filters?: ScreeningFilters,
  q?: string
): WhereOptions<ScreeningAttributes> {
  const where: WhereOptions<ScreeningAttributes> = {};
  const ands: WhereOptions[] = [];

  // Structured filters
  if (filters) {
    // Movie ID filter (single or multiple)
    if (filters.movieId) {
      if (Array.isArray(filters.movieId)) {
        (where as any).movieId = { [Op.in]: filters.movieId };
      } else {
        (where as any).movieId = filters.movieId;
      }
    }

    // Theater ID filter (single or multiple)
    if (filters.theaterId) {
      if (Array.isArray(filters.theaterId)) {
        (where as any).theaterId = { [Op.in]: filters.theaterId };
      } else {
        (where as any).theaterId = filters.theaterId;
      }
    }

    // Hall ID filter (single or multiple)
    if (filters.hallId) {
      if (Array.isArray(filters.hallId)) {
        (where as any).hallId = { [Op.in]: filters.hallId };
      } else {
        (where as any).hallId = filters.hallId;
      }
    }

    // Screening ID filter (single or multiple)
    if (filters.screeningId) {
      if (Array.isArray(filters.screeningId)) {
        (where as any).screeningId = { [Op.in]: filters.screeningId };
      } else {
        (where as any).screeningId = filters.screeningId;
      }
    }

    // Price filters
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      (where as any).price = {
        ...(filters.minPrice !== undefined
          ? { [Op.gte]: filters.minPrice }
          : {}),
        ...(filters.maxPrice !== undefined
          ? { [Op.lte]: filters.maxPrice }
          : {}),
      };
    }

    // Price range filter (overrides min/max if provided)
    if (filters.priceRange) {
      (where as any).price = {
        [Op.gte]: filters.priceRange.min,
        [Op.lte]: filters.priceRange.max,
      };
    }

    // Start time range filters
    const startTimeFrom = toDate(filters.startTimeFrom);
    const startTimeTo = toDate(filters.startTimeTo);
    if (startTimeFrom || startTimeTo) {
      (where as any).startTime = {
        ...(startTimeFrom ? { [Op.gte]: startTimeFrom } : {}),
        ...(startTimeTo ? { [Op.lte]: startTimeTo } : {}),
      };
    }

    // Time slot filter (overrides startTimeFrom/To if provided)
    if (filters.timeSlot) {
      (where as any).startTime = {
        [Op.gte]: filters.timeSlot.startTime,
        [Op.lte]: filters.timeSlot.endTime,
      };
    }

    // Specific screening date (all screenings on this date)
    if (filters.screeningDate) {
      const date = toDate(filters.screeningDate);
      if (date) {
        const { start, end } = getDayBounds(date);
        (where as any).startTime = {
          [Op.gte]: start,
          [Op.lte]: end,
        };
      }
    }

    // Date range filters (date-only, ignoring time)
    if (!filters.screeningDate && (filters.dateFrom || filters.dateTo)) {
      const dateFrom = toDate(filters.dateFrom);
      const dateTo = toDate(filters.dateTo);

      const startTime: any = {};
      if (dateFrom) {
        const { start } = getDayBounds(dateFrom);
        startTime[Op.gte] = start;
      }
      if (dateTo) {
        const { end } = getDayBounds(dateTo);
        startTime[Op.lte] = end;
      }

      if (Object.keys(startTime).length > 0) {
        (where as any).startTime = startTime;
      }
    }

    // Time-of-day filters (using SQL time functions)
    if (filters.timeFrom || filters.timeTo) {
      const timeFromMinutes = parseTimeToMinutes(filters.timeFrom);
      const timeToMinutes = parseTimeToMinutes(filters.timeTo);

      if (timeFromMinutes !== undefined || timeToMinutes !== undefined) {
        const timeConditions: any[] = [];

        if (timeFromMinutes !== undefined) {
          // TIME(startTime) >= 'HH:MM:SS'
          const timeStr = `${Math.floor(timeFromMinutes / 60)
            .toString()
            .padStart(
              2,
              '0'
            )}:${(timeFromMinutes % 60).toString().padStart(2, '0')}:00`;
          timeConditions.push(
            sqlWhere(fn('TIME', col('startTime')), { [Op.gte]: timeStr })
          );
        }

        if (timeToMinutes !== undefined) {
          // TIME(startTime) <= 'HH:MM:SS'
          const timeStr = `${Math.floor(timeToMinutes / 60)
            .toString()
            .padStart(
              2,
              '0'
            )}:${(timeToMinutes % 60).toString().padStart(2, '0')}:59`;
          timeConditions.push(
            sqlWhere(fn('TIME', col('startTime')), { [Op.lte]: timeStr })
          );
        }

        ands.push(...timeConditions);
      }
    }

    // Hall references filter (specific theater-hall combinations)
    if (filters.hallReferences && filters.hallReferences.length > 0) {
      const hallConditions = filters.hallReferences.map((ref) => ({
        [Op.and]: [{ theaterId: ref.theaterId }, { hallId: ref.hallId }],
      }));

      ands.push({ [Op.or]: hallConditions });
    }

    // Created date range
    const createdFrom = toDate(filters.createdFrom);
    const createdTo = toDate(filters.createdTo);
    if (createdFrom || createdTo) {
      (where as any).createdAt = {
        ...(createdFrom ? { [Op.gte]: createdFrom } : {}),
        ...(createdTo ? { [Op.lte]: createdTo } : {}),
      };
    }

    // Updated date range
    const updatedFrom = toDate(filters.updatedFrom);
    const updatedTo = toDate(filters.updatedTo);
    if (updatedFrom || updatedTo) {
      (where as any).updatedAt = {
        ...(updatedFrom ? { [Op.gte]: updatedFrom } : {}),
        ...(updatedTo ? { [Op.lte]: updatedTo } : {}),
      };
    }
  }

  // Free-text search (q): search across screening ID, movie ID, theater ID
  const qTrim = (q ?? '').trim();
  if (qTrim) {
    const tokens = qTrim
      .split(/\s+/)
      .filter(Boolean)
      .map((t) => escapeLike(t.toLowerCase()));

    for (const tok of tokens) {
      const pattern = `%${tok}%`;
      ands.push({
        [Op.or]: [
          lcLike('screeningId', pattern),
          lcLike('movieId', pattern),
          lcLike('theaterId', pattern),
        ],
      });
    }
  }

  if (ands.length) {
    (where as any)[Op.and] = ands;
  }

  return where;
}

/** Normalize pagination/sort options with sane defaults. */
export function normalizeListOptions(options: BaseList = {}) {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, options.limit ?? DEFAULT_LIMIT)
  );
  const sortBy: SortBy =
    options.sortBy && SORTABLE[options.sortBy] ? options.sortBy : 'startTime';
  const sortDir: SortDir = options.sortDir === 'asc' ? 'asc' : 'desc';
  return { page, limit, sortBy, sortDir };
}

/** Build Sequelize order tuple(s). */
export function buildOrder(sortBy: SortBy, sortDir: SortDir): OrderItem[] {
  return [[sortBy, sortDir]];
}

/** Helper to build WHERE clause for screenings by movie */
export function buildScreeningsByMovieWhere(
  movieId: string
): WhereOptions<ScreeningAttributes> {
  return { movieId } as WhereOptions<ScreeningAttributes>;
}

/** Helper to build WHERE clause for screenings by theater */
export function buildScreeningsByTheaterWhere(
  theaterId: string
): WhereOptions<ScreeningAttributes> {
  return { theaterId } as WhereOptions<ScreeningAttributes>;
}

/** Helper to build WHERE clause for screenings by hall */
export function buildScreeningsByHallWhere(
  theaterId: string,
  hallId: string
): WhereOptions<ScreeningAttributes> {
  return {
    theaterId,
    hallId,
  } as WhereOptions<ScreeningAttributes>;
}

/** Helper to build WHERE clause for specific screening */
export function buildSpecificScreeningWhere(
  screeningId: string
): WhereOptions<ScreeningAttributes> {
  return { screeningId } as WhereOptions<ScreeningAttributes>;
}

/** Helper to build WHERE clause for multiple screenings */
export function buildMultipleScreeningsWhere(
  screeningIds: string[]
): WhereOptions<ScreeningAttributes> {
  return {
    screeningId: { [Op.in]: screeningIds },
  } as WhereOptions<ScreeningAttributes>;
}

/** Helper to build WHERE clause for screenings by date range */
export function buildScreeningsByDateRangeWhere(
  startDate: Date,
  endDate: Date
): WhereOptions<ScreeningAttributes> {
  return {
    startTime: {
      [Op.gte]: startDate,
      [Op.lte]: endDate,
    },
  } as WhereOptions<ScreeningAttributes>;
}

/** Helper to build WHERE clause for screenings by price range */
export function buildScreeningsByPriceRangeWhere(
  minPrice: number,
  maxPrice: number
): WhereOptions<ScreeningAttributes> {
  return {
    price: {
      [Op.gte]: minPrice,
      [Op.lte]: maxPrice,
    },
  } as WhereOptions<ScreeningAttributes>;
}

/** Helper to build WHERE clause for screenings on a specific date */
export function buildScreeningsByDateWhere(
  date: Date
): WhereOptions<ScreeningAttributes> {
  const { start, end } = getDayBounds(date);
  return {
    startTime: {
      [Op.gte]: start,
      [Op.lte]: end,
    },
  } as WhereOptions<ScreeningAttributes>;
}

/** Helper to build WHERE clause for upcoming screenings */
export function buildUpcomingScreeningsWhere(
  fromTime: Date = new Date()
): WhereOptions<ScreeningAttributes> {
  return {
    startTime: {
      [Op.gte]: fromTime,
    },
  } as WhereOptions<ScreeningAttributes>;
}

/** Helper to build WHERE clause for past screenings */
export function buildPastScreeningsWhere(
  beforeTime: Date = new Date()
): WhereOptions<ScreeningAttributes> {
  return {
    startTime: {
      [Op.lt]: beforeTime,
    },
  } as WhereOptions<ScreeningAttributes>;
}

/** Helper to build WHERE clause for screenings by hall quality */
export function buildScreeningsByQualityWhere(
  quality: HallQuality
): WhereOptions<ScreeningAttributes> {
  // This will be used with include/join in the service layer
  return {} as WhereOptions<ScreeningAttributes>;
}

/** Helper to build WHERE clause for screenings by multiple hall qualities */
export function buildScreeningsByQualitiesWhere(
  qualities: HallQuality[]
): WhereOptions<ScreeningAttributes> {
  // This will be used with include/join in the service layer
  return {} as WhereOptions<ScreeningAttributes>;
}

/**
 * Helper to build WHERE clause for conflicting screenings in the same hall
 * Fixed: Improved conflict detection logic
 */
export function buildConflictingScreeningsWhere(
  theaterId: string,
  hallId: string,
  startTime: Date,
  endTime: Date,
  excludeScreeningId?: string
): WhereOptions<ScreeningAttributes> {
  const where: any = {
    theaterId,
    hallId,
    // Find screenings that overlap with our time window
    // A screening conflicts if:
    // 1. It starts before our screening ends AND
    // 2. Our screening starts before it would end (assuming 2-hour duration)
    [Op.and]: [
      {
        startTime: {
          [Op.lt]: endTime, // existing screening starts before our screening ends
        },
      },
      {
        // Our screening starts before the existing screening would end
        // Since we don't store endTime, we assume 2-hour (120 minutes) duration
        [Op.or]: [
          {
            startTime: {
              [Op.gte]: new Date(startTime.getTime() - 120 * 60 * 1000), // within 2 hours before our start
            },
          },
        ],
      },
    ],
  };

  if (excludeScreeningId) {
    where.screeningId = { [Op.ne]: excludeScreeningId };
  }

  return where as WhereOptions<ScreeningAttributes>;
}
