import express from 'express';
import {
  createScreening,
  getScreeningById,
  updateScreening,
  deleteScreening,
  getAllScreenings,
  getScreeningsByMovieId,
  getScreeningsByTheaterId,
  getScreeningsByHallId,
  getScreeningsByDate,
  searchScreenings,
} from '../controllers/screening.controller.js';
import {
  createScreeningValidator,
  updateScreeningValidator,
  screeningIdParamValidator,
  searchScreeningValidator,
} from '../validators/screening.validator.js';
import { movieIdParamValidator } from '../validators/movie.validator.js';
import { handleValidationError } from '../middlewares/handleValidatonError.middleware.js';
import { decodeJwtToken } from '../middlewares/auth.middleware.js';
import { permission } from '../middlewares/permission.js';
import {
  movieHallIdParamsValidator,
  theaterIdParamValidator,
} from '../validators/movie-hall.validator.js';
import { dateParamValidator } from '../validators/date.validator.js';
import { getBookedSeatsByScreeningId } from '../controllers/booked-seat.controller.js';

const router = express.Router();

router.post(
  '/',
  createScreeningValidator,
  handleValidationError,
  decodeJwtToken,
  permission.isStaff,
  createScreening
);

router.get('/', getAllScreenings);

router.get(
  '/search',
  searchScreeningValidator,
  handleValidationError,
  searchScreenings
);

router.get(
  '/:screeningId',
  screeningIdParamValidator,
  handleValidationError,
  getScreeningById
);

router.patch(
  '/:screeningId',
  screeningIdParamValidator,
  updateScreeningValidator,
  handleValidationError,
  decodeJwtToken,
  permission.isStaff,
  updateScreening
);

router.delete(
  '/:screeningId',
  screeningIdParamValidator,
  handleValidationError,
  decodeJwtToken,
  permission.isStaff,
  deleteScreening
);

router.get(
  '/movie/:movieId',
  movieIdParamValidator,
  handleValidationError,
  getScreeningsByMovieId
);

router.get(
  '/theater/:theaterId',
  theaterIdParamValidator,
  handleValidationError,
  getScreeningsByTheaterId
);

router.get(
  '/hall/:hallId',
  movieHallIdParamsValidator,
  handleValidationError,
  getScreeningsByHallId
);

router.get(
  '/date/:date',
  dateParamValidator,
  handleValidationError,
  getScreeningsByDate
);

router.get('/:screeningId/booked-seats', getBookedSeatsByScreeningId);

export default router;
