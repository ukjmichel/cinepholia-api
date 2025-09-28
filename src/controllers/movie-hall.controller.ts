/**
 * @module controllers/movie-hall.controller
 *
 * Express controller for managing movie halls and their operations.
 */

import { Request, Response, NextFunction } from 'express';
import movieHallService from '../services/movie-hall.service.js';
import type {
  CreateMovieHallDTO,
  UpdateMovieHallDTO,
  HallQuality,
  HallIdentifier,
} from '../interfaces/movie-hall.js';
import type {
  MovieHallFilters,
  SortBy,
  SortDir,
} from '../queries/movie-hall.queries.js';
import { BadRequestError } from '../errors/bad-request-error.js';
import { NotFoundError } from '../errors/not-found-error.js';

export class MovieHallController {
  /** Create a new movie hall */
  createHall = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const hallData: CreateMovieHallDTO = req.body;

      if (!hallData.theaterId) {
        throw new BadRequestError('Theater ID is required');
      }
      if (!hallData.hallId) {
        throw new BadRequestError('Hall ID is required');
      }
      if (!hallData.seatsLayout || !Array.isArray(hallData.seatsLayout)) {
        throw new BadRequestError('Valid seats layout is required');
      }
      if (!hallData.quality) {
        throw new BadRequestError('Hall quality is required');
      }

      // Validate layout
      const validation = movieHallService.validateLayout(hallData.seatsLayout);
      if (!validation.isValid) {
        throw new BadRequestError(
          `Invalid seats layout: ${validation.errors.join(', ')}`
        );
      }

      const hall = await movieHallService.create(hallData);

