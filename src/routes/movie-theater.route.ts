import { Router } from 'express';
import { movieTheaterController } from '../controllers/movie-theater.controller.js';
import {
  decodeJwtToken,
  requireAdmin,
  requireStaffOrAdmin,
} from '../middlewares/auth.middleware.js';
import {
  validateCreateMovieTheater,
  validateUpdateMovieTheater,
  validateMovieTheaterIdParam,
  validateListMovieTheaters,
  validateSearchMovieTheaters,
} from '../validators/movie-theater.validator.js';

const movieTheaterRouter = Router();

/* =============== ROUTES =============== */

movieTheaterRouter.post(
  '/',
  decodeJwtToken,
  requireStaffOrAdmin,
  validateCreateMovieTheater,
  movieTheaterController.createTheater
);

/** Public theater queries - no auth required */
movieTheaterRouter.get(
  '/search',
  validateSearchMovieTheaters,
  movieTheaterController.searchTheaters
);

movieTheaterRouter.get('/all', movieTheaterController.getAllTheaters);

movieTheaterRouter.get(
  '/stats',
  decodeJwtToken,
  requireStaffOrAdmin,
  movieTheaterController.getTheaterStats
);

/** List theaters with pagination and filters - public access */
movieTheaterRouter.get(
  '/',
  validateListMovieTheaters,
  movieTheaterController.listTheaters
);

/** Get theater by ID - public access */
movieTheaterRouter.get(
  '/:theaterId',
  validateMovieTheaterIdParam,
  movieTheaterController.getTheaterById
);

/** Update theater - Admin only */
movieTheaterRouter.patch(
  '/:theaterId',
  decodeJwtToken,
  requireStaffOrAdmin,
  validateUpdateMovieTheater,
  movieTheaterController.updateTheater
);

/** Delete theater - Admin only */
movieTheaterRouter.delete(
  '/:theaterId',
  decodeJwtToken,
  requireStaffOrAdmin,
  movieTheaterController.deleteTheater
);

export default movieTheaterRouter;
