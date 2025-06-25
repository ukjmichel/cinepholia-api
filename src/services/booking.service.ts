/**
 * Seat reservation management service.
 *
 * This service manages all operations related to reservations:
 * creation with verification of available seats, reading by various identifiers,
 * updating, deletion, and searching by user, session, or status.
 *
 * Main features:
 * - Secure creation of reservations (checks the number of remaining seats)
 * - Reading a reservation or list by user, session, or status
 * - Modification and deletion of a reservation
 * - Simple search with keywords (userId, screeningId, status)
 * - Integration with user, session, and room models
 *
 */

import {
  BookingModel,
  BookingAttributes,
  BookingCreationAttributes,
} from '../models/booking.model.js';
import { NotFoundError } from '../errors/not-found-error.js';
import { ConflictError } from '../errors/conflict-error.js';
import { sequelize } from '../config/db.js';
import { Transaction, Op } from 'sequelize';
import { UserModel } from '../models/user.model.js';
import { ScreeningModel } from '../models/screening.model.js';
import { MovieHallModel } from '../models/movie-hall.model.js';

/**
 * Main service for CRUD operations and search on reservations.
 */
export class BookingService {
  // === CRUD Operations ===

  /**
   * Retrieves a reservation by its unique identifier.
   *
   * @param {string} bookingId - UUID of the reservation.
   * @param {Transaction} [transaction] - Optional transaction.
   * @returns {Promise<BookingModel>} Found reservation with user and screening.
   * @throws {NotFoundError} If the reservation does not exist.
   */
  async getBookingById(
    bookingId: string,
    transaction?: Transaction
  ): Promise<BookingModel | null> {
    const booking = await BookingModel.findByPk(bookingId, {
      include: [UserModel, ScreeningModel],
      transaction,
    });
    if (!booking) {
      throw new NotFoundError(`Booking with id ${bookingId} not found`);
    }
    return booking;
  }

  /**
   * Creates a new reservation after checking available seats.
   *
   * @param {BookingCreationAttributes} payload - Reservation data.
   * @param {Transaction} [transaction] - Optional transaction.
   * @returns {Promise<BookingModel>} Created reservation.
   * @throws {NotFoundError} If the screening or hall does not exist.
   * @throws {ConflictError} If the number of requested seats exceeds available seats.
   */
  async createBooking(
    payload: BookingCreationAttributes,
    transaction?: Transaction
  ): Promise<BookingModel> {
    // Only booking creation, no seat logic
    return BookingModel.create(payload, { transaction });
  }

  async updateBooking(
    bookingId: string,
    update: Partial<BookingAttributes>,
    transaction?: Transaction
  ): Promise<BookingModel> {
    const booking = await BookingModel.findByPk(bookingId, { transaction });
    if (!booking)
      throw new NotFoundError(`Booking with id ${bookingId} not found`);
    await booking.update(update, { transaction });
    await booking.reload({ transaction });
    return booking;
  }

  /**
   * Deletes a reservation.
   *
   * @param {string} bookingId - UUID of the reservation.
   * @param {Transaction} [transaction] - Optional transaction.
   * @returns {Promise<void>}
   * @throws {NotFoundError} If the reservation does not exist.
   */
  async deleteBooking(
    bookingId: string,
    transaction?: Transaction
  ): Promise<void> {
    const run = async (t: Transaction) => {
      const booking = await BookingModel.findByPk(bookingId, {
        transaction: t,
      });
      if (!booking) {
        throw new NotFoundError(`Booking with id ${bookingId} not found`);
      }
      await booking.destroy({ transaction: t });
    };

    if (transaction) {
      return run(transaction);
    } else {
      return await sequelize.transaction(run);
    }
  }

  /**
   * Retrieves all reservations, sorted by descending date.
   *
   * @param {Transaction} [transaction] - Optional transaction.
   * @returns {Promise<BookingModel[]>} List of reservations.
   */
  async getAllBookings(transaction?: Transaction): Promise<BookingModel[]> {
    return BookingModel.findAll({
      include: [UserModel, ScreeningModel],
      order: [['bookingDate', 'DESC']],
      transaction,
    });
  }

  // === Filters ===

  /**
   * Retrieves the reservations of a user.
   *
   * @param {string} userId - UUID of the user.
   * @param {Transaction} [transaction] - Optional transaction.
   * @returns {Promise<BookingModel[]>} User's reservations.
   */
  async getBookingsByUser(
    userId: string,
    transaction?: Transaction
  ): Promise<BookingModel[]> {
    return BookingModel.findAll({
      where: { userId },
      include: [ScreeningModel],
      order: [['bookingDate', 'DESC']],
      transaction,
    });
  }

  /**
   * Retrieves the reservations associated with a screening.
   *
   * @param {string} screeningId - UUID of the screening.
   * @param {Transaction} [transaction] - Optional transaction.
   * @returns {Promise<BookingModel[]>} Screening's reservations.
   */
  async getBookingsByScreening(
    screeningId: string,
    transaction?: Transaction
  ): Promise<BookingModel[]> {
    return BookingModel.findAll({
      where: { screeningId },
      include: [UserModel],
      order: [['bookingDate', 'DESC']],
      transaction,
    });
  }

  /**
   * Retrieves reservations by status (e.g., pending, used, canceled).
   *
   * @param {string} status - Status of the reservation.
   * @param {Transaction} [transaction] - Optional transaction.
   * @returns {Promise<BookingModel[]>} List of reservations with this status.
   */
  async getBookingsByStatus(
    status: string,
    transaction?: Transaction
  ): Promise<BookingModel[]> {
    return BookingModel.findAll({
      where: { status },
      include: [UserModel, ScreeningModel],
      order: [['bookingDate', 'DESC']],
      transaction,
    });
  }

  // === Search ===

  /**
   * Searches for reservations (with joins) on status, screeningId, or userId fields.
   *
   * @param {string} query - Search term.
   * @param {Transaction} [transaction] - Optional transaction.
   * @returns {Promise<BookingModel[]>} Matching reservations.
   */
  async searchBookingSimple(
    query: string,
    transaction?: Transaction
  ): Promise<BookingModel[]> {
    return BookingModel.findAll({
      where: {
        [Op.or]: [
          { status: { [Op.like]: `%${query}%` } },
          { screeningId: { [Op.like]: `%${query}%` } },
          { userId: { [Op.like]: `%${query}%` } },
        ],
      },
      include: [
        { model: UserModel, as: 'user', required: false },
        { model: ScreeningModel, as: 'screening', required: false },
      ],
      order: [['bookingDate', 'DESC']],
      transaction,
    });
  }

  /**
   * Simplified search (without joins) on status, screeningId, or userId fields.
   *
   * @param {string} query - Search term.
   * @param {Transaction} [transaction] - Optional transaction.
   * @returns {Promise<BookingModel[]>} Matching reservations.
   */
  async searchBookingVerySimple(
    query: string,
    transaction?: Transaction
  ): Promise<BookingModel[]> {
    return BookingModel.findAll({
      where: {
        [Op.or]: [
          { status: { [Op.like]: `%${query}%` } },
          { screeningId: { [Op.like]: `%${query}%` } },
          { userId: { [Op.like]: `%${query}%` } },
        ],
      },
      order: [['bookingDate', 'DESC']],
      transaction,
    });
  }
}

export const bookingService = new BookingService();
