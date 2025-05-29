import { Request, Response, NextFunction } from 'express';
import { BookingService } from '../services/booking.service.js';
import { BadRequestError } from '../errors/bad-request-error.js';

/**
 * Get a booking by its ID.
 * @route GET /bookings/:bookingId
 * @param {Request} req - Express request object (expects bookingId in params)
 * @param {Response} res - Express response object (returns booking)
 * @param {NextFunction} next - Express next middleware
 * @returns {Promise<void>}
 * @async
 */
export const getBookingById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const booking = await BookingService.getBookingById(req.params.bookingId);
    res.json({ message: 'Booking found', data: booking });
  } catch (err) {
    next(err);
  }
};

/**
 * Create a new booking.
 * @route POST /bookings
 * @param {Request} req - Express request object (expects booking data in body)
 * @param {Response} res - Express response object (returns created booking)
 * @param {NextFunction} next - Express next middleware
 * @returns {Promise<void>}
 * @async
 */
export const createBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const booking = await BookingService.createBooking(req.body);
    res.status(201).json({ message: 'Booking created', data: booking });
  } catch (err) {
    next(err);
  }
};

/**
 * Update a booking by its ID.
 * @route PUT /bookings/:bookingId
 * @param {Request} req - Express request object (expects bookingId in params and update in body)
 * @param {Response} res - Express response object (returns updated booking)
 * @param {NextFunction} next - Express next middleware
 * @returns {Promise<void>}
 * @async
 */
export const updateBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const booking = await BookingService.updateBooking(
      req.params.bookingId,
      req.body
    );
    res.json({ message: 'Booking updated', data: booking });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a booking by its ID.
 * @route DELETE /bookings/:bookingId
 * @param {Request} req - Express request object (expects bookingId in params)
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware
 * @returns {Promise<void>}
 * @async
 */
export const deleteBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await BookingService.deleteBooking(req.params.bookingId);
    res.status(204).send(); // No body for 204
  } catch (err) {
    next(err);
  }
};

/**
 * Get all bookings.
 * @route GET /bookings
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object (returns all bookings)
 * @param {NextFunction} next - Express next middleware
 * @returns {Promise<void>}
 * @async
 */
export const getAllBookings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const bookings = await BookingService.getAllBookings();
    res.json({ message: 'All bookings', data: bookings });
  } catch (err) {
    next(err);
  }
};

/**
 * Get bookings for a user.
 * @route GET /bookings/user/:userId
 * @param {Request} req - Express request object (expects userId in params)
 * @param {Response} res - Express response object (returns bookings for user)
 * @param {NextFunction} next - Express next middleware
 * @returns {Promise<void>}
 * @async
 */
export const getBookingsByUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const bookings = await BookingService.getBookingsByUser(req.params.userId);
    res.json({ message: 'Bookings for user', data: bookings });
  } catch (err) {
    next(err);
  }
};

/**
 * Get bookings for a screening.
 * @route GET /bookings/screening/:screeningId
 * @param {Request} req - Express request object (expects screeningId in params)
 * @param {Response} res - Express response object (returns bookings for screening)
 * @param {NextFunction} next - Express next middleware
 * @returns {Promise<void>}
 * @async
 */
export const getBookingsByScreening = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const bookings = await BookingService.getBookingsByScreening(
      req.params.screeningId
    );
    res.json({ message: 'Bookings for screening', data: bookings });
  } catch (err) {
    next(err);
  }
};

/**
 * Get bookings by status.
 * @route GET /bookings/status/:status
 * @param {Request} req - Express request object (expects status in params)
 * @param {Response} res - Express response object (returns bookings by status)
 * @param {NextFunction} next - Express next middleware
 * @returns {Promise<void>}
 * @async
 */
export const getBookingsByStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const bookings = await BookingService.getBookingsByStatus(
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
 * Search bookings by user email, user name, status, or screeningId (partial match).
 * @route GET /bookings/search?q=...
 * @param {Request} req - Express request object (expects search string in query param "q")
 * @param {Response} res - Express response object (returns search results)
 * @param {NextFunction} next - Express next middleware
 * @returns {Promise<void>}
 * @async
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
    const bookings = await BookingService.searchBookingSimple(query);
    res.json({ message: 'Bookings search results', data: bookings });
  } catch (err) {
    next(err);
  }
};
