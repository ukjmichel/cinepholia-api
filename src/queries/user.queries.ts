// src/queries/user.queries.ts
import {
  Op,
  type WhereOptions,
  type OrderItem,
  col,
  fn,
  where as sqlWhere,
} from 'sequelize';
import type { UserAttributes } from '../interfaces/user';

/** Sorting config */
export type SortBy =
  | 'createdAt'
  | 'updatedAt'
  | 'username'
  | 'email'
  | 'firstName'
  | 'lastName'
  | 'verified';

export type SortDir = 'asc' | 'desc';

export const SORTABLE: Record<SortBy, true> = {
  createdAt: true,
  updatedAt: true,
  username: true,
  email: true,
  firstName: true,
  lastName: true,
  verified: true,
};

export type DateLike = string | Date;

export interface BaseList {
  page?: number; // 1-based
  limit?: number; // default: 20
  sortBy?: SortBy; // default: createdAt
  sortDir?: SortDir; // default: desc
}

export interface UserFilters {
  userId?: string;
  verified?: boolean;
  username?: string; // exact, case-insensitive
  email?: string; // exact, case-insensitive
  firstName?: string; // exact, case-insensitive
  lastName?: string; // exact, case-insensitive

  createdFrom?: DateLike;
  createdTo?: DateLike;
  updatedFrom?: DateLike;
  updatedTo?: DateLike;

  // NOTE: role is handled in the service via AuthorizationModel include,
  // so it's intentionally not typed here, but may still be present at runtime.
}

export interface ListOptions extends BaseList {
  filters?: UserFilters;
}

export interface SearchParams extends BaseList {
  q?: string;
  filters?: UserFilters;
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
export function lcLike<K extends keyof UserAttributes>(
  column: K,
  lowerTermWithPercents: string
) {
  return sqlWhere(fn('LOWER', col(String(column))), {
    [Op.like]: lowerTermWithPercents,
  });
}

/** Build a WHERE object from structured filters + optional free-text q (MySQL friendly). */
export function buildUserWhere(
  filters?: UserFilters,
  q?: string
): WhereOptions<UserAttributes> {
  const where: WhereOptions<UserAttributes> = {};
  const ands: WhereOptions[] = [];

  // Structured filters (exact, case-insensitive for strings)
  if (filters) {
    if (filters.userId) (where as any).userId = filters.userId;
    if (typeof filters.verified === 'boolean')
      (where as any).verified = filters.verified;

    if (filters.username) {
      ands.push(
        sqlWhere(
          fn('LOWER', col('username')),
          Op.eq,
          filters.username.trim().toLowerCase()
        )
      );
    }
    if (filters.email) {
      ands.push(
        sqlWhere(
          fn('LOWER', col('email')),
          Op.eq,
          filters.email.trim().toLowerCase()
        )
      );
    }
    if (filters.firstName) {
      ands.push(
        sqlWhere(
          fn('LOWER', col('firstName')),
          Op.eq,
          filters.firstName.trim().toLowerCase()
        )
      );
    }
    if (filters.lastName) {
      ands.push(
        sqlWhere(
          fn('LOWER', col('lastName')),
          Op.eq,
          filters.lastName.trim().toLowerCase()
        )
      );
    }

    const createdFrom = toDate(filters.createdFrom);
    const createdTo = toDate(filters.createdTo);
    if (createdFrom || createdTo) {
      (where as any).createdAt = {
        ...(createdFrom ? { [Op.gte]: createdFrom } : {}),
        ...(createdTo ? { [Op.lte]: createdTo } : {}),
      };
    }

    const updatedFrom = toDate(filters.updatedFrom);
    const updatedTo = toDate(filters.updatedTo);
    if (updatedFrom || updatedTo) {
      (where as any).updatedAt = {
        ...(updatedFrom ? { [Op.gte]: updatedFrom } : {}),
        ...(updatedTo ? { [Op.lte]: updatedTo } : {}),
      };
    }
  }

  // Free-text search (q): split into tokens, each must match at least one column (AND of ORs)
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
          lcLike('username', pattern),
          lcLike('email', pattern),
          lcLike('firstName', pattern),
          lcLike('lastName', pattern),
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
