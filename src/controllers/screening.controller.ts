/**
 * @module controllers/screening.controller
 *
 * @description
 * Controller for managing movie screenings.
 *
 * @features
 * - Full CRUD operations (Create, Read, Update, Delete).
 * - Search and filtering of screenings.
 * - Specialized queries:
 *   - By movie ID
 *   - By theater ID
 *   - By hall ID
 *   - By screening date
 *
 * @response
 * All endpoints return JSON in the format:
 * ```json
 * {
 *   "message": "Short description of the result",
 *   "data": { ... } | [ ... ] | null
 * }
 * ```
 * - `message`: Human-readable description of the operation result.
 * - `data`: An object, array, or `null` (for deletions or when no results are found).
 *
 * @dependencies
 * - `screeningService`: Handles all database queries and business logic for screenings.
 * - `NotFoundError`: Thrown when a requested screening does not exist.
 * - `BadRequestError`: Thrown for invalid input parameters.
 *
 * @security
 * - Validates IDs and date formats to prevent malformed queries.
 * - Relies on parameterized queries through the ORM to prevent SQL injection.
 *
 * All methods forward errors to Express via `next()`.
 */

import { Request, Response, NextFunction } from 'express';
import { screeningService } from '../services/screening.service.js';
import { ScreeningCreationAttributes } from '../models/screening.model.js';
import { BadRequestError } from '../errors/bad-request-error.js';

/**
 * Retrieve a screening by its unique ID.
 *
 * @route GET /screenings/:screeningId
 * @param {Request} req - Express request (params: `screeningId`)
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express error-handling middleware
 * @returns {200 OK | 404 Not Found} `{ message, data }`
 */
export async function getScreeningById(
  req: Request<{ screeningId: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const screening = await screeningService.getScreeningById(
      req.params.screeningId
    );
    res
      .status(200)
      .json({ message: 'Screening fetched successfully', data: screening });
  } catch (err) {
    next(err);
  }
}

/**
 * Create a new screening.
 *
 * @route POST /screenings
 * @param {Request} req - Express request (body: `ScreeningCreationAttributes`)
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express error-handling middleware
 * @returns {201 Created} `{ message, data }`
 * @throws {BadRequestError} If invalid data is provided
 */
export async function createScreening(
  req: Request<{}, {}, ScreeningCreationAttributes>,
  res: Response,
  next: NextFunction
) {
  try {
    const screening = await screeningService.createScreening(req.body);
    res
      .status(201)
      .json({ message: 'Screening created successfully', data: screening });
  } catch (err) {
    next(err);
  }
}

/**
 * Partially update an existing screening.
 *
 * @route PATCH /screenings/:screeningId
 * @param {Request} req - Express request (params: `screeningId`, body: partial fields to update)
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express error-handling middleware
 * @returns {200 OK} `{ message, data }`
 * @throws {NotFoundError} If the screening does not exist
 */
export async function updateScreening(
  req: Request<
    { screeningId: string },
    {},
    Partial<ScreeningCreationAttributes>
  >,
  res: Response,
  next: NextFunction
) {
  try {
    const screening = await screeningService.updateScreening(
      req.params.screeningId,
      req.body
    );
    res
      .status(200)
      .json({ message: 'Screening updated successfully', data: screening });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete a screening by its ID.
 *
 * @route DELETE /screenings/:screeningId
 * @param {Request} req - Express request (params: `screeningId`)
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express error-handling middleware
 * @returns {200 OK} `{ message, data: null }`
 * @throws {NotFoundError} If the screening does not exist
 */
export async function deleteScreening(
  req: Request<{ screeningId: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    await screeningService.deleteScreening(req.params.screeningId);
    res
      .status(200)
      .json({ message: 'Screening deleted successfully', data: null });
  } catch (err) {
    next(err);
  }
}

/**
 * Retrieve all screenings.
 *
 * @route GET /screenings
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express error-handling middleware
 * @returns {200 OK} `{ message, data }`
 */
export async function getAllScreenings(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const screenings = await screeningService.getAllScreenings();
    res
      .status(200)
      .json({ message: 'Screenings fetched successfully', data: screenings });
  } catch (err) {
    next(err);
  }
}

/**
 * Search screenings either by a global text query (`q`) or by advanced filters.
 *
 * @route GET /screenings/search
 * @param {Request} req - Express request (query: `q` OR advanced filters)
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express error-handling middleware
 * @returns {200 OK} `{ message, data }`
 */
export async function searchScreenings(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const results = req.query.q
      ? await screeningService.searchScreenings(String(req.query.q))
      : await screeningService.searchScreenings(req.query);

    res
      .status(200)
      .json({ message: 'Screenings search completed', data: results });
  } catch (err) {
    next(err);
  }
}

/**
 * Retrieve all screenings for a given movie.
 *
 * @route GET /movies/:movieId/screenings
 * @param {Request} req - Express request (params: `movieId`)
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express error-handling middleware
 * @returns {200 OK} `{ message, data }`
 */
export async function getScreeningsByMovieId(
  req: Request<{ movieId: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const screenings = await screeningService.getScreeningsByMovieId(
      req.params.movieId
    );
    res.status(200).json({
      message: 'Screenings by movie fetched successfully',
      data: screenings,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Retrieve all screenings for a given theater.
 *
 * @route GET /theaters/:theaterId/screenings
 * @param {Request} req - Express request (params: `theaterId`)
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express error-handling middleware
 * @returns {200 OK} `{ message, data }`
 */
export async function getScreeningsByTheaterId(
  req: Request<{ theaterId: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const screenings = await screeningService.getScreeningsByTheaterId(
      req.params.theaterId
    );
    res.status(200).json({
      message: 'Screenings by theater fetched successfully',
      data: screenings,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Retrieve all screenings for a given hall in a given theater.
 *
 * @route GET /halls/:hallId/screenings?theaterId={theaterId}
 * @param {Request} req - Express request (params: `hallId`, query: `theaterId` required)
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express error-handling middleware
 * @returns {200 OK} `{ message, data }`
 * @throws {BadRequestError} If `theaterId` is missing
 */
export async function getScreeningsByHallId(
  req: Request<{ hallId: string }, {}, {}, { theaterId?: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const { theaterId } = req.query;
    if (!theaterId) {
      return next(new BadRequestError('theaterId is required'));
    }
    const screenings = await screeningService.getScreeningsByHallId(
      req.params.hallId,
      theaterId
    );
    res.status(200).json({
      message: 'Screenings by hall fetched successfully',
      data: screenings,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Retrieve all screenings for a specific date.
 *
 * @route GET /screenings/date/:date
 * @param {Request} req - Express request (params: `date` in format YYYY-MM-DD)
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express error-handling middleware
 * @returns {200 OK} `{ message, data }`
 * @throws {BadRequestError} If date format is invalid
 */
export async function getScreeningsByDate(
  req: Request<{ date: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const date = new Date(req.params.date);
    if (isNaN(date.getTime())) {
      return next(new BadRequestError('Invalid date format'));
    }
    const screenings = await screeningService.getScreeningsByDate(date);
    res.status(200).json({
      message: 'Screenings by date fetched successfully',
      data: screenings,
    });
  } catch (err) {
    next(err);
  }
}
