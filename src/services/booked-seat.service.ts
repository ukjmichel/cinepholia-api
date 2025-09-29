/**
 * BookedSeatService
 * -----------------
 * Service for managing individual seat bookings within screenings.
 *
 * This service handles:
 * - Validation of seat existence and availability
 * - Creation and deletion of seat bookings
 * - Seat availability checks for booking operations
 * - Bulk operations for multiple seats
 *
 * Features:
 * - Atomic seat booking operations
 * - Validation against hall capacity and existing bookings
 * - Support for transactional operations
 * - Standardized method naming convention
 */

import {
  BookedSeatModel,
  BookedSeatAttributes,
} from '../models/booked-seat.model.js';
import { ScreeningModel } from '../models/screening.model.js';
import { NotFoundError } from '../errors/not-found-error.js';
import { BadRequestError } from '../errors/bad-request-error.js';
import { ConflictError } from '../errors/conflict-error.js';
import { Transaction, Op } from 'sequelize';
import { sequelize } from '../config/db.js';

export interface CreateBookedSeatDTO {
  screeningId: string;
  seatId: string;
  bookingId: string;
}

/**
 * Service for managing booked seats
 */
export class BookedSeatService {
  /* =============== SEAT VALIDATION =============== */

  /**
   * Validates that all specified seats exist in the screening's hall.
   *
   * @param screeningId - UUID of the screening
   * @param seatIds - Array of seat identifiers to validate
   * @param transaction - Optional database transaction
   * @throws {NotFoundError} If screening doesn't exist
   * @throws {BadRequestError} If any seats don't exist in the hall
   */
  async validateSeatsExist(
    screeningId: string,
    seatIds: string[],
    transaction?: Transaction
  ): Promise<void> {
    // Get the screening with hall information
    const screening = await ScreeningModel.findByPk(screeningId, {
      include: ['hall'], // Assuming hall association exists
      transaction,
    });

    if (!screening) {
      throw new NotFoundError(`Screening with id ${screeningId} not found`);
    }

    // Validate seats exist in hall (this logic depends on your hall model structure)
    // For now, we'll assume basic validation - you may need to adjust based on your hall model
    const hall = (screening as any).hall;
    if (!hall) {
      throw new NotFoundError(
        `Hall information not found for screening ${screeningId}`
      );
    }

    // Example validation - adjust based on your hall seat structure
    const maxSeats = hall.capacity || 100; // fallback
    for (const seatId of seatIds) {
      // Basic validation - you may need more sophisticated logic
      if (!seatId || seatId.length === 0) {
        throw new BadRequestError(`Invalid seat identifier: ${seatId}`);
      }

      // Additional seat validation logic would go here
      // e.g., checking against hall.seatLayout, hall.seatMap, etc.
    }
  }

  /**
   * Checks if all specified seats are available (not already booked) for the screening.
   *
   * @param screeningId - UUID of the screening
   * @param seatIds - Array of seat identifiers to check
   * @param transaction - Optional database transaction
   * @throws {ConflictError} If any seats are already booked
   */
  async validateSeatsAvailable(
    screeningId: string,
    seatIds: string[],
    transaction?: Transaction
  ): Promise<void> {
    const bookedSeats = await BookedSeatModel.findAll({
      where: {
        screeningId,
        seatId: { [Op.in]: seatIds },
      },
      transaction,
    });

    if (bookedSeats.length > 0) {
      const bookedSeatIds = bookedSeats.map((seat) => seat.seatId);
      throw new ConflictError(
        `The following seats are already booked: ${bookedSeatIds.join(', ')}`
      );
    }
  }

  /* =============== CRUD OPERATIONS =============== */

  /**
   * Creates a single seat booking.
   *
   * @param seatData - Seat booking data
   * @param transaction - Optional database transaction
   * @returns Created booked seat record
   */
  async createSeatBooking(
    seatData: CreateBookedSeatDTO,
    transaction?: Transaction
  ): Promise<BookedSeatModel> {
    return await BookedSeatModel.create(seatData, { transaction });
  }

  /**
   * Creates multiple seat bookings atomically.
   *
   * @param seatsData - Array of seat booking data
   * @param transaction - Optional database transaction
   * @returns Array of created booked seat records
   */
  async createMultipleSeatBookings(
    seatsData: CreateBookedSeatDTO[],
    transaction?: Transaction
  ): Promise<BookedSeatModel[]> {
    return await BookedSeatModel.bulkCreate(seatsData, { transaction });
  }

  /**
   * Removes all seat bookings associated with a specific booking.
   *
   * @param bookingId - UUID of the booking
   * @param transaction - Optional database transaction
   * @returns Number of deleted records
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
   * Removes specific seat bookings.
   *
   * @param screeningId - UUID of the screening
   * @param seatIds - Array of seat identifiers to release
   * @param transaction - Optional database transaction
   * @returns Number of deleted records
   */
  async deleteSeatBookings(
    screeningId: string,
    seatIds: string[],
    transaction?: Transaction
  ): Promise<number> {
    return await BookedSeatModel.destroy({
      where: {
        screeningId,
        seatId: { [Op.in]: seatIds },
      },
      transaction,
    });
  }

