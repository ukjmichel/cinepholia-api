/**
 * @module controllers/movie.controller
 *
 * Express controller for managing movies with poster uploads and comprehensive filtering.
 */

import { Request, Response, NextFunction } from 'express';
import movieService from '../services/movie.service.js';
import type {
  CreateMovieDTO,
  UpdateMovieDTO,
  MovieDTO,
} from '../interfaces/movie.js';
import { BadRequestError } from '../errors/bad-request-error.js';
import { NotFoundError } from '../errors/not-found-error.js';
import { sequelize } from '../config/db.js';

export class MovieController {
  /** Create a new movie with optional poster upload */
  createMovie = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const transaction = await sequelize.transaction();
    try {
      const movieData: CreateMovieDTO = {
        title: req.body.title,
        description: req.body.description,
        ageRating: req.body.ageRating,
        genre: req.body.genre,
        releaseDate: new Date(req.body.releaseDate),
        director: req.body.director,
        durationMinutes: parseInt(req.body.durationMinutes),
        recommended:
          req.body.recommended === 'true' || req.body.recommended === true,
      };

      const file = req.file;
      const movie = await movieService.create(movieData, file, { transaction });

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
        director: req.query.director as string | undefined,
        genre: req.query.genre as string | undefined,
        ageRating: req.query.ageRating as string | undefined,
        recommended:
          typeof req.query.recommended !== 'undefined'
            ? req.query.recommended === 'true' || req.query.recommended === '1'
            : undefined,
        minDuration: req.query.minDuration
          ? parseInt(req.query.minDuration as string, 10)
          : undefined,
        maxDuration: req.query.maxDuration
          ? parseInt(req.query.maxDuration as string, 10)
          : undefined,
        releasedFrom: req.query.releasedFrom as string | undefined,
        releasedTo: req.query.releasedTo as string | undefined,
      };

      const result = await movieService.list({
        page,
        limit: pageSize,
        filters,
        sortBy: req.query.sortBy as any,
        sortDir: req.query.sortDir as any,
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

  /** Search movies with free-text query plus filters */
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
      const { q, title, director, genre, ageRating, recommended } =
        req.query as Record<string, string | undefined>;

      let recommendedBool: boolean | undefined = undefined;
      if (recommended === 'true' || recommended === '1') recommendedBool = true;
      if (recommended === 'false' || recommended === '0')
        recommendedBool = false;

      const filters: Record<string, unknown> = {};
      if (title) filters.title = title.trim();
      if (director) filters.director = director.trim();
      if (genre) filters.genre = genre.trim();
      if (ageRating) filters.ageRating = ageRating.trim();
      if (typeof recommendedBool === 'boolean')
        filters.recommended = recommendedBool;

      // 1st fetch
      let result = await movieService.search({
        page,
        limit: pageSize,
        q: q?.trim() || undefined,
        filters,
        sortBy: req.query.sortBy as any,
        sortDir: req.query.sortDir as any,
      });

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
          sortBy: req.query.sortBy as any,
          sortDir: req.query.sortDir as any,
        });
      }

      res.status(200).json({
        message: 'Movies found successfully',
        data: {
          movies: result.items ?? [],
          total,
          page,
          pageSize,
          totalPages,
          query: q?.trim(),
        },
      });
    } catch (err) {
      next(err);
    }
  };

  /** Get movie by ID */
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

  /** Update movie with optional poster upload */
  updateMovie = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const transaction = await sequelize.transaction();
    try {
      const updates: Partial<UpdateMovieDTO> = {};

      // Only include provided fields
      if (req.body.title !== undefined) updates.title = req.body.title;
      if (req.body.description !== undefined)
        updates.description = req.body.description;
      if (req.body.ageRating !== undefined)
        updates.ageRating = req.body.ageRating;
      if (req.body.genre !== undefined) updates.genre = req.body.genre;
      if (req.body.releaseDate !== undefined)
        updates.releaseDate = new Date(req.body.releaseDate);
      if (req.body.director !== undefined) updates.director = req.body.director;
      if (req.body.durationMinutes !== undefined) {
        updates.durationMinutes = parseInt(req.body.durationMinutes);
      }
      if (req.body.recommended !== undefined) {
        updates.recommended =
          req.body.recommended === 'true' || req.body.recommended === true;
      }

      const file = req.file;
      const movie = await movieService.update(
        req.params.movieId,
        updates,
        file,
        { transaction }
      );

      if (!movie) throw new NotFoundError('Movie not found');

      await transaction.commit();

      res.status(200).json({
        message: 'Movie updated successfully',
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

  /** Delete movie */
  deleteMovie = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const deleted = await movieService.remove(req.params.movieId);
      if (!deleted) throw new NotFoundError('Movie not found');

      res.status(200).json({
        message: 'Movie deleted successfully',
        data: null,
      });
    } catch (err) {
      next(err);
    }
  };


  /** Get upcoming movies */
  getUpcomingMovies = async (
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

      const result = await movieService.getUpcoming({
        page,
        limit: pageSize,
        sortBy: req.query.sortBy as any,
        sortDir: req.query.sortDir as any,
      });

      res.status(200).json({
        message: 'Upcoming movies found successfully',
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

  /** Get movies by theater */
  getMoviesByTheater = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { theaterId } = req.params;
      const page = req.query.page
        ? parseInt(req.query.page as string, 10)
        : undefined;
      const pageSize = req.query.pageSize
        ? parseInt(req.query.pageSize as string, 10)
        : undefined;

      const result = await movieService.getByTheater(theaterId, {
        page,
        limit: pageSize,
        sortBy: req.query.sortBy as any,
        sortDir: req.query.sortDir as any,
      });

      res.status(200).json({
        message: 'Movies by theater found successfully',
        data: {
          movies: result.items,
          total: result.totalItems,
          page: result.page,
          pageSize: result.limit,
          totalPages: result.totalPages,
          theaterId,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  /** Get movie by screening ID */
  getMovieByScreening = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { screeningId } = req.params;
      const movie = await movieService.getByScreeningId(screeningId);

      res.status(200).json({
        message: 'Movie by screening found successfully',
        data: { movie, screeningId },
      });
    } catch (err) {
      next(err);
    }
  };
}

/** Singleton instance for routing usage */
export const movieController = new MovieController();
