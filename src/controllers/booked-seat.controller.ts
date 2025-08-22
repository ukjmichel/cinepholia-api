/**
 * @module controllers/booked-seat.controller
 *
 * @description
 * Handles retrieving booked seat information for a specific screening.
 * 
 * @features
 * - Validates that a `screeningId` is provided in the request parameters.
 * - Retrieves booked seat data from the bookedSeatService.
 * - Sends the retrieved data in a JSON response.
 *
 * @dependencies
 * - bookedSeatService: Provides data access for booked seats.
 *
 */

import { Request, Response, NextFunction } from 'express';
import { bookedSeatService } from '../services/booked-seat.service.js';

/**
 * Retrieves all booked seats for a given screening.
 *
 * @param req - Express request object containing `screeningId` in the route parameters
 * @param res - Express response object used to send booked seat data
 * @param next - Express next function for error handling
 * @returns A JSON response with booked seat data
 *
 * @throws {400 Bad Request} If `screeningId` is not provided in the request
 * @throws {Error} Any unexpected error will be passed to the global error handler
 */
export async function getBookedSeatsByScreeningId(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> {
  try {
    const { screeningId } = req.params;
    if (!screeningId) {
      return res.status(400).json({ message: 'screeningId is required' });
    }

    const bookedSeats =
      await bookedSeatService.getSeatBookingsByScreeningId(screeningId);

    return res.status(200).json({
      message: 'Seat bookings retrieved successfully',
      data: bookedSeats,
    });
  } catch (err) {
    next(err);
  }
}
