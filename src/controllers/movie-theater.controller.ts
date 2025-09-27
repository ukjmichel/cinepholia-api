/**
 * @module controllers/movie-theater.controller
 *
 * Express controller for managing movie theaters and their operations.
 */

import { Request, Response, NextFunction } from 'express';
import movieTheaterService from '../services/movie-theater.service.js';
import type {
  CreateMovieTheaterDTO,
  UpdateMovieTheaterDTO,
} from '../interfaces/movie-theater.js';
import type {
  MovieTheaterFilters,
  SortBy,
  SortDir,
} from '../queries/movie-theater.queries.js';
import { BadRequestError } from '../errors/bad-request-error.js';
import { NotFoundError } from '../errors/not-found-error.js';

export class MovieTheaterController {
  /** Create a new movie theater */
  createTheater = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const theaterData: CreateMovieTheaterDTO = req.body;

      if (!theaterData.theaterId) {
        throw new BadRequestError('Theater ID is required');
      }

      const theater = await movieTheaterService.create(theaterData);

      res.status(201).json({
        message: 'Movie theater created successfully',
        data: { theater },
      });
    } catch (error) {
      next(error);
    }
  };

  /** Get a theater by ID */
  getTheaterById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { theaterId } = req.params;
      const theater = await movieTheaterService.get(theaterId);

      if (!theater) {
        throw new NotFoundError('Movie theater not found');
      }

      res.status(200).json({
        message: 'Movie theater found successfully',
        data: { theater },
      });
    } catch (error) {
      next(error);
    }
  };

  /** Update a theater by ID */
  updateTheater = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { theaterId } = req.params;
      const updateData: UpdateMovieTheaterDTO = req.body;

      const theater = await movieTheaterService.update(theaterId, updateData);

      if (!theater) {
        throw new NotFoundError('Movie theater not found');
      }

      res.status(200).json({
        message: 'Movie theater updated successfully',
        data: { theater },
      });
    } catch (error) {
      next(error);
    }
  };

  /** Delete a theater by ID */
  deleteTheater = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { theaterId } = req.params;
      const deleted = await movieTheaterService.remove(theaterId);

      if (!deleted) {
        throw new NotFoundError('Movie theater not found');
      }

      res.status(200).json({
        message: 'Movie theater deleted successfully',
        data: null,
      });
    } catch (error) {
      next(error);
    }
  };

  /** List theaters with pagination, sorting, and filters */
  listTheaters = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const page = req.query.page
        ? parseInt(req.query.page as string, 10)
        : undefined;
      const limit =
        req.query.limit || req.query.pageSize
          ? parseInt((req.query.limit || req.query.pageSize) as string, 10)
          : undefined;

      const sortBy = req.query.sortBy as SortBy | undefined;
      const sortDir = req.query.sortDir as SortDir | undefined;

      // Build filters from query parameters
      const filters: MovieTheaterFilters = {};

      if (req.query.theaterId) {
        if (Array.isArray(req.query.theaterId)) {
          filters.theaterId = req.query.theaterId as string[];
        } else {
          filters.theaterId = req.query.theaterId as string;
        }
      }

      if (req.query.name) filters.name = req.query.name as string;
      if (req.query.city) filters.city = req.query.city as string;
      if (req.query.postalCode)
        filters.postalCode = req.query.postalCode as string;
      if (req.query.address) filters.address = req.query.address as string;
      if (req.query.phone) filters.phone = req.query.phone as string;
      if (req.query.email) filters.email = req.query.email as string;

      // Date range filters
      if (req.query.createdFrom)
        filters.createdFrom = req.query.createdFrom as string;
      if (req.query.createdTo)
        filters.createdTo = req.query.createdTo as string;
      if (req.query.updatedFrom)
        filters.updatedFrom = req.query.updatedFrom as string;
      if (req.query.updatedTo)
        filters.updatedTo = req.query.updatedTo as string;

      const result = await movieTheaterService.list({
        page,
        limit,
        sortBy,
        sortDir,
        filters,
      });

      res.status(200).json({
        message: 'Movie theaters found successfully',
        data: {
          theaters: result.items,
          total: result.totalItems,
          page: result.page,
          pageSize: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /** Search theaters with free-text query and filters */
  searchTheaters = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const page = req.query.page
        ? parseInt(req.query.page as string, 10)
        : undefined;
      const limit =
        req.query.limit || req.query.pageSize
          ? parseInt((req.query.limit || req.query.pageSize) as string, 10)
          : undefined;

      const sortBy = req.query.sortBy as SortBy | undefined;
      const sortDir = req.query.sortDir as SortDir | undefined;
      const q = req.query.q as string | undefined;

      // Build filters from query parameters
      const filters: MovieTheaterFilters = {};

      if (req.query.theaterId) {
        if (Array.isArray(req.query.theaterId)) {
          filters.theaterId = req.query.theaterId as string[];
        } else {
          filters.theaterId = req.query.theaterId as string;
        }
      }

      if (req.query.name) filters.name = req.query.name as string;
      if (req.query.city) filters.city = req.query.city as string;
      if (req.query.postalCode)
        filters.postalCode = req.query.postalCode as string;
      if (req.query.address) filters.address = req.query.address as string;
      if (req.query.phone) filters.phone = req.query.phone as string;
      if (req.query.email) filters.email = req.query.email as string;

      // Date range filters
      if (req.query.createdFrom)
        filters.createdFrom = req.query.createdFrom as string;
      if (req.query.createdTo)
        filters.createdTo = req.query.createdTo as string;
      if (req.query.updatedFrom)
        filters.updatedFrom = req.query.updatedFrom as string;
      if (req.query.updatedTo)
        filters.updatedTo = req.query.updatedTo as string;

      const result = await movieTheaterService.search({
        page,
        limit,
        sortBy,
        sortDir,
        q,
        filters,
      });

      res.status(200).json({
        message: 'Movie theaters found successfully',
        data: {
          theaters: result.items,
          total: result.totalItems,
          page: result.page,
          pageSize: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /** Get all theaters without pagination */
  getAllTheaters = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const theaters = await movieTheaterService.getAll();

      res.status(200).json({
        message: 'All movie theaters retrieved successfully',
        data: {
          theaters,
          total: theaters.length,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /** Get theater statistics and analytics */
  getTheaterStats = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const stats = await movieTheaterService.getStats();

      res.status(200).json({
        message: 'Theater statistics retrieved successfully',
        data: { stats },
      });
    } catch (error) {
      next(error);
    }
  };
}

/** Singleton instance for routing usage */
export const movieTheaterController = new MovieTheaterController();
