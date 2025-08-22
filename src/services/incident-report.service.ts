/**
 * @module services/incident-report.service
 *
 * @description
 * Minimal Incident Report service (Mongoose) with **no business logic**:
 * - No SQL lookups, no status-transition rules, no dedupe/upsert tricks.
 * - All single-record operations address documents by the business key `incidentId`
 *   (not MongoDB `_id`).
 * - Search helpers support free-text on `description` and common structured filters.
 *
 * Notes:
 * - `incidentId` immutability and validation are enforced by the schema.
 * - Errors: throws `NotFoundError` when a requested incident cannot be found.
 */

import {
  IncidentReport,
  IncidentReportModel,
} from '../models/incident-report.schema.js';
import { NotFoundError } from '../errors/not-found-error.js';

export type IncidentStatus =
  | 'open'
  | 'acknowledged'
  | 'in_progress'
  | 'resolved'
  | 'closed';

export interface IncidentReportFilter {
  status?: IncidentStatus;
  theaterId?: string;
  hallId?: string;
  createdBy?: string;
  incidentId?: string;
  createdAtFrom?: Date;
  createdAtTo?: Date;
  updatedAtFrom?: Date;
  updatedAtTo?: Date;
}

/**
 * Thin data-access layer around the IncidentReport Mongoose model.
 * This class intentionally avoids domain/business rules.
 */
export class IncidentReportService {
  /**
   * Get a single incident by its business id (`incidentId`).
   * @param incidentId - The business UUID of the incident.
   * @returns The incident report document.
   * @throws {NotFoundError} If no incident exists with the given `incidentId`.
   */
  async getIncident(incidentId: string): Promise<IncidentReport> {
    const doc = await IncidentReportModel.findOne({ incidentId }).lean();
    if (!doc) {
      throw new NotFoundError(
        `Incident with incidentId "${incidentId}" not found`
      );
    }
    return doc;
  }

  /**
   * Create a new incident.
   * - If `incidentId` is omitted, the schema default will generate one.
   * - No deduplication/uniqueness logic is applied here.
   * @param data - The incident payload.
   * @returns The created incident report.
   */
  async createIncident(
    data: Omit<IncidentReport, 'createdAt' | 'updatedAt'>
  ): Promise<IncidentReport> {
    const created = await IncidentReportModel.create(data as any);
    return created.toObject() as IncidentReport;
  }

  /**
   * Update an incident by `incidentId`.
   * - Passes updates as-is; relies on schema to enforce any immutability (e.g., `incidentId`).
   * @param incidentId - The business UUID of the incident to update.
   * @param updateData - Partial fields to update.
   * @returns The updated incident report.
   * @throws {NotFoundError} If the incident does not exist.
   */
  async updateIncident(
    incidentId: string,
    updateData: Partial<IncidentReport>
  ): Promise<IncidentReport> {
    const updated = await IncidentReportModel.findOneAndUpdate(
      { incidentId },
      updateData,
      { new: true }
    ).lean();

    if (!updated) {
      throw new NotFoundError(
        `Incident with incidentId "${incidentId}" not found`
      );
    }
    return updated;
  }

  /**
   * Delete an incident by `incidentId`.
   * @param incidentId - The business UUID of the incident to delete.
   * @throws {NotFoundError} If the incident does not exist.
   */
  async deleteIncident(incidentId: string): Promise<void> {
    const res = await IncidentReportModel.deleteOne({ incidentId });
    if (res.deletedCount === 0) {
      throw new NotFoundError(
        `Incident with incidentId "${incidentId}" not found`
      );
    }
  }

  /**
   * List all incidents, newest first.
   * @returns Array of incident reports.
   */
  async getAllIncidents(): Promise<IncidentReport[]> {
    return IncidentReportModel.find().sort({ createdAt: -1 }).lean();
  }

  /**
   * List incidents by status, newest first.
   * @param status - One of the allowed status values.
   * @returns Array of incident reports.
   */
  async getIncidentsByStatus(
    status: IncidentStatus
  ): Promise<IncidentReport[]> {
    return IncidentReportModel.find({ status }).sort({ createdAt: -1 }).lean();
  }

  /**
   * List incidents by location. If `hallId` is provided, narrows to that hall.
   * @param theaterId - Theater identifier.
   * @param hallId - Optional hall identifier.
   * @returns Array of incident reports.
   */
  async getIncidentsByLocation(
    theaterId: string,
    hallId?: string
  ): Promise<IncidentReport[]> {
    const filter: any = { theaterId };
    if (hallId) filter.hallId = hallId;
    return IncidentReportModel.find(filter).sort({ createdAt: -1 }).lean();
  }

  /**
   * List incidents created by a specific user (UUID), newest first.
   * @param createdBy - Creator's UUID.
   * @returns Array of incident reports.
   */
  async getIncidentsByUser(createdBy: string): Promise<IncidentReport[]> {
    return IncidentReportModel.find({ createdBy })
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * List incidents by `incidentId`. (Useful if you want to inspect potential duplicates.)
   * @param incidentId - The business UUID to match.
   * @returns Array of incident reports.
   */
  async getIncidentsByIncidentId(
    incidentId: string
  ): Promise<IncidentReport[]> {
    return IncidentReportModel.find({ incidentId })
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Search incidents with optional free text and structured filters.
   * - Free text (`q`) applies to `description` (case-insensitive).
   * - Supports date ranges for `createdAt` and `updatedAt`.
   * @param q - Optional free-text query for `description`.
   * @param filters - Optional structured filters.
   * @returns Array of incident reports.
   */
  async searchIncidents(
    q?: string,
    filters?: IncidentReportFilter
  ): Promise<IncidentReport[]> {
    const mongoFilter: any = {};

    if (filters) {
      if (filters.status) mongoFilter.status = filters.status;
      if (filters.theaterId) mongoFilter.theaterId = filters.theaterId;
      if (filters.hallId) mongoFilter.hallId = filters.hallId;
      if (filters.createdBy) mongoFilter.createdBy = filters.createdBy;
      if (filters.incidentId) mongoFilter.incidentId = filters.incidentId;

      if (filters.createdAtFrom || filters.createdAtTo) {
        mongoFilter.createdAt = {};
        if (filters.createdAtFrom)
          mongoFilter.createdAt.$gte = filters.createdAtFrom;
        if (filters.createdAtTo)
          mongoFilter.createdAt.$lte = filters.createdAtTo;
      }
      if (filters.updatedAtFrom || filters.updatedAtTo) {
        mongoFilter.updatedAt = {};
        if (filters.updatedAtFrom)
          mongoFilter.updatedAt.$gte = filters.updatedAtFrom;
        if (filters.updatedAtTo)
          mongoFilter.updatedAt.$lte = filters.updatedAtTo;
      }
    }

    if (q) mongoFilter.description = { $regex: q, $options: 'i' };

    return IncidentReportModel.find(mongoFilter).sort({ createdAt: -1 }).lean();
  }
}

export const incidentReportService = new IncidentReportService();
