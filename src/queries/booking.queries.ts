// src/queries/booking.queries.ts

import {
  Op,
  type WhereOptions,
  type OrderItem,
  col,
  fn,
  where as sqlWhere,
} from 'sequelize';
import type { BookingAttributes } from '../interfaces/booking.js';

/** Sorting config */
export type SortBy =
  | 'createdAt'
  | 'updatedAt'
  | 'bookingDate'
  | 'totalPrice'
  | 'seatsNumber'
  | 'status';

export type SortDir = 'asc' | 'desc';

export const SORTABLE: Record<SortBy, true> = {
  createdAt: true,
  updatedAt: true,
  bookingDate: true,
  totalPrice: true,
  seatsNumber: true,
  status: true,
};

export type DateLike = string | Date;

export interface BaseList {
  page?: number; // 1-based
  limit?: number; // default: 20
  sortBy?: SortBy; // default: createdAt
  sortDir?: SortDir; // default: desc
}

export interface BookingFilters {
  bookingId?: string;
  userId?: string;
  screeningId?: string;
  status?: string; // exact match

  // Price filters
  minPrice?: number;
  maxPrice?: number;

  // Seats filters
  minSeats?: number;
  maxSeats?: number;

  // Date range filters
  bookedFrom?: DateLike;
  bookedTo?: DateLike;
  createdFrom?: DateLike;
  createdTo?: DateLike;
  updatedFrom?: DateLike;
  updatedTo?: DateLike;
}

export interface ListOptions extends BaseList {
  filters?: BookingFilters;
}

export interface SearchParams extends BaseList {
  q?: string; // free-text search across userId, screeningId, status
  filters?: BookingFilters;
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
export function lcLike<K extends keyof BookingAttributes>(
  column: K,
  lowerTermWithPercents: string
) {
  return sqlWhere(fn('LOWER', col(String(column))), {
    [Op.like]: lowerTermWithPercents,
  });
}

/** Build a WHERE object from structured filters + optional free-text q (MySQL friendly). */
export function buildBookingWhere(
  filters?: BookingFilters,
  q?: string
): WhereOptions<BookingAttributes> {
  const where: WhereOptions<BookingAttributes> = {};
  const ands: WhereOptions[] = [];

  // Structured filters
  if (filters) {
    if (filters.bookingId) (where as any).bookingId = filters.bookingId;
    if (filters.userId) (where as any).userId = filters.userId;
    if (filters.screeningId) (where as any).screeningId = filters.screeningId;
    if (filters.status) (where as any).status = filters.status;

    // Price range
    if (filters.minPrice || filters.maxPrice) {
      (where as any).totalPrice = {
        ...(filters.minPrice ? { [Op.gte]: filters.minPrice } : {}),
        ...(filters.maxPrice ? { [Op.lte]: filters.maxPrice } : {}),
      };
    }

    // Seats range
    if (filters.minSeats || filters.maxSeats) {
      (where as any).seatsNumber = {
        ...(filters.minSeats ? { [Op.gte]: filters.minSeats } : {}),
        ...(filters.maxSeats ? { [Op.lte]: filters.maxSeats } : {}),
      };
    }

    // Booking date range
    const bookedFrom = toDate(filters.bookedFrom);
    const bookedTo = toDate(filters.bookedTo);
    if (bookedFrom || bookedTo) {
      (where as any).bookingDate = {
        ...(bookedFrom ? { [Op.gte]: bookedFrom } : {}),
        ...(bookedTo ? { [Op.lte]: bookedTo } : {}),
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
          lcLike('userId', pattern),
          lcLike('screeningId', pattern),
          lcLike('status', pattern),
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

/** Helper to build WHERE clause for upcoming bookings (future screenings) */
export function buildUpcomingBookingsWhere(
  fromDate?: Date
): WhereOptions<BookingAttributes> {
  const startDate = fromDate || new Date();

  // This will need to be used with a join to screenings table
  // The actual implementation would depend on how you structure the join
  return {
    bookingDate: { [Op.gte]: startDate },
  } as WhereOptions<BookingAttributes>;
}

/** Helper to build WHERE clause for bookings by theater (via screenings) */
export function buildBookingsByTheaterWhere(
  theaterScreeningIds: string[]
): WhereOptions<BookingAttributes> {
  if (!theaterScreeningIds.length) {
    // Return a condition that matches nothing
    return { screeningId: { [Op.in]: [] } } as WhereOptions<BookingAttributes>;
  }

  return {
    screeningId: { [Op.in]: theaterScreeningIds },
  } as WhereOptions<BookingAttributes>;
}

/** Helper to build WHERE clause for bookings by status */
export function buildBookingsByStatusWhere(
  status: string
): WhereOptions<BookingAttributes> {
  return {
    status: status,
  } as WhereOptions<BookingAttributes>;
}

/** Helper to build WHERE clause for bookings by user */
export function buildBookingsByUserWhere(
  userId: string
): WhereOptions<BookingAttributes> {
  return {
    userId: userId,
  } as WhereOptions<BookingAttributes>;
}

/** Helper to build WHERE clause for bookings by screening */
export function buildBookingsByScreeningWhere(
  screeningId: string
): WhereOptions<BookingAttributes> {
  return {
    screeningId: screeningId,
  } as WhereOptions<BookingAttributes>;
}
