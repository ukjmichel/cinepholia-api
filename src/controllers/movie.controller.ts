/**
 * @module controllers/movies.controller
 *
 * Controller for managing movies.
 *
 * Features:
 * - Full CRUD (Create, Read, Update, Delete)
 * - Search and filtering
 * - Specialized listings (upcoming movies, movies by theater, etc.)
 * - Automatic enrichment of each movie with an average `rating` from booking comments.
 */

import { Request, Response, NextFunction } from 'express';
import { movieService } from '../services/movie.service.js';
import { bookingCommentService } from '../services/booking-comment.service.js';

/**
 * Converts a Sequelize movie instance to a plain object and adds its average rating.
 *
 * @private
 * @param {any} movie - Sequelize movie instance or plain object
 * @returns {Promise<any>} A plain object representing the movie with a `rating` field
 */
async function enrichMovieWithRating(movie: any): Promise<any> {
  if (!movie) return null;
  const plain = movie.get ? movie.get({ plain: true }) : movie;
  const avgRating = await bookingCommentService.getAverageRatingForMovie(
    plain.movieId
  );
  return { ...plain, rating: avgRating };
}

/**
 * Converts an array of Sequelize movie instances to plain objects and adds ratings.
 *
 * @private
 * @param {any[]} movies - Array of Sequelize movie instances
 * @returns {Promise<any[]>} An array of movie objects with `rating` fields
 */
async function enrichMoviesWithRatings(movies: any[]): Promise<any[]> {
  return Promise.all(movies.map((m) => enrichMovieWithRating(m)));
}

// ------------------ CRUD CONTROLLERS ----------------------

/**
 * Create a new movie (with optional poster) and return it with the `rating` field.
 *
 * @route POST /movies
 * @param {Request} req - Express request containing movie data in `req.body` and optional poster file in `req.file`
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express error-handling middleware
 * @returns {201 Created} `{ message: string, data: object }` - The created movie with its rating
 */
export async function createMovie(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const movie = await movieService.createMovie(req.body, req.file);
    const enriched = await enrichMovieWithRating(movie);
    res
      .status(201)
      .json({ message: 'Movie created successfully', data: enriched });
  } catch (error) {
    next(error);
  }
}

/**
 * Update an existing movie and return it with the `rating` field.
 *
 * @route PUT /movies/:movieId
 * @param {Request} req - Express request containing movie ID in `req.params.movieId`, updated data in `req.body`, and optional poster file in `req.file`
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express error-handling middleware
 * @returns {200 OK} `{ message: string, data: object }` - The updated movie with its rating
 */
export async function updateMovie(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const movie = await movieService.updateMovie(
      req.params.movieId,
      req.body,
      req.file
    );
    const enriched = await enrichMovieWithRating(movie);
    res
      .status(200)
      .json({ message: 'Movie updated successfully', data: enriched });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a movie by its ID.
 *
 * @route DELETE /movies/:movieId
 * @param {Request} req - Express request containing movie ID in `req.params.movieId`
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express error-handling middleware
 * @returns {200 OK} `{ message: string, data: null }` - Confirmation of deletion
 */
export async function deleteMovie(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await movieService.deleteMovie(req.params.movieId);
    res.status(200).json({ message: 'Movie deleted successfully', data: null });
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieve a movie by its ID and include the `rating` field.
 *
 * @route GET /movies/:movieId
 * @param {Request} req - Express request containing movie ID in `req.params.movieId`
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express error-handling middleware
 * @returns {200 OK | 404 Not Found} `{ message: string, data: object|null }`
 */
export async function getMovieById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const movie = await movieService.getMovieById(req.params.movieId);
    if (!movie) {
      res.status(404).json({ message: 'Movie not found', data: null });
      return;
    }
    const enriched = await enrichMovieWithRating(movie);
    res
      .status(200)
      .json({ message: 'Movie fetched successfully', data: enriched });
  } catch (error) {
    next(error);
  }
}

// ------------------ SPECIAL READS / LISTINGS ----------------------

/**
 * Retrieve a movie by its screening ID (via the associated screening) and include the `rating` field.
 *
 * @route GET /movies/by-screening/:screeningId
 * @param {Request} req - Express request containing screening ID in `req.params.screeningId`
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express error-handling middleware
 * @returns {200 OK | 404 Not Found} `{ message: string, data: object|null }`
 */
export async function getMovieByScreeningId(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const movie = await movieService.getMovieByScreeningId(
      req.params.screeningId
    );
    if (!movie) {
      res
        .status(404)
        .json({ message: 'Movie not found for screening', data: null });
      return;
    }
    const enriched = await enrichMovieWithRating(movie);
    res
      .status(200)
      .json({ message: 'Movie fetched by screeningId', data: enriched });
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieve all movies with their ratings.
 *
 * @route GET /movies
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express error-handling middleware
 * @returns {200 OK} `{ message: string, data: object[] }` - List of movies with ratings
 */
export async function getAllMovies(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const movies = await movieService.getAllMovies();
    const enriched = await enrichMoviesWithRatings(movies);
    res
      .status(200)
      .json({ message: 'Movies fetched successfully', data: enriched });
  } catch (error) {
    next(error);
  }
}

/**
 * Search for movies using query filters and include ratings.
 *
 * @route GET /movies/search
 * @param {Request} req - Express request containing filters in `req.query`
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express error-handling middleware
 * @returns {200 OK} `{ message: string, data: object[] }` - List of matching movies with ratings
 */
export async function searchMovie(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const filters = req.query;
    const movies = await movieService.searchMovie(filters);
    const enriched = await enrichMoviesWithRatings(movies);
    res
      .status(200)
      .json({ message: 'Movies search completed', data: enriched });
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieve all upcoming movies (future release dates) with ratings.
 *
 * @route GET /movies/upcoming
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express error-handling middleware
 * @returns {200 OK} `{ message: string, data: object[] }` - List of upcoming movies with ratings
 */
export async function getUpcomingMovies(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const movies = await movieService.getUpcomingMovies();
    const enriched = await enrichMoviesWithRatings(movies);
    res
      .status(200)
      .json({
        message: 'Upcoming movies fetched successfully',
        data: enriched,
      });
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieve all movies shown in a specific theater with ratings.
 *
 * @route GET /theaters/:theaterId/movies
 * @param {Request} req - Express request containing theater ID in `req.params.theaterId`
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express error-handling middleware
 * @returns {200 OK} `{ message: string, data: object[] }` - List of movies shown in the theater with ratings
 */
export async function getMoviesByTheater(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const movies = await movieService.getMoviesByTheater(req.params.theaterId);
    const enriched = await enrichMoviesWithRatings(movies);
    res.status(200).json({
      message: 'Movies by theater fetched successfully',
      data: enriched,
    });
  } catch (error) {
    next(error);
  }
}
