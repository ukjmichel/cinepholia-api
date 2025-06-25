import { Request, Response, NextFunction } from 'express';
import { bookingService } from '../services/booking.service.js';
import { sequelize } from '../config/db.js';
import { screeningService } from '../services/screening.service.js';
import { NotFoundError } from '../errors/not-found-error.js';
import { bookedSeatService } from '../services/booked-seat.service.js';
import { BookingCreationAttributes } from '../models/booking.model.js';
import { BadRequestError } from '../errors/bad-request-error.js';

/**
 * Create a new booking.
 * @param req - Express request (body: booking fields)
 * @param res - Express response
 * @param next - Express error handler
 */
export const createBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Validation: All fields present and correct type
  const { userId, screeningId, seatIds } = req.body as {
    userId: string;
    screeningId: string;
    seatIds: string[];
  };

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
    if (!screening) {
      throw new NotFoundError(`Screening not found with ID ${screeningId}`);
    }

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

    // 4. Build and type payload for BookingCreationAttributes
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

export const updateBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { bookingId } = req.params;
  const update = req.body;

  const transaction = await sequelize.transaction();
  try {
    // Try to update the booking
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
 * Delete a booking by its ID.
 * @param req - Express request (params: bookingId)
 * @param res - Express response
 * @param next - Express error handler
 */
export const deleteBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    await bookingService.deleteBooking(req.params.bookingId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

/**
 * Get all bookings.
 * @param req - Express request
 * @param res - Express response
 * @param next - Express error handler
 */
export const getAllBookings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const bookings = await bookingService.getAllBookings();
    res.json({ message: 'All bookings', data: bookings });
  } catch (error) {
    next(error);
  }
};
export const getBookingById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { bookingId } = req.params;

  try {
    const booking = await bookingService.getBookingById(bookingId);
    res.status(200).json({
      message: 'Booking found',
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all bookings for a specific user.
 * @param req - Express request (params: userId)
 * @param res - Express response
 * @param next - Express error handler
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
 * @param req - Express request (params: screeningId)
 * @param res - Express response
 * @param next - Express error handler
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
 * @param req - Express request (params: status)
 * @param res - Express response
 * @param next - Express error handler
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
 * @param req - Express request (query: query string)
 * @param res - Express response
 * @param next - Express error handler
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
 * @param req - Express request (params: bookingId)
 * @param res - Express response
 * @param next - Express error handler
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
 * @param req - Express request (params: bookingId)
 * @param res - Express response
 * @param next - Express error handler
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
