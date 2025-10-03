/**
 * @module controllers/movie-stats.controller
 *
 * Express controller for movie booking statistics with MongoDB integration.
 *
 * @description
 * This controller provides endpoints for retrieving booking statistics for movies.
 * Statistics are tracked in MongoDB via the MovieStatsService and include daily
 * booking counts over a rolling 7-day period.
 *
 * @features
 * - Retrieve statistics by movie ID
 * - Standard error handling and response format
 * - Integration with MongoDB-based stats tracking
 */

import { Request, Response, NextFunction } from 'express';
import movieStatsService from '../services/movie-stats.service.js';
import { NotFoundError } from '../errors/not-found-error.js';
import { BadRequestError } from '../errors/bad-request-error.js';

export class MovieStatsController {
  /**
   * Get booking statistics for a specific movie.
   * @route GET /api/movies/:movieId/stats
   *
   * @description
   * Returns aggregated booking data for a movie from MongoDB including:
   * - Movie ID
   * - Array of daily booking counts (up to 7 days)
   * - Date and number pairs for each tracked day
   *
   * @param {Request} req - Express request (params: movieId)
   * @param {Response} res - Express response
   * @param {NextFunction} next - Express next function
   *
   * @returns {Promise<void>}
   *
   * @example Success Response (200):
   * {
   *   "message": "Movie stats retrieved successfully",
   *   "data": {
   *     "_id": "507f1f77bcf86cd799439011",
   *     "movieId": "550e8400-e29b-41d4-a716-446655440000",
   *     "bookingNumbers": [
   *       { "date": "2025-10-03", "number": 25 },
   *       { "date": "2025-10-02", "number": 30 },
   *       { "date": "2025-10-01", "number": 28 }
   *     ]
   *   }
   * }
   *
   * @example Not Found Response (404):
   * {
   *   "message": "Stats not found for movie",
   *   "data": null
   * }
   *
   * @example Error Response (400):
   * {
   *   "message": "movieId is required",
   *   "data": null
   * }
   */
  getMovieStats = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { movieId } = req.params;

      // Validate movieId parameter
      if (
        !movieId ||
        typeof movieId !== 'string' ||
        movieId.trim().length === 0
      ) {
        throw new BadRequestError(
          'movieId is required and must be a valid string'
        );
      }

      // Retrieve stats from MongoDB
      const stats = await movieStatsService.getStatsByMovieId(movieId);

      // Handle case where no stats exist for this movie
      if (!stats) {
        throw new NotFoundError(`Stats not found for movie ${movieId}`);
      }

      // Return successful response with stats data
      res.status(200).json({
        message: 'Movie stats retrieved successfully',
        data: stats,
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({
          message: error.message,
          data: null,
        });
        return;
      }
      if (error instanceof BadRequestError) {
        res.status(400).json({
          message: error.message,
          data: null,
        });
        return;
      }
      next(error);
    }
  };

  /**
   * Get statistics for multiple movies.
   * @route GET /api/movies/stats
   *
   * @description
   * Returns booking statistics for multiple movies based on query parameters.
   * Useful for dashboard views or comparative analytics.
   *
   * @param {Request} req - Express request (query: movieIds as comma-separated string)
   * @param {Response} res - Express response
   * @param {NextFunction} next - Express next function
   *
   * @returns {Promise<void>}
   *
   * @example Success Response (200):
   * {
   *   "message": "Stats retrieved for 3 movies",
   *   "data": [
   *     { "movieId": "movie-1", "bookingNumbers": [...] },
   *     { "movieId": "movie-2", "bookingNumbers": [...] }
   *   ]
   * }
   */
  getMultipleMovieStats = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { movieIds } = req.query;

      if (!movieIds || typeof movieIds !== 'string') {
        throw new BadRequestError(
          'movieIds query parameter is required (comma-separated)'
        );
      }

      // Parse comma-separated movie IDs
      const movieIdArray = movieIds
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id.length > 0);

      if (movieIdArray.length === 0) {
        throw new BadRequestError('At least one valid movieId is required');
      }

      // Retrieve stats for all movies
      const statsPromises = movieIdArray.map((movieId) =>
        movieStatsService.getStatsByMovieId(movieId)
      );

      const statsResults = await Promise.all(statsPromises);

      // Filter out null results (movies without stats)
      const validStats = statsResults.filter((stat) => stat !== null);

      res.status(200).json({
        message: `Stats retrieved for ${validStats.length} movie(s)`,
        data: validStats,
      });
    } catch (error) {
      if (error instanceof BadRequestError) {
        res.status(400).json({
          message: error.message,
          data: null,
        });
        return;
      }
      next(error);
    }
  };
}

/** Singleton instance for routing usage */
export const movieStatsController = new MovieStatsController();
