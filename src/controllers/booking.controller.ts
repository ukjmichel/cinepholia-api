/**
 * @module controllers/booking.controller
 * @description
 *   Express controller for cinema bookings, ensuring business validation and
 *   transactional integrity.
 *
 * ## Features
 * - Create, update, delete bookings.
 * - Prevent seat double-booking.
 * - Update booking-related statistics in MongoDB.
 * - Retrieve bookings by user, screening, status, or search query.
 * - Mark bookings as used or canceled.
 * - Get upcoming bookings for a user.
 *
 * ## Response Format
 * All routes in this controller return JSON in the following format:
 * ```json
 * {
 *   "message": "Short description of the result",
 *   "data": { ... } | [ ... ] | null
 * }
 * ```
 * - `message`: Human-readable summary of the result.
 * - `data`: Object, array, or `null` for deletions or validation failures.
 *
 * This structure is consistent for:
 * - Success (`2xx`) responses.
 * - Handled client errors returned here (`4xx`).
 * Unhandled errors are delegated to the global error middleware, which should also output this format.
 */

import { Request, Response, NextFunction } from 'express';
import { bookingService } from '../services/booking.service.js';
import { sequelize } from '../config/db.js';
import { screeningService } from '../services/screening.service.js';
import { NotFoundError } from '../errors/not-found-error.js';
import { bookedSeatService } from '../services/booked-seat.service.js';
import { BookingCreationAttributes } from '../models/booking.model.js';
import movieStatsService from '../services/movie-stats.service.js';
import dayjs from 'dayjs';

/**
 * Create a new booking and reserve seats.
 *
 * @route POST /bookings
 * @body {string} userId - The ID of the user making the booking.
 * @body {string} screeningId - The ID of the screening.
 * @body {string[]} seatIds - Array of seat IDs to book.
 * @returns {201 Created} Booking and seat(s) created successfully.
 * @returns {400 Bad Request} If required fields are missing or invalid.
 * @returns {409 Conflict} If one or more seats are already booked.
 */
export const createBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { userId, screeningId, seatIds } = req.body as {
    userId: string;
    screeningId: string;
    seatIds: string[];
  };

  if (!userId || typeof userId !== 'string') {
    res
      .status(400)
      .json({ message: 'userId is required and must be a string', data: null });
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

  const transaction = await sequelize.transaction();
  try {
    const screening = await screeningService.getScreeningById(
      screeningId,
      transaction
    );
    if (!screening)
      throw new NotFoundError(`Screening not found with ID ${screeningId}`);

    await bookedSeatService.checkSeatsExist(
      screeningId,
      uniqueSeatIds,
      transaction
    );
    await bookedSeatService.checkSeatsAvailable(
      screeningId,
      uniqueSeatIds,
      transaction
    );

    const totalPrice = Number(screening.price) * uniqueSeatIds.length;

    const payload: BookingCreationAttributes = {
      userId,
      screeningId,
      seatsNumber: uniqueSeatIds.length,
      totalPrice,
    };

    const booking = await bookingService.createBooking(payload, transaction);

    await Promise.all(
      uniqueSeatIds.map((seatId: string) =>
        bookedSeatService.createSeatBooking(
          { bookingId: booking.bookingId, screeningId, seatId },
          transaction
        )
      )
    );

    await transaction.commit();

    try {
      if (screening.movieId) {
        await movieStatsService.addBooking(
          screening.movieId,
          uniqueSeatIds.length
        );
      }
    } catch (statErr) {
      console.warn('Stats update failed:', statErr);
    }

    res.status(201).json({
      message: 'Booking and seat(s) created successfully',
      data: booking,
    });
  } catch (error: any) {
    await transaction.rollback();
    if (
      error?.name === 'SequelizeUniqueConstraintError' ||
      error?.code === 'ER_DUP_ENTRY'
    ) {
      res.status(409).json({
        message: 'One or more selected seats are no longer available.',
        data: null,
      });
      return;
    }
    next(error);
  }
};

/**
 * Delete a booking by its ID.
 *
 * @route DELETE /bookings/:bookingId
 * @param {string} bookingId - The ID of the booking to delete.
 * @returns {200 OK} Booking deleted successfully.
 * @returns {404 Not Found} If the booking does not exist.
 */
