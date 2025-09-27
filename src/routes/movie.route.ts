import { Router, Request, Response, NextFunction } from 'express';
import { movieController } from '../controllers/movie.controller.js';
import {
  decodeJwtToken,
  requireAdmin,
  requireStaffOrAdmin,
} from '../middlewares/auth.middleware.js';
import {
  uploadMiddleware,
  handleUploadErrors,
} from '../middlewares/upload.middleware.js';

const movieRouter = Router();

/* =============== ROUTES =============== */

/** Create movie - Admin/Staff only */
movieRouter.post(
  '/',
  decodeJwtToken,
  requireStaffOrAdmin,
  uploadMiddleware.singleImage('poster'),
  movieController.createMovie
);

/** Public movie queries - no auth required */
movieRouter.get('/search', movieController.searchMovies);
movieRouter.get('/upcoming', movieController.getUpcomingMovies);
movieRouter.get('/theater/:theaterId', movieController.getMoviesByTheater);
movieRouter.get('/screening/:screeningId', movieController.getMovieByScreening);

/** List movies - Admin/Staff can see all, public can see basic list */
movieRouter.get('/', movieController.listMovies);

/** Get movie by ID - public access */
movieRouter.get('/:movieId', movieController.getMovieById);

/** Update movie - Admin/Staff only */
movieRouter.patch(
  '/:movieId',
  decodeJwtToken,
  requireStaffOrAdmin,
  uploadMiddleware.singleImage('poster'),
  movieController.updateMovie
);

/** Delete movie - Admin only */
movieRouter.delete(
  '/:movieId',
  decodeJwtToken,
  requireStaffOrAdmin,
  movieController.deleteMovie
);

/* =============== ERROR HANDLING =============== */

// Handle upload errors through centralized error handler
movieRouter.use(handleUploadErrors);

export default movieRouter;
