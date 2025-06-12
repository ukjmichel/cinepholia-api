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
import { uploadMovieImage } from '../middlewares/upload.middleware.js';

const router = Router();

/**
 * @openapi
 * /movies/{movieId}:
 *   put:
 *     tags:
 *       - Movies
 *     summary: Update a movie
 *     description: Update a movie's data and/or poster image. Only staff can update.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: movieId
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique movie ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               ageRating: { type: string }
 *               genre: { type: string }
 *               releaseDate: { type: string, format: date }
 *               director: { type: string }
 *               durationMinutes: { type: integer }
 *               recommended: { type: boolean }
 *               poster:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Updated movie data
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Movie not found
 */
/**
 * Update a movie.
 */
router.put(
  '/:movieId',
  decodeJwtToken,
  permission.isStaff,
  uploadMovieImage.single('poster'),
  updateMovieValidator,
  handleValidationError,
  updateMovie
);

/**
 * @openapi
 * /movies:
 *   post:
 *     tags:
 *       - Movies
 *     summary: Create a new movie
 *     description: Create a new movie, optionally with a poster image. Only staff can create.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               ageRating: { type: string }
 *               genre: { type: string }
 *               releaseDate: { type: string, format: date }
 *               director: { type: string }
 *               durationMinutes: { type: integer }
 *               recommended: { type: boolean }
 *               poster:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Created movie data
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       409:
 *         description: Conflict (movie already exists)
 */
/**
 * Create a new movie.
 */
router.post(
  '/',
  decodeJwtToken,
  permission.isStaff,
  uploadMovieImage.single('poster'),
  createMovieValidator,
  handleValidationError,
  createMovie
);

/**
 * @openapi
 * /movies/{movieId}:
 *   delete:
 *     tags:
 *       - Movies
 *     summary: Delete a movie
 *     description: Delete a movie by ID. Only staff can delete.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: movieId
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique movie ID
 *     responses:
 *       204:
 *         description: Deleted successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Movie not found
 */
/**
 * Delete a movie.
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
 * @openapi
 * /movies/search:
 *   get:
 *     tags:
 *       - Movies
 *     summary: Search movies
 *     description: Search movies by title, director, genre, or use advanced filters.
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Global search term (title, director, genre)
 *       - in: query
 *         name: title
 *         schema: { type: string }
 *       - in: query
 *         name: director
 *         schema: { type: string }
 *       - in: query
 *         name: genre
 *         schema: { type: string }
 *       - in: query
 *         name: ageRating
 *         schema: { type: string }
 *       - in: query
 *         name: releaseDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: recommended
 *         schema: { type: boolean }
 *       - in: query
 *         name: movieId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Array of matched movies
 *       400:
 *         description: Validation error
 */
/**
 * Search for movies.
 */
router.get('/search', searchMovieValidator, handleValidationError, searchMovie);

/**
 * @openapi
 * /movies/{movieId}:
 *   get:
 *     tags:
 *       - Movies
 *     summary: Get movie by ID
 *     description: Get detailed information for a movie by its ID.
 *     parameters:
 *       - in: path
 *         name: movieId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Movie data
 *       400:
 *         description: Validation error
 *       404:
 *         description: Movie not found
 */
/**
 * Get a movie by its ID.
 */
router.get(
  '/:movieId',
  movieIdParamValidator,
  handleValidationError,
  getMovieById
);

/**
 * @openapi
 * /movies:
 *   get:
 *     tags:
 *       - Movies
 *     summary: Get all movies
 *     description: Get a list of all movies.
 *     responses:
 *       200:
 *         description: Array of movies
 */
/**
 * Get all movies.
 */
router.get('/', getAllMovies);

export default router;
