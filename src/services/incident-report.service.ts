/**
 * @module services/incident-report.service
 *
 * @description
 * High-level operations for managing incident reports (Mongoose).
 * Returns safe DTOs instead of raw Mongoose documents.
 * Provides CRUD operations, filtered searches, and pagination.
 * Validates theater and hall existence before creating/updating incidents.
 */

import {
  IncidentReportModel,
  type IncidentReport,
} from '../models/incident-report.schema.js';
import { NotFoundError } from '../errors/not-found-error.js';
import { BadRequestError } from '../errors/bad-request-error.js';
import type {
  CreateIncidentReportDTO,
  UpdateIncidentReportDTO,
  IncidentReportDTO,
  IncidentStatus,
  PaginatedResponse,
} from '../interfaces/incident-report.js';
import { toIncidentReportDTO } from '../interfaces/incident-report.js';
import {
  buildIncidentReportFilter,
  buildSort,
  buildLocationFilter,
  normalizeListOptions,
  type ListOptions,
  type SearchParams,
} from '../queries/incident-report.queries.js';
import movieTheaterService from './movie-theater.service.js';
import movieHallService from './movie-hall.service.js';

const DEFAULT_LIMIT = 20;

export class IncidentReportService {
  /* =============== CRUD =============== */

  /**
   * Create a new incident report and return a safe DTO.
   * If `incidentId` is omitted, the schema will auto-generate one.
   * Validates that the theater and hall exist before creating the incident.
   */
  async create(payload: CreateIncidentReportDTO): Promise<IncidentReportDTO> {
    // Validate theater exists
    const theater = await movieTheaterService.get(payload.theaterId);
    if (!theater) {
      throw new BadRequestError(
        `Theater with ID "${payload.theaterId}" does not exist`
      );
    }

    // Validate hall exists in the specified theater
    const hall = await movieHallService.get(payload.theaterId, payload.hallId);
    if (!hall) {
      throw new BadRequestError(
        `Hall "${payload.hallId}" does not exist in theater "${payload.theaterId}"`
      );
    }

    const created = await IncidentReportModel.create(payload as any);
    return toIncidentReportDTO(this.pickForDTO(created.toObject()));
  }

  /**
   * Retrieve an incident by its business id (`incidentId`).
   * @returns The incident DTO or null if not found.
   */
  async get(incidentId: string): Promise<IncidentReportDTO | null> {
    const doc = await IncidentReportModel.findOne({ incidentId }).lean();
    return doc ? toIncidentReportDTO(this.pickForDTO(doc)) : null;
  }

  /**
   * Get an incident by ID (throws if not found).
   */
  async getById(incidentId: string): Promise<IncidentReportDTO> {
    const incident = await this.get(incidentId);
    if (!incident) {
      throw new NotFoundError(
        `Incident with incidentId "${incidentId}" not found`
      );
    }
    return incident;
  }

  /**
   * Update an incident by `incidentId`.
   * Validates theater and hall existence if those fields are being updated.
   * @returns The updated incident DTO or null if not found.
   */
  async update(
    incidentId: string,
    dto: UpdateIncidentReportDTO
  ): Promise<IncidentReportDTO | null> {
    // Get existing incident first
    const existingIncident = await IncidentReportModel.findOne({
      incidentId,
    }).lean();

    if (!existingIncident) {
      return null;
    }

    // Determine final theater and hall IDs after update
    const finalTheaterId = dto.theaterId ?? existingIncident.theaterId;
    const finalHallId = dto.hallId ?? existingIncident.hallId;

    // If theater is being changed, validate it exists
    if (dto.theaterId && dto.theaterId !== existingIncident.theaterId) {
      const theater = await movieTheaterService.get(dto.theaterId);
      if (!theater) {
        throw new BadRequestError(
          `Theater with ID "${dto.theaterId}" does not exist`
        );
      }
    }

    // If theater or hall is being changed, validate the hall exists in the (new) theater
    if (
      dto.theaterId !== undefined ||
      (dto.hallId && dto.hallId !== existingIncident.hallId)
    ) {
      const hall = await movieHallService.get(finalTheaterId, finalHallId);
      if (!hall) {
        throw new BadRequestError(
          `Hall "${finalHallId}" does not exist in theater "${finalTheaterId}"`
        );
      }
    }

    const updated = await IncidentReportModel.findOneAndUpdate(
      { incidentId },
      dto,
      { new: true }
    ).lean();

    return updated ? toIncidentReportDTO(this.pickForDTO(updated)) : null;
  }

