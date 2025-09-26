// src/queries/movie-theater.queries.ts

import {
  Op,
  type WhereOptions,
  type OrderItem,
  col,
  fn,
  where as sqlWhere,
} from 'sequelize';
import type { MovieTheaterAttributes } from '../interfaces/movie-theater';

/** Sorting config */
export type SortBy =
  | 'createdAt'
  | 'updatedAt'
  | 'theaterId'
  | 'city'
  | 'postalCode'
  | 'address'
  | 'phone'
  | 'email';

export type SortDir = 'asc' | 'desc';

export const SORTABLE: Record<SortBy, true> = {
  createdAt: true,
  updatedAt: true,
  theaterId: true,
  city: true,
  postalCode: true,
  address: true,
  phone: true,
  email: true,
};

export type DateLike = string | Date;

export interface BaseList {
  page?: number; // 1-based
  limit?: number; // default: 20
  sortBy?: SortBy; // default: city
  sortDir?: SortDir; // default: asc
}

export interface MovieTheaterFilters {
  theaterId?: string | string[];
  city?: string; // partial match, case-insensitive
  postalCode?: string; // exact match
  address?: string; // partial match, case-insensitive
  phone?: string; // partial match
  email?: string; // partial match, case-insensitive

  // Date range filters
  createdFrom?: DateLike;
  createdTo?: DateLike;
  updatedFrom?: DateLike;
  updatedTo?: DateLike;
}

export interface ListOptions extends BaseList {
  filters?: MovieTheaterFilters;
}

export interface SearchParams extends BaseList {
  q?: string; // free-text search across theater ID, city, address, phone, email
  filters?: MovieTheaterFilters;
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
export function lcLike<K extends keyof MovieTheaterAttributes>(
  column: K,
  lowerTermWithPercents: string
) {
  return sqlWhere(fn('LOWER', col(String(column))), {
    [Op.like]: lowerTermWithPercents,
  });
}

/** Build a WHERE object from structured filters + optional free-text q (MySQL friendly). */
export function buildMovieTheaterWhere(
  filters?: MovieTheaterFilters,
  q?: string
): WhereOptions<MovieTheaterAttributes> {
  const where: WhereOptions<MovieTheaterAttributes> = {};
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

    // Exact postal code match
    if (filters.postalCode) (where as any).postalCode = filters.postalCode;

    // Partial string matches (case-insensitive)
    if (filters.city) {
      const term = `%${escapeLike(filters.city.trim().toLowerCase())}%`;
      ands.push(lcLike('city', term));
    }
    if (filters.address) {
      const term = `%${escapeLike(filters.address.trim().toLowerCase())}%`;
      ands.push(lcLike('address', term));
    }
    if (filters.phone) {
      const term = `%${escapeLike(filters.phone.trim().toLowerCase())}%`;
      ands.push(lcLike('phone', term));
    }
    if (filters.email) {
      const term = `%${escapeLike(filters.email.trim().toLowerCase())}%`;
      ands.push(lcLike('email', term));
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

  // Free-text search (q): search across theater ID, city, address, phone, email
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
          lcLike('theaterId', pattern),
          lcLike('city', pattern),
          lcLike('address', pattern),
          lcLike('phone', pattern),
          lcLike('email', pattern),
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
    options.sortBy && SORTABLE[options.sortBy] ? options.sortBy : 'city';
  const sortDir: SortDir = options.sortDir === 'asc' ? 'asc' : 'desc';
  return { page, limit, sortBy, sortDir };
}

/** Build Sequelize order tuple(s). */
export function buildOrder(sortBy: SortBy, sortDir: SortDir): OrderItem[] {
  return [[sortBy, sortDir]];
}

/** Helper to build WHERE clause for theaters by city */
export function buildTheatersByCityWhere(
  city: string
): WhereOptions<MovieTheaterAttributes> {
  const term = `%${escapeLike(city.trim().toLowerCase())}%`;
  return sqlWhere(fn('LOWER', col('city')), {
    [Op.like]: term,
  }) as WhereOptions<MovieTheaterAttributes>;
}

/** Helper to build WHERE clause for theaters by postal code */
export function buildTheatersByPostalCodeWhere(
  postalCode: string
): WhereOptions<MovieTheaterAttributes> {
  return { postalCode } as WhereOptions<MovieTheaterAttributes>;
}

/** Helper to build WHERE clause for theaters by location (city OR postal code) */
export function buildTheatersByLocationWhere(
  location: string
): WhereOptions<MovieTheaterAttributes> {
  const term = `%${escapeLike(location.trim().toLowerCase())}%`;
  return {
    [Op.or]: [
      sqlWhere(fn('LOWER', col('city')), { [Op.like]: term }),
      { postalCode: location.trim() },
    ],
  } as WhereOptions<MovieTheaterAttributes>;
}
