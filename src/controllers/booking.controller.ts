/**
 * @module controllers/booking.controller
 *
 * Express controller for cinema bookings with modern patterns, pagination,
 * and structured search capabilities.
 *
 * @features
 * - CRUD operations with DTO responses
 * - Paginated list and search endpoints
 * - Structured filtering and sorting
 * - Transactional seat booking operations
 * - Enhanced error handling and validation
 * - Authorization and access control
 * - Movie statistics tracking integration
 */

import { Request, Response, NextFunction } from 'express';
import dayjs from 'dayjs';
import { sequelize } from '../config/db.js';

import { bookingService } from '../services/booking.service.js';
import { bookedSeatService } from '../services/booked-seat.service.js';
import screeningService from '../services/screening.service.js';
import movieStatsService from '../services/movie-stats.service.js';

import { NotFoundError } from '../errors/not-found-error.js';
import { BadRequestError } from '../errors/bad-request-error.js';
import { ConflictError } from '../errors/conflict-error.js';

import type { ListOptions, SearchParams } from '../queries/booking.queries.js';

/* ----------------------------- helpers ----------------------------- */

/** returns true if req.user is the owner of the booking or has one of the roles */
function canActOnBooking(
  req: Request,
  bookingUserId: string,
  roles: string[] = []
): boolean {
  const isOwner =
    (req as any).user?.id && (req as any).user.id === bookingUserId;
  const hasRole =
    Array.isArray((req as any).user?.roles) &&
    (req as any).user.roles.some((r: string) => roles.includes(r));
  return Boolean(isOwner || hasRole);
}

/** Extract pagination and filter parameters from query */
function extractListOptions(query: any): ListOptions {
  const {
    page,
    limit,
    sortBy,
    sortDir,
    // Filters
    bookingId,
    userId,
    screeningId,
    status,
    minPrice,
    maxPrice,
    minSeats,
    maxSeats,
    bookedFrom,
    bookedTo,
    createdFrom,
    createdTo,
    updatedFrom,
    updatedTo,
  } = query;

  return {
    page: page ? parseInt(page) : undefined,
    limit: limit ? parseInt(limit) : undefined,
    sortBy,
    sortDir,
    filters: {
      bookingId,
      userId,
      screeningId,
      status,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      minSeats: minSeats ? parseInt(minSeats) : undefined,
      maxSeats: maxSeats ? parseInt(maxSeats) : undefined,
      bookedFrom,
      bookedTo,
      createdFrom,
      createdTo,
      updatedFrom,
      updatedTo,
    },
  };
}

/** Extract search parameters from query */
function extractSearchParams(query: any): SearchParams {
  const { q } = query;
  const listOptions = extractListOptions(query);
  return { ...listOptions, q };
}

export class BookingController {
  /* =============== MODERN CRUD ENDPOINTS =============== */

  /**
   * List bookings with pagination, filtering, and sorting.
   * @route GET /api/bookings
   */
  listBookings = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const options = extractListOptions(req.query);
      const result = await bookingService.list(options);

