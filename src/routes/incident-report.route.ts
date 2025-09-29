import { Router } from 'express';
import { incidentReportController } from '../controllers/incident-report.controller.js';
import {
  decodeJwtToken,
  requireStaffOrAdmin,
} from '../middlewares/auth.middleware.js';
import {
  validateCreateIncident,
  validateUpdateIncident,
  validateIncidentIdParam,
  validateListIncidents,
  validateSearchIncidents,
  validateStatusParam,
} from '../validators/incident-report.validator.js';

const incidentReportRouter = Router();

/* =============== ROUTES =============== */

/** Create incident - Staff/Admin only */
incidentReportRouter.post(
  '/',
  decodeJwtToken,
  requireStaffOrAdmin,
  validateCreateIncident,

  incidentReportController.createIncident
);

/** Search and specialized queries - Staff/Admin only */
incidentReportRouter.get(
  '/search',
  decodeJwtToken,
  requireStaffOrAdmin,
  validateSearchIncidents,

  incidentReportController.searchIncidents
);

incidentReportRouter.get(
  '/status/:status',
  decodeJwtToken,
  requireStaffOrAdmin,
  validateStatusParam,
  validateListIncidents,

  incidentReportController.getIncidentsByStatus
);

incidentReportRouter.get(
  '/location/:theaterId',
  decodeJwtToken,
  requireStaffOrAdmin,
  validateListIncidents,

  incidentReportController.getIncidentsByLocation
);

incidentReportRouter.get(
  '/user/:userId',
  decodeJwtToken,
  requireStaffOrAdmin,
  validateListIncidents,

  incidentReportController.getIncidentsByUser
);

incidentReportRouter.get(
  '/incident-id/:incidentId',
  decodeJwtToken,
  requireStaffOrAdmin,
  validateIncidentIdParam,
  validateListIncidents,

  incidentReportController.getIncidentsByIncidentId
);

/** List incidents - Staff/Admin only */
incidentReportRouter.get(
  '/',
  decodeJwtToken,
  requireStaffOrAdmin,
  validateListIncidents,

  incidentReportController.listIncidents
);

/** Get incident by ID - Staff/Admin only */
incidentReportRouter.get(
  '/:incidentId',
  decodeJwtToken,
  requireStaffOrAdmin,
  validateIncidentIdParam,

  incidentReportController.getIncidentById
);

/** Update incident - Staff/Admin only */
incidentReportRouter.patch(
  '/:incidentId',
  decodeJwtToken,
  requireStaffOrAdmin,
  validateUpdateIncident,

  incidentReportController.updateIncident
);

/** Delete incident - Staff/Admin only */
incidentReportRouter.delete(
  '/:incidentId',
  decodeJwtToken,
  requireStaffOrAdmin,
  validateIncidentIdParam,
  incidentReportController.deleteIncident
);

export default incidentReportRouter;
