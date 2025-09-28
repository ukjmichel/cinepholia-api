/**
 * @module controllers/screening.controller
 *
 * Express controller for managing movie screenings and their operations.
 */

import { Request, Response, NextFunction } from 'express';
import screeningService from '../services/screening.service.js';
import { sequelize } from '../config/db.js';
import type {
  CreateScreeningDTO,
  UpdateScreeningDTO,
  PriceRange,
  TimeSlot,
  HallReference,
  HallQuality, // <-- added
} from '../interfaces/screening.js';
import type {
  ScreeningFilters,
  SortBy,
  SortDir,
} from '../queries/screening.queries.js';
import { BadRequestError } from '../errors/bad-request-error.js';
import { NotFoundError } from '../errors/not-found-error.js';

export class ScreeningController {
  /** Create a new screening */
  createScreening = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const transaction = await sequelize.transaction();
    try {
      const screeningData: CreateScreeningDTO = req.body;

      if (!screeningData.movieId) {
        throw new BadRequestError('Movie ID is required');
      }
      if (!screeningData.theaterId) {
        throw new BadRequestError('Theater ID is required');
      }
      if (!screeningData.hallId) {
        throw new BadRequestError('Hall ID is required');
      }
      if (!screeningData.startTime) {
        throw new BadRequestError('Start time is required');
      }
      if (screeningData.price === undefined || screeningData.price === null) {
        throw new BadRequestError('Price is required');
      }

      // Parse start time if it's a string
      if (typeof screeningData.startTime === 'string') {
        screeningData.startTime = new Date(screeningData.startTime);
        if (isNaN(screeningData.startTime.getTime())) {
          throw new BadRequestError('Invalid start time format');
        }
      }

      const screening = await screeningService.create(screeningData, {
        transaction,
      });

      await transaction.commit();

      res.status(201).json({
        message: 'Screening created successfully',
        data: { screening },
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

  /** Get a screening by ID */
  getScreeningById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { screeningId } = req.params;
      const screening = await screeningService.get(screeningId);

      if (!screening) {
        throw new NotFoundError(`Screening ${screeningId} not found`);
      }

      res.status(200).json({
        message: 'Screening found successfully',
        data: { screening },
      });
    } catch (error) {
      next(error);
    }
  };

  /** Update a screening by ID */
  updateScreening = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const transaction = await sequelize.transaction();
    try {
      const { screeningId } = req.params;
      const updateData: UpdateScreeningDTO = req.body;

      // Parse start time if it's provided as a string
      if (updateData.startTime && typeof updateData.startTime === 'string') {
        updateData.startTime = new Date(updateData.startTime);
        if (isNaN(updateData.startTime.getTime())) {
          throw new BadRequestError('Invalid start time format');
        }
      }

      const screening = await screeningService.update(screeningId, updateData, {
        transaction,
      });

      if (!screening) {
        throw new NotFoundError(`Screening ${screeningId} not found`);
      }

      await transaction.commit();

      res.status(200).json({
        message: 'Screening updated successfully',
        data: { screening },
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

  /** Delete a screening by ID */
  deleteScreening = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const transaction = await sequelize.transaction();
    try {
      const { screeningId } = req.params;
      const deleted = await screeningService.remove(screeningId, {
        transaction,
      });

      if (!deleted) {
        throw new NotFoundError(`Screening ${screeningId} not found`);
      }

      await transaction.commit();

      res.status(200).json({
        message: 'Screening deleted successfully',
        data: null,
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

  /** List screenings with pagination, sorting, and filters */
  listScreenings = async (
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
      const filters: ScreeningFilters = {};

      if (req.query.movieId) {
        if (Array.isArray(req.query.movieId)) {
          filters.movieId = req.query.movieId as string[];
        } else {
          filters.movieId = req.query.movieId as string;
        }
      }

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

      // --- Hall quality filter (single, multi, or CSV) ---
      if (req.query.quality) {
        if (Array.isArray(req.query.quality)) {
          filters.quality = req.query.quality as HallQuality[];
        } else if (typeof req.query.quality === 'string') {
          const list = (req.query.quality as string)
            .split(',')
            .map((q) => q.trim())
            .filter(Boolean) as HallQuality[];
          filters.quality = list.length > 1 ? list : (list[0] as HallQuality);
        }
      }

      // Price filters
      if (req.query.minPrice) {
        filters.minPrice = parseFloat(req.query.minPrice as string);
      }
      if (req.query.maxPrice) {
        filters.maxPrice = parseFloat(req.query.maxPrice as string);
      }

      // Time filters
      if (req.query.startTimeFrom) {
        filters.startTimeFrom = req.query.startTimeFrom as string;
      }
      if (req.query.startTimeTo) {
        filters.startTimeTo = req.query.startTimeTo as string;
      }

      // Date filters
      if (req.query.screeningDate) {
        filters.screeningDate = req.query.screeningDate as string;
      }
      if (req.query.dateFrom) {
        filters.dateFrom = req.query.dateFrom as string;
      }
      if (req.query.dateTo) {
        filters.dateTo = req.query.dateTo as string;
      }

      // Time-of-day filters
      if (req.query.timeFrom) {
        filters.timeFrom = req.query.timeFrom as string;
      }
      if (req.query.timeTo) {
        filters.timeTo = req.query.timeTo as string;
      }

      // Record management filters
      if (req.query.createdFrom)
        filters.createdFrom = req.query.createdFrom as string;
      if (req.query.createdTo)
        filters.createdTo = req.query.createdTo as string;
      if (req.query.updatedFrom)
        filters.updatedFrom = req.query.updatedFrom as string;
      if (req.query.updatedTo)
        filters.updatedTo = req.query.updatedTo as string;

      const result = await screeningService.list({
        page,
        limit,
        sortBy,
        sortDir,
        filters,
      });

      res.status(200).json({
        message: 'Screenings found successfully',
        data: {
          screenings: result.items,
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

  /** Search screenings with free-text query and filters */
  searchScreenings = async (
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

      // Build filters from query parameters (similar to listScreenings)
      const filters: ScreeningFilters = {};

      if (req.query.movieId) {
        if (Array.isArray(req.query.movieId)) {
          filters.movieId = req.query.movieId as string[];
        } else {
          filters.movieId = req.query.movieId as string;
        }
      }

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

      // --- NEW: Hall quality filter for search (single, multi, CSV) ---
      if (req.query.quality) {
        if (Array.isArray(req.query.quality)) {
          filters.quality = req.query.quality as HallQuality[];
        } else if (typeof req.query.quality === 'string') {
          const list = (req.query.quality as string)
            .split(',')
            .map((q) => q.trim())
            .filter(Boolean) as HallQuality[];
          filters.quality = list.length > 1 ? list : (list[0] as HallQuality);
        }
      }

      // Price filters
      if (req.query.minPrice) {
        filters.minPrice = parseFloat(req.query.minPrice as string);
      }
      if (req.query.maxPrice) {
        filters.maxPrice = parseFloat(req.query.maxPrice as string);
      }

      // Time and date filters
      if (req.query.startTimeFrom) {
        filters.startTimeFrom = req.query.startTimeFrom as string;
      }
      if (req.query.startTimeTo) {
        filters.startTimeTo = req.query.startTimeTo as string;
      }
      if (req.query.screeningDate) {
        filters.screeningDate = req.query.screeningDate as string;
      }
      if (req.query.dateFrom) {
        filters.dateFrom = req.query.dateFrom as string;
      }
      if (req.query.dateTo) {
        filters.dateTo = req.query.dateTo as string;
      }

      const result = await screeningService.search({
        page,
        limit,
        sortBy,
        sortDir,
        q,
        filters,
      });

      res.status(200).json({
        message: 'Screenings found successfully',
        data: {
          screenings: result.items,
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

  /** Get screenings by movie */
  getScreeningsByMovie = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { movieId } = req.params;
      const page = req.query.page
        ? parseInt(req.query.page as string, 10)
        : undefined;
      const limit =
        req.query.limit || req.query.pageSize
          ? parseInt((req.query.limit || req.query.pageSize) as string, 10)
          : undefined;
      const sortBy = req.query.sortBy as SortBy | undefined;
      const sortDir = req.query.sortDir as SortDir | undefined;

      const result = await screeningService.getByMovie(movieId, {
        page,
        limit,
        sortBy,
        sortDir,
      });

      res.status(200).json({
        message: 'Screenings for movie found successfully',
        data: {
          screenings: result.items,
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

  /** Get screenings by theater */
  getScreeningsByTheater = async (
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

      const result = await screeningService.getByTheater(theaterId, {
        page,
        limit,
        sortBy,
        sortDir,
      });

      res.status(200).json({
        message: 'Screenings for theater found successfully',
        data: {
          screenings: result.items,
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

  /** Get screenings by hall */
  getScreeningsByHall = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { theaterId, hallId } = req.params;
      const page = req.query.page
        ? parseInt(req.query.page as string, 10)
        : undefined;
      const limit =
        req.query.limit || req.query.pageSize
          ? parseInt((req.query.limit || req.query.pageSize) as string, 10)
          : undefined;
      const sortBy = req.query.sortBy as SortBy | undefined;
      const sortDir = req.query.sortDir as SortDir | undefined;

      const result = await screeningService.getByHall(theaterId, hallId, {
        page,
        limit,
        sortBy,
        sortDir,
      });

      res.status(200).json({
        message: 'Screenings for hall found successfully',
        data: {
          screenings: result.items,
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

  /** Get screenings by date */
  getScreeningsByDate = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { date } = req.params;
      const parsedDate = new Date(date);

      if (isNaN(parsedDate.getTime())) {
        throw new BadRequestError('Invalid date format');
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

      const result = await screeningService.getByDate(parsedDate, {
        page,
        limit,
        sortBy,
        sortDir,
      });

      res.status(200).json({
        message: 'Screenings for date found successfully',
        data: {
          screenings: result.items,
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

  /** Get upcoming screenings */
  getUpcomingScreenings = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const fromTime = req.query.from
        ? new Date(req.query.from as string)
        : new Date();

      if (req.query.from && isNaN(fromTime.getTime())) {
        throw new BadRequestError('Invalid from time format');
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

      const result = await screeningService.getUpcoming(fromTime, {
        page,
        limit,
        sortBy,
        sortDir,
      });

      res.status(200).json({
        message: 'Upcoming screenings found successfully',
        data: {
          screenings: result.items,
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

  /** Get past screenings */
  getPastScreenings = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const beforeTime = req.query.before
        ? new Date(req.query.before as string)
        : new Date();

      if (req.query.before && isNaN(beforeTime.getTime())) {
        throw new BadRequestError('Invalid before time format');
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

      const result = await screeningService.getPast(beforeTime, {
        page,
        limit,
        sortBy,
        sortDir,
      });

      res.status(200).json({
        message: 'Past screenings found successfully',
        data: {
          screenings: result.items,
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

  /** Get multiple specific screenings */
  getMultipleScreenings = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const screeningIds = req.body.screeningIds as string[];

      if (!Array.isArray(screeningIds) || screeningIds.length === 0) {
        throw new BadRequestError('Screening IDs array is required');
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

      const result = await screeningService.getMultiple(screeningIds, {
        page,
        limit,
        sortBy,
        sortDir,
      });

      res.status(200).json({
        message: 'Specified screenings found successfully',
        data: {
          screenings: result.items,
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

  /** Check for scheduling conflicts */
  checkSchedulingConflicts = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const transaction = await sequelize.transaction();
    try {
      const { theaterId, hallId } = req.params;
      const { startTime, excludeScreeningId } = req.body;

      if (!startTime) {
        throw new BadRequestError('Start time is required');
      }

      const parsedStartTime = new Date(startTime);
      if (isNaN(parsedStartTime.getTime())) {
        throw new BadRequestError('Invalid start time format');
      }

      const conflicts = await screeningService.checkSchedulingConflicts(
        theaterId,
        hallId,
        parsedStartTime,
        excludeScreeningId,
        { transaction }
      );

      await transaction.commit();

      res.status(200).json({
        message: 'Scheduling conflicts check completed',
        data: {
          conflicts,
          hasConflicts: conflicts.length > 0,
          conflictCount: conflicts.length,
        },
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

  /** Check if screening slot is available */
  checkSlotAvailability = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const transaction = await sequelize.transaction();
    try {
      const { theaterId, hallId } = req.params;
      const { startTime, excludeScreeningId } = req.body;

      if (!startTime) {
        throw new BadRequestError('Start time is required');
      }

      const parsedStartTime = new Date(startTime);
      if (isNaN(parsedStartTime.getTime())) {
        throw new BadRequestError('Invalid start time format');
      }

      const isAvailable = await screeningService.isSlotAvailable(
        theaterId,
        hallId,
        parsedStartTime,
        excludeScreeningId,
        { transaction }
      );

      await transaction.commit();

      res.status(200).json({
        message: 'Slot availability check completed',
        data: { isAvailable },
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

  /** Find available time slots */
  findAvailableSlots = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { theaterId, hallId } = req.params;
      const { date, duration } = req.query;

      if (!date) {
        throw new BadRequestError('Date is required');
      }

      const parsedDate = new Date(date as string);
      if (isNaN(parsedDate.getTime())) {
        throw new BadRequestError('Invalid date format');
      }

      const movieDuration = duration
        ? parseInt(duration as string, 10)
        : undefined;

      const availableSlots = await screeningService.findAvailableSlots(
        theaterId,
        hallId,
        parsedDate,
        movieDuration
      );

      res.status(200).json({
        message: 'Available time slots found successfully',
        data: {
          slots: availableSlots,
          count: availableSlots.length,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /** Get theater schedule for a specific date */
  getTheaterSchedule = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { theaterId, date } = req.params;
      const parsedDate = new Date(date);

      if (isNaN(parsedDate.getTime())) {
        throw new BadRequestError('Invalid date format');
      }

      const schedule = await screeningService.getTheaterSchedule(
        theaterId,
        parsedDate
      );

      res.status(200).json({
        message: 'Theater schedule retrieved successfully',
        data: { schedule },
      });
    } catch (error) {
      next(error);
    }
  };

  /** Get movie showtimes */
  getMovieShowtimes = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { movieId } = req.params;
      const { dateFrom, dateTo } = req.query;

      let parsedDateFrom: Date | undefined;
      let parsedDateTo: Date | undefined;

      if (dateFrom) {
        parsedDateFrom = new Date(dateFrom as string);
        if (isNaN(parsedDateFrom.getTime())) {
          throw new BadRequestError('Invalid dateFrom format');
        }
      }

      if (dateTo) {
        parsedDateTo = new Date(dateTo as string);
        if (isNaN(parsedDateTo.getTime())) {
          throw new BadRequestError('Invalid dateTo format');
        }
      }

      const showtimes = await screeningService.getMovieShowtimes(
        movieId,
        parsedDateFrom,
        parsedDateTo
      );

      res.status(200).json({
        message: 'Movie showtimes retrieved successfully',
        data: { showtimes },
      });
    } catch (error) {
      next(error);
    }
  };

  /** Check if screening exists */
  checkScreeningExists = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { screeningId } = req.params;
      const exists = await screeningService.exists(screeningId);

      res.status(200).json({
        message: 'Screening existence check completed',
        data: { exists },
      });
    } catch (error) {
      next(error);
    }
  };

  /** Initialize database with screenings for all theaters and halls - Staff/Admin only */
  initializeDatabase = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const transaction = await sequelize.transaction();
    try {
      const {
        year,
        month,
        screeningsPerDay,
        startHour,
        basePrice,
        clearExisting,
      } = req.body;

      const options = {
        year: year ? parseInt(year, 10) : undefined,
        month: month ? parseInt(month, 10) : undefined,
        screeningsPerDay: screeningsPerDay ? parseInt(screeningsPerDay, 10) : 4,
        startHour: startHour ? parseInt(startHour, 10) : 10,
        basePrice: basePrice ? parseFloat(basePrice) : 12.5,
        clearExisting: clearExisting !== false, // Default to true
      };

      const result = await screeningService.initializeDatabase(options, {
        transaction,
      });

      await transaction.commit();

      const successfulHalls = result.theaterResults.reduce(
        (acc, theater) =>
          acc + theater.hallResults.filter((hall) => hall.success).length,
        0
      );

      const failedHalls = result.theaterResults.reduce(
        (acc, theater) =>
          acc + theater.hallResults.filter((hall) => !hall.success).length,
        0
      );

      res.status(201).json({
        message: 'Database initialization completed successfully',
        data: {
          summary: {
            totalScreenings: result.totalScreenings,
            theatersProcessed: result.theaterResults.length,
            successfulHalls,
            failedHalls,
          },
          results: result.theaterResults,
          options,
        },
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

  /** Generate monthly schedule for a theater hall - Staff/Admin only */
  generateMonthlySchedule = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const transaction = await sequelize.transaction();
    try {
      const { theaterId, hallId } = req.params;
      const { year, month, screeningsPerDay, startHour, movieIds, basePrice } =
        req.body;

      if (!year || !month) {
        throw new BadRequestError('Year and month are required');
      }

      const yearNum = parseInt(year, 10);
      const monthNum = parseInt(month, 10);

      if (isNaN(yearNum) || isNaN(monthNum)) {
        throw new BadRequestError('Year and month must be valid numbers');
      }

      const options = {
        screeningsPerDay: screeningsPerDay ? parseInt(screeningsPerDay, 10) : 4,
        startHour: startHour ? parseInt(startHour, 10) : 10,
        movieIds: movieIds || [],
        basePrice: basePrice ? parseFloat(basePrice) : 12.5,
      };

      const screenings = await screeningService.generateMonthlySchedule(
        theaterId,
        hallId,
        yearNum,
        monthNum,
        options,
        { transaction }
      );

      await transaction.commit();

      res.status(201).json({
        message: `Monthly schedule generated successfully for ${monthNum}/${yearNum}`,
        data: {
          screenings,
          count: screenings.length,
          theaterId,
          hallId,
          month: monthNum,
          year: yearNum,
        },
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

  /** Clear monthly schedule for a theater hall - Staff/Admin only */
  clearMonthlySchedule = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const transaction = await sequelize.transaction();
    try {
      const { theaterId, hallId } = req.params;
      const { year, month } = req.body;

      if (!year || !month) {
        throw new BadRequestError('Year and month are required');
      }

      const yearNum = parseInt(year, 10);
      const monthNum = parseInt(month, 10);

      if (isNaN(yearNum) || isNaN(monthNum)) {
        throw new BadRequestError('Year and month must be valid numbers');
      }

      const deletedCount = await screeningService.clearMonthlySchedule(
        theaterId,
        hallId,
        yearNum,
        monthNum,
        { transaction }
      );

      await transaction.commit();

      res.status(200).json({
        message: `Monthly schedule cleared successfully for ${monthNum}/${yearNum}`,
        data: {
          deletedCount,
          theaterId,
          hallId,
          month: monthNum,
          year: yearNum,
        },
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

  /** Get screening statistics and analytics */
  getScreeningStats = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const stats = await screeningService.getStats();

      res.status(200).json({
        message: 'Screening statistics retrieved successfully',
        data: { stats },
      });
    } catch (error) {
      next(error);
    }
  };
}

/** Singleton instance for routing usage */
export const screeningController = new ScreeningController();