      res.status(200).json({
        message: 'Bookings retrieved successfully',
        data: result.items,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Search bookings with free-text query plus structured filters.
   * @route GET /api/bookings/search
   */
  searchBookings = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const params = extractSearchParams(req.query);
      const result = await bookingService.search(params);

      res.status(200).json({
        message: 'Search completed successfully',
        data: result.items,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create a new booking with seat reservation.
   * @route POST /api/bookings
   */
  createBooking = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { userId, screeningId, seatIds } = req.body as {
      userId: string;
      screeningId: string;
      seatIds: string[];
    };

    // ---- Basic validation ----
    if (!userId || typeof userId !== 'string') {
      res.status(400).json({
        message: 'userId is required and must be a string',
        data: null,
      });
      return;
    }
    if (!screeningId || typeof screeningId !== 'string') {
      res.status(400).json({
        message: 'screeningId is required and must be a string',
        data: null,
      });
      return;
    }
    if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
      res.status(400).json({
        message: 'seatIds is required and must be a non-empty array',
        data: null,
      });
      return;
    }
    if (!seatIds.every((s) => typeof s === 'string' && s.length > 0)) {
      res
        .status(400)
        .json({ message: 'All seatIds must be non-empty strings', data: null });
      return;
    }
    const uniqueSeatIds = [...new Set(seatIds)];
    if (uniqueSeatIds.length !== seatIds.length) {
      res
        .status(400)
        .json({ message: 'Duplicate seats in booking request', data: null });
      return;
    }

    const t = await sequelize.transaction();
    try {
      // 1) Get screening & basic checks
      const screening = await screeningService.getById(screeningId, {
        transaction: t,
      });
      if (!screening) {
        await t.rollback();
        res.status(404).json({ message: 'Screening not found', data: null });
        return;
      }

      const startsAt =
        (screening as any).startTime ?? (screening as any).startsAt;
      if (startsAt && dayjs(startsAt).isBefore(dayjs())) {
        await t.rollback();
        res.status(400).json({
          message: 'Screening already started or finished',
          data: null,
        });
        return;
      }

      // 2) Validate seats existence & availability
      await bookedSeatService.validateSeatsExist(screeningId, uniqueSeatIds, t);
      await bookedSeatService.validateSeatsAvailable(
        screeningId,
        uniqueSeatIds,
        t
      );

      // 3) Compute pricing fields
      const unitPrice =
        (screening as any).ticketPrice ??
        (screening as any).price ??
        (screening as any).ticket_price ??
        null;

      if (unitPrice == null || Number.isNaN(Number(unitPrice))) {
        await t.rollback();
        res.status(400).json({
          message:
            'Unable to compute total price: screening has no ticket price defined',
          data: null,
        });
        return;
      }

      const seatsNumber = uniqueSeatIds.length;
      const totalPrice = Number(unitPrice) * seatsNumber;

      // 4) Create booking using service method
      const bookingPayload = {
        userId,
        screeningId,
        seatsNumber,
        totalPrice,
        status: 'PENDING' as const,
        bookingDate: new Date(),
      };

      const booking = await bookingService.createBookingWithSeats(
        bookingPayload,
        uniqueSeatIds,
        { transaction: t }
      );

      await t.commit();

      // 5) Update movie statistics (after transaction commits)
      // Extract movieId from the screening
      const movieId = (screening as any).movieId;
      if (movieId) {
        try {
          // Add the number of seats booked to the stats
          await movieStatsService.addBooking(
            movieId,
            seatsNumber,
            new Date().toISOString().slice(0, 10)
          );
          console.log(
            `Movie stats updated: added ${seatsNumber} bookings for movie ${movieId}`
          );
        } catch (statsError) {
          // Log error but don't fail the booking
          console.error('Failed to update movie stats:', statsError);
        }
      }

      res.status(201).json({
        message: 'Booking created successfully',
        data: null,
      });
    } catch (err: any) {
      await t.rollback();

      if (err?.name === 'SequelizeUniqueConstraintError') {
        res.status(409).json({
          message: 'One or more seats have just been booked',
          data: null,
        });
        return;
      }
      if (err instanceof NotFoundError) {
        res.status(404).json({ message: err.message, data: null });
        return;
      }
      if (err instanceof BadRequestError) {
        res.status(400).json({ message: err.message, data: null });
        return;
      }
      if (err instanceof ConflictError) {
        res.status(409).json({ message: err.message, data: null });
        return;
      }

      next(err);
    }
  };

  /**
   * Get a single booking by ID.
   * @route GET /api/bookings/:bookingId
   */
  getBooking = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const booking = await bookingService.getById(req.params.bookingId);

      res.status(200).json({
        message: 'Booking retrieved successfully',
        data: booking,
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ message: error.message, data: null });
        return;
      }
      next(error);
    }
  };

  /**
   * Update a booking.
   * @route PATCH /api/bookings/:bookingId
   */
  updateBooking = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { bookingId } = req.params;
    const update = req.body;

    try {
      const existing = await bookingService.getById(bookingId);
      if (!canActOnBooking(req, existing.userId, ['admin'])) {
        res.status(403).json({ message: 'Forbidden', data: null });
        return;
      }

      const booking = await bookingService.update(bookingId, update);
      if (!booking) {
        res.status(404).json({ message: 'Booking not found', data: null });
        return;
      }

      res.status(200).json({
        message: 'Booking updated successfully',
        data: booking,
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ message: error.message, data: null });
        return;
      }
      next(error);
    }
  };

  /**
   * Delete a booking.
   * @route DELETE /api/bookings/:bookingId
   */
  deleteBooking = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { bookingId } = req.params;
    const t = await sequelize.transaction();

    try {
      const booking = await bookingService.getById(bookingId);
      if (!canActOnBooking(req, booking.userId, ['admin'])) {
        await t.rollback();
        res.status(403).json({ message: 'Forbidden', data: null });
        return;
      }

      // Store booking details before deletion for stats update
      const seatsNumber = booking.seatsNumber;
      const screeningId = booking.screeningId;

      // Remove seat bookings first
      await bookedSeatService.deleteSeatBookingsByBookingId(bookingId, t);

      // Remove booking
      const deleted = await bookingService.remove(bookingId, {
        transaction: t,
      });
      if (!deleted) {
        await t.rollback();
        res.status(404).json({ message: 'Booking not found', data: null });
        return;
      }

      await t.commit();

      // Update movie statistics (after transaction commits)
      try {
        const screening = await screeningService.getById(screeningId);
        const movieId = (screening as any)?.movieId;

        if (movieId) {
          await movieStatsService.removeBooking(
            movieId,
            seatsNumber,
            new Date().toISOString().slice(0, 10)
          );
          console.log(
            `Movie stats updated: removed ${seatsNumber} bookings for movie ${movieId}`
          );
        }
      } catch (statsError) {
        // Log error but don't fail the deletion
        console.error('Failed to update movie stats:', statsError);
      }

      res
        .status(200)
        .json({ message: 'Booking deleted successfully', data: null });
    } catch (error) {
      await t.rollback();
      if (error instanceof NotFoundError) {
        res.status(404).json({ message: error.message, data: null });
        return;
      }
      next(error);
    }
  };

  /* =============== SPECIALIZED ENDPOINTS =============== */

  /**
   * Get bookings by user with pagination.
   * @route GET /api/bookings/user/:userId
   */
  getBookingsByUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { userId } = req.params;
      const options = extractListOptions(req.query);
      const result = await bookingService.getByUser(userId, options);

      res.status(200).json({
        message: 'User bookings retrieved successfully',
        data: result.items,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get bookings by screening with pagination.
   * @route GET /api/bookings/screening/:screeningId
   */
  getBookingsByScreening = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { screeningId } = req.params;
      const options = extractListOptions(req.query);
      const result = await bookingService.getByScreening(screeningId, options);

      res.status(200).json({
        message: 'Screening bookings retrieved successfully',
        data: result.items,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get bookings by status with pagination.
   * @route GET /api/bookings/status/:status
   */
  getBookingsByStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { status } = req.params;
      const options = extractListOptions(req.query);
      const result = await bookingService.getByStatus(status, options);

      res.status(200).json({
        message: 'Status bookings retrieved successfully',
        data: result.items,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get upcoming bookings for a user.
   * @route GET /api/bookings/user/:userId/upcoming
   */
  getUpcomingBookingsByUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { userId } = req.params;
      const options = extractListOptions(req.query);
      const today = dayjs().startOf('day').toDate();
      const result = await bookingService.getUpcomingByUser(
        userId,
        today,
        options
      );

      res.status(200).json({
        message: 'Upcoming bookings retrieved successfully',
        data: result.items,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /* =============== STATUS MANAGEMENT =============== */

  /**
   * Mark a booking as used.
   * @route PATCH /api/bookings/:bookingId/use
   */
  markBookingAsUsed = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { bookingId } = req.params;
      const booking = await bookingService.getById(bookingId);

      if (booking.status === 'USED') {
        res.status(400).json({
          message: 'Booking already marked as used',
          data: null,
        });
        return;
      }

      const updated = await bookingService.update(bookingId, {
        status: 'USED',
      });
      res.status(200).json({
        message: 'Booking marked as used successfully',
        data: updated,
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ message: error.message, data: null });
        return;
      }
      next(error);
    }
  };

  /**
   * Cancel a booking.
   * @route PATCH /api/bookings/:bookingId/cancel
   */
  cancelBooking = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { bookingId } = req.params;
      const booking = await bookingService.getById(bookingId);

      if (!canActOnBooking(req, booking.userId, ['staff', 'admin'])) {
        res.status(403).json({ message: 'Forbidden', data: null });
        return;
      }

      if (booking.status === 'CANCELLED') {
        res.status(400).json({
          message: 'Booking already cancelled',
          data: null,
        });
        return;
      }

      // Store booking details before cancellation for stats update
      const seatsNumber = booking.seatsNumber;
      const screeningId = booking.screeningId;

      const updated = await bookingService.update(bookingId, {
        status: 'CANCELLED',
      });

      // Update movie statistics (after status update)
      try {
        const screening = await screeningService.getById(screeningId);
        const movieId = (screening as any)?.movieId;

        if (movieId) {
          await movieStatsService.removeBooking(
            movieId,
            seatsNumber,
            new Date().toISOString().slice(0, 10)
          );
          console.log(
            `Movie stats updated: removed ${seatsNumber} bookings for movie ${movieId} (cancelled)`
          );
        }
      } catch (statsError) {
        // Log error but don't fail the cancellation
        console.error('Failed to update movie stats:', statsError);
      }

      res.status(200).json({
        message: 'Booking cancelled successfully',
        data: updated,
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ message: error.message, data: null });
        return;
      }
      next(error);
    }
  };
}

/** Singleton instance for routing usage */
export const bookingController = new BookingController();