  /**
   * Permanently remove an incident by `incidentId`.
   * @returns true if deleted, false if not found.
   */
  async remove(incidentId: string): Promise<boolean> {
    const res = await IncidentReportModel.deleteOne({ incidentId });
    return res.deletedCount > 0;
  }

  /* =============== LIST / SEARCH =============== */

  /**
   * List incidents with pagination, optional sorting, and filters.
   */
  async list(
    optsList: ListOptions = {}
  ): Promise<PaginatedResponse<IncidentReportDTO>> {
    const { page, limit, sortBy, sortDir } = normalizeListOptions(optsList);
    const filter = buildIncidentReportFilter(optsList.filters);
    const sort = buildSort(sortBy, sortDir);

    const [items, total] = await Promise.all([
      IncidentReportModel.find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      IncidentReportModel.countDocuments(filter),
    ]);

    return this.paginate(items, total, page, limit);
  }

  /**
   * Search by free-text query (q) plus structured filters.
   */
  async search(
    params: SearchParams
  ): Promise<PaginatedResponse<IncidentReportDTO>> {
    const { page, limit, sortBy, sortDir } = normalizeListOptions(params);
    const filter = buildIncidentReportFilter(params.filters, params.q);
    const sort = buildSort(sortBy, sortDir);

    const [items, total] = await Promise.all([
      IncidentReportModel.find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      IncidentReportModel.countDocuments(filter),
    ]);

    return this.paginate(items, total, page, limit);
  }

  /* =============== SPECIALIZED QUERIES =============== */

  /**
   * List incidents by status, newest first.
   */
  async getByStatus(
    status: IncidentStatus,
    optsList: Omit<ListOptions, 'filters'> = {}
  ): Promise<PaginatedResponse<IncidentReportDTO>> {
    return this.list({
      ...optsList,
      filters: { status },
    });
  }

  /**
   * List incidents by location (theater + optional hall).
   */
  async getByLocation(
    theaterId: string,
    hallId?: string,
    optsList: Omit<ListOptions, 'filters'> = {}
  ): Promise<PaginatedResponse<IncidentReportDTO>> {
    const { page, limit, sortBy, sortDir } = normalizeListOptions(optsList);
    const filter = buildLocationFilter(theaterId, hallId);
    const sort = buildSort(sortBy, sortDir);

    const [items, total] = await Promise.all([
      IncidentReportModel.find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      IncidentReportModel.countDocuments(filter),
    ]);

    return this.paginate(items, total, page, limit);
  }

  /**
   * List incidents created by a specific user (UUID).
   */
  async getByUser(
    createdBy: string,
    optsList: Omit<ListOptions, 'filters'> = {}
  ): Promise<PaginatedResponse<IncidentReportDTO>> {
    return this.list({
      ...optsList,
      filters: { createdBy },
    });
  }

  /**
   * List all incidents matching a specific incidentId.
   * Useful for inspecting potential duplicates.
   */
  async getByIncidentId(
    incidentId: string,
    optsList: Omit<ListOptions, 'filters'> = {}
  ): Promise<PaginatedResponse<IncidentReportDTO>> {
    return this.list({
      ...optsList,
      filters: { incidentId },
    });
  }

  /* =============== Helpers =============== */

  /** Convert raw documents into a paginated DTO response */
  private paginate(
    docs: IncidentReport[],
    total: number,
    page: number,
    limit: number
  ): PaginatedResponse<IncidentReportDTO> {
    const items = docs.map((doc) => toIncidentReportDTO(this.pickForDTO(doc)));
    const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit)));

    return {
      items,
      page,
      limit,
      total,
      totalItems: total,
      totalPages,
    };
  }

  /** Pick only safe fields for DTO mapping */
  private pickForDTO(doc: IncidentReport) {
    return {
      incidentId: doc.incidentId,
      theaterId: doc.theaterId,
      hallId: doc.hallId,
      description: doc.description,
      status: doc.status,
      createdBy: doc.createdBy,
      createdAt: doc.createdAt!,
      updatedAt: doc.updatedAt!,
    };
  }
}

/** Singleton instance for app-wide use */
export const incidentReportService = new IncidentReportService();
