/**
 * @module controllers/movie-stat.controller
 *
 * @description
 *
 * Retrieve booking statistics for a specific movie.
 *
 * This endpoint returns aggregated booking data for a movie from MongoDB
 * (via `MovieStatsService`). It requires a `movieId` path parameter.
 *
 * @response
 * All responses follow the standard `{ message, data }` JSON structure:
 * ```json
 * {
 *   "message": "Short description of the result",
 *   "data": { ... } | null
 * }
 * ```
 */

import { Request, Response } from 'express';
import MovieStatsService from '../services/movie-stats.service.js';

/**
 * @route GET /movies/:movieId/stats
 * @param {Request} req - Express request (params: movieId)
 * @param {Response} res - Express response
 */
export const getStats = async (req: Request, res: Response): Promise<void> => {
  const { movieId } = req.params;

  if (!movieId) {
    res.status(400).json({ message: 'movieId is required.', data: null });
    return;
  }

  try {
    const stats = await MovieStatsService.getStatsByMovieId(movieId);

    if (!stats) {
      res.status(404).json({ message: 'Stats not found.', data: null });
      return;
    }

    res.status(200).json({ message: 'Movie stats', data: stats });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error.', data: null });
  }
};
