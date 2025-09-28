// src/controllers/booking.controller.ts

/**
 * @module controllers/booking.controller
 *
 * @description
 * Express controller for cinema bookings, ensuring business validation and
 * transactional integrity.
 *
 * @features
 * - Create, update, delete bookings.
 * - Prevent seat double-booking.
 * - Update booking-related statistics in MongoDB (hook in service layer if needed).
 * - Retrieve bookings by user, screening, status, or search query.
 * - Mark bookings as used or canceled.
 * - Get upcoming bookings for a user.
 *
 * @response
 * {
 *   "message": string,
 *   "data": object | array | null
 * }
 */

import { Request, Response, NextFunction } from 'express';
import dayjs from 'dayjs';
import { sequelize } from '../config/db.js';

import { bookingService } from '../services/booking.service.js';
import { bookedSeatService } from '../services/booked-seat.service.js';
import screeningService from '../services/screening.service.js';

import { NotFoundError } from '../errors/not-found-error.js';
import { BadRequestError } from '../errors/bad-request-error.js';
import { ConflictError } from '../errors/conflict-error.js';

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

/* ----------------------------- create ------------------------------ */
/**
 * Create a new booking and reserve seats (atomic).
 *
 * Uses:
 * - screeningService.getById(id, { transaction })
 * - bookedSeatService.checkSeatsExist(screeningId, seatIds, transaction)
 * - bookedSeatService.checkSeatsAvailable(screeningId, seatIds, transaction)
 * - bookingService.createBooking(payload, transaction)
 * - bookedSeatService.createSeatBooking({ bookingId, screeningId, seatId }, transaction)
 */
