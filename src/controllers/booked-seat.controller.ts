import { Request, Response, NextFunction } from 'express';
import { bookedSeatService } from '../services/booked-seat.service.js';

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
