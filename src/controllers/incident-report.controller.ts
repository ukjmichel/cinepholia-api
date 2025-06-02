import { Request, Response, NextFunction } from 'express';
import { IncidentReportService } from '../services/incident-report.service.js';
import { BadRequestError } from '../errors/bad-request-error.js';

/**
 * Get an incident report by its ID.
 * @route GET /incident-reports/:incidentId
 * @param {Request} req - Express request object (expects incidentId in params)
 * @param {Response} res - Express response object (returns incident report)
 * @param {NextFunction} next - Express next middleware
 * @returns {Promise<void>}
 * @async
 */
export const getIncidentReportById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const incidentReport = await new IncidentReportService().findById(
      req.params.incidentId
    );
    res.json({ message: 'Incident report found', data: incidentReport });
  } catch (err) {
    next(err);
  }
};

/**
 * Create a new incident report.
 * @route POST /incident-reports
 * @param {Request} req - Express request object (expects incident report data in body)
 * @param {Response} res - Express response object (returns created incident report)
 * @param {NextFunction} next - Express next middleware
 * @returns {Promise<void>}
 * @async
 */
export const createIncidentReport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const incidentReport = await new IncidentReportService().create(req.body);
    res
      .status(201)
      .json({ message: 'Incident report created', data: incidentReport });
  } catch (err) {
    next(err);
  }
};

/**
 * Update an incident report by its ID.
 * @route PATCH /incident-reports/:incidentId
 * @param {Request} req - Express request object (expects incidentId in params and update data in body)
 * @param {Response} res - Express response object (returns updated incident report)
 * @param {NextFunction} next - Express next middleware
 * @returns {Promise<void>}
 * @async
 */
export const updateIncidentReport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const incidentReport = await new IncidentReportService().updateById(
      req.params.incidentId,
      req.body
    );
    res.json({ message: 'Incident report updated', data: incidentReport });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete an incident report by its ID.
 * @route DELETE /incident-reports/:incidentId
 * @param {Request} req - Express request object (expects incidentId in params)
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware
 * @returns {Promise<void>}
 * @async
 */
export const deleteIncidentReport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await new IncidentReportService().deleteById(req.params.incidentId);
    res.status(204).send(); // No body for 204
  } catch (err) {
    next(err);
  }
};

/**
 * Get all incident reports.
 * @route GET /incident-reports
 * @param {Request} req - Express request object (supports limit and offset query params)
 * @param {Response} res - Express response object (returns all incident reports)
 * @param {NextFunction} next - Express next middleware
 * @returns {Promise<void>}
 * @async
 */
export const getAllIncidentReports = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const limit = req.query.limit
      ? parseInt(req.query.limit as string)
      : undefined;
    const offset = req.query.offset
      ? parseInt(req.query.offset as string)
      : undefined;

    const incidentReports = await new IncidentReportService().findAll({
      limit,
      offset,
    });
    res.json({ message: 'All incident reports', data: incidentReports });
  } catch (err) {
    next(err);
  }
};

/**
 * Get incident reports for a theater.
 * @route GET /incident-reports/theater/:theaterId
 * @param {Request} req - Express request object (expects theaterId in params)
 * @param {Response} res - Express response object (returns incident reports for theater)
 * @param {NextFunction} next - Express next middleware
 * @returns {Promise<void>}
 * @async
 */
export const getIncidentReportsByTheater = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const incidentReports =
      await new IncidentReportService().findAllByTheaterId(
        req.params.theaterId
      );
    res.json({
      message: 'Incident reports for theater',
      data: incidentReports,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get incident reports for a specific hall.
 * @route GET /incident-reports/hall/:theaterId/:hallId
 * @param {Request} req - Express request object (expects theaterId and hallId in params)
 * @param {Response} res - Express response object (returns incident reports for hall)
 * @param {NextFunction} next - Express next middleware
 * @returns {Promise<void>}
 * @async
 */
export const getIncidentReportsByHall = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const incidentReports = await new IncidentReportService().findAllByHall(
      req.params.theaterId,
      req.params.hallId
    );
    res.json({ message: 'Incident reports for hall', data: incidentReports });
  } catch (err) {
    next(err);
  }
};

