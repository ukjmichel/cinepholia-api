/**
 * Booking Controller
 *
 * Manages API endpoints for booking operations (CRUD, search, filters).
 * All responses use the schema { message, data }, except for deletion (204 No Content).
 *
 * Dependencies:
 * - bookingService: business logic for bookings.
 * - bookedSeatService: seat reservation management.
 * - BadRequestError, NotAuthorizedError: input error handling.
 */

import { Request, Response, NextFunction } from 'express';
import { bookingService } from '../services/booking.service.js';
import { bookedSeatService } from '../services/booked-seat.service.js';
import { BadRequestError } from '../errors/bad-request-error.js';
import { NotAuthorizedError } from '../errors/not-authorized-error.js';
import { sequelize } from '../config/db.js';
import { Transaction } from 'sequelize';
import { ScreeningModel } from '../models/screening.model.js';

/**
 * Get a booking by its unique identifier.
 * @param req Express request object (expects bookingId in params)
 * @param res Express response object (returns booking)
 * @param next Express next middleware
 */
export const getBookingById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const booking = await bookingService.getBookingById(req.params.bookingId);
    res.json({ message: 'Booking found', data: booking });
  } catch (err) {
    next(err);
  }
};

/**
 * Create a new booking with seat checks and price calculation.
 * Performs seat existence and availability checks in parallel.
 * @param req Express request object (expects screeningId, seatIds in body)
 * @param res Express response object (returns created booking)
 * @param next Express next middleware
 */
export const createBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  let transaction: Transaction | null = null;
  try {
    transaction = await sequelize.transaction();

    const { screeningId, seatsNumber, seatIds } = req.body;
    const userId = req.user?.userId;

    if (!userId) throw new NotAuthorizedError('User is not authenticated');
    if (!seatIds || seatIds.length === 0)
      throw new BadRequestError('No seats selected');
    if (seatsNumber !== seatIds.length)
      throw new BadRequestError('Seats number mismatch');

    // Fetch the screening to get seat price
    const screening = await ScreeningModel.findByPk(screeningId, {
      transaction,
    });
    if (!screening) throw new BadRequestError('Screening not found');
    const totalPrice = Number(screening.price) * seatIds.length;

    // Run seat existence & availability checks in parallel
    await Promise.all([
      bookedSeatService.checkSeatsExist(screeningId, seatIds, transaction),
      bookedSeatService.checkSeatsAvailable(screeningId, seatIds, transaction),
    ]);

    // Generate bookingId
    const bookingId = crypto.randomUUID();

    // Create booking
    const booking = await bookingService.createBooking(
      {
        bookingId,
        userId,
        screeningId,
        seatsNumber: seatIds.length,
        status: 'pending',
        totalPrice,
      },
      transaction
    );

    // Book each seat (parallel creation)
    const seatBookings = await Promise.all(
      seatIds.map((seatId: string) =>
        bookedSeatService.createSeatBooking(
          { screeningId, seatId, bookingId },
          transaction as Transaction
        )
      )
    );

    await transaction.commit();

    res.status(201).json({
      message: 'Booking created successfully',
      booking,
      seats: seatBookings,
      totalSeats: seatBookings.length,
    });
  } catch (error) {
    if (transaction) await transaction.rollback().catch(console.error);
    next(error);
  }
};

/**
 * Update a booking by its ID (allows changing seats or status).
 * Seat existence and availability are checked in parallel if seatIds are provided.
 * @param req Express request object (expects bookingId in params, fields in body)
 * @param res Express response object (returns updated booking)
 * @param next Express next middleware
 */
