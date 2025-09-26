// src/queries/movie.queries.ts

import {
  Op,
  type WhereOptions,
  type OrderItem,
  col,
  fn,
  where as sqlWhere,
} from 'sequelize';
import type { MovieAttributes } from '../interfaces/movie';

/** Sorting config */
export type SortBy =
  | 'createdAt'
  | 'updatedAt'
  | 'title'
  | 'director'
  | 'genre'
  | 'releaseDate'
  | 'durationMinutes'
  | 'ageRating'
  | 'recommended';

export type SortDir = 'asc' | 'desc';

export const SORTABLE: Record<SortBy, true> = {
  createdAt: true,
  updatedAt: true,
  title: true,
  director: true,
  genre: true,
  releaseDate: true,
  durationMinutes: true,
  ageRating: true,
  recommended: true,
};

export type DateLike = string | Date;

export interface BaseList {
  page?: number; // 1-based
  limit?: number; // default: 20
  sortBy?: SortBy; // default: createdAt
  sortDir?: SortDir; // default: desc
}

export interface MovieFilters {
  movieId?: string;
  title?: string; // partial match, case-insensitive
  director?: string; // partial match, case-insensitive
  genre?: string; // partial match, case-insensitive
  ageRating?: string; // exact match
  recommended?: boolean;

  // Duration filters
  minDuration?: number;
  maxDuration?: number;

  // Date range filters
  releasedFrom?: DateLike;
  releasedTo?: DateLike;
  createdFrom?: DateLike;
  createdTo?: DateLike;
  updatedFrom?: DateLike;
  updatedTo?: DateLike;
}

export interface ListOptions extends BaseList {
  filters?: MovieFilters;
}

export interface SearchParams extends BaseList {
  q?: string; // free-text search across title, director, genre, description
  filters?: MovieFilters;
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
export function lcLike<K extends keyof MovieAttributes>(
  column: K,
  lowerTermWithPercents: string
) {
  return sqlWhere(fn('LOWER', col(String(column))), {
    [Op.like]: lowerTermWithPercents,
  });
}

/** Build a WHERE object from structured filters + optional free-text q (MySQL friendly). */
export function buildMovieWhere(
  filters?: MovieFilters,
  q?: string
): WhereOptions<MovieAttributes> {
  const where: WhereOptions<MovieAttributes> = {};
  const ands: WhereOptions[] = [];

  // Structured filters
  if (filters) {
    if (filters.movieId) (where as any).movieId = filters.movieId;
    if (filters.ageRating) (where as any).ageRating = filters.ageRating;
    if (typeof filters.recommended === 'boolean')
      (where as any).recommended = filters.recommended;

    // Partial string matches (case-insensitive)
    if (filters.title) {
      const term = `%${escapeLike(filters.title.trim().toLowerCase())}%`;
      ands.push(lcLike('title', term));
    }
    if (filters.director) {
      const term = `%${escapeLike(filters.director.trim().toLowerCase())}%`;
      ands.push(lcLike('director', term));
    }
    if (filters.genre) {
      const term = `%${escapeLike(filters.genre.trim().toLowerCase())}%`;
      ands.push(lcLike('genre', term));
    }

    // Duration range
    if (filters.minDuration || filters.maxDuration) {
      (where as any).durationMinutes = {
        ...(filters.minDuration ? { [Op.gte]: filters.minDuration } : {}),
        ...(filters.maxDuration ? { [Op.lte]: filters.maxDuration } : {}),
      };
    }

    // Release date range
    const releasedFrom = toDate(filters.releasedFrom);
    const releasedTo = toDate(filters.releasedTo);
    if (releasedFrom || releasedTo) {
      (where as any).releaseDate = {
        ...(releasedFrom ? { [Op.gte]: releasedFrom } : {}),
        ...(releasedTo ? { [Op.lte]: releasedTo } : {}),
      };
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

  // Free-text search (q): split into tokens, each must match at least one searchable column
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
          lcLike('title', pattern),
          lcLike('director', pattern),
          lcLike('genre', pattern),
          lcLike('description', pattern),
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
    options.sortBy && SORTABLE[options.sortBy] ? options.sortBy : 'createdAt';
  const sortDir: SortDir = options.sortDir === 'asc' ? 'asc' : 'desc';
  return { page, limit, sortBy, sortDir };
}

/** Build Sequelize order tuple(s). */
export function buildOrder(sortBy: SortBy, sortDir: SortDir): OrderItem[] {
  return [[sortBy, sortDir]];
}

/** Helper to build WHERE clause for upcoming movies (future releases) */
export function buildUpcomingMoviesWhere(): WhereOptions<MovieAttributes> {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today

  return {
    releaseDate: { [Op.gt]: today },
  } as WhereOptions<MovieAttributes>;
}

/** Helper to build WHERE clause for movies by theater (via screenings) */
export function buildMoviesByTheaterWhere(
  movieIds: string[]
): WhereOptions<MovieAttributes> {
  if (!movieIds.length) {
    // Return a condition that matches nothing
    return { movieId: { [Op.in]: [] } } as WhereOptions<MovieAttributes>;
  }

  return {
    movieId: { [Op.in]: movieIds },
  } as WhereOptions<MovieAttributes>;
}
