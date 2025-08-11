/**
 * BookedSeatService
 * -----------------
 * Service class for managing seat bookings (BookedSeatModel) in the database.
 *
 * Features:
 * - Create, read, and delete booked seats for screenings.
 * - Validate that booked seats exist in the movie hall layout.
 * - Check that seats are available (not already booked).
 * - All methods support an optional transaction parameter for consistency.
 * - Throws NotFoundError, BadRequestError, or ConflictError for client-friendly error handling.
 *
 * Error handling:
 * - NotFoundError: For missing screenings or halls.
 * - BadRequestError: For invalid seat IDs.
 * - ConflictError: For attempting to book already reserved seats.
 *
 */

import { Transaction } from 'sequelize';
import { MovieHallService } from './movie-hall.service.js';
import {
  BookedSeatAttributes,
  BookedSeatModel,
} from '../models/booked-seat.model.js';
import { NotFoundError } from '../errors/not-found-error.js';
import { BadRequestError } from '../errors/bad-request-error.js';
import { ConflictError } from '../errors/conflict-error.js';
import { screeningService } from './screening.service.js';

// Singleton instance of MovieHallService for internal use
const movieHallService = new MovieHallService();

/**
 * Service class for Booked Seats (BookedSeatModel) business logic.
 * Handles seat booking creation, validation, and availability checks.
 */
export class BookedSeatService {
  /**
   * Create a new seat booking.
   *
   * @param data - The seat booking attributes.
   * @param transaction - Optional transaction for atomic operations.
   * @returns The created seat booking.
   * @throws {Error} If creation fails.
   */
  async createSeatBooking(
    data: BookedSeatAttributes,
    transaction?: Transaction
  ): Promise<BookedSeatModel> {
    return await BookedSeatModel.create(data, { transaction });
  }

  /**
   * Get a seat booking by screeningId and seatId.
   *
   * @param screeningId - Screening ID.
   * @param seatId - Seat ID.
   * @param transaction - Optional transaction for consistent reads.
   * @returns The seat booking if found, otherwise null.
   * @throws {Error} If retrieval fails.
   */
  async getSeatBookingByScreeningIdAndSeatId(
    screeningId: string,
    seatId: string,
    transaction?: Transaction
  ): Promise<BookedSeatModel | null> {
    return await BookedSeatModel.findOne({
      where: { screeningId, seatId },
      transaction,
    });
  }

  /**
   * Get all seat bookings by bookingId.
   *
   * @param bookingId - Booking ID.
   * @param transaction - Optional transaction for consistent reads.
   * @returns An array of seat bookings.
   * @throws {Error} If retrieval fails.
   */
  async getSeatBookingsByBookingId(
    bookingId: string,
    transaction?: Transaction
  ): Promise<BookedSeatModel[]> {
    return await BookedSeatModel.findAll({
      where: { bookingId },
      transaction,
    });
  }

  /**
   * Get all seat bookings by screeningId.
   *
   * @param screeningId - Screening ID.
   * @param transaction - Optional transaction for consistent reads.
   * @returns An array of seat bookings.
   * @throws {Error} If retrieval fails.
   */
  async getSeatBookingsByScreeningId(
    screeningId: string,
    transaction?: Transaction
  ): Promise<BookedSeatModel[]> {
    return await BookedSeatModel.findAll({
      where: { screeningId },
      transaction,
    });
  }

  /**
   * Delete a seat booking by screeningId and seatId.
   *
   * @param screeningId - Screening ID.
   * @param seatId - Seat ID.
   * @param transaction - Optional transaction for atomic operations.
   * @returns True if deleted, false otherwise.
   * @throws {Error} If deletion fails.
   */
  async deleteSeatBooking(
    screeningId: string,
    seatId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    const deleted = await BookedSeatModel.destroy({
      where: { screeningId, seatId },
      transaction,
    });
    return deleted > 0;
  }

  /**
   * Delete all seat bookings for a specific booking ID.
   *
   * @param bookingId - The booking ID.
   * @param transaction - Optional transaction for atomic operations.
   * @returns Number of records deleted.
   * @throws {Error} If deletion fails.
   */
  async deleteSeatBookingsByBookingId(
    bookingId: string,
    transaction?: Transaction
  ): Promise<number> {
    return await BookedSeatModel.destroy({
      where: { bookingId },
      transaction,
    });
  }

  /**
   * Check if all seat IDs exist in the movie hall's layout.
   *
   * @param screeningId - The screening ID.
   * @param seatIds - Array of seat IDs to validate.
   * @param transaction - Optional transaction for consistent reads.
   * @throws {NotFoundError} If screening or movie hall not found.
   * @throws {BadRequestError} If a seat ID does not exist in the layout.
   * @throws {Error} If validation process fails unexpectedly.
   */
  async checkSeatsExist(
    screeningId: string,
    seatIds: string[],
    transaction?: Transaction
  ): Promise<void> {
    if (!seatIds.length) return;

    const screening = await screeningService.getScreeningById(screeningId);
    if (!screening) {
      throw new NotFoundError(`Screening not found with ID ${screeningId}`);
    }

    try {
      const movieHall = await movieHallService.findByTheaterIdAndHallId(
        screening.theaterId,
        screening.hallId,
        transaction
      );

      if (!movieHall) {
        throw new NotFoundError('Movie hall not found');
      }

      const seatsLayout = movieHall.seatsLayout;
      const validSeats = new Set<string>();

      for (let row = 0; row < seatsLayout.length; row++) {
        for (let col = 0; col < seatsLayout[row].length; col++) {
          const seatValue = seatsLayout[row][col];
          if (seatValue && seatValue !== 0) {
            validSeats.add(seatValue.toString());
          }
        }
      }

      for (const seatId of seatIds) {
        if (!validSeats.has(seatId)) {
          throw new BadRequestError(`Invalid seat ID: ${seatId}`);
        }
      }
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof BadRequestError) {
        throw error;
      }
      throw new Error(`Error validating seats: ${(error as Error).message}`);
    }
  }

  /**
   * Check if given seat IDs are available (not already booked for the screening).
   *
   * @param screeningId - The screening ID.
   * @param seatIds - Array of seat IDs to check availability.
   * @param transaction - Optional transaction for consistent reads.
   * @throws {ConflictError} If a seat is already booked.
   * @throws {Error} If availability check fails unexpectedly.
   */
  async checkSeatsAvailable(
    screeningId: string,
    seatIds: string[],
    transaction?: Transaction
  ): Promise<void> {
    if (!seatIds.length) return;

    try {
      const existingBookings = await BookedSeatModel.findAll({
        where: {
          screeningId,
          seatId: seatIds,
        },
        transaction,
      });

      if (existingBookings.length > 0) {
        const bookedSeatIds = existingBookings.map((booking) => booking.seatId);
        throw new ConflictError(
          `The following seats are already booked: ${bookedSeatIds.join(', ')}`
        );
      }
    } catch (error) {
      if (error instanceof ConflictError) {
        throw error;
      }
      throw new Error(
        `Error checking seat availability: ${(error as Error).message}`
      );
    }
  }
}

export const bookedSeatService = new BookedSeatService();
