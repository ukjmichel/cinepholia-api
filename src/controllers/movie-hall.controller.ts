/**
 * @module controllers/movie-hall.controller
 *
 * @description
 * Express controller for managing cinema halls.
 * Provides handlers for:
 * - Creating a hall
 * - Listing all halls (with optional pagination)
 * - Getting halls by theater
 * - Retrieving a hall by its composite key (theaterId + hallId)
 * - Updating a hall
 * - Deleting a hall
 * - Searching halls by theaterId or hallId
 *
 * ## Response Structure
 * All endpoints return JSON with the format:
 * ```json
 * {
 *   "message": "Short description of the result",
 *   "data": { ... } | [ ... ] | null
 * }
 * ```
 */

import { Request, Response, NextFunction } from 'express';
import { MovieHallService } from '../services/movie-hall.service.js';

const service = new MovieHallService();

/**
 * Create a new movie hall.
 *
 * @route POST /movie-halls
 * @param {Request} req - Express request (body: hall data)
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express error handler
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
 * Get all movie halls, optionally paginated using ?limit=&offset= query parameters.
 *
 * @route GET /movie-halls
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
 * @route GET /theaters/:theaterId/halls
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
 * Get a single hall by composite key (theaterId + hallId).
 *
 * @route GET /theaters/:theaterId/halls/:hallId
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
 * Update a hall by composite key (theaterId + hallId).
 *
 * @route PUT /theaters/:theaterId/halls/:hallId
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
 * Delete a hall by composite key (theaterId + hallId).
 *
 * @route DELETE /theaters/:theaterId/halls/:hallId
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
 * Search movie halls by theaterId or hallId.
 *
 * @route GET /movie-halls/search
 * @query {string} theaterId - Filter by theater ID
 * @query {string} hallId - Filter by hall ID
 * @query {number} limit - Pagination limit
 * @query {number} offset - Pagination offset
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
