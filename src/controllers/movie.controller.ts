/**
 * @module controllers/movies.controller
 *
 * @description
 * Controller for managing movies.
 *
 * This controller provides Express handlers for:
 * - Creating, updating, deleting, and retrieving movies.
 * - Listing all movies, upcoming movies, and movies by theater.
 * - Searching for movies using filters.
 *
 * Each response is enriched with the average `rating` field
 * retrieved from booking comments.
 *
 * Business logic is delegated to `movieService`, and ratings
 * are fetched from `bookingCommentService`.
 *
 * @since 2025
 */

import { Request, Response, NextFunction } from 'express';
import { movieService } from '../services/movie.service.js';
import { bookingCommentService } from '../services/booking-comment.service.js';

/**
 * Converts a Sequelize movie instance to a plain object and adds its average rating.
 * @param {any} movie - Sequelize movie instance or plain object.
 * @returns {Promise<any>} Movie object with the `rating` field.
 */
async function enrichMovieWithRating(movie: any) {
  if (!movie) return null;
  const plain = movie.get ? movie.get({ plain: true }) : movie;
  const avgRating = await bookingCommentService.getAverageRatingForMovie(
    plain.movieId
  );
  return { ...plain, rating: avgRating };
}

/**
 * Converts an array of Sequelize movies to plain objects and adds ratings.
 * @param {any[]} movies - Array of Sequelize movies.
 * @returns {Promise<any[]>} Array of movie objects with `rating`.
 */
async function enrichMoviesWithRatings(movies: any[]) {
  return Promise.all(movies.map((m) => enrichMovieWithRating(m)));
}

/**
 * Updates an existing movie and returns it with the `rating` field.
 * @route PUT /movies/:movieId
 */
export async function updateMovie(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const movie = await movieService.updateMovie(
      req.params.movieId,
      req.body,
      req.file
    );
    const enriched = await enrichMovieWithRating(movie);
    res.json({ message: 'Movie updated successfully', data: enriched });
  } catch (error) {
    next(error);
  }
}

/**
 * Creates a new movie (with optional poster) and returns it with the `rating` field.
 * @route POST /movies
 */
export async function createMovie(
  req: Request,
  res: Response,
  next: NextFunction
) {
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
 * Retrieves a movie by its ID and includes the `rating` field.
 * @route GET /movies/:movieId
 */
export async function getMovieById(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const movie = await movieService.getMovieById(req.params.movieId);
    const enriched = await enrichMovieWithRating(movie);
    res.json({ message: 'Movie fetched successfully', data: enriched });
  } catch (error) {
    next(error);
  }
}

/**
 * Deletes a movie by its ID.
 * @route DELETE /movies/:movieId
 */
export async function deleteMovie(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    await movieService.deleteMovie(req.params.movieId);
    res.status(204).json({ message: 'Movie deleted successfully', data: null });
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieves all movies with their ratings.
 * @route GET /movies
 */
export async function getAllMovies(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const movies = await movieService.getAllMovies();
    const enriched = await enrichMoviesWithRatings(movies);
    res.json({ message: 'Movies fetched successfully', data: enriched });
  } catch (error) {
    next(error);
  }
}

/**
 * Searches for movies using query filters and includes ratings.
 * @route GET /movies/search
 */
export async function searchMovie(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const filters = req.query;
    const movies = await movieService.searchMovie(filters);
    const enriched = await enrichMoviesWithRatings(movies);
    res.json({ message: 'Movies search completed', data: enriched });
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieves all upcoming movies (future release dates) with ratings.
 * @route GET /movies/upcoming
 */
export async function getUpcomingMovies(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const movies = await movieService.getUpcomingMovies();
    const enriched = await enrichMoviesWithRatings(movies);
    res.json({
      message: 'Upcoming movies fetched successfully',
      data: enriched,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieves all movies shown in a specific theater with ratings.
 * @route GET /theaters/:theaterId/movies
 */
export async function getMoviesByTheater(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const movies = await movieService.getMoviesByTheater(req.params.theaterId);
    const enriched = await enrichMoviesWithRatings(movies);
    res.json({
      message: 'Movies by theater fetched successfully',
      data: enriched,
    });
  } catch (error) {
    next(error);
  }
}
