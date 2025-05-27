import { Request, Response, NextFunction } from 'express';
import { MovieService } from '../services/movie.service.js';
import { BadRequestError } from '../errors/bad-request-error.js';

/**
 * Get a movie by ID.
 * @route GET /movies/:movieId
 * @group Movies
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Object} 200 - { message: string, data: Movie }
 * @returns {Object} 404 - { message: string, data: null }
 */
export async function getMovieById(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const movie = await MovieService.getMovieById(req.params.movieId);
    res.json({ message: 'Movie fetched successfully', data: movie });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new movie.
 * @route POST /movies
 * @group Movies
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Object} 201 - { message: string, data: Movie }
 * @returns {Object} 400 - { message: string, data: null }
 */
export async function createMovie(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const movie = await MovieService.createMovie(req.body);
    res
      .status(201)
      .json({ message: 'Movie created successfully', data: movie });
  } catch (error) {
    next(error);
  }
}

/**
 * Update an existing movie by ID.
 * @route PUT /movies/:movieId
 * @group Movies
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Object} 200 - { message: string, data: Movie }
 * @returns {Object} 404 - { message: string, data: null }
 */
export async function updateMovie(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const updated = await MovieService.updateMovie(
      req.params.movieId,
      req.body
    );
    res.json({ message: 'Movie updated successfully', data: updated });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a movie by ID.
 * @route DELETE /movies/:movieId
 * @group Movies
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Object} 204 - { message: string, data: null }
 * @returns {Object} 404 - { message: string, data: null }
 */
export async function deleteMovie(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await MovieService.deleteMovie(req.params.movieId);
    res.status(204).json({ message: 'Movie deleted successfully', data: null });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all movies.
 * @route GET /movies
 * @group Movies
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Object} 200 - { message: string, data: Movie[] }
 */
export async function getAllMovies(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const movies = await MovieService.getAllMovies();
    res.json({ message: 'Movies fetched successfully', data: movies });
  } catch (error) {
    next(error);
  }
}

/**
 * Search for movies by title, director, or genre (partial match).
 * @route GET /movies/search?q={query}
 * @group Movies
 * @param {Request} req - Express request object (with req.query.q)
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Object} 200 - { message: string, data: Movie[] }
 * @returns {Object} 400 - { message: string, data: null }
 */
export async function searchMovie(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> {
  try {
    const { q } = req.query;
    if (typeof q !== 'string' || !q.trim()) {
      throw new BadRequestError('Missing or invalid search query');
    }
    const movies = await MovieService.searchMovie(q);
    res.json({ message: 'Movies search completed', data: movies });
  } catch (error) {
    next(error);
  }
}
