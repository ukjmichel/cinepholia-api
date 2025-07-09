/**
 * @module controllers/booking.controller
 * @description
 *   Express controller functions for handling cinema bookings.
 *   - Ensures business validation and transactional integrity.
 *   - Integrates booking statistics in MongoDB (movieStatsService).
 *   - All methods respond with appropriate HTTP status and payload.
 */

import { Request, Response, NextFunction } from 'express';
import { bookingService } from '../services/booking.service.js';
import { sequelize } from '../config/db.js';
import { screeningService } from '../services/screening.service.js';
import { NotFoundError } from '../errors/not-found-error.js';
import { bookedSeatService } from '../services/booked-seat.service.js';
import { BookingCreationAttributes } from '../models/booking.model.js';
import { BadRequestError } from '../errors/bad-request-error.js';
import movieStatsService from '../services/movie-stats.service.js';

/**
 * Create a new booking.
 *
 * @route POST /bookings
 * @param req - Express request (body: userId, screeningId, seatIds)
 * @param res - Express response
 * @param next - Express error handler
 * @returns {Promise<void>} Returns nothing; sends JSON response.
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

  // Input validation
  if (!userId || typeof userId !== 'string') {
    res
      .status(400)
      .json({ message: 'userId is required and must be a string' });
    return;
  }
  if (!screeningId || typeof screeningId !== 'string') {
    res
      .status(400)
      .json({ message: 'screeningId is required and must be a string' });
    return;
  }
  if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
    res
      .status(400)
      .json({ message: 'seatIds is required and must be a non-empty array' });
    return;
  }
  if (!seatIds.every((s) => typeof s === 'string' && s.length > 0)) {
    res.status(400).json({ message: 'All seatIds must be non-empty strings' });
    return;
  }
  // Prevent duplicate seats
  const uniqueSeatIds = [...new Set(seatIds)];
  if (uniqueSeatIds.length !== seatIds.length) {
    res.status(400).json({ message: 'Duplicate seats in booking request' });
    return;
  }

  const transaction = await sequelize.transaction();
  try {
    // 1. Validate screening exists and get its price
    const screening = await screeningService.getScreeningById(
      screeningId,
      transaction
    );
    if (!screening)
      throw new NotFoundError(`Screening not found with ID ${screeningId}`);

    // 2. Validate seat existence and availability
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

    // 3. Calculate total price
    const totalPrice = Number(screening.price) * uniqueSeatIds.length;

    // 4. Build booking payload
    const payload: BookingCreationAttributes = {
      userId,
      screeningId,
      seatsNumber: uniqueSeatIds.length,
      totalPrice,
    };

    // 5. Create booking
    const booking = await bookingService.createBooking(payload, transaction);

    // 6. Book seats
    await Promise.all(
      uniqueSeatIds.map((seatId: string) =>
        bookedSeatService.createSeatBooking(
          {
            bookingId: booking.bookingId,
            screeningId,
            seatId,
          },
          transaction
        )
      )
    );

    await transaction.commit();

    // 7. Update stats (MongoDB) after booking
    try {
      if (screening.movieId) {
        await movieStatsService.addBooking(
          screening.movieId,
          uniqueSeatIds.length
        );
      }
    } catch (statErr) {
      // Log but do not block booking
      console.warn('Stats update failed:', statErr);
    }

    res.status(201).json({
      message: 'Booking and seat(s) created successfully',
      data: booking,
    });
  } catch (error: any) {
    await transaction.rollback();
    // Handle DB unique constraint error gracefully
    if (
      error.name === 'SequelizeUniqueConstraintError' ||
      error.code === 'ER_DUP_ENTRY'
    ) {
      res.status(409).json({
        message: 'One or more selected seats are no longer available.',
        error: error.message,
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
 * @param req - Express request (params: bookingId)
 * @param res - Express response
 * @param next - Express error handler
 * @returns {Promise<void>} Returns nothing; sends status 204 on success.
 */
export const deleteBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Find the booking (required for stats and seat unbooking)
    const booking = await bookingService.getBookingById(req.params.bookingId);
    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }

    // 2. Find the screening for movieId
    const screening = await screeningService.getScreeningById(
      booking.screeningId
    );
    const movieId = screening?.movieId;

    // 3. Delete booking
    await bookingService.deleteBooking(req.params.bookingId);

    // 4. Update stats (MongoDB) after deletion
    try {
      if (movieId) {
        await movieStatsService.removeBooking(movieId, booking.seatsNumber);
      }
    } catch (statErr) {
      // Log but do not block deletion
      console.warn('Stats update failed:', statErr);
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

/**
 * Update a booking.
 *
 * @route PATCH /bookings/:bookingId
 * @param req - Express request (params: bookingId, body: updates)
 * @param res - Express response
 * @param next - Express error handler
 * @returns {Promise<void>} Returns nothing; sends JSON response.
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
    res.json({ message: 'Booking updated', data: booking });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * Get all bookings.
 *
 * @route GET /bookings
 * @param req - Express request
 * @param res - Express response
 * @param next - Express error handler
 * @returns {Promise<void>} Returns nothing; sends JSON response.
 */
export const getAllBookings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const bookings = await bookingService.getAllBookings();
    res.json({ message: 'All bookings', data: bookings });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a booking by ID.
 *
 * @route GET /bookings/:bookingId
 * @param req - Express request (params: bookingId)
 * @param res - Express response
 * @param next - Express error handler
 * @returns {Promise<void>} Returns nothing; sends JSON response.
 */
export const getBookingById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { bookingId } = req.params;
  try {
    const booking = await bookingService.getBookingById(bookingId);
    res.status(200).json({ message: 'Booking found', data: booking });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all bookings for a specific user.
 *
 * @route GET /bookings/user/:userId
 */
export const getBookingsByUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const bookings = await bookingService.getBookingsByUser(req.params.userId);
    res.json({ message: 'Bookings by user', data: bookings });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all bookings for a specific screening.
 *
 * @route GET /bookings/screening/:screeningId
 */
export const getBookingsByScreening = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const bookings = await bookingService.getBookingsByScreening(
      req.params.screeningId
    );
    res.json({ message: 'Bookings by screening', data: bookings });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all bookings with a specific status.
 *
 * @route GET /bookings/status/:status
 */
export const getBookingsByStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const bookings = await bookingService.getBookingsByStatus(
      req.params.status
    );
    res.json({ message: 'Bookings by status', data: bookings });
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
) => {
  const { q } = req.query as { q?: string };
  if (!q) {
    return next(new BadRequestError('Query parameter q is required'));
  }
  try {
    const bookings = await bookingService.searchBookingSimple(q);
    res.json({ message: 'Bookings search results', data: bookings });
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
) => {
  try {
    const booking = await bookingService.getBookingById(req.params.bookingId);
    if (!booking) {
      return next(new BadRequestError('Booking not found'));
    }
    if (booking.status === 'used') {
      return next(new BadRequestError('Booking already marked as used'));
    }
    const updated = await bookingService.updateBooking(req.params.bookingId, {
      status: 'used',
    });
    res.json({ message: 'Booking marked as used', data: updated });
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
) => {
  try {
    const booking = await bookingService.getBookingById(req.params.bookingId);
    if (!booking) {
      return next(new BadRequestError('Booking not found'));
    }
    if (booking.status === 'canceled') {
      return next(new BadRequestError('Booking already canceled'));
    }
    const updated = await bookingService.updateBooking(req.params.bookingId, {
      status: 'canceled',
    });
    res.json({ message: 'Booking canceled', data: updated });
  } catch (error) {
    next(error);
  }
};
