/**
 * @module controllers/incident-report.controller
 *
 * Express controller for managing incident reports with comprehensive filtering.
 */

import { Request, Response, NextFunction } from 'express';
import { incidentReportService } from '../services/incident-report.service.js';
import type {
  CreateIncidentReportDTO,
  UpdateIncidentReportDTO,
  IncidentStatus,
} from '../interfaces/incident-report.js';
import { NotFoundError } from '../errors/not-found-error.js';

export class IncidentReportController {
  /** Create a new incident report */
  createIncident = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const incidentData: CreateIncidentReportDTO = {
        incidentId: req.body.incidentId, // Optional - will be auto-generated if not provided
        theaterId: req.body.theaterId,
        hallId: req.body.hallId,
        description: req.body.description,
        status: req.body.status || 'open',
        createdBy: req.body.createdBy,
      };

      const incident = await incidentReportService.create(incidentData);

      res.status(201).json({
        message: 'Incident report created successfully',
        data: { incident },
      });
    } catch (error) {
      next(error);
    }
  };

  /** List incidents with pagination and filters */
  listIncidents = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const page = req.query.page
        ? parseInt(req.query.page as string, 10)
        : undefined;
      const pageSize = req.query.pageSize
        ? parseInt(req.query.pageSize as string, 10)
        : undefined;

      const filters: Record<string, any> = {
        incidentId: req.query.incidentId as string | undefined,
        status: req.query.status as IncidentStatus | undefined,
        theaterId: req.query.theaterId as string | undefined,
        hallId: req.query.hallId as string | undefined,
        createdBy: req.query.createdBy as string | undefined,
        createdAtFrom: req.query.createdAtFrom as string | undefined,
        createdAtTo: req.query.createdAtTo as string | undefined,
        updatedAtFrom: req.query.updatedAtFrom as string | undefined,
        updatedAtTo: req.query.updatedAtTo as string | undefined,
      };

      const result = await incidentReportService.list({
        page,
        limit: pageSize,
        filters,
        sortBy: req.query.sortBy as any,
        sortDir: req.query.sortDir as any,
      });

      res.status(200).json({
        message: 'Incidents found successfully',
        data: {
          incidents: result.items,
          total: result.totalItems,
          page: result.page,
          pageSize: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  /** Search incidents with free-text query plus filters */
  searchIncidents = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Normalize pagination
      const pageRaw = Number(req.query.page ?? 1);
      const pageSizeRaw = Number(req.query.pageSize ?? 20);

      const pageSize =
        Number.isFinite(pageSizeRaw) && pageSizeRaw > 0
          ? Math.min(pageSizeRaw, 100)
          : 20;

      let page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

      // Build filters from query
      const {
        q,
        incidentId,
        status,
        theaterId,
        hallId,
        createdBy,
        createdAtFrom,
        createdAtTo,
        updatedAtFrom,
        updatedAtTo,
      } = req.query as Record<string, string | undefined>;

      const filters: Record<string, unknown> = {};
      if (incidentId) filters.incidentId = incidentId.trim();
      if (status) filters.status = status as IncidentStatus;
      if (theaterId) filters.theaterId = theaterId.trim();
      if (hallId) filters.hallId = hallId.trim();
      if (createdBy) filters.createdBy = createdBy.trim();
      if (createdAtFrom) filters.createdAtFrom = createdAtFrom;
      if (createdAtTo) filters.createdAtTo = createdAtTo;
      if (updatedAtFrom) filters.updatedAtFrom = updatedAtFrom;
      if (updatedAtTo) filters.updatedAtTo = updatedAtTo;

      // 1st fetch
      let result = await incidentReportService.search({
        page,
        limit: pageSize,
        q: q?.trim() || undefined,
        filters,
        sortBy: req.query.sortBy as any,
        sortDir: req.query.sortDir as any,
      });

      const total = result.total ?? 0;
      let totalPages = Math.max(1, Math.ceil(total / pageSize));

      // If we asked for a page beyond the last and there are items, refetch last valid page
      if (total > 0 && page > totalPages) {
        page = totalPages;
        result = await incidentReportService.search({
          page,
          limit: pageSize,
          q: q?.trim() || undefined,
          filters,
          sortBy: req.query.sortBy as any,
          sortDir: req.query.sortDir as any,
        });
      }

      res.status(200).json({
        message: 'Incidents found successfully',
        data: {
          incidents: result.items ?? [],
          total,
          page,
          pageSize,
          totalPages,
          query: q?.trim(),
        },
      });
    } catch (err) {
      next(err);
    }
  };

  /** Get incident by incidentId */
  getIncidentById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const incident = await incidentReportService.get(req.params.incidentId);
      if (!incident) throw new NotFoundError('Incident not found');

      res.status(200).json({
        message: 'Incident found successfully',
        data: { incident },
      });
    } catch (err) {
      next(err);
    }
  };

  /** Update incident */
  updateIncident = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const updates: Partial<UpdateIncidentReportDTO> = {};

      // Only include provided fields (incidentId cannot be updated - it's immutable)
      if (req.body.theaterId !== undefined)
        updates.theaterId = req.body.theaterId;
      if (req.body.hallId !== undefined) updates.hallId = req.body.hallId;
      if (req.body.description !== undefined)
        updates.description = req.body.description;
      if (req.body.status !== undefined) updates.status = req.body.status;

      const incident = await incidentReportService.update(
        req.params.incidentId,
        updates
      );

      if (!incident) throw new NotFoundError('Incident not found');

      res.status(200).json({
        message: 'Incident updated successfully',
        data: { incident },
      });
    } catch (error) {
      next(error);
    }
  };

  /** Delete incident */
  deleteIncident = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const deleted = await incidentReportService.remove(req.params.incidentId);
      if (!deleted) throw new NotFoundError('Incident not found');

      res.status(200).json({
        message: 'Incident deleted successfully',
        data: null,
      });
    } catch (err) {
      next(err);
    }
  };

  /** Get incidents by status */
  getIncidentsByStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { status } = req.params;
      const page = req.query.page
        ? parseInt(req.query.page as string, 10)
        : undefined;
      const pageSize = req.query.pageSize
        ? parseInt(req.query.pageSize as string, 10)
        : undefined;

      const result = await incidentReportService.getByStatus(
        status as IncidentStatus,
        {
          page,
          limit: pageSize,
          sortBy: req.query.sortBy as any,
          sortDir: req.query.sortDir as any,
        }
      );

      res.status(200).json({
        message: 'Incidents by status found successfully',
        data: {
          incidents: result.items,
          total: result.totalItems,
          page: result.page,
          pageSize: result.limit,
          totalPages: result.totalPages,
          status,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  /** Get incidents by location (theater + optional hall) */
  getIncidentsByLocation = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { theaterId } = req.params;
      const hallId = req.query.hallId as string | undefined;
      const page = req.query.page
        ? parseInt(req.query.page as string, 10)
        : undefined;
      const pageSize = req.query.pageSize
        ? parseInt(req.query.pageSize as string, 10)
        : undefined;

      const result = await incidentReportService.getByLocation(
        theaterId,
        hallId,
        {
          page,
          limit: pageSize,
          sortBy: req.query.sortBy as any,
          sortDir: req.query.sortDir as any,
        }
      );

      res.status(200).json({
        message: 'Incidents by location found successfully',
        data: {
          incidents: result.items,
          total: result.totalItems,
          page: result.page,
          pageSize: result.limit,
          totalPages: result.totalPages,
          theaterId,
          hallId,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  /** Get incidents by user (createdBy) */
  getIncidentsByUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { userId } = req.params;
      const page = req.query.page
        ? parseInt(req.query.page as string, 10)
        : undefined;
      const pageSize = req.query.pageSize
        ? parseInt(req.query.pageSize as string, 10)
        : undefined;

      const result = await incidentReportService.getByUser(userId, {
        page,
        limit: pageSize,
        sortBy: req.query.sortBy as any,
        sortDir: req.query.sortDir as any,
      });

      res.status(200).json({
        message: 'Incidents by user found successfully',
        data: {
          incidents: result.items,
          total: result.totalItems,
          page: result.page,
          pageSize: result.limit,
          totalPages: result.totalPages,
          userId,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  /** Get all incidents with a specific incidentId (for checking duplicates) */
  getIncidentsByIncidentId = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { incidentId } = req.params;
      const page = req.query.page
        ? parseInt(req.query.page as string, 10)
        : undefined;
      const pageSize = req.query.pageSize
        ? parseInt(req.query.pageSize as string, 10)
        : undefined;

      const result = await incidentReportService.getByIncidentId(incidentId, {
        page,
        limit: pageSize,
        sortBy: req.query.sortBy as any,
        sortDir: req.query.sortDir as any,
      });

      res.status(200).json({
        message: 'Incidents found successfully',
        data: {
          incidents: result.items,
          total: result.totalItems,
          page: result.page,
          pageSize: result.limit,
          totalPages: result.totalPages,
          incidentId,
        },
      });
    } catch (err) {
      next(err);
    }
  };
}

/** Singleton instance for routing usage */
export const incidentReportController = new IncidentReportController();
