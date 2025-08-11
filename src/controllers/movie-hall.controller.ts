/**
 * @module controllers/movie-hall.controller
 *
 * @description
 * Express controller for managing cinema halls.
 *
 * @features
 * - Create a new hall.
 * - List all halls with optional pagination.
 * - Get all halls for a specific theater.
 * - Retrieve a hall by its composite key (theaterId + hallId).
 * - Update hall details.
 * - Delete a hall.
 * - Search halls by `theaterId` or `hallId`.
 *
 * @response
 * All endpoints return JSON in the following format:
 * ```json
 * {
 *   "message": "Short description of the result",
 *   "data": { ... } | [ ... ] | null
 * }
 * ```
 * - `message`: Human-readable description of the operation result.
 * - `data`: An object, array, or `null` (for deletions or no matches found).
 *
 * @dependencies
 * - `movieHallService`: Business logic and database operations for halls.
 * - `NotFoundError`: Thrown when the requested hall is not found.
 * - `BadRequestError`: Thrown when provided input is invalid.
 */

import { Request, Response, NextFunction } from 'express';
import { MovieHallService } from '../services/movie-hall.service.js';

const service = new MovieHallService();

/**
 * Create a new movie hall.
 *
 * @param {Request} req - Express request containing hall data in `body`.
 * @param {Response} res - Express response used to send the created hall data.
 * @param {NextFunction} next - Express error handler callback.
 * @returns {Promise<void>} A promise resolving to a JSON response with the created hall.
 */
export async function createMovieHall(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const hall = await service.create(req.body);
    res.status(201).json({ message: 'Movie hall created', data: hall });
  } catch (err) {
    next(err);
  }
}

/**
 * Get all movie halls, optionally paginated using `limit` and `offset` query parameters.
 *
 * @param {Request} req - Express request with optional `limit` and `offset` query parameters.
 * @param {Response} res - Express response used to send the list of halls.
 * @param {NextFunction} next - Express error handler callback.
 * @returns {Promise<void>} A promise resolving to a JSON response with the list of halls.
 */
export async function getAllMovieHalls(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { limit, offset } = req.query;
    const halls = await service.findAll({
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
    res.json({ message: 'All movie halls', data: halls });
  } catch (err) {
    next(err);
  }
}

/**
 * Get all movie halls for a given theater.
 *
 * @param {Request} req - Express request containing `theaterId` in route parameters.
 * @param {Response} res - Express response used to send the list of halls.
 * @param {NextFunction} next - Express error handler callback.
 * @returns {Promise<void>} A promise resolving to a JSON response with the halls for the theater.
 */
export async function getMovieHallsByTheater(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const halls = await service.findAllByTheaterId(req.params.theaterId);
    res.json({
      message: `Movie halls for theater ${req.params.theaterId}`,
      data: halls,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get a single hall by composite key (`theaterId` + `hallId`).
 *
 * @param {Request} req - Express request containing `theaterId` and `hallId` in route parameters.
 * @param {Response} res - Express response used to send the hall data.
 * @param {NextFunction} next - Express error handler callback.
 * @returns {Promise<void>} A promise resolving to a JSON response with the hall data.
 */
export async function getMovieHall(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const hall = await service.findByTheaterIdAndHallId(
      req.params.theaterId,
      req.params.hallId
    );
    res.json({
      message: 'Movie hall found',
      data: hall,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update a hall by composite key (`theaterId` + `hallId`).
 *
 * @param {Request} req - Express request containing hall update data in `body` and `theaterId`, `hallId` in route parameters.
 * @param {Response} res - Express response used to send the updated hall data.
 * @param {NextFunction} next - Express error handler callback.
 * @returns {Promise<void>} A promise resolving to a JSON response with the updated hall.
 */
export async function updateMovieHall(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const hall = await service.updateByTheaterIdAndHallId(
      req.params.theaterId,
      req.params.hallId,
      req.body
    );
    res.json({ message: 'Movie hall updated', data: hall });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete a hall by composite key (`theaterId` + `hallId`).
 *
 * @param {Request} req - Express request containing `theaterId` and `hallId` in route parameters.
 * @param {Response} res - Express response used to confirm deletion.
 * @param {NextFunction} next - Express error handler callback.
 * @returns {Promise<void>} A promise resolving to a JSON response confirming deletion.
 */
export async function deleteMovieHall(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    await service.deleteByTheaterIdAndHallId(
      req.params.theaterId,
      req.params.hallId
    );
    res.json({ message: 'Movie hall deleted', data: null });
  } catch (err) {
    next(err);
  }
}

/**
 * Search movie halls by `theaterId` or `hallId`.
 *
 * @param {Request} req - Express request containing optional query params:
 *   - `theaterId` {string} - Filter by theater ID.
 *   - `hallId` {string} - Filter by hall ID.
 *   - `limit` {number} - Pagination limit.
 *   - `offset` {number} - Pagination offset.
 * @param {Response} res - Express response used to send the search results.
 * @param {NextFunction} next - Express error handler callback.
 * @returns {Promise<void>} A promise resolving to a JSON response with the search results.
 */
export async function searchMovieHalls(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { theaterId, hallId, limit, offset } = req.query;
    const halls = await service.searchByTheaterIdOrHallId({
      theaterId: theaterId as string | undefined,
      hallId: hallId as string | undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
    res.json({ message: 'Search results', data: halls });
  } catch (err) {
    next(err);
  }
}
