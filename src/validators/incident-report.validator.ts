/**
 * @module validators/incident-report.validator
 *
 * @description
 * express-validator rules for Incident Reports.
 * - No Mongo ObjectId usage anywhere; single-record routes use business `incidentId` (UUID).
 * - `createIncidentValidation` treats `incidentId` as optional: if provided, it must be a valid UUID;
 *   if omitted, the model generates it.
 */

import { body, param, query } from 'express-validator';
import type { Request } from 'express';

export const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const idRegex = /^[a-zA-Z0-9_-]+$/;
export const ALLOWED_STATUSES = [
  'open',
  'acknowledged',
  'in_progress',
  'resolved',
  'closed',
] as const;

function getReqQuery(req: Request): Record<string, any> {
  return ((req as any)?.query ?? {}) as Record<string, any>;
}

/* ------------------------------- Param rules ------------------------------ */

export const incidentIdParamValidation = [
  param('incidentId')
    .trim()
    .matches(uuidRegex)
    .withMessage('Invalid UUID format for "incidentId"'),
];

export const createdByParamValidation = [
  param('createdBy')
    .trim()
    .matches(uuidRegex)
    .withMessage('Invalid UUID format for "createdBy"'),
];

export const theaterIdParamValidation = [
  param('theaterId')
    .trim()
    .isLength({ min: 2, max: 36 })
    .withMessage('theaterId must be between 2 and 36 characters')
    .matches(idRegex)
    .withMessage(
      'theaterId must contain only letters, numbers, underscores, or hyphens'
    ),
];

export const hallIdParamValidation = [
  param('hallId')
    .trim()
    .isLength({ min: 1, max: 16 })
    .withMessage('hallId must be between 1 and 16 characters')
    .matches(idRegex)
    .withMessage(
      'hallId must contain only letters, numbers, underscores, or hyphens'
    ),
];

export const statusParamValidation = [
  param('status')
    .trim()
    .customSanitizer((v) => String(v).toLowerCase())
    .isIn(ALLOWED_STATUSES as unknown as string[])
    .withMessage(`status must be one of: ${ALLOWED_STATUSES.join(', ')}`),
];

/* ------------------------------- Body rules -------------------------------- */

/**
 * Create Incident:
 * - `incidentId` optional; if present must be UUID.
 * - `theaterId`, `hallId`, `description`, `createdBy` required.
 * - `status` optional enum.
 */
export const createIncidentValidation = [
  body('incidentId')
    .optional()
    .trim()
    .matches(uuidRegex)
    .withMessage('Invalid UUID format for "incidentId"'),

  body('theaterId')
    .exists({ checkNull: true })
    .withMessage('theaterId is required')
    .bail()
    .trim()
    .isLength({ min: 2, max: 36 })
    .withMessage('theaterId must be between 2 and 36 characters')
    .matches(idRegex)
    .withMessage(
      'theaterId must contain only letters, numbers, underscores, or hyphens'
    ),

  body('hallId')
    .exists({ checkNull: true })
    .withMessage('hallId is required')
    .bail()
    .trim()
    .isLength({ min: 1, max: 16 })
    .withMessage('hallId must be between 1 and 16 characters')
    .matches(idRegex)
    .withMessage(
      'hallId must contain only letters, numbers, underscores, or hyphens'
    ),

  body('description')
    .exists({ checkNull: true })
    .withMessage('description is required')
    .bail()
    .isString()
    .withMessage('description must be a string')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('description must be between 1 and 5000 characters'),

  body('createdBy')
    .exists({ checkNull: true })
    .withMessage('createdBy is required')
    .bail()
    .trim()
    .matches(uuidRegex)
    .withMessage('Invalid UUID format for "createdBy"'),

  body('status')
    .optional()
    .trim()
    .customSanitizer((v) => String(v).toLowerCase())
    .isIn(ALLOWED_STATUSES as unknown as string[])
    .withMessage(`status must be one of: ${ALLOWED_STATUSES.join(', ')}`),
];

/**
 * Update Incident:
 * - Forbid updating `incidentId`.
 * - Other fields optional with constraints.
 */
