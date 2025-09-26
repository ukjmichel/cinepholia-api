// src/queries/movie-hall.queries.ts

import {
  Op,
  type WhereOptions,
  type OrderItem,
  col,
  fn,
  where as sqlWhere,
} from 'sequelize';
import type {
  MovieHallAttributes,
  HallQuality,
} from '../interfaces/movie-hall';

/** Sorting config */
export type SortBy =
  | 'createdAt'
  | 'updatedAt'
  | 'theaterId'
  | 'hallId'
  | 'quality';

export type SortDir = 'asc' | 'desc';

export const SORTABLE: Record<SortBy, true> = {
  createdAt: true,
  updatedAt: true,
  theaterId: true,
  hallId: true,
  quality: true,
};

export type DateLike = string | Date;

export interface BaseList {
  page?: number; // 1-based
  limit?: number; // default: 20
  sortBy?: SortBy; // default: theaterId, hallId
  sortDir?: SortDir; // default: asc
}

export interface MovieHallFilters {
  theaterId?: string | string[];
  hallId?: string | string[];
  quality?: HallQuality | HallQuality[];

  // Capacity filters (based on seatsLayout analysis)
  minCapacity?: number;
  maxCapacity?: number;

  // Date range filters
  createdFrom?: DateLike;
  createdTo?: DateLike;
  updatedFrom?: DateLike;
  updatedTo?: DateLike;
}

export interface ListOptions extends BaseList {
  filters?: MovieHallFilters;
}

export interface SearchParams extends BaseList {
  q?: string; // free-text search across theater ID, hall ID
  filters?: MovieHallFilters;
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

/** Case-insensitive LIKE for MySQL using LOWER(column) LIKE '%term%' */
export function lcLike<K extends keyof MovieHallAttributes>(
  column: K,
  lowerTermWithPercents: string
) {
  return sqlWhere(fn('LOWER', col(String(column))), {
    [Op.like]: lowerTermWithPercents,
  });
}

/** Calculate total seats from seatsLayout */
function calculateTotalSeats(seatsLayout: (string | number)[][]): number {
  return seatsLayout.reduce((total, row) => total + row.length, 0);
}

/** Build a WHERE object from structured filters + optional free-text q (MySQL friendly). */
export function buildMovieHallWhere(
  filters?: MovieHallFilters,
  q?: string
): WhereOptions<MovieHallAttributes> {
  const where: WhereOptions<MovieHallAttributes> = {};
  const ands: WhereOptions[] = [];

  // Structured filters
  if (filters) {
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

    // Quality filter (single or multiple)
    if (filters.quality) {
      if (Array.isArray(filters.quality)) {
        (where as any).quality = { [Op.in]: filters.quality };
      } else {
        (where as any).quality = filters.quality;
      }
    }

    // Note: Capacity filters would need to be handled in the service layer
    // since they require calculation from the seatsLayout JSON field
    // We can add raw SQL queries if needed for performance

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

  // Free-text search (q): search across theater ID, hall ID
  const qTrim = (q ?? '').trim();
  if (qTrim) {
    const tokens = qTrim
      .split(/\s+/)
      .filter(Boolean)
      .map((t) => escapeLike(t.toLowerCase()));

    for (const tok of tokens) {
      const pattern = `%${tok}%`;
      ands.push({
        [Op.or]: [lcLike('theaterId', pattern), lcLike('hallId', pattern)],
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
    options.sortBy && SORTABLE[options.sortBy] ? options.sortBy : 'theaterId';
  const sortDir: SortDir = options.sortDir === 'asc' ? 'asc' : 'desc';
  return { page, limit, sortBy, sortDir };
}

/** Build Sequelize order tuple(s). */
export function buildOrder(sortBy: SortBy, sortDir: SortDir): OrderItem[] {
  return [[sortBy, sortDir]];
}

/** Helper to build WHERE clause for halls by theater */
export function buildHallsByTheaterWhere(
  theaterId: string
): WhereOptions<MovieHallAttributes> {
  return { theaterId } as WhereOptions<MovieHallAttributes>;
}

/** Helper to build WHERE clause for halls by quality */
export function buildHallsByQualityWhere(
  quality: HallQuality
): WhereOptions<MovieHallAttributes> {
  return { quality } as WhereOptions<MovieHallAttributes>;
}

/** Helper to build WHERE clause for specific hall */
export function buildSpecificHallWhere(
  theaterId: string,
  hallId: string
): WhereOptions<MovieHallAttributes> {
  return { theaterId, hallId } as WhereOptions<MovieHallAttributes>;
}

/** Helper to build WHERE clause for multiple halls */
export function buildMultipleHallsWhere(
  halls: Array<{ theaterId: string; hallId: string }>
): WhereOptions<MovieHallAttributes> {
  const conditions = halls.map((hall) => ({
    [Op.and]: [{ theaterId: hall.theaterId }, { hallId: hall.hallId }],
  }));

  return {
    [Op.or]: conditions,
  } as WhereOptions<MovieHallAttributes>;
}

/** Helper to build WHERE clause for halls with specific qualities */
export function buildHallsByQualitiesWhere(
  qualities: HallQuality[]
): WhereOptions<MovieHallAttributes> {
  return {
    quality: { [Op.in]: qualities },
  } as WhereOptions<MovieHallAttributes>;
}