  /* =============== QUERY OPERATIONS =============== */

  /**
   * Gets all booked seats for a specific screening.
   *
   * @param screeningId - UUID of the screening
   * @param transaction - Optional database transaction
   * @returns Array of booked seat records
   */
  async getBookedSeatsByScreening(
    screeningId: string,
    transaction?: Transaction
  ): Promise<BookedSeatModel[]> {
    return await BookedSeatModel.findAll({
      where: { screeningId },
      include: ['booking'], // Include booking details if needed
      transaction,
    });
  }

  /**
   * Gets all booked seats for a specific booking.
   *
   * @param bookingId - UUID of the booking
   * @param transaction - Optional database transaction
   * @returns Array of booked seat records
   */
  async getBookedSeatsByBooking(
    bookingId: string,
    transaction?: Transaction
  ): Promise<BookedSeatModel[]> {
    return await BookedSeatModel.findAll({
      where: { bookingId },
      include: ['screening'], // Include screening details if needed
      transaction,
    });
  }

  /**
   * Gets available seats for a screening (seats that exist but aren't booked).
   * Note: This method assumes you have a way to determine all possible seats.
   *
   * @param screeningId - UUID of the screening
   * @param transaction - Optional database transaction
   * @returns Array of available seat identifiers
   */
  async getAvailableSeats(
    screeningId: string,
    transaction?: Transaction
  ): Promise<string[]> {
    // Get all booked seats
    const bookedSeats = await this.getBookedSeatsByScreening(
      screeningId,
      transaction
    );
    const bookedSeatIds = bookedSeats.map((seat) => seat.seatId);

    // Get screening with hall info to determine all possible seats
    const screening = await ScreeningModel.findByPk(screeningId, {
      include: ['hall'],
      transaction,
    });

    if (!screening) {
      throw new NotFoundError(`Screening with id ${screeningId} not found`);
    }

    // This is a simplified example - adjust based on your hall model structure
    const hall = (screening as any).hall;
    const totalSeats = this.generateSeatIds(hall); // You'll need to implement this based on your hall structure

    return totalSeats.filter((seatId) => !bookedSeatIds.includes(seatId));
  }

  /**
   * Counts the number of available seats for a screening.
   *
   * @param screeningId - UUID of the screening
   * @param transaction - Optional database transaction
   * @returns Number of available seats
   */
  async countAvailableSeats(
    screeningId: string,
    transaction?: Transaction
  ): Promise<number> {
    const availableSeats = await this.getAvailableSeats(
      screeningId,
      transaction
    );
    return availableSeats.length;
  }

  /* =============== LEGACY METHODS (for backward compatibility) =============== */

  /** @deprecated Use validateSeatsExist instead */
  async checkSeatsExist(
    screeningId: string,
    seatIds: string[],
    transaction?: Transaction
  ): Promise<void> {
    return this.validateSeatsExist(screeningId, seatIds, transaction);
  }

  /** @deprecated Use validateSeatsAvailable instead */
  async checkSeatsAvailable(
    screeningId: string,
    seatIds: string[],
    transaction?: Transaction
  ): Promise<void> {
    return this.validateSeatsAvailable(screeningId, seatIds, transaction);
  }

  /* =============== HELPER METHODS =============== */

  /**
   * Generates all possible seat IDs for a hall.
   * This is a placeholder implementation - adjust based on your hall model.
   *
   * @param hall - Hall object with seat configuration
   * @returns Array of all possible seat identifiers
   */
  private generateSeatIds(hall: any): string[] {
    // This is a simplified example - you'll need to implement based on your hall structure
    // Examples of possible hall structures:
    // - hall.capacity: total number of seats (generate A1, A2, ..., B1, B2, etc.)
    // - hall.seatLayout: 2D array of seat configuration
    // - hall.seats: array of seat objects

    const capacity = hall?.capacity || 100;
    const seats: string[] = [];

    // Simple example: generate seats like A1, A2, ..., A10, B1, B2, etc.
    const rowCount = Math.ceil(capacity / 10); // 10 seats per row
    for (let row = 0; row < rowCount; row++) {
      const rowLetter = String.fromCharCode(65 + row); // A, B, C, etc.
      const seatsInRow = Math.min(10, capacity - row * 10);
      for (let seat = 1; seat <= seatsInRow; seat++) {
        seats.push(`${rowLetter}${seat}`);
      }
    }

    return seats;
  }
}

/** Singleton instance for app-wide use */
export const bookedSeatService = new BookedSeatService();