/**
 * Get incident reports for a user.
 * @route GET /incident-reports/user/:userId
 * @param {Request} req - Express request object (expects userId in params)
 * @param {Response} res - Express response object (returns incident reports for user)
 * @param {NextFunction} next - Express next middleware
 * @returns {Promise<void>}
 * @async
 */
export const getIncidentReportsByUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const incidentReports = await new IncidentReportService().findAllByUserId(
      req.params.userId
    );
    res.json({ message: 'Incident reports for user', data: incidentReports });
  } catch (err) {
    next(err);
  }
};

/**
 * Get incident reports by status.
 * @route GET /incident-reports/status/:status
 * @param {Request} req - Express request object (expects status in params)
 * @param {Response} res - Express response object (returns incident reports by status)
 * @param {NextFunction} next - Express next middleware
 * @returns {Promise<void>}
 * @async
 */
export const getIncidentReportsByStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const incidentReports = await new IncidentReportService().findAllByStatus(
      req.params.status as 'pending' | 'in_progress' | 'fulfilled'
    );
    res.json({
      message: `Incident reports with status ${req.params.status}`,
      data: incidentReports,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update the status of an incident report.
 * @route PATCH /incident-reports/:incidentId/status
 * @param {Request} req - Express request object (expects incidentId in params and status in body)
 * @param {Response} res - Express response object (returns updated incident report)
 * @param {NextFunction} next - Express next middleware
 * @returns {Promise<void>}
 * @async
 */
export const updateIncidentReportStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status } = req.body;
    if (!status) {
      return next(new BadRequestError('Status is required in request body'));
    }

    const validStatuses = ['pending', 'in_progress', 'fulfilled'];
    if (!validStatuses.includes(status)) {
      return next(
        new BadRequestError(
          `Status must be one of: ${validStatuses.join(', ')}`
        )
      );
    }

    const incidentReport = await new IncidentReportService().updateStatus(
      req.params.incidentId,
      status
    );
    res.json({
      message: 'Incident report status updated',
      data: incidentReport,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Search incident reports by title, description, status, theater, hall, user, or date range.
 * @route GET /incident-reports/search
 * @param {Request} req - Express request object (expects search criteria in query params)
 * @param {Response} res - Express response object (returns search results)
 * @param {NextFunction} next - Express next middleware
 * @returns {Promise<void>}
 * @async
 */
export const searchIncidentReports = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      title,
      description,
      status,
      theaterId,
      hallId,
      userId,
      dateFrom,
      dateTo,
      limit,
      offset,
    } = req.query;

    // Validate that at least one search parameter is provided
    if (
      !title &&
      !description &&
      !status &&
      !theaterId &&
      !hallId &&
      !userId &&
      !dateFrom &&
      !dateTo
    ) {
      return next(
        new BadRequestError('At least one search parameter is required')
      );
    }

    const searchQuery: any = {};
    if (title) searchQuery.title = title as string;
    if (description) searchQuery.description = description as string;
    if (status) searchQuery.status = status as string;
    if (theaterId) searchQuery.theaterId = theaterId as string;
    if (hallId) searchQuery.hallId = hallId as string;
    if (userId) searchQuery.userId = userId as string;
    if (dateFrom) searchQuery.dateFrom = new Date(dateFrom as string);
    if (dateTo) searchQuery.dateTo = new Date(dateTo as string);

    const options: any = {};
    if (limit) options.limit = parseInt(limit as string);
    if (offset) options.offset = parseInt(offset as string);

    const incidentReports = await new IncidentReportService().search(
      searchQuery,
      options
    );
    res.json({
      message: 'Incident reports search results',
      data: incidentReports,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get incident report statistics.
 * @route GET /incident-reports/statistics
 * @param {Request} req - Express request object (optional theaterId query param)
 * @param {Response} res - Express response object (returns statistics)
 * @param {NextFunction} next - Express next middleware
 * @returns {Promise<void>}
 * @async
 */
export const getIncidentReportStatistics = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const theaterId = req.query.theaterId as string | undefined;
    const statistics = await new IncidentReportService().getStatistics(
      theaterId
    );
    res.json({ message: 'Incident report statistics', data: statistics });
  } catch (err) {
    next(err);
  }
};
