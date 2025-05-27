import { Router } from 'express';
import {
  getMovieById,
  createMovie,
  updateMovie,
  deleteMovie,
  getAllMovies,
  searchMovie,
} from '../controllers/movie.controller.js';

import {
  createMovieValidator,
  updateMovieValidator,
  searchMovieValidator,
  movieIdParamValidator,
} from '../validators/movie.validator.js';
import { handleValidationError } from '../middlewares/handleValidatonError.middleware.js';
import { decodeJwtToken } from '../middlewares/auth.middleware.js';
import { permission } from '../middlewares/permission.js';

const router = Router();

/**
 * @swagger
 * /movies:
 *   post:
 *     summary: Create a new movie (Staff only)
 *     tags: [Movies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MovieCreate'
 *     responses:
 *       201:
 *         description: Movie created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Movie'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/',
  decodeJwtToken,
  permission.isStaff,
  createMovieValidator,
  handleValidationError,
  createMovie
);

/**
 * @swagger
 * /movies/{movieId}:
 *   put:
 *     summary: Update a movie (Staff only)
 *     tags: [Movies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: movieId
 *         required: true
 *         schema:
 *           type: string
 *         description: The movie ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MovieUpdate'
 *     responses:
 *       200:
 *         description: Movie updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Movie'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Movie not found
 */
router.put(
  '/:movieId',
  decodeJwtToken,
  permission.isStaff,
  movieIdParamValidator,
  updateMovieValidator,
  handleValidationError,
  updateMovie
);

/**
 * @swagger
 * /movies/{movieId}:
 *   delete:
 *     summary: Delete a movie (Staff only)
 *     tags: [Movies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: movieId
 *         required: true
 *         schema:
 *           type: string
 *         description: The movie ID
 *     responses:
 *       204:
 *         description: Movie deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Movie not found
 */
router.delete(
  '/:movieId',
  decodeJwtToken,
  permission.isStaff,
  movieIdParamValidator,
  handleValidationError,
  deleteMovie
);

/**
 * @swagger
 * /movies/search:
 *   get:
 *     summary: Search for movies
 *     tags: [Movies]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query (title, director, or genre)
 *         required: true
 *     responses:
 *       200:
 *         description: List of movies matching the search query
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Movie'
 *       400:
 *         description: Validation error
 */
router.get('/search', searchMovieValidator, handleValidationError, searchMovie);

/**
 * @swagger
 * /movies/{movieId}:
 *   get:
 *     summary: Get a movie by ID
 *     tags: [Movies]
 *     parameters:
 *       - in: path
 *         name: movieId
 *         required: true
 *         schema:
 *           type: string
 *         description: The movie ID
 *     responses:
 *       200:
 *         description: Movie object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Movie'
 *       404:
 *         description: Movie not found
 */
router.get(
  '/:movieId',
  movieIdParamValidator,
  handleValidationError,
  getMovieById
);

/**
 * @swagger
 * /movies:
 *   get:
 *     summary: Get all movies
 *     tags: [Movies]
 *     responses:
 *       200:
 *         description: List of all movies
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Movie'
 */
router.get('/', getAllMovies);

export default router;
