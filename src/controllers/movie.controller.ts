import { Request, Response, NextFunction } from 'express';
import { MovieService } from '../services/movie.service.js';
import { BadRequestError } from '../errors/bad-request-error.js';

export async function updateMovie(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // req.body: fields, req.file: image file (optional)
    const movie = await MovieService.updateMovie(
      req.params.movieId,
      req.body,
      req.file
    );
    res.json({ message: 'Movie updated successfully', data: movie });
  } catch (error) {
    next(error);
  }
}

export async function createMovie(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const movie = await MovieService.createMovie(req.body, req.file);
    res
      .status(201)
      .json({ message: 'Movie created successfully', data: movie });
  } catch (error) {
    next(error);
  }
}

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

export async function deleteMovie(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    await MovieService.deleteMovie(req.params.movieId);
    res.status(204).json({ message: 'Movie deleted successfully', data: null });
  } catch (error) {
    next(error);
  }
}

export async function getAllMovies(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const movies = await MovieService.getAllMovies();
    res.json({ message: 'Movies fetched successfully', data: movies });
  } catch (error) {
    next(error);
  }
}

export async function searchMovie(
  req: Request,
  res: Response,
  next: NextFunction
) {
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
