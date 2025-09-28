import { Router } from 'express';
import { movieHallController } from '../controllers/movie-hall.controller.js';
import {
  decodeJwtToken,
  requireStaffOrAdmin,
} from '../middlewares/auth.middleware.js';
import {
  validateCreateMovieHall,
  validateUpdateMovieHall,
  validateMovieHallParams,
  validateTheaterIdParam,
  validateQualityParam,
  validateListMovieHalls,
  validateSearchMovieHalls,
  validateMultipleHalls,
  validateHallQualities,
  validateHallLayout,
} from '../validators/movie-hall.validator.js';

const movieHallRouter = Router();

/* =============== ROUTES =============== */

/** Create new hall - Staff/Admin only */
movieHallRouter.post(
  '/',
  decodeJwtToken,
  requireStaffOrAdmin,
  validateCreateMovieHall,
  movieHallController.createHall
);

/** Public hall queries - no auth required */
movieHallRouter.get(
  '/search',
  validateSearchMovieHalls,
  movieHallController.searchHalls
);

/** Get hall statistics - Staff/Admin only */
movieHallRouter.get(
  '/stats',
  decodeJwtToken,
  requireStaffOrAdmin,
  movieHallController.getHallStats
);

/** Get halls by quality - public access */
movieHallRouter.get(
  '/quality/:quality',
  validateQualityParam,
  validateListMovieHalls,
  movieHallController.getHallsByQuality
);

/** Get halls by multiple qualities - public access */
movieHallRouter.post(
  '/qualities',
  validateHallQualities,
  validateListMovieHalls,
  movieHallController.getHallsByQualities
);

/** Get multiple specific halls - public access */
movieHallRouter.post(
  '/multiple',
  validateMultipleHalls,
  validateListMovieHalls,
  movieHallController.getMultipleHalls
);

/** Get halls by theater - public access */
movieHallRouter.get(
  '/theater/:theaterId',
  validateTheaterIdParam,
  validateListMovieHalls,
  movieHallController.getHallsByTheater
);

/** Get theater capacity summary - public access */
movieHallRouter.get(
  '/theater/:theaterId/capacities',
  validateTheaterIdParam,
  movieHallController.getTheaterCapacities
);

/** Validate hall layout - Staff/Admin only */
movieHallRouter.post(
  '/validate-layout',
  decodeJwtToken,
  requireStaffOrAdmin,
  validateHallLayout,
  movieHallController.validateHallLayout
);

/** List halls with pagination and filters - public access */
movieHallRouter.get('/', validateListMovieHalls, movieHallController.listHalls);

/** Get hall by composite key - public access */
movieHallRouter.get(
  '/:theaterId/:hallId',
  validateMovieHallParams,
  movieHallController.getHallById
);

/** Update hall - Staff/Admin only */
movieHallRouter.patch(
  '/:theaterId/:hallId',
  decodeJwtToken,
  requireStaffOrAdmin,
  validateUpdateMovieHall,
  movieHallController.updateHall
);

/** Update hall layout only - Staff/Admin only */
movieHallRouter.patch(
  '/:theaterId/:hallId/layout',
  decodeJwtToken,
  requireStaffOrAdmin,
  validateMovieHallParams,
  validateHallLayout,
  movieHallController.updateHallLayout
);

/** Get hall capacity info - public access */
movieHallRouter.get(
  '/:theaterId/:hallId/capacity',
  validateMovieHallParams,
  movieHallController.getHallCapacity
);

/** Check if hall exists - public access */
movieHallRouter.get(
  '/:theaterId/:hallId/exists',
  validateMovieHallParams,
  movieHallController.checkHallExists
);

/** Get hall seat IDs - public access */
movieHallRouter.get(
  '/:theaterId/:hallId/seats',
  validateMovieHallParams,
  movieHallController.getHallSeatIds
);

/** Delete hall - Staff/Admin only */
movieHallRouter.delete(
  '/:theaterId/:hallId',
  decodeJwtToken,
  requireStaffOrAdmin,
  validateMovieHallParams,
  movieHallController.deleteHall
);

export default movieHallRouter;
