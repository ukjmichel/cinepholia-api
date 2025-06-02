import express from 'express';
import {
  createIncidentReport,
  getIncidentReportById,
  updateIncidentReport,
  deleteIncidentReport,
  getAllIncidentReports,
  getIncidentReportsByTheater,
  getIncidentReportsByHall,
  getIncidentReportsByUser,
  getIncidentReportsByStatus,
  updateIncidentReportStatus,
  searchIncidentReports,
  getIncidentReportStatistics,
} from '../controllers/incident-report.controller.js';
import {
  createIncidentReportValidator,
  updateIncidentReportValidator,
  incidentReportIdParamValidator,
  searchIncidentReportValidator,
  updateIncidentReportStatusValidator,
  theaterIdParamValidator,
  hallIdParamValidator,
  incidentReportStatusParamValidator,
} from '../validators/incident-report.validator.js';
import { userIdParamValidator } from '../validators/user.validator.js';
import { handleValidationError } from '../middlewares/handleValidatonError.middleware.js';
import { decodeJwtToken } from '../middlewares/auth.middleware.js';
import { permission } from '../middlewares/permission.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Incident Reports
 *     description: API for managing cinema incident reports
 */

// Protect all routes below
router.use(decodeJwtToken, permission.isStaff);

/**
 * @swagger
 * /incident-reports/search:
 *   get:
 *     summary: Search incident reports by multiple criteria
 *     tags: [Incident Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: title
 *         schema:
 *           type: string
 *         description: Search by title (partial match)
 *       - in: query
 *         name: description
 *         schema:
 *           type: string
 *         description: Search by description (partial match)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, in_progress, fulfilled]
 *         description: Filter by status
 *       - in: query
 *         name: theaterId
 *         schema:
 *           type: string
 *         description: Filter by theater ID
 *       - in: query
 *         name: hallId
 *         schema:
 *           type: string
 *         description: Filter by hall ID
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for incident date range
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for incident date range
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Maximum number of results
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *         description: Number of results to skip
 *     responses:
 *       200:
 *         description: Incident reports found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/IncidentReport'
 *       400:
 *         description: Bad request (at least one search parameter required)
 *       404:
 *         description: No incident reports match search criteria
 */
router.get(
  '/search',
  searchIncidentReportValidator,
  handleValidationError,
  searchIncidentReports
);

/**
 * @swagger
 * /incident-reports/statistics:
 *   get:
 *     summary: Get incident report statistics
 *     tags: [Incident Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: theaterId
 *         schema:
 *           type: string
 *         description: Optional theater ID to filter statistics
 *     responses:
 *       200:
 *         description: Incident report statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/IncidentReportStatistics'
 */
router.get('/statistics', getIncidentReportStatistics);

/**
 * @swagger
 * /incident-reports:
 *   post:
 *     summary: Create a new incident report
 *     tags: [Incident Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/IncidentReportInput'
 *     responses:
 *       201:
 *         description: Incident report created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/IncidentReport'
 *       400:
 *         description: Invalid input or validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Theater, hall, or user not found
 */
router.post(
  '/',
  createIncidentReportValidator,
  handleValidationError,
  createIncidentReport
);

/**
 * @swagger
 * /incident-reports:
 *   get:
 *     summary: Get all incident reports
 *     tags: [Incident Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Maximum number of results
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *         description: Number of results to skip
 *     responses:
 *       200:
 *         description: List of incident reports
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/IncidentReport'
 */
router.get('/', getAllIncidentReports);

/**
 * @swagger
 * /incident-reports/{incidentId}:
 *   get:
 *     summary: Get an incident report by ID
 *     tags: [Incident Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: incidentId
 *         schema:
 *           type: string
 *         required: true
 *         description: UUID of the incident report
 *     responses:
 *       200:
 *         description: Incident report found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/IncidentReport'
 *       404:
 *         description: Incident report not found
 */
router.get(
  '/:incidentId',
  incidentReportIdParamValidator,
  handleValidationError,
  getIncidentReportById
);

