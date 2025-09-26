import { Router } from 'express';
import { movieController } from '../controllers/movie.controller.js';
import {
  decodeJwtToken,
  requireAdmin,
  requireStaffOrAdmin,
} from '../middlewares/auth.middleware.js';
import {
  validateCreateMovie,
  validateUpdateMovie,
  validateMovieIdParam,
  validateListMovies,
  validateSearchMovies,
} from '../validators/movie.validator.js';

const router = Router();

/** Public routes - no authentication required */
router.get(
  '/',
  validateListMovies,
  movieController.listMovies
);
router.get(
  '/search',
  validateSearchMovies,
  movieController.searchMovies
);
router.get('/recommended', movieController.getRecommendedMovies);
router.get('/genre/:genre', movieController.getMoviesByGenre);
router.get('/director/:director', movieController.getMoviesByDirector);
router.get(
  '/:movieId',
  validateMovieIdParam,
  movieController.getMovieById
);

/** Protected routes - require staff or admin */
router.post(
  '/',
  decodeJwtToken,
  requireStaffOrAdmin,
  validateCreateMovie,
  movieController.createMovie
);

router.patch(
  '/:movieId',
  decodeJwtToken,
  requireStaffOrAdmin,
  validateUpdateMovie,
  movieController.updateMovie
);

router.post(
  '/:movieId/toggle-recommendation',
  decodeJwtToken,
  requireStaffOrAdmin,
  validateMovieIdParam,
  movieController.toggleRecommendation
);

/** Admin only routes */
router.delete(
  '/:movieId',
  decodeJwtToken,
  requireAdmin,
  validateMovieIdParam,
  movieController.deleteMovie
);

export default router;
