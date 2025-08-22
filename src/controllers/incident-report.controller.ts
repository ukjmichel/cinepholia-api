/**
 * @module controllers/incident-report.controller
 *
 * @description
 * Express handlers for Incident Reports.
 *
 * Security & Validation:
 * - XSS sanitization of `description` via DOMPurify (server-side jsdom).
 * - Basic runtime validation for UUIDs, ids, statuses, and date parsing.
 *
 * Notable behavior:
 * - `incidentId` is optional on create: if omitted, the model generates it.
 * - `incidentId` cannot be updated later (immutable).
 * - `searchIncidents` is strongly typed to avoid `req.query` optional errors.
 *
 * Routing note:
 * - Single-record routes should use `/:incidentId` (UUID) — never Mongo `_id`.
 */

import { Request, Response, NextFunction } from 'express';
import { incidentReportService } from '../services/incident-report.service.js';
import { IncidentReport } from '../models/incident-report.schema.js';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

/* -------------------------------------------------------------------------- */
/*                                Sanitization                                */
/* -------------------------------------------------------------------------- */

const { window } = new JSDOM('');
const DOMPurifyInstance = createDOMPurify(window as any);

/** Sanitize a description to prevent XSS (strips all tags/attrs). */
export function sanitizeDescription(input: string): string {
  return DOMPurifyInstance.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const idRegex = /^[a-zA-Z0-9_-]+$/;

const ALLOWED_STATUSES = [
  'open',
  'acknowledged',
  'in_progress',
  'resolved',
  'closed',
] as const;
type AllowedStatus = (typeof ALLOWED_STATUSES)[number];

function isValidUUID(v?: string) {
  return typeof v === 'string' && uuidRegex.test(v);
}
function isValidId(v?: string, min = 1, max = 36) {
  return (
    typeof v === 'string' &&
    v.length >= min &&
    v.length <= max &&
    idRegex.test(v)
  );
}
function isValidStatus(v?: string): v is AllowedStatus {
  return (
    typeof v === 'string' && (ALLOWED_STATUSES as readonly string[]).includes(v)
  );
}
function parseDateOr400(
  val: unknown,
  field: string,
  res: Response
): Date | undefined {
  if (val === undefined) return undefined;
  const d = new Date(String(val));
  if (isNaN(d.getTime())) {
    res.status(400).json({ message: `Invalid date for ${field}`, data: null });
    return undefined as any;
  }
  return d;
}

/* -------------------------------------------------------------------------- */
/*                                 CRUD GETs                                  */
/* -------------------------------------------------------------------------- */

export async function getAllIncidents(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const incidents = await incidentReportService.getAllIncidents();
    res.status(200).json({ message: 'All incidents', data: incidents });
  } catch (error) {
    next(error);
  }
}

export async function getIncident(
  req: Request<{ incidentId: string }>,
  res: Response,
  next: NextFunction
): Promise<any> {
  try {
    const { incidentId } = req.params;
    if (!isValidUUID(incidentId)) {
      return res
        .status(400)
        .json({ message: 'Invalid incidentId (UUID)', data: null });
    }
    const incident = await incidentReportService.getIncident(incidentId);
    res.status(200).json({ message: 'Incident found', data: incident });
  } catch (error) {
    next(error);
  }
}

export async function getIncidentsByStatus(
  req: Request<{ status: string }>,
  res: Response,
  next: NextFunction
): Promise<any> {
  try {
    const { status } = req.params;
    if (!isValidStatus(status)) {
      return res.status(400).json({ message: 'Invalid status', data: null });
    }
    const incidents = await incidentReportService.getIncidentsByStatus(status);
    res
      .status(200)
      .json({ message: `Incidents with status ${status}`, data: incidents });
  } catch (error) {
    next(error);
  }
}

export async function getIncidentsByLocation(
  req: Request<{ theaterId: string; hallId?: string }>,
  res: Response,
  next: NextFunction
): Promise<any> {
  try {
    const { theaterId, hallId } = req.params;
    if (!isValidId(theaterId, 2, 36)) {
      return res.status(400).json({ message: 'Invalid theaterId', data: null });
    }
    if (hallId && !isValidId(hallId, 1, 16)) {
      return res.status(400).json({ message: 'Invalid hallId', data: null });
    }
    const incidents = await incidentReportService.getIncidentsByLocation(
      theaterId,
      hallId
    );
    res.status(200).json({ message: 'Incidents by location', data: incidents });
  } catch (error) {
    next(error);
  }
}

export async function getIncidentsByUser(
  req: Request<{ createdBy: string }>,
  res: Response,
  next: NextFunction
): Promise<any> {
  try {
    const { createdBy } = req.params;
    if (!isValidUUID(createdBy)) {
      return res
        .status(400)
        .json({ message: 'Invalid createdBy UUID', data: null });
    }
    const incidents = await incidentReportService.getIncidentsByUser(createdBy);
    res
      .status(200)
      .json({ message: `Incidents by user ${createdBy}`, data: incidents });
  } catch (error) {
    next(error);
  }
}

