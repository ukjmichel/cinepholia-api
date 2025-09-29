// src/queries/incident-report.queries.ts

import type { FilterQuery } from 'mongoose';
import type { IncidentReportAttributes } from '../interfaces/incident-report';

/** Sorting config */
export type SortBy =
  | 'createdAt'
  | 'updatedAt'
  | 'status'
  | 'theaterId'
  | 'hallId'
  | 'incidentId';

export type SortDir = 'asc' | 'desc';

export const SORTABLE: Record<SortBy, true> = {
  createdAt: true,
  updatedAt: true,
  status: true,
  theaterId: true,
  hallId: true,
  incidentId: true,
};

export type DateLike = string | Date;

export interface BaseList {
  page?: number; // 1-based
  limit?: number; // default: 20
  sortBy?: SortBy; // default: createdAt
  sortDir?: SortDir; // default: desc
}

export interface IncidentReportFilters {
  incidentId?: string;
  status?: 'open' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed';
  theaterId?: string;
  hallId?: string;
  createdBy?: string;

  // Date range filters
  createdAtFrom?: DateLike;
  createdAtTo?: DateLike;
  updatedAtFrom?: DateLike;
  updatedAtTo?: DateLike;
}

export interface ListOptions extends BaseList {
  filters?: IncidentReportFilters;
}

export interface SearchParams extends BaseList {
  q?: string; // free-text search on description
  filters?: IncidentReportFilters;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/** Parse DateLike safely */
function toDate(d?: DateLike): Date | undefined {
  if (!d) return undefined;
  const dt = d instanceof Date ? d : new Date(d);
  return isNaN(dt.getTime()) ? undefined : dt;
}

/** Build a Mongoose filter object from structured filters + optional free-text q */
export function buildIncidentReportFilter(
  filters?: IncidentReportFilters,
  q?: string
): FilterQuery<IncidentReportAttributes> {
  const mongoFilter: FilterQuery<IncidentReportAttributes> = {};

  // Structured filters
  if (filters) {
    if (filters.incidentId) mongoFilter.incidentId = filters.incidentId;
    if (filters.status) mongoFilter.status = filters.status;
    if (filters.theaterId) mongoFilter.theaterId = filters.theaterId;
    if (filters.hallId) mongoFilter.hallId = filters.hallId;
    if (filters.createdBy) mongoFilter.createdBy = filters.createdBy;

    // Date range filters
    if (filters.createdAtFrom || filters.createdAtTo) {
      mongoFilter.createdAt = {} as any;
      const from = toDate(filters.createdAtFrom);
      const to = toDate(filters.createdAtTo);
      if (from) (mongoFilter.createdAt as any).$gte = from;
      if (to) (mongoFilter.createdAt as any).$lte = to;
    }

    if (filters.updatedAtFrom || filters.updatedAtTo) {
      mongoFilter.updatedAt = {} as any;
      const from = toDate(filters.updatedAtFrom);
      const to = toDate(filters.updatedAtTo);
      if (from) (mongoFilter.updatedAt as any).$gte = from;
      if (to) (mongoFilter.updatedAt as any).$lte = to;
    }
  }

  // Free-text search on description (case-insensitive)
  const qTrim = (q ?? '').trim();
  if (qTrim) {
    mongoFilter.description = { $regex: qTrim, $options: 'i' } as any;
  }

  return mongoFilter;
}

/** Normalize pagination/sort options with sane defaults */
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

/** Build Mongoose sort object */
export function buildSort(
  sortBy: SortBy,
  sortDir: SortDir
): Record<string, 1 | -1> {
  return { [sortBy]: sortDir === 'asc' ? 1 : -1 };
}

/** Helper to build filter for a specific location */
export function buildLocationFilter(
  theaterId: string,
  hallId?: string
): FilterQuery<IncidentReportAttributes> {
  const filter: FilterQuery<IncidentReportAttributes> = { theaterId };
  if (hallId) filter.hallId = hallId;
  return filter;
}
