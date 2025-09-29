// src/interfaces/incident-report.ts

export interface IncidentReportAttributes {
  incidentId: string;
  theaterId: string;
  hallId: string;
  description: string;
  status: 'open' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IncidentReportCreationAttributes {
  incidentId?: string; // Optional - auto-generated if omitted
  theaterId: string;
  hallId: string;
  description: string;
  status?: 'open' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed';
  createdBy: string;
}

export interface IncidentReportDTO {
  incidentId: string;
  theaterId: string;
  hallId: string;
  description: string;
  status: 'open' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateIncidentReportDTO {
  incidentId?: string; // Optional - auto-generated if omitted
  theaterId: string;
  hallId: string;
  description: string;
  status?: 'open' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed';
  createdBy: string;
}

export interface UpdateIncidentReportDTO {
  theaterId?: string;
  hallId?: string;
  description?: string;
  status?: 'open' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed';
}

export type IncidentStatus =
  | 'open'
  | 'acknowledged'
  | 'in_progress'
  | 'resolved'
  | 'closed';

/**
 * Generic pagination wrapper for list/search queries.
 */
export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  total: number;
}

/**
 * Mapper to convert IncidentReport to safe DTO.
 */
export function toIncidentReportDTO(
  incident: Pick<
    IncidentReportAttributes,
    | 'incidentId'
    | 'theaterId'
    | 'hallId'
    | 'description'
    | 'status'
    | 'createdBy'
    | 'createdAt'
    | 'updatedAt'
  >
): IncidentReportDTO {
  const {
    incidentId,
    theaterId,
    hallId,
    description,
    status,
    createdBy,
    createdAt,
    updatedAt,
  } = incident;

  return {
    incidentId,
    theaterId,
    hallId,
    description,
    status,
    createdBy,
    createdAt,
    updatedAt,
  };
}