export const updateBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  let transaction: Transaction | null = null;
  try {
    transaction = await sequelize.transaction();

    const bookingId = req.params.bookingId;
    const { status, seatIds } = req.body;

    // Fetch booking and screening
    const booking = await bookingService.getBookingById(bookingId);
    if (!booking) throw new BadRequestError('Booking not found');
    const screening = await ScreeningModel.findByPk(booking.screeningId, {
      transaction,
    });
    if (!screening) throw new BadRequestError('Screening not found');

    let totalPrice = booking.totalPrice;
    let seats = null;

    // If seats are updated, check and update seat reservations
    if (seatIds) {
      if (!Array.isArray(seatIds) || seatIds.length === 0)
        throw new BadRequestError('No seats selected');

      // Parallel check for seat existence and availability
      await Promise.all([
        bookedSeatService.checkSeatsExist(
          screening.screeningId,
          seatIds,
          transaction
        ),
        bookedSeatService.checkSeatsAvailable(
          screening.screeningId,
          seatIds,
          transaction
        ),
      ]);

      // Delete old booked seats
      await bookedSeatService.deleteSeatBookingsByBookingId(
        bookingId,
        transaction
      );

      // Create new booked seats in parallel
      seats = await Promise.all(
        seatIds.map((seatId: string) =>
          bookedSeatService.createSeatBooking(
            { screeningId: screening.screeningId, seatId, bookingId },
            transaction as Transaction
          )
        )
      );

      totalPrice = Number(screening.price) * seatIds.length;
      req.body.seatsNumber = seatIds.length;
      req.body.totalPrice = totalPrice;
    }

    // Update booking details (status, seatsNumber, totalPrice, etc.)
    const updatedBooking = await bookingService.updateBooking(
      bookingId,
      req.body,
      transaction
    );

    await transaction.commit();
    res.json({
      message: 'Booking updated',
      data: {
        booking: updatedBooking,
        seats: seats || 'Seats unchanged',
        totalSeats: seatIds ? seatIds.length : booking.seatsNumber,
      },
    });
  } catch (err) {
    if (transaction) await transaction.rollback().catch(console.error);
    next(err);
  }
};

/**
 * Delete a booking by its ID.
 * @param req Express request object (expects bookingId in params)
 * @param res Express response object
 * @param next Express next middleware
 */
export const deleteBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await bookingService.deleteBooking(req.params.bookingId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

/**
 * Get all bookings.
 * @param req Express request object
 * @param res Express response object (returns all bookings)
 * @param next Express next middleware
 */
export const getAllBookings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const bookings = await bookingService.getAllBookings();
    res.json({ message: 'All bookings', data: bookings });
  } catch (err) {
    next(err);
  }
};

/**
 * Get bookings for a user by userId.
 * @param req Express request object (expects userId in params)
 * @param res Express response object (returns user's bookings)
 * @param next Express next middleware
 */
export const getBookingsByUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const bookings = await bookingService.getBookingsByUser(req.params.userId);
    res.json({ message: 'Bookings for user', data: bookings });
  } catch (err) {
    next(err);
  }
};

/**
 * Get bookings for a screening by screeningId.
 * @param req Express request object (expects screeningId in params)
 * @param res Express response object (returns bookings for screening)
 * @param next Express next middleware
 */
export const getBookingsByScreening = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const bookings = await bookingService.getBookingsByScreening(
      req.params.screeningId
    );
    res.json({ message: 'Bookings for screening', data: bookings });
  } catch (err) {
    next(err);
  }
};

/**
 * Get bookings by status.
 * @param req Express request object (expects status in params)
 * @param res Express response object (returns bookings with status)
 * @param next Express next middleware
 */
export const getBookingsByStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const bookings = await bookingService.getBookingsByStatus(
      req.params.status
    );
    res.json({
      message: `Bookings with status ${req.params.status}`,
      data: bookings,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Search bookings by user email, name, status, or screeningId (partial match).
 * @param req Express request object (expects search string in query param "q")
 * @param res Express response object (returns search results)
 * @param next Express next middleware
 */
export const searchBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = req.query.q as string;
    if (!query || typeof query !== 'string') {
      return next(new BadRequestError('Query parameter q is required'));
    }
    const bookings = await bookingService.searchBookingSimple(query);
    res.json({ message: 'Bookings search results', data: bookings });
  } catch (err) {
    next(err);
  }
};
