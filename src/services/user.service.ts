/**
 * @module services/user.service
 *
 * High-level operations for managing users.
 * Returns safe DTOs (no password) instead of raw Sequelize instances.
 */

import { UserModel } from '../models/user.model.js';
import { AuthorizationModel, Role } from '../models/authorization.model.js';
import type {
  CreateUserDTO,
  UpdateUserDTO,
  UserDTO,
  UserAttributes,
  PaginatedResponse,
} from '../interfaces/user.js';
import { toUserDTO } from '../interfaces/user.js';
import type { ListOptions, SearchParams } from '../queries/user.queries.js';
import {
  buildOrder,
  buildUserWhere,
  normalizeListOptions,
} from '../queries/user.queries.js';
import type { Transaction, Includeable } from 'sequelize';

const DEFAULT_LIMIT = 20;

type ServiceOptions = {
  transaction?: Transaction;
};

// helper to safely read role from filters without changing external types
function extractRoleFilter(filters?: unknown): Role | undefined {
  return (filters as any)?.role as Role | undefined;
}

export class UserService {
  /* =============== CRUD =============== */

  /** Create a new user and return a safe DTO */
  async create(
    payload: CreateUserDTO,
    opts: ServiceOptions = {}
  ): Promise<UserDTO> {
    const user = await UserModel.create(payload as any, {
      transaction: opts.transaction,
    });
    return toUserDTO(this.pickForDTO(user));
  }

  /** Retrieve a user by id (DTO or null) */
  async get(
    userId: string,
    opts: ServiceOptions = {}
  ): Promise<UserDTO | null> {
    const user = await UserModel.findByPk(userId, {
      transaction: opts.transaction,
    });
    return user ? toUserDTO(this.pickForDTO(user)) : null;
  }

  /** Update selected fields of a user and return DTO (or null if not found) */
  async update(
    userId: string,
    dto: UpdateUserDTO,
    opts: ServiceOptions = {}
  ): Promise<UserDTO | null> {
    const user = await UserModel.findByPk(userId, {
      transaction: opts.transaction,
    });
    if (!user) return null;

    const updatable: UpdateUserDTO = {} as UpdateUserDTO;
    for (const key of Object.keys(dto) as (keyof UpdateUserDTO)[]) {
      if (dto[key] !== undefined) (updatable as any)[key] = dto[key];
    }

    user.set(updatable as any);
    await user.save({ transaction: opts.transaction }); // triggers hooks (normalize + hash)
    return toUserDTO(this.pickForDTO(user));
  }

  /** Permanently remove a user (true if deleted) */
  async remove(userId: string, opts: ServiceOptions = {}): Promise<boolean> {
    const deleted = await UserModel.destroy({
      where: { userId },
      transaction: opts.transaction,
    });
    return deleted > 0;
  }

  /* =============== LIST / SEARCH =============== */

  /**
   * List users with pagination, optional sorting, and filters.
   * Supports filtering by authorization role via `optsList.filters.role`.
   */
  async list(
    optsList: ListOptions = {},
    opts: ServiceOptions = {}
  ): Promise<PaginatedResponse<UserDTO>> {
    const { page, limit, sortBy, sortDir } = normalizeListOptions(optsList);
    const where = buildUserWhere(optsList.filters);
    const role = extractRoleFilter(optsList.filters);

    const include: Includeable[] | undefined = role
      ? [
          {
            model: AuthorizationModel,
            attributes: [], // we only need the join; omit columns
            where: { role },
            required: true, // inner join to enforce filter
          } as any,
        ]
      : undefined;

    const { rows, count } = await UserModel.findAndCountAll({
      where,
      include,
      offset: (page - 1) * limit,
      limit,
      order: buildOrder(sortBy, sortDir),
      transaction: opts.transaction,
      distinct: true, // important when using include to get correct count
    });

    return this.paginate(rows, count, page, limit);
  }

  /**
   * Search by free-text query (q) plus structured filters.
   * Supports filtering by authorization role via `params.filters.role`.
   */
  async search(
    params: SearchParams,
    opts: ServiceOptions = {}
  ): Promise<PaginatedResponse<UserDTO>> {
    const { page, limit, sortBy, sortDir } = normalizeListOptions(params);
    const where = buildUserWhere(params.filters, params.q);
    const role = extractRoleFilter(params.filters);

    const include: Includeable[] | undefined = role
      ? [
          {
            model: AuthorizationModel,
            attributes: [],
            where: { role },
            required: true,
          } as any,
        ]
      : undefined;

    const { rows, count } = await UserModel.findAndCountAll({
      where,
      include,
      offset: (page - 1) * limit,
      limit,
      order: buildOrder(sortBy, sortDir),
      transaction: opts.transaction,
      distinct: true,
    });

    return this.paginate(rows, count, page, limit);
  }

  /* =============== Helpers =============== */

  /** Convert raw rows into a paginated DTO response */
  private paginate(
    rows: UserModel[],
    count: number,
    page: number,
    limit: number
  ): PaginatedResponse<UserDTO> {
    const items = rows.map((u) => toUserDTO(this.pickForDTO(u)));
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

  /** Pick only safe fields for DTO mapping (exclude password) */
  private pickForDTO(model: UserModel) {
    const u = model.get() as UserAttributes;
    return {
      userId: u.userId,
      username: u.username,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      verified: u.verified,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    };
  }
}

/** Singleton instance for app-wide use */
const userService = new UserService();
export default userService;
