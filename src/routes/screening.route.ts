import { Router } from 'express';
import { screeningController } from '../controllers/screening.controller.js';
import {
  decodeJwtToken,
  requireStaffOrAdmin,
} from '../middlewares/auth.middleware.js';
import {
  validateCreateScreening,
  validateUpdateScreening,
  validateScreeningIdParam,
  validateMovieIdParam,
  validateTheaterIdParam,
  validateHallIdParams,
  validateDateParam,
  validateListScreenings,
  validateSearchScreenings,
  validateMultipleScreenings,
  validateSchedulingConflict,
  validateSlotAvailability,
  validateAvailableSlots,
  validateTheaterSchedule,
  validateMovieShowtimes,
  validateGenerateMonthlySchedule,
  validateClearMonthlySchedule,
  validateInitializeDatabase,
} from '../validators/screening.validator.js';

const screeningRouter = Router();

/* =============== ROUTES =============== */

/** Initialize database with screenings for all theaters/halls - Staff/Admin only */
screeningRouter.post(
  '/init-db',
  decodeJwtToken,
  requireStaffOrAdmin,
  validateInitializeDatabase,
  screeningController.initializeDatabase
);

/** Create new screening - Staff/Admin only */
screeningRouter.post(
  '/',
  decodeJwtToken,
  requireStaffOrAdmin,
  validateCreateScreening,
  screeningController.createScreening
);

/** Public screening queries - no auth required */
screeningRouter.get(
  '/search',
  validateSearchScreenings,
  screeningController.searchScreenings
);

/** Get screening statistics - Staff/Admin only */
screeningRouter.get(
  '/stats',
  decodeJwtToken,
  requireStaffOrAdmin,
  screeningController.getScreeningStats
);

/** Get upcoming screenings - public access */
screeningRouter.get(
  '/upcoming',
  validateListScreenings,
  screeningController.getUpcomingScreenings
);

/** Get past screenings - public access */
screeningRouter.get(
  '/past',
  validateListScreenings,
  screeningController.getPastScreenings
);

/** Get multiple specific screenings - Staff/Admin only */
screeningRouter.post(
  '/multiple',
  decodeJwtToken,
  requireStaffOrAdmin,
  validateMultipleScreenings,
  validateListScreenings,
  screeningController.getMultipleScreenings
);

/** Get screenings by movie - public access */
screeningRouter.get(
  '/movie/:movieId',
  validateMovieIdParam,
  validateListScreenings,
  screeningController.getScreeningsByMovie
);

/** Get movie showtimes - public access */
screeningRouter.get(
  '/movie/:movieId/showtimes',
  validateMovieIdParam,
  validateMovieShowtimes,
  screeningController.getMovieShowtimes
);

/** Get screenings by theater - public access */
screeningRouter.get(
  '/theater/:theaterId',
  validateTheaterIdParam,
  validateListScreenings,
  screeningController.getScreeningsByTheater
);

/** Get theater schedule for specific date - public access */
screeningRouter.get(
  '/theater/:theaterId/schedule/:date',
  validateTheaterIdParam,
  validateDateParam,
  validateTheaterSchedule,
  screeningController.getTheaterSchedule
);

/** Get screenings by hall - public access */
screeningRouter.get(
  '/theater/:theaterId/hall/:hallId',
  validateHallIdParams,
  validateListScreenings,
  screeningController.getScreeningsByHall
);

/** Check scheduling conflicts - Staff/Admin only */
screeningRouter.post(
  '/theater/:theaterId/hall/:hallId/conflicts',
  decodeJwtToken,
  requireStaffOrAdmin,
  validateHallIdParams,
  validateSchedulingConflict,
  screeningController.checkSchedulingConflicts
);

/** Check slot availability - Staff/Admin only */
screeningRouter.post(
  '/theater/:theaterId/hall/:hallId/availability',
  decodeJwtToken,
  requireStaffOrAdmin,
  validateHallIdParams,
  validateSlotAvailability,
  screeningController.checkSlotAvailability
);

/** Find available time slots - Staff/Admin only */
screeningRouter.get(
  '/theater/:theaterId/hall/:hallId/available-slots',
  decodeJwtToken,
  requireStaffOrAdmin,
  validateHallIdParams,
  validateAvailableSlots,
  screeningController.findAvailableSlots
);

/** Generate monthly schedule for theater hall - Staff/Admin only */
screeningRouter.post(
  '/theater/:theaterId/hall/:hallId/generate-monthly',
  decodeJwtToken,
  requireStaffOrAdmin,
  validateHallIdParams,
  validateGenerateMonthlySchedule,
  screeningController.generateMonthlySchedule
);

/** Clear monthly schedule for theater hall - Staff/Admin only */
screeningRouter.delete(
  '/theater/:theaterId/hall/:hallId/clear-monthly',
  decodeJwtToken,
  requireStaffOrAdmin,
  validateHallIdParams,
  validateClearMonthlySchedule,
  screeningController.clearMonthlySchedule
);

/** Get screenings by date - public access */
screeningRouter.get(
  '/date/:date',
  validateDateParam,
  validateListScreenings,
  screeningController.getScreeningsByDate
);

/** List screenings with pagination and filters - public access */
screeningRouter.get(
  '/',
  validateListScreenings,
  screeningController.listScreenings
);

/** Get screening by ID - public access */
screeningRouter.get(
  '/:screeningId',
  validateScreeningIdParam,
  screeningController.getScreeningById
);

/** Update screening - Staff/Admin only */
screeningRouter.patch(
  '/:screeningId',
  decodeJwtToken,
  requireStaffOrAdmin,
  validateScreeningIdParam,
  validateUpdateScreening,
  screeningController.updateScreening
);

/** Check if screening exists - public access */
screeningRouter.get(
  '/:screeningId/exists',
  validateScreeningIdParam,
  screeningController.checkScreeningExists
);

/** Delete screening - Staff/Admin only */
screeningRouter.delete(
  '/:screeningId',
  decodeJwtToken,
  requireStaffOrAdmin,
  validateScreeningIdParam,
  screeningController.deleteScreening
);

export default screeningRouter;