/** Optional: list all docs that share a given incidentId (mainly for debugging). */
export async function getIncidentsByIncidentId(
  req: Request<{ incidentId: string }>,
  res: Response,
  next: NextFunction
): Promise<any> {
  try {
    const { incidentId } = req.params;
    if (!isValidUUID(incidentId)) {
      return res
        .status(400)
        .json({ message: 'Invalid incidentId', data: null });
    }
    const incidents =
      await incidentReportService.getIncidentsByIncidentId(incidentId);
    res.status(200).json({
      message: `Incidents for incidentId ${incidentId}`,
      data: incidents,
    });
  } catch (error) {
    next(error);
  }
}

/* -------------------------------------------------------------------------- */
/*                                    POST                                    */
/* -------------------------------------------------------------------------- */

/**
 * **POST /incidents**
 * Create a new incident (XSS sanitized).
 * - `incidentId` is optional; if absent, it is auto-generated by the model.
 */
export async function createIncident(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> {
  try {
    const payload: Omit<IncidentReport, 'createdAt' | 'updatedAt'> & {
      incidentId?: string;
    } = {
      incidentId: req.body.incidentId, // optional
      theaterId: req.body.theaterId,
      hallId: req.body.hallId,
      description: req.body.description,
      createdBy: req.body.createdBy,
      status: req.body.status ?? 'open',
    };

    // Optional incidentId validation (only if provided)
    if (payload.incidentId && !isValidUUID(payload.incidentId)) {
      return res
        .status(400)
        .json({ message: 'Invalid incidentId (UUID)', data: null });
    }

    // Basic required fields
    if (!isValidId(payload.theaterId, 2, 36))
      return res.status(400).json({ message: 'Invalid theaterId', data: null });
    if (!isValidId(payload.hallId, 1, 16))
      return res.status(400).json({ message: 'Invalid hallId', data: null });
    if (!isValidUUID(payload.createdBy))
      return res
        .status(400)
        .json({ message: 'Invalid createdBy (UUID)', data: null });
    if (payload.status && !isValidStatus(payload.status))
      return res
        .status(400)
        .json({ message: 'Invalid status value', data: null });

    if (payload.description) {
      payload.description = sanitizeDescription(payload.description);
    }

    const created = await incidentReportService.createIncident(payload);
    res.status(201).json({ message: 'Incident created', data: created });
  } catch (error) {
    next(error);
  }
}

/* -------------------------------------------------------------------------- */
/*                                    PUT                                     */
/* -------------------------------------------------------------------------- */

export async function updateIncident(
  req: Request<{ incidentId: string }>,
  res: Response,
  next: NextFunction
): Promise<any> {
  try {
    const { incidentId } = req.params;
    if (!isValidUUID(incidentId)) {
      return res
        .status(400)
        .json({ message: 'Invalid incidentId (UUID)', data: null });
    }

    const updateData: Partial<IncidentReport> = { ...req.body };

    // Do not allow updating incidentId (immutable)
    if (updateData.incidentId !== undefined) {
      delete updateData.incidentId;
    }

    if (updateData.description) {
      updateData.description = sanitizeDescription(updateData.description);
    }
    if (updateData.status && !isValidStatus(updateData.status)) {
      return res
        .status(400)
        .json({ message: 'Invalid status value', data: null });
    }
    if (updateData.createdBy && !isValidUUID(updateData.createdBy)) {
      return res.status(400).json({ message: 'Invalid createdBy', data: null });
    }
    if (updateData.theaterId && !isValidId(updateData.theaterId, 2, 36)) {
      return res.status(400).json({ message: 'Invalid theaterId', data: null });
    }
    if (updateData.hallId && !isValidId(updateData.hallId, 1, 16)) {
      return res.status(400).json({ message: 'Invalid hallId', data: null });
    }

    const updated = await incidentReportService.updateIncident(
      incidentId,
      updateData
    );
    res.status(200).json({ message: 'Incident updated', data: updated });
  } catch (error) {
    next(error);
  }
}

/* -------------------------------------------------------------------------- */
/*                                   DELETE                                   */
/* -------------------------------------------------------------------------- */

export async function deleteIncident(
  req: Request<{ incidentId: string }>,
  res: Response,
  next: NextFunction
): Promise<any> {
  try {
    const { incidentId } = req.params;
    if (!isValidUUID(incidentId)) {
      return res
        .status(400)
        .json({ message: 'Invalid incidentId (UUID)', data: null });
    }
    await incidentReportService.deleteIncident(incidentId);
    res.status(200).json({ message: 'Incident deleted', data: null });
  } catch (error) {
    next(error);
  }
}

/* -------------------------------------------------------------------------- */
/*                           STATUS TRANSITION ROUTES                         */
/* -------------------------------------------------------------------------- */

export async function acknowledgeIncident(
  req: Request<{ incidentId: string }>,
  res: Response,
  next: NextFunction
): Promise<any> {
  try {
    const { incidentId } = req.params;
    if (!isValidUUID(incidentId)) {
      return res
        .status(400)
        .json({ message: 'Invalid incidentId (UUID)', data: null });
    }
    const updated = await incidentReportService.updateIncident(incidentId, {
      status: 'acknowledged',
    });
    res.status(200).json({ message: 'Incident acknowledged', data: updated });
  } catch (error) {
    next(error);
  }
}

export async function startProgress(
  req: Request<{ incidentId: string }>,
  res: Response,
  next: NextFunction
): Promise<any> {
  try {
    const { incidentId } = req.params;
    if (!isValidUUID(incidentId)) {
      return res
        .status(400)
        .json({ message: 'Invalid incidentId (UUID)', data: null });
    }
    const updated = await incidentReportService.updateIncident(incidentId, {
      status: 'in_progress',
    });
    res.status(200).json({ message: 'Incident in progress', data: updated });
  } catch (error) {
    next(error);
  }
}

export async function resolveIncident(
  req: Request<{ incidentId: string }>,
  res: Response,
  next: NextFunction
): Promise<any> {
  try {
    const { incidentId } = req.params;
    if (!isValidUUID(incidentId)) {
      return res
        .status(400)
        .json({ message: 'Invalid incidentId (UUID)', data: null });
    }
    const updated = await incidentReportService.updateIncident(incidentId, {
      status: 'resolved',
    });
    res.status(200).json({ message: 'Incident resolved', data: updated });
  } catch (error) {
    next(error);
  }
}

export async function closeIncident(
  req: Request<{ incidentId: string }>,
  res: Response,
  next: NextFunction
): Promise<any> {
  try {
    const { incidentId } = req.params;
    if (!isValidUUID(incidentId)) {
      return res
        .status(400)
        .json({ message: 'Invalid incidentId (UUID)', data: null });
    }
    const updated = await incidentReportService.updateIncident(incidentId, {
      status: 'closed',
    });
    res.status(200).json({ message: 'Incident closed', data: updated });
  } catch (error) {
    next(error);
  }
}

/* -------------------------------------------------------------------------- */
/*                                   SEARCH                                   */
/* -------------------------------------------------------------------------- */

/** Strongly typed query to avoid `req.query` being possibly undefined. */
type IncidentSearchQuery = {
  q?: string;
  status?: string;
  theaterId?: string;
  hallId?: string;
  createdBy?: string; // UUID
  incidentId?: string; // UUID
  createdAtFrom?: string; // ISO date
  createdAtTo?: string; // ISO date
  updatedAtFrom?: string; // ISO date
  updatedAtTo?: string; // ISO date
};

export async function searchIncidents(
  req: Request<{}, {}, {}, IncidentSearchQuery>,
  res: Response,
  next: NextFunction
): Promise<any> {
  try {
    const query = (req.query ?? {}) as IncidentSearchQuery;

    const {
      q,
      status,
      theaterId,
      hallId,
      createdBy,
      incidentId,
      createdAtFrom,
      createdAtTo,
      updatedAtFrom,
      updatedAtTo,
    } = query;

    if (status && !isValidStatus(status)) {
      return res.status(400).json({ message: 'Invalid status', data: null });
    }
    if (createdBy && !isValidUUID(createdBy)) {
      return res
        .status(400)
        .json({ message: 'Invalid createdBy UUID', data: null });
    }
    if (incidentId && !isValidUUID(incidentId)) {
      return res
        .status(400)
        .json({ message: 'Invalid incidentId UUID', data: null });
    }
    if (theaterId && !isValidId(theaterId, 2, 36)) {
      return res.status(400).json({ message: 'Invalid theaterId', data: null });
    }
    if (hallId && !isValidId(hallId, 1, 16)) {
      return res.status(400).json({ message: 'Invalid hallId', data: null });
    }

    const createdFrom = parseDateOr400(createdAtFrom, 'createdAtFrom', res);
    if (createdAtFrom && !createdFrom) return;
    const createdToDate = parseDateOr400(createdAtTo, 'createdAtTo', res);
    if (createdAtTo && !createdToDate) return;
    const updatedFromDate = parseDateOr400(updatedAtFrom, 'updatedAtFrom', res);
    if (updatedAtFrom && !updatedFromDate) return;
    const updatedToDate = parseDateOr400(updatedAtTo, 'updatedAtTo', res);
    if (updatedAtTo && !updatedToDate) return;

    const filters = {
      status: status as AllowedStatus | undefined,
      theaterId,
      hallId,
      createdBy,
      incidentId,
      createdAtFrom: createdFrom,
      createdAtTo: createdToDate,
      updatedAtFrom: updatedFromDate,
      updatedAtTo: updatedToDate,
    };

    const results = await incidentReportService.searchIncidents(
      q,
      filters as any
    );
    res.status(200).json({ message: 'Search results', data: results });
  } catch (error) {
    next(error);
  }
}
