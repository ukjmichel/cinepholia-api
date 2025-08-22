/**
 * @module models/incident-report.schema
 *
 * @description
 * Mongoose Schema and Model for Incident Reports.
 *
 * Key points:
 * - `incidentId` (UUID) is the business identifier:
 *   - Optional on create; auto-generated if not provided (via `default`).
 *   - Validated with UUID regex.
 *   - Indexed (non-unique) for fast lookup.
 *   - Immutable after creation.
 * - Location: `theaterId` (2–36) + `hallId` (1–16), limited to [a-zA-Z0-9_-].
 * - `status` enum with default "open".
 * - `createdBy` is a UUID (creator).
 * - `timestamps: true` adds `createdAt` and `updatedAt`.
 * - JSON transform exposes `id` (string) and hides `_id` and `__v`.
 */

import mongoose, { Schema } from 'mongoose';
import { randomUUID } from 'node:crypto';

export interface IncidentReport {
  incidentId: string; // UUID (auto-generated if omitted)
  theaterId: string;
  hallId: string;
  description: string;
  status: 'open' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed';
  createdBy: string; // UUID
  createdAt?: Date;
  updatedAt?: Date;
}

// UUID v1–v5 regex
const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// SQL-friendly id rules for theater/hall ids
const idRegex = /^[a-zA-Z0-9_-]+$/;

const IncidentReportSchema = new Schema<IncidentReport>(
  {
    incidentId: {
      type: String,
      required: [true, 'incidentId is required'],
      /**
       * Auto-generate UUID only if not provided by client.
       * If a client sends a valid `incidentId`, Mongoose will not call this default.
       */
      default: () => randomUUID(),
      match: [uuidRegex, 'Invalid UUID format for incidentId'],
      index: true, // ✅ non-unique index
      immutable: true, // prevent changes after creation
    },
    theaterId: {
      type: String,
      required: [true, 'theaterId is required'],
      minlength: [2, 'theaterId must be at least 2 characters'],
      maxlength: [36, 'theaterId cannot exceed 36 characters'],
      match: [
        idRegex,
        'theaterId must contain only letters, numbers, underscores, or hyphens',
      ],
    },
    hallId: {
      type: String,
      required: [true, 'hallId is required'],
      minlength: [1, 'hallId must be at least 1 character'],
      maxlength: [16, 'hallId cannot exceed 16 characters'],
      match: [
        idRegex,
        'hallId must contain only letters, numbers, underscores, or hyphens',
      ],
    },
    description: {
      type: String,
      required: [true, 'description is required'],
      trim: true,
      maxlength: [5000, 'description cannot exceed 5000 characters'],
    },
    status: {
      type: String,
      enum: {
        values: ['open', 'acknowledged', 'in_progress', 'resolved', 'closed'],
        message:
          'status must be one of "open", "acknowledged", "in_progress", "resolved", or "closed"',
      },
      default: 'open',
      index: true,
    },
    createdBy: {
      type: String,
      required: [true, 'createdBy is required'],
      match: [uuidRegex, 'Invalid UUID format for createdBy'],
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        return ret;
      },
    },
  }
);

// Helpful indexes
IncidentReportSchema.index({ incidentId: 1 }); // ✅ explicit non-unique index
IncidentReportSchema.index({ theaterId: 1, hallId: 1, createdAt: -1 });

export const IncidentReportModel = mongoose.model<IncidentReport>(
  'IncidentReport',
  IncidentReportSchema
);