/**
 * @swagger
 * /incident-reports/{incidentId}:
 *   patch:
 *     summary: Update an incident report (ownership, staff, or admin only)
 *     tags: [Incident Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: incidentId
 *         schema:
 *           type: string
 *         required: true
 *         description: UUID of the incident report
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/IncidentReportUpdate'
 *     responses:
 *       200:
 *         description: Incident report updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/IncidentReport'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Incident report not found
 */
router.patch(
  '/:incidentId',
  incidentReportIdParamValidator,
  updateIncidentReportValidator,
  handleValidationError,
  updateIncidentReport
);

/**
 * @swagger
 * /incident-reports/{incidentId}:
 *   delete:
 *     summary: Delete an incident report (ownership, staff, or admin only)
 *     tags: [Incident Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: incidentId
 *         schema:
 *           type: string
 *         required: true
 *         description: UUID of the incident report
 *     responses:
 *       204:
 *         description: Incident report deleted (No Content)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Incident report not found
 */
router.delete(
  '/:incidentId',
  incidentReportIdParamValidator,
  handleValidationError,
  deleteIncidentReport
);

/**
 * @swagger
 * /incident-reports/{incidentId}/status:
 *   patch:
 *     summary: Update incident report status (staff only)
 *     tags: [Incident Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: incidentId
 *         schema:
 *           type: string
 *         required: true
 *         description: UUID of the incident report
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, in_progress, fulfilled]
 *     responses:
 *       200:
 *         description: Incident report status updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/IncidentReport'
 *       400:
 *         description: Invalid status or missing status in body
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (staff only)
 *       404:
 *         description: Incident report not found
 */
router.patch(
  '/:incidentId/status',
  incidentReportIdParamValidator,
  updateIncidentReportStatusValidator,
  handleValidationError,
  updateIncidentReportStatus
);

/**
 * @swagger
 * /incident-reports/theater/{theaterId}:
 *   get:
 *     summary: Get all incident reports for a specific theater
 *     tags: [Incident Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: theaterId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the theater
 *     responses:
 *       200:
 *         description: Incident reports for theater
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/IncidentReport'
 *       404:
 *         description: Theater not found or no incident reports found
 */
router.get(
  '/theater/:theaterId',
  theaterIdParamValidator,
  handleValidationError,
  getIncidentReportsByTheater
);

/**
 * @swagger
 * /incident-reports/hall/{theaterId}/{hallId}:
 *   get:
 *     summary: Get all incident reports for a specific hall
 *     tags: [Incident Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: theaterId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the theater
 *       - in: path
 *         name: hallId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the hall
 *     responses:
 *       200:
 *         description: Incident reports for hall
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/IncidentReport'
 *       404:
 *         description: Hall not found or no incident reports found
 */
router.get(
  '/hall/:theaterId/:hallId',
  theaterIdParamValidator,
  hallIdParamValidator,
  handleValidationError,
  getIncidentReportsByHall
);

/**
 * @swagger
 * /incident-reports/user/{userId}:
 *   get:
 *     summary: Get all incident reports for a specific user
 *     tags: [Incident Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: UUID of the user
 *     responses:
 *       200:
 *         description: Incident reports for user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/IncidentReport'
 *       404:
 *         description: User not found or no incident reports found
 */
router.get(
  '/user/:userId',
  userIdParamValidator,
  handleValidationError,
  getIncidentReportsByUser
);

/**
 * @swagger
 * /incident-reports/status/{status}:
 *   get:
 *     summary: Get incident reports by status
 *     tags: [Incident Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, in_progress, fulfilled]
 *         required: true
 *         description: Incident report status
 *     responses:
 *       200:
 *         description: Incident reports with given status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/IncidentReport'
 *       404:
 *         description: No incident reports found with given status
 */
router.get(
  '/status/:status',
  incidentReportStatusParamValidator,
  handleValidationError,
  getIncidentReportsByStatus
);

export default router;
