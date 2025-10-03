import { Router } from 'express';
import { movieStatsController } from '../controllers/movie-stats.controller.js';

import {
  decodeJwtToken,
  requireStaffOrAdmin,
} from '../middlewares/auth.middleware.js';
import {
  validateMovieIdParam,
  validateMultipleMovieStats,
} from '../validators/movie-stat.validator.js';

const movieStatsRouter = Router();

/**
 * @route GET /api/movies/stats
 * @description Get statistics for multiple movies (comma-separated movieIds)
 * @access Staff or Admin only
 * @query movieIds - Comma-separated list of movie UUIDs
 * @example /api/movies/stats?movieIds=uuid1,uuid2,uuid3
 */
movieStatsRouter.get(
  '/stats',
  decodeJwtToken,
  requireStaffOrAdmin,
  validateMultipleMovieStats,
  movieStatsController.getMultipleMovieStats
);

/**
 * @route GET /api/movies/:movieId/stats
 * @description Get booking statistics for a specific movie
 * @access Staff or Admin only
 * @param movieId - Movie UUID
 * @example /api/movies/550e8400-e29b-41d4-a716-446655440000/stats
 */
movieStatsRouter.get(
  '/:movieId/stats',
  decodeJwtToken,
  requireStaffOrAdmin,
  validateMovieIdParam,
  movieStatsController.getMovieStats
);

export default movieStatsRouter;