export const updateIncidentValidation = [
  body().isObject().withMessage('Body must be a JSON object'),

  body('incidentId').not().exists().withMessage('incidentId cannot be updated'),

  body('theaterId')
    .optional()
    .trim()
    .isLength({ min: 2, max: 36 })
    .withMessage('theaterId must be between 2 and 36 characters')
    .matches(idRegex)
    .withMessage(
      'theaterId must contain only letters, numbers, underscores, or hyphens'
    ),

  body('hallId')
    .optional()
    .trim()
    .isLength({ min: 1, max: 16 })
    .withMessage('hallId must be between 1 and 16 characters')
    .matches(idRegex)
    .withMessage(
      'hallId must contain only letters, numbers, underscores, or hyphens'
    ),

  body('description')
    .optional()
    .isString()
    .withMessage('description must be a string')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('description must be between 1 and 5000 characters'),

  body('createdBy')
    .optional()
    .trim()
    .matches(uuidRegex)
    .withMessage('Invalid UUID format for "createdBy"'),

  body('status')
    .optional()
    .trim()
    .customSanitizer((v) => String(v).toLowerCase())
    .isIn(ALLOWED_STATUSES as unknown as string[])
    .withMessage(`status must be one of: ${ALLOWED_STATUSES.join(', ')}`),
];

/* ------------------------------- Query rules ------------------------------- */

export const searchQueryValidation = [
  query('q').optional().isString().withMessage('q must be a string').trim(),

  query('status')
    .optional()
    .trim()
    .customSanitizer((v) => String(v).toLowerCase())
    .isIn(ALLOWED_STATUSES as unknown as string[])
    .withMessage(`status must be one of: ${ALLOWED_STATUSES.join(', ')}`),

  query('theaterId')
    .optional()
    .trim()
    .isLength({ min: 2, max: 36 })
    .withMessage('theaterId must be between 2 and 36 characters')
    .matches(idRegex)
    .withMessage(
      'theaterId must contain only letters, numbers, underscores, or hyphens'
    ),

  query('hallId')
    .optional()
    .trim()
    .isLength({ min: 1, max: 16 })
    .withMessage('hallId must be between 1 and 16 characters')
    .matches(idRegex)
    .withMessage(
      'hallId must contain only letters, numbers, underscores, or hyphens'
    ),

  query('createdBy')
    .optional()
    .trim()
    .matches(uuidRegex)
    .withMessage('Invalid UUID format for "createdBy"'),

  query('incidentId')
    .optional()
    .trim()
    .matches(uuidRegex)
    .withMessage('Invalid UUID format for "incidentId"'),

  query('createdAtFrom')
    .optional()
    .isISO8601()
    .withMessage('createdAtFrom must be an ISO 8601 date')
    .toDate(),

  query('createdAtTo')
    .optional()
    .isISO8601()
    .withMessage('createdAtTo must be an ISO 8601 date')
    .toDate()
    .custom((to, meta) => {
      const q = getReqQuery(meta.req as Request);
      const from = q.createdAtFrom;
      if (from) {
        const f = new Date(from);
        const t = new Date(to as any);
        if (!isNaN(f.getTime()) && !isNaN(t.getTime()) && f > t) {
          throw new Error('createdAtFrom must be <= createdAtTo');
        }
      }
      return true;
    }),

  query('updatedAtFrom')
    .optional()
    .isISO8601()
    .withMessage('updatedAtFrom must be an ISO 8601 date')
    .toDate(),

  query('updatedAtTo')
    .optional()
    .isISO8601()
    .withMessage('updatedAtTo must be an ISO 8601 date')
    .toDate()
    .custom((to, meta) => {
      const q = getReqQuery(meta.req as Request);
      const from = q.updatedAtFrom;
      if (from) {
        const f = new Date(from);
        const t = new Date(to as any);
        if (!isNaN(f.getTime()) && !isNaN(t.getTime()) && f > t) {
          throw new Error('updatedAtFrom must be <= updatedAtTo');
        }
      }
      return true;
    }),
];