// controllers/booking.controller.ts (only the createBooking body changed)
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

  // ---- Basic validation (same as before) ----
  if (!userId || typeof userId !== 'string') {
    res.status(400).json({ message: 'userId is required and must be a string', data: null });
    return;
  }
  if (!screeningId || typeof screeningId !== 'string') {
    res.status(400).json({ message: 'screeningId is required and must be a string', data: null });
    return;
  }
  if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
    res.status(400).json({ message: 'seatIds is required and must be a non-empty array', data: null });
    return;
  }
  if (!seatIds.every((s) => typeof s === 'string' && s.length > 0)) {
    res.status(400).json({ message: 'All seatIds must be non-empty strings', data: null });
    return;
  }
  const uniqueSeatIds = [...new Set(seatIds)];
  if (uniqueSeatIds.length !== seatIds.length) {
    res.status(400).json({ message: 'Duplicate seats in booking request', data: null });
    return;
  }

  const t = await sequelize.transaction();
  try {
    // 1) Get screening & basic checks
    const screening = await screeningService.getById(screeningId, { transaction: t });
    if (!screening) {
      await t.rollback();
      res.status(404).json({ message: 'Screening not found', data: null });
      return;
    }
    const startsAt = (screening as any).startTime ?? (screening as any).startsAt;
    if (startsAt && dayjs(startsAt).isBefore(dayjs())) {
      await t.rollback();
      res.status(400).json({ message: 'Screening already started or finished', data: null });
      return;
    }

    // 2) Validate seats existence & availability
    await bookedSeatService.checkSeatsExist(screeningId, uniqueSeatIds, t);
    await bookedSeatService.checkSeatsAvailable(screeningId, uniqueSeatIds, t);

    // 3) Compute pricing fields required by BookingModel
    //    Adapt these property names to your Screening DTO.
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

    // 4) Create booking with all NOT NULL fields
    const bookingPayload = {
      userId,
      screeningId,
      status: 'confirmed',
      bookingDate: new Date(),   // optional, if your schema has it
      seatsNumber,               // required by your model
      totalPrice,                // required by your model
      // currency: 'EUR',        // add if present in schema
    } as any;

    const booking = await bookingService.createBooking(bookingPayload, t);

    // 5) Create seat rows tied to this booking
    const createdSeats = [];
    for (const seatId of uniqueSeatIds) {
      createdSeats.push(
        await bookedSeatService.createSeatBooking(
          { bookingId: booking.bookingId ?? booking.id, screeningId, seatId },
          t
        )
      );
    }

    await t.commit();
    res.status(201).json({
      message: 'Booking and seats created',
      data: { booking, seats: createdSeats },
    });
  } catch (err: any) {
    await t.rollback();

    if (err?.name === 'SequelizeUniqueConstraintError') {
      res.status(409).json({ message: 'One or more seats have just been booked', data: null });
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


/* ------------------------------ delete ----------------------------- */
/**
 * Delete a booking by its ID. Also deletes associated seat reservations.
 *
 * @route DELETE /bookings/:bookingId
 */
export const deleteBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { bookingId } = req.params;
  const t = await sequelize.transaction();
  try {
    const booking = await bookingService.getBookingById(bookingId, t);
    if (!booking) {
      await t.rollback();
      res.status(404).json({ message: 'Booking not found', data: null });
      return;
    }

    // ownership or admin
    if (!canActOnBooking(req, (booking as any).userId, ['admin'])) {
      await t.rollback();
      res.status(403).json({ message: 'Forbidden', data: null });
      return;
    }

    // Remove seat rows first (if not ON DELETE CASCADE)
    await bookedSeatService.deleteSeatBookingsByBookingId(bookingId, t);

    await bookingService.deleteBooking(bookingId, t);

    await t.commit();
    res.status(200).json({ message: 'Booking deleted', data: null });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

/* ------------------------------ update ----------------------------- */
/**
 * Update a booking (owner or admin).
 *
 * @route PATCH /bookings/:bookingId
 */
export const updateBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { bookingId } = req.params;
  const update = req.body;
  const t = await sequelize.transaction();
  try {
    const existing = await bookingService.getBookingById(bookingId, t);
    if (!existing) {
      await t.rollback();
      res.status(404).json({ message: 'Booking not found', data: null });
      return;
    }
    if (!canActOnBooking(req, (existing as any).userId, ['admin'])) {
      await t.rollback();
      res.status(403).json({ message: 'Forbidden', data: null });
      return;
    }

    const booking = await bookingService.updateBooking(bookingId, update, t);
    await t.commit();
    res.status(200).json({ message: 'Booking updated', data: booking });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

/* ------------------------------- reads ----------------------------- */
/**
 * Retrieve all bookings (admin).
 *
 * @route GET /bookings
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
 * Retrieve a booking by its ID (owner or staff/admin via route/RBAC).
 *
 * @route GET /bookings/:bookingId
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
    // Optional: enforce ownership here as well if route doesn’t already
    const roles: string[] = Array.isArray((req as any).user?.roles)
      ? (req as any).user.roles
      : [];
    const isStaffOrAdmin = roles.includes('staff') || roles.includes('admin');
    if (!isStaffOrAdmin && !canActOnBooking(req, (booking as any).userId)) {
      res.status(403).json({ message: 'Forbidden', data: null });
      return;
    }

    res.status(200).json({ message: 'Booking found', data: booking });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve bookings by user ID (self or admin via route).
 *
 * @route GET /bookings/user/:userId
 */
export const getBookingsByUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const bookings = await bookingService.getBookingsByUser(req.params.userId);
    res.status(200).json({ message: 'Bookings by user', data: bookings });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve bookings by screening ID (staff/admin via route).
 *
 * @route GET /bookings/screening/:screeningId
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
    res.status(200).json({ message: 'Bookings by screening', data: bookings });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve bookings by status (staff/admin via route).
 *
 * @route GET /bookings/status/:status
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
    res.status(200).json({ message: 'Bookings by status', data: bookings });
  } catch (error) {
    next(error);
  }
};

/**
 * Search bookings (staff/admin via route).
 *
 * @route GET /bookings/search?q=
 */
export const searchBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { q } = req.query as { q?: string };
  if (!q) {
    res
      .status(400)
      .json({ message: 'Query parameter q is required', data: null });
    return;
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

/* ----------------------------- state changes ----------------------- */
/**
 * Mark a booking as 'used' (staff/admin).
 *
 * @route PATCH /bookings/:bookingId/used
 */
export const markBookingAsUsed = async (
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
    if ((booking as any).status === 'used') {
      res
        .status(400)
        .json({ message: 'Booking already marked as used', data: null });
      return;
    }
    const updated = await bookingService.updateBooking(req.params.bookingId, {
      status: 'USED',
    });
    res.status(200).json({ message: 'Booking marked as used', data: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel a booking (owner or staff/admin).
 *
 * @route PATCH /bookings/:bookingId/cancel
 */
export const cancelBooking = async (
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
    if (!canActOnBooking(req, (booking as any).userId, ['staff', 'admin'])) {
      res.status(403).json({ message: 'Forbidden', data: null });
      return;
    }
    if ((booking as any).status === 'canceled') {
      res.status(400).json({ message: 'Booking already canceled', data: null });
      return;
    }
    const updated = await bookingService.updateBooking(req.params.bookingId, {
      status: 'CANCELLED',
    });
    res.status(200).json({ message: 'Booking canceled', data: updated });
  } catch (error) {
    next(error);
  }
};



/* ----------------------------- upcoming ---------------------------- */
/**
 * Retrieve upcoming bookings for a user (today or future screenings).
 *
 * @route GET /bookings/user/:userId/upcoming
 */
export const getUpcomingBookingsByUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
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
