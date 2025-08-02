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
  hallScreeningsValidator, // <-- Validator for hallId param + theaterId query
  theaterIdParamValidator,
} from '../validators/movie-hall.validator.js';

import { dateParamValidator } from '../validators/date.validator.js';
import { getBookedSeatsByScreeningId } from '../controllers/booked-seat.controller.js';

const router = express.Router();

/* ---------------------------------------------------------------------
   ROUTES: Screenings API
--------------------------------------------------------------------- */

// ---------------------- Create a new screening (Staff Only) ----------------------
/**
 * @swagger
 * /screenings/:
 *   post:
 *     summary: Create a new screening (staff only)
 *     tags: [Screenings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Screening'
 *     responses:
 *       201:
 *         description: Screening created
 */
router.post(
  '/',
  decodeJwtToken,
  permission.isStaff,
  createScreeningValidator,
  handleValidationError,
  createScreening
);

// ---------------------- List all screenings ----------------------
/**
 * @swagger
 * /screenings/:
 *   get:
 *     summary: List all screenings
 *     tags: [Screenings]
 *     responses:
 *       200:
 *         description: List of screenings
 */
router.get('/', getAllScreenings);

// ---------------------- Search screenings (query/filter) ----------------------
/**
 * @swagger
 * /screenings/search:
 *   get:
 *     summary: Search screenings (text query or filters)
 *     tags: [Screenings]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query string
 *     responses:
 *       200:
 *         description: Search results
 */
router.get(
  '/search',
  searchScreeningValidator,
  handleValidationError,
  searchScreenings
);

// ---------------------- Get screening by ID ----------------------
/**
 * @swagger
 * /screenings/{screeningId}:
 *   get:
 *     summary: Get screening by ID
 *     tags: [Screenings]
 *     parameters:
 *       - in: path
 *         name: screeningId
 *         required: true
 *         schema:
 *           type: string
 *         description: Screening unique ID
 *     responses:
 *       200:
 *         description: Screening found
 *       404:
 *         description: Screening not found
 */
router.get(
  '/:screeningId',
  screeningIdParamValidator,
  handleValidationError,
  getScreeningById
);

// ---------------------- Update a screening (Staff Only) ----------------------
/**
 * @swagger
 * /screenings/{screeningId}:
 *   patch:
 *     summary: Update a screening (staff only)
 *     tags: [Screenings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: screeningId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Screening'
 *     responses:
 *       200:
 *         description: Screening updated
 *       404:
 *         description: Screening not found
 */
router.patch(
  '/:screeningId',
  decodeJwtToken,
  permission.isStaff,
  screeningIdParamValidator,
  updateScreeningValidator,
  handleValidationError,
  updateScreening
);

// ---------------------- Delete a screening (Staff Only) ----------------------
/**
 * @swagger
 * /screenings/{screeningId}:
 *   delete:
 *     summary: Delete a screening (staff only)
 *     tags: [Screenings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: screeningId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Screening deleted
 *       404:
 *         description: Screening not found
 */
router.delete(
  '/:screeningId',
  decodeJwtToken,
  permission.isStaff,
  screeningIdParamValidator,
  handleValidationError,
  deleteScreening
);

// ---------------------- List screenings by movie ID ----------------------
/**
 * @swagger
 * /screenings/movie/{movieId}:
 *   get:
 *     summary: List screenings by movie ID
 *     tags: [Screenings]
 *     parameters:
 *       - in: path
 *         name: movieId
 *         required: true
 *         schema:
 *           type: string
 *         description: Movie unique ID
 *     responses:
 *       200:
 *         description: Screenings found
 */
router.get(
  '/movie/:movieId',
  movieIdParamValidator,
  handleValidationError,
  getScreeningsByMovieId
);

// ---------------------- List screenings by theater ID ----------------------
/**
 * @swagger
 * /screenings/theater/{theaterId}:
 *   get:
 *     summary: List screenings by theater ID
 *     tags: [Screenings]
 *     parameters:
 *       - in: path
 *         name: theaterId
 *         required: true
 *         schema:
 *           type: string
 *         description: Theater unique ID
 *     responses:
 *       200:
 *         description: Screenings found
 */
router.get(
  '/theater/:theaterId',
  theaterIdParamValidator,
  handleValidationError,
  getScreeningsByTheaterId
);

// ---------------------- List screenings by hall ID (with theaterId query) ----------------------
/**
 * @swagger
 * /screenings/hall/{hallId}:
 *   get:
 *     summary: List screenings by hall ID (requires theaterId query param)
 *     tags: [Screenings]
 *     parameters:
 *       - in: path
 *         name: hallId
 *         required: true
 *         schema:
 *           type: string
 *         description: Hall unique ID
 *       - in: query
 *         name: theaterId
 *         required: true
 *         schema:
 *           type: string
 *         description: Theater unique ID
 *     responses:
 *       200:
 *         description: Screenings found
 */
router.get(
  '/hall/:hallId',
  hallScreeningsValidator, // <<-- USES proper validator for hallId param + theaterId query
  handleValidationError,
  getScreeningsByHallId
);

// ---------------------- List screenings by date ----------------------
/**
 * @swagger
 * /screenings/date/{date}:
 *   get:
 *     summary: List screenings by date (YYYY-MM-DD)
 *     tags: [Screenings]
 *     parameters:
 *       - in: path
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *         description: Date in format YYYY-MM-DD
 *     responses:
 *       200:
 *         description: Screenings found
 */
router.get(
  '/date/:date',
  dateParamValidator,
  handleValidationError,
  getScreeningsByDate
);

// ---------------------- List all booked seats for a screening ----------------------
/**
 * @swagger
 * /screenings/{screeningId}/booked-seats:
 *   get:
 *     summary: List all booked seats for a screening
 *     tags: [Screenings]
 *     parameters:
 *       - in: path
 *         name: screeningId
 *         required: true
 *         schema:
 *           type: string
 *         description: Screening unique ID
 *     responses:
 *       200:
 *         description: Booked seats list
 */
router.get('/:screeningId/booked-seats', getBookedSeatsByScreeningId);

export default router;