export const deleteBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const booking = await bookingService.getBookingById(req.params.bookingId);
    if (!booking) {
      res.status(404).json({ message: 'Booking not found', data: null });
      return;
    }
    const screening = await screeningService.getScreeningById(
      booking.screeningId
    );
    const movieId = screening?.movieId;

    await bookingService.deleteBooking(req.params.bookingId);

    try {
      if (movieId) {
        await movieStatsService.removeBooking(movieId, booking.seatsNumber);
      }
    } catch (statErr) {
      console.warn('Stats update failed:', statErr);
    }

    res.status(200).json({ message: 'Booking deleted', data: null });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a booking.
 *
 * @route PATCH /bookings/:bookingId
 * @param {string} bookingId - The ID of the booking to update.
 * @body {object} update - Partial booking data to update.
 * @returns {200 OK} Booking updated successfully.
 */
export const updateBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { bookingId } = req.params;
  const update = req.body;
  const transaction = await sequelize.transaction();
  try {
    const booking = await bookingService.updateBooking(
      bookingId,
      update,
      transaction
    );
    await transaction.commit();
    res.status(200).json({ message: 'Booking updated', data: booking });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * Retrieve all bookings.
 *
 * @route GET /bookings
 * @returns {200 OK} List of all bookings.
 */
export const getAllBookings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const bookings = await bookingService.getAllBookings();
    res.status(200).json({ message: 'All bookings', data: bookings });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve a booking by its ID.
 *
 * @route GET /bookings/:bookingId
 * @param {string} bookingId - The ID of the booking.
 * @returns {200 OK} Booking found.
 * @returns {404 Not Found} If booking does not exist.
 */
export const getBookingById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const booking = await bookingService.getBookingById(req.params.bookingId);
    if (!booking) {
      res.status(404).json({ message: 'Booking not found', data: null });
      return;
    }
    res.status(200).json({ message: 'Booking found', data: booking });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve bookings by user ID.
 *
 * @route GET /bookings/user/:userId
 */
export const getBookingsByUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const bookings = await bookingService.getBookingsByUser(req.params.userId);
    res.status(200).json({ message: 'Bookings by user', data: bookings });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve bookings by screening ID.
 *
 * @route GET /bookings/screening/:screeningId
 */
export const getBookingsByScreening = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const bookings = await bookingService.getBookingsByScreening(
      req.params.screeningId
    );
    res.status(200).json({ message: 'Bookings by screening', data: bookings });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve bookings by status.
 *
 * @route GET /bookings/status/:status
 */
export const getBookingsByStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const bookings = await bookingService.getBookingsByStatus(
      req.params.status
    );
    res.status(200).json({ message: 'Bookings by status', data: bookings });
  } catch (error) {
    next(error);
  }
};

/**
 * Search bookings by keyword (status, screeningId, userId).
 *
 * @route GET /bookings/search?q=
 */
export const searchBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const { q } = req.query as { q?: string };
  if (!q) {
    return res
      .status(400)
      .json({ message: 'Query parameter q is required', data: null });
  }
  try {
    const bookings = await bookingService.searchBookingSimple(q);
    res
      .status(200)
      .json({ message: 'Bookings search results', data: bookings });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark a booking as 'used'.
 *
 * @route PATCH /bookings/:bookingId/used
 */
export const markBookingAsUsed = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const booking = await bookingService.getBookingById(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found', data: null });
    }
    if (booking.status === 'used') {
      return res
        .status(400)
        .json({ message: 'Booking already marked as used', data: null });
    }
    const updated = await bookingService.updateBooking(req.params.bookingId, {
      status: 'used',
    });
    res.status(200).json({ message: 'Booking marked as used', data: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel a booking.
 *
 * @route PATCH /bookings/:bookingId/cancel
 */
export const cancelBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const booking = await bookingService.getBookingById(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found', data: null });
    }
    if (booking.status === 'canceled') {
      return res
        .status(400)
        .json({ message: 'Booking already canceled', data: null });
    }
    const updated = await bookingService.updateBooking(req.params.bookingId, {
      status: 'canceled',
    });
    res.status(200).json({ message: 'Booking canceled', data: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve upcoming bookings for a user (today or future screenings).
 *
 * @route GET /bookings/upcoming/:userId
 */
export const getUpcomingBookingsByUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.params.userId;
    const today = dayjs().startOf('day').toDate();
    const bookings = await bookingService.getBookingsByUserUpcoming(
      userId,
      today
    );
    res
      .status(200)
      .json({ message: 'Upcoming bookings by user', data: bookings });
  } catch (error) {
    next(error);
  }
};
