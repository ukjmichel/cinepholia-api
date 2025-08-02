import express from 'express';
// Controllers
import {
  createMovieHall,
  getAllMovieHalls,
  getMovieHallsByTheater,
  getMovieHall,
  updateMovieHall,
  deleteMovieHall,
  searchMovieHalls,
} from '../controllers/movie-hall.controller.js';
// Validators
import {
  createMovieHallValidator,
  updateMovieHallValidator,
  searchMovieHallValidator,
  theaterIdParamValidator,
  movieHallIdParamsValidator,
} from '../validators/movie-hall.validator.js';
// Middleware
import { handleValidationError } from '../middlewares/handleValidatonError.middleware.js';
import { decodeJwtToken } from '../middlewares/auth.middleware.js';
import { permission } from '../middlewares/permission.js';

const router = express.Router();

/**
 * @swagger
 * /movie-halls:
 *   post:
 *     summary: Create a new movie hall
 *     tags: [Movie Halls]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MovieHallCreate'
 *     responses:
 *       201:
 *         description: Movie hall created successfully
 *       400:
 *         description: Validation error
 */
router.post(
  '/',
  createMovieHallValidator,
  handleValidationError,
  decodeJwtToken,
  permission.isStaff,
  createMovieHall
);

/**
 * @swagger
 * /movie-halls:
 *   get:
 *     summary: Get all movie halls
 *     tags: [Movie Halls]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Max number of results
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *         description: Skip N results
 *     responses:
 *       200:
 *         description: List of all movie halls
 */
router.get('/', getAllMovieHalls);

/**
 * @swagger
 * /movie-halls/theater/{theaterId}:
 *   get:
 *     summary: Get all halls by theaterId
 *     tags: [Movie Halls]
 *     parameters:
 *       - in: path
 *         name: theaterId
 *         required: true
 *         schema:
 *           type: string
 *         description: Theater ID
 *     responses:
 *       200:
 *         description: List of halls for the theater
 *       400:
 *         description: Validation error
 */
router.get(
  '/theater/:theaterId',
  theaterIdParamValidator,
  handleValidationError,
  getMovieHallsByTheater
);

/**
 * @swagger
 * /movie-halls/search:
 *   get:
 *     summary: Search halls by theaterId or hallId
 *     tags: [Movie Halls]
 *     parameters:
 *       - in: query
 *         name: theaterId
 *         schema:
 *           type: string
 *         description: Theater ID filter
 *       - in: query
 *         name: hallId
 *         schema:
 *           type: string
 *         description: Hall ID filter
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Max number of results
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *         description: Number of results to skip
 *     responses:
 *       200:
 *         description: List of halls matching the filters
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MovieHall'
 *       400:
 *         description: Validation error
 */
router.get(
  '/search',
  searchMovieHallValidator,
  handleValidationError,
  searchMovieHalls
);

/**
 * @swagger
 * /movie-halls/{theaterId}/{hallId}:
 *   get:
 *     summary: Get a single movie hall by theater and hall ID
 *     tags: [Movie Halls]
 *     parameters:
 *       - in: path
 *         name: theaterId
 *         required: true
 *         schema:
 *           type: string
 *         description: Theater ID
 *       - in: path
 *         name: hallId
 *         required: true
 *         schema:
 *           type: string
 *         description: Hall ID
 *     responses:
 *       200:
 *         description: Movie hall object
 *       400:
 *         description: Validation error
 *       404:
 *         description: Hall not found
 */
router.get(
  '/:theaterId/:hallId',
  movieHallIdParamsValidator,
  handleValidationError,
  getMovieHall
);

/**
 * @swagger
 * /movie-halls/{theaterId}/{hallId}:
 *   patch:
 *     summary: Update a movie hall by composite PK
 *     tags: [Movie Halls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: theaterId
 *         required: true
 *         schema:
 *           type: string
 *         description: Theater ID
 *       - in: path
 *         name: hallId
 *         required: true
 *         schema:
 *           type: string
 *         description: Hall ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MovieHallUpdate'
 *     responses:
 *       200:
 *         description: Movie hall updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Hall not found
 */
router.patch(
  '/:theaterId/:hallId',
  movieHallIdParamsValidator,
  updateMovieHallValidator,
  handleValidationError,
  decodeJwtToken,
  permission.isStaff,
  updateMovieHall
);

/**
 * @swagger
 * /movie-halls/{theaterId}/{hallId}:
 *   delete:
 *     summary: Delete a movie hall by composite PK
 *     tags: [Movie Halls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: theaterId
 *         required: true
 *         schema:
 *           type: string
 *         description: Theater ID
 *       - in: path
 *         name: hallId
 *         required: true
 *         schema:
 *           type: string
 *         description: Hall ID
 *     responses:
 *       200:
 *         description: Movie hall deleted
 *       400:
 *         description: Validation error
 *       404:
 *         description: Hall not found
 */
router.delete(
  '/:theaterId/:hallId',
  movieHallIdParamsValidator,
  handleValidationError,
  decodeJwtToken,
  permission.isStaff,
  deleteMovieHall
);

export default router;
