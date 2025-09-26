/**
 * @module controllers/movie.controller
 *
 * Express controller for managing movies in the cinema application.
 */

import { Request, Response, NextFunction } from 'express';
import { BadRequestError } from '../errors/bad-request-error.js';
import { NotFoundError } from '../errors/not-found-error.js';
import { sequelize } from '../config/db.js';
import movieService from '../services/movie.service.js';
import type { MovieAttributes } from '../interfaces/movie.js';

export class MovieController {
  /** Create a new movie */
  createMovie = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const transaction = await sequelize.transaction();
    try {
      const movieData = req.body;
      const movie = await movieService.create(movieData, { transaction });

      await transaction.commit();

      res.status(201).json({
        message: 'Movie created successfully',
        data: { movie },
      });
    } catch (error) {
      try {
        await transaction.rollback();
      } catch {
        // optionally log rollback error
      }
      next(error);
    }
  };

  /** List movies with pagination and filters */
  listMovies = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const page = req.query.page
        ? parseInt(req.query.page as string, 10)
        : undefined;
      const pageSize = req.query.pageSize
        ? parseInt(req.query.pageSize as string, 10)
        : undefined;

      const filters: Record<string, any> = {
        title: req.query.title as string | undefined,
        genre: req.query.genre as string | undefined,
        director: req.query.director as string | undefined,
        ageRating: req.query.ageRating as string | undefined,
        recommended:
          typeof req.query.recommended !== 'undefined'
            ? req.query.recommended === 'true' || req.query.recommended === '1'
            : undefined,
      };

      const result = await movieService.list({
        page,
        limit: pageSize,
        filters,
      });

      res.status(200).json({
        message: 'Movies found successfully',
        data: {
          movies: result.items,
          total: result.totalItems,
          page: result.page,
          pageSize: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  /** Search movies with free-text query and filters */
  searchMovies = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Normalize pagination
      const pageRaw = Number(req.query.page ?? 1);
      const pageSizeRaw = Number(req.query.pageSize ?? 20);

      const pageSize =
        Number.isFinite(pageSizeRaw) && pageSizeRaw > 0
          ? Math.min(pageSizeRaw, 100)
          : 20;

      let page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

      // Build filters from query
      const {
        q,
        movieId,
        title,
        genre,
        director,
        ageRating,
        recommended,
        releasedAfter,
        releasedBefore,
      } = req.query as Record<string, string | undefined>;

      let recommendedBool: boolean | undefined = undefined;
      if (recommended === 'true' || recommended === '1') recommendedBool = true;
      if (recommended === 'false' || recommended === '0')
        recommendedBool = false;

      const filters: Record<string, unknown> = {};
      if (movieId) filters.movieId = movieId.trim();
      if (title) filters.title = title.trim();
      if (genre) filters.genre = genre.trim();
      if (director) filters.director = director.trim();
      if (ageRating) filters.ageRating = ageRating.trim();
      if (typeof recommendedBool === 'boolean')
        filters.recommended = recommendedBool;
      if (releasedAfter) filters.releasedAfter = releasedAfter.trim();
      if (releasedBefore) filters.releasedBefore = releasedBefore.trim();

      // 1st fetch
      let result = await movieService.search({
        page,
        limit: pageSize,
        q: q?.trim() || undefined,
        filters,
      } as any);

      const total = result.total ?? 0;
      let totalPages = Math.max(1, Math.ceil(total / pageSize));

      // If we asked for a page beyond the last and there are items, refetch last valid page
      if (total > 0 && page > totalPages) {
        page = totalPages;
        result = await movieService.search({
          page,
          limit: pageSize,
          q: q?.trim() || undefined,
          filters,
        } as any);
      }

      res.status(200).json({
        message: 'Movies found successfully',
        data: {
          movies: result.items ?? [],
          total,
          page,
          pageSize,
          totalPages,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  /** Get a movie by ID */
  getMovieById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const movie = await movieService.get(req.params.movieId);
      if (!movie) throw new NotFoundError('Movie not found');

      res.status(200).json({
        message: 'Movie found successfully',
        data: { movie },
      });
    } catch (err) {
      next(err);
    }
  };

  /** Update movie fields */
  updateMovie = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const movie = await movieService.update(
        req.params.movieId,
        req.body as Partial<MovieAttributes>
      );

      if (!movie) throw new NotFoundError('Movie not found');

      res.status(200).json({
        message: 'Movie updated successfully',
        data: { movie },
      });
    } catch (err) {
      next(err);
    }
  };

  /** Delete movie */
  deleteMovie = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const deleted = await movieService.remove(req.params.movieId);
      if (deleted) {
        res.status(200).json({
          message: 'Movie deleted successfully',
          data: null,
        });
        return;
      }
      throw new NotFoundError('Movie not found');
    } catch (err) {
      next(err);
    }
  };

  /** Get recommended movies */
  getRecommendedMovies = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const movies = await movieService.getRecommended();
      res.status(200).json({
        message: 'Recommended movies found successfully',
        data: { movies },
      });
    } catch (err) {
      next(err);
    }
  };



  /** Toggle movie recommendation status */
  toggleRecommendation = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const movie = await movieService.get(req.params.movieId);
      if (!movie) throw new NotFoundError('Movie not found');

      const updatedMovie = await movieService.update(req.params.movieId, {
        recommended: !movie.recommended,
      });

      res.status(200).json({
        message: `Movie recommendation ${updatedMovie?.recommended ? 'enabled' : 'disabled'} successfully`,
        data: { movie: updatedMovie },
      });
    } catch (err) {
      next(err);
    }
  };
}

/** Singleton instance for routing usage */
export const movieController = new MovieController();