      res.status(201).json({
        message: 'Movie hall created successfully',
        data: { hall },
      });
    } catch (error) {
      next(error);
    }
  };

  /** Get a hall by composite key (theaterId + hallId) */
  getHallById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { theaterId, hallId } = req.params;
      const hall = await movieHallService.get(theaterId, hallId);

      if (!hall) {
        throw new NotFoundError(
          `Hall ${hallId} not found in theater ${theaterId}`
        );
      }

      res.status(200).json({
        message: 'Movie hall found successfully',
        data: { hall },
      });
    } catch (error) {
      next(error);
    }
  };

  /** Update a hall by composite key */
  updateHall = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { theaterId, hallId } = req.params;
      const updateData: UpdateMovieHallDTO = req.body;

      // Validate layout if provided
      if (updateData.seatsLayout) {
        const validation = movieHallService.validateLayout(
          updateData.seatsLayout
        );
        if (!validation.isValid) {
          throw new BadRequestError(
            `Invalid seats layout: ${validation.errors.join(', ')}`
          );
        }
      }

      const hall = await movieHallService.update(theaterId, hallId, updateData);

      if (!hall) {
        throw new NotFoundError(
          `Hall ${hallId} not found in theater ${theaterId}`
        );
      }

      res.status(200).json({
        message: 'Movie hall updated successfully',
        data: { hall },
      });
    } catch (error) {
      next(error);
    }
  };

  /** Delete a hall by composite key */
  deleteHall = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { theaterId, hallId } = req.params;
      const deleted = await movieHallService.remove(theaterId, hallId);

      if (!deleted) {
        throw new NotFoundError(
          `Hall ${hallId} not found in theater ${theaterId}`
        );
      }

      res.status(200).json({
        message: 'Movie hall deleted successfully',
        data: null,
      });
    } catch (error) {
      next(error);
    }
  };

  /** List halls with pagination, sorting, and filters */
  listHalls = async (
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
      const filters: MovieHallFilters = {};

      if (req.query.theaterId) {
        if (Array.isArray(req.query.theaterId)) {
          filters.theaterId = req.query.theaterId as string[];
        } else {
          filters.theaterId = req.query.theaterId as string;
        }
      }

      if (req.query.hallId) {
        if (Array.isArray(req.query.hallId)) {
          filters.hallId = req.query.hallId as string[];
        } else {
          filters.hallId = req.query.hallId as string;
        }
      }

      if (req.query.quality) {
        if (Array.isArray(req.query.quality)) {
          filters.quality = req.query.quality as HallQuality[];
        } else {
          filters.quality = req.query.quality as HallQuality;
        }
      }

      // Capacity filters
      if (req.query.minCapacity) {
        filters.minCapacity = parseInt(req.query.minCapacity as string, 10);
      }
      if (req.query.maxCapacity) {
        filters.maxCapacity = parseInt(req.query.maxCapacity as string, 10);
      }

      // Date range filters
      if (req.query.createdFrom)
        filters.createdFrom = req.query.createdFrom as string;
      if (req.query.createdTo)
        filters.createdTo = req.query.createdTo as string;
      if (req.query.updatedFrom)
        filters.updatedFrom = req.query.updatedFrom as string;
      if (req.query.updatedTo)
        filters.updatedTo = req.query.updatedTo as string;

      const result = await movieHallService.list({
        page,
        limit,
        sortBy,
        sortDir,
        filters,
      });

      res.status(200).json({
        message: 'Movie halls found successfully',
        data: {
          halls: result.items,
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

  /** Search halls with free-text query and filters */
  searchHalls = async (
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
      const filters: MovieHallFilters = {};

      if (req.query.theaterId) {
        if (Array.isArray(req.query.theaterId)) {
          filters.theaterId = req.query.theaterId as string[];
        } else {
          filters.theaterId = req.query.theaterId as string;
        }
      }

      if (req.query.hallId) {
        if (Array.isArray(req.query.hallId)) {
          filters.hallId = req.query.hallId as string[];
        } else {
          filters.hallId = req.query.hallId as string;
        }
      }

      if (req.query.quality) {
        if (Array.isArray(req.query.quality)) {
          filters.quality = req.query.quality as HallQuality[];
        } else {
          filters.quality = req.query.quality as HallQuality;
        }
      }

      // Capacity filters
      if (req.query.minCapacity) {
        filters.minCapacity = parseInt(req.query.minCapacity as string, 10);
      }
      if (req.query.maxCapacity) {
        filters.maxCapacity = parseInt(req.query.maxCapacity as string, 10);
      }

      // Date range filters
      if (req.query.createdFrom)
        filters.createdFrom = req.query.createdFrom as string;
      if (req.query.createdTo)
        filters.createdTo = req.query.createdTo as string;
      if (req.query.updatedFrom)
        filters.updatedFrom = req.query.updatedFrom as string;
      if (req.query.updatedTo)
        filters.updatedTo = req.query.updatedTo as string;

      const result = await movieHallService.search({
        page,
        limit,
        sortBy,
        sortDir,
        q,
        filters,
      });

      res.status(200).json({
        message: 'Movie halls found successfully',
        data: {
          halls: result.items,
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

  /** Get halls by theater */
  getHallsByTheater = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { theaterId } = req.params;
      const page = req.query.page
        ? parseInt(req.query.page as string, 10)
        : undefined;
      const limit =
        req.query.limit || req.query.pageSize
          ? parseInt((req.query.limit || req.query.pageSize) as string, 10)
          : undefined;
      const sortBy = req.query.sortBy as SortBy | undefined;
      const sortDir = req.query.sortDir as SortDir | undefined;

      const result = await movieHallService.getByTheater(theaterId, {
        page,
        limit,
        sortBy,
        sortDir,
      });

      res.status(200).json({
        message: 'Halls for theater found successfully',
        data: {
          halls: result.items,
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

  /** Get halls by quality */
  getHallsByQuality = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { quality } = req.params;

      if (!['2D', '3D', 'IMAX', '4DX'].includes(quality)) {
        throw new BadRequestError('Invalid hall quality');
      }

      const page = req.query.page
        ? parseInt(req.query.page as string, 10)
        : undefined;
      const limit =
        req.query.limit || req.query.pageSize
          ? parseInt((req.query.limit || req.query.pageSize) as string, 10)
          : undefined;
      const sortBy = req.query.sortBy as SortBy | undefined;
      const sortDir = req.query.sortDir as SortDir | undefined;

      const result = await movieHallService.getByQuality(
        quality as HallQuality,
        {
          page,
          limit,
          sortBy,
          sortDir,
        }
      );

      res.status(200).json({
        message: `Halls with ${quality} quality found successfully`,
        data: {
          halls: result.items,
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

  /** Get halls by multiple qualities */
  getHallsByQualities = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const qualities = req.body.qualities as HallQuality[];

      if (!Array.isArray(qualities) || qualities.length === 0) {
        throw new BadRequestError('Qualities array is required');
      }

      const invalidQualities = qualities.filter(
        (q) => !['2D', '3D', 'IMAX', '4DX'].includes(q)
      );
      if (invalidQualities.length > 0) {
        throw new BadRequestError(
          `Invalid hall qualities: ${invalidQualities.join(', ')}`
        );
      }

      const page = req.query.page
        ? parseInt(req.query.page as string, 10)
        : undefined;
      const limit =
        req.query.limit || req.query.pageSize
          ? parseInt((req.query.limit || req.query.pageSize) as string, 10)
          : undefined;
      const sortBy = req.query.sortBy as SortBy | undefined;
      const sortDir = req.query.sortDir as SortDir | undefined;

      const result = await movieHallService.getByQualities(qualities, {
        page,
        limit,
        sortBy,
        sortDir,
      });

      res.status(200).json({
        message: 'Halls with specified qualities found successfully',
        data: {
          halls: result.items,
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

  /** Get multiple specific halls */
  getMultipleHalls = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const halls = req.body.halls as HallIdentifier[];

      if (!Array.isArray(halls) || halls.length === 0) {
        throw new BadRequestError('Halls array is required');
      }

      // Validate hall identifiers
      for (const hall of halls) {
        if (!hall.theaterId || !hall.hallId) {
          throw new BadRequestError('Each hall must have theaterId and hallId');
        }
      }

      const page = req.query.page
        ? parseInt(req.query.page as string, 10)
        : undefined;
      const limit =
        req.query.limit || req.query.pageSize
          ? parseInt((req.query.limit || req.query.pageSize) as string, 10)
          : undefined;
      const sortBy = req.query.sortBy as SortBy | undefined;
      const sortDir = req.query.sortDir as SortDir | undefined;

      const result = await movieHallService.getMultiple(halls, {
        page,
        limit,
        sortBy,
        sortDir,
      });

      res.status(200).json({
        message: 'Specified halls found successfully',
        data: {
          halls: result.items,
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

  /** Get hall capacity information */
  getHallCapacity = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { theaterId, hallId } = req.params;
      const capacityInfo = await movieHallService.getCapacityInfo(
        theaterId,
        hallId
      );

      if (!capacityInfo) {
        throw new NotFoundError(
          `Hall ${hallId} not found in theater ${theaterId}`
        );
      }

      res.status(200).json({
        message: 'Hall capacity information retrieved successfully',
        data: { capacity: capacityInfo },
      });
    } catch (error) {
      next(error);
    }
  };

  /** Get capacity information for all halls in a theater */
  getTheaterCapacities = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { theaterId } = req.params;
      const capacities = await movieHallService.getTheaterCapacities(theaterId);

      res.status(200).json({
        message: 'Theater hall capacities retrieved successfully',
        data: {
          capacities,
          total: capacities.length,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /** Check if hall exists */
  checkHallExists = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { theaterId, hallId } = req.params;
      const exists = await movieHallService.exists(theaterId, hallId);

      res.status(200).json({
        message: 'Hall existence check completed',
        data: { exists },
      });
    } catch (error) {
      next(error);
    }
  };

  /** Get all seat IDs from a hall */
  getHallSeatIds = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { theaterId, hallId } = req.params;
      const seatIds = await movieHallService.getAllSeatIds(theaterId, hallId);

      res.status(200).json({
        message: 'Hall seat IDs retrieved successfully',
        data: {
          seatIds,
          total: seatIds.length,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /** Get hall statistics and analytics */
  getHallStats = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const stats = await movieHallService.getStats();

      res.status(200).json({
        message: 'Hall statistics retrieved successfully',
        data: { stats },
      });
    } catch (error) {
      next(error);
    }
  };

  /** Update hall layout */
  updateHallLayout = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { theaterId, hallId } = req.params;
      const { seatsLayout } = req.body;

      if (!seatsLayout || !Array.isArray(seatsLayout)) {
        throw new BadRequestError('Valid seats layout is required');
      }

      // Validate layout
      const validation = movieHallService.validateLayout(seatsLayout);
      if (!validation.isValid) {
        throw new BadRequestError(
          `Invalid seats layout: ${validation.errors.join(', ')}`
        );
      }

      const hall = await movieHallService.updateLayout(
        theaterId,
        hallId,
        seatsLayout
      );

      if (!hall) {
        throw new NotFoundError(
          `Hall ${hallId} not found in theater ${theaterId}`
        );
      }

      res.status(200).json({
        message: 'Hall layout updated successfully',
        data: { hall },
      });
    } catch (error) {
      next(error);
    }
  };

  /** Validate hall layout */
  validateHallLayout = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { seatsLayout } = req.body;

      if (!seatsLayout || !Array.isArray(seatsLayout)) {
        throw new BadRequestError('Valid seats layout is required');
      }

      const validation = movieHallService.validateLayout(seatsLayout);

      res.status(200).json({
        message: 'Layout validation completed',
        data: {
          isValid: validation.isValid,
          errors: validation.errors,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}

/** Singleton instance for routing usage */
export const movieHallController = new MovieHallController();
