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
 * Service class for managing bookings.
 */
export class BookingService {
  // CRUD

  /**
   * Get a booking by its ID.
   * @param {string} bookingId - UUID of the booking.
   * @returns {Promise<BookingModel>} BookingModel instance.
   * @throws {NotFoundError} If the booking does not exist.
   */
  static async getBookingById(bookingId: string): Promise<BookingModel> {
    const booking = await BookingModel.findByPk(bookingId, {
      include: [UserModel, ScreeningModel],
    });
    if (!booking) {
      throw new NotFoundError(`Booking with id ${bookingId} not found`);
    }
    return booking;
  }

  /**
   * Create a new booking after verifying seat availability.
   * @param {BookingCreationAttributes} payload - Booking creation data.
   * @returns {Promise<BookingModel>} Created BookingModel instance.
   * @throws {NotFoundError} If the screening or hall is not found.
   * @throws {ConflictError} If not enough seats are available.
   */
  static async createBooking(
    payload: BookingCreationAttributes
  ): Promise<BookingModel> {
    return await sequelize.transaction(async (t: Transaction) => {
      const screening = await ScreeningModel.findByPk(payload.screeningId, {
        include: [MovieHallModel],
        transaction: t,
      });
      if (!screening) throw new NotFoundError('Screening not found');

      const hall = await screening.$get('hall', { transaction: t });
      if (!hall) throw new NotFoundError('Hall not found for this screening');

      const totalSeats = hall.seatsLayout.reduce(
        (sum, row) => sum + row.length,
        0
      );

      const bookedSeats = await BookingModel.sum('seatsNumber', {
        where: { screeningId: payload.screeningId },
        transaction: t,
      });

      const remainingSeats = totalSeats - (bookedSeats || 0);
      if (payload.seatsNumber > remainingSeats) {
        throw new ConflictError(
          `Only ${remainingSeats} seat(s) left for this screening`
        );
      }

      return await BookingModel.create(payload, { transaction: t });
    });
  }

  /**
   * Update a booking by ID.
   * @param {string} bookingId - UUID of the booking.
   * @param {Partial<BookingAttributes>} update - Partial booking data.
   * @returns {Promise<BookingModel>} Updated BookingModel instance.
   * @throws {NotFoundError} If the booking is not found.
   */
  static async updateBooking(
    bookingId: string,
    update: Partial<BookingAttributes>
  ): Promise<BookingModel> {
    return await sequelize.transaction(async (t: Transaction) => {
      const booking = await BookingModel.findByPk(bookingId, {
        transaction: t,
      });
      if (!booking) {
        throw new NotFoundError(`Booking with id ${bookingId} not found`);
      }

      await booking.update(update, { transaction: t });
      await booking.reload({ transaction: t });

      return booking;
    });
  }

  /**
   * Delete a booking by ID.
   * @param {string} bookingId - UUID of the booking.
   * @returns {Promise<void>}
   * @throws {NotFoundError} If the booking is not found.
   */
  static async deleteBooking(bookingId: string): Promise<void> {
    return await sequelize.transaction(async (t: Transaction) => {
      const booking = await BookingModel.findByPk(bookingId, {
        transaction: t,
      });
      if (!booking) {
        throw new NotFoundError(`Booking with id ${bookingId} not found`);
      }

      await booking.destroy({ transaction: t });
    });
  }

  /**
   * Get all bookings.
   * @returns {Promise<BookingModel[]>} Array of BookingModel instances.
   */
  static async getAllBookings(): Promise<BookingModel[]> {
    return BookingModel.findAll({
      include: [UserModel, ScreeningModel],
      order: [['bookingDate', 'DESC']],
    });
  }

  // Find by X

  /**
   * Get all bookings by user ID.
   * @param {string} userId - UUID of the user.
   * @returns {Promise<BookingModel[]>} Array of BookingModel instances.
   */
  static async getBookingsByUser(userId: string): Promise<BookingModel[]> {
    return BookingModel.findAll({
      where: { userId },
      include: [ScreeningModel],
      order: [['bookingDate', 'DESC']],
    });
  }

  /**
   * Get all bookings by screening ID.
   * @param {string} screeningId - UUID of the screening.
   * @returns {Promise<BookingModel[]>} Array of BookingModel instances.
   */
  static async getBookingsByScreening(
    screeningId: string
  ): Promise<BookingModel[]> {
    return BookingModel.findAll({
      where: { screeningId },
      include: [UserModel],
      order: [['bookingDate', 'DESC']],
    });
  }

  /**
   * Get all bookings by status (pending, used, canceled).
   * @param {string} status - Booking status.
   * @returns {Promise<BookingModel[]>} Array of BookingModel instances.
   */
  static async getBookingsByStatus(status: string): Promise<BookingModel[]> {
    return BookingModel.findAll({
      where: { status },
      include: [UserModel, ScreeningModel],
      order: [['bookingDate', 'DESC']],
    });
  }

  /**
   * Search bookings with a simple text query.
   * Searches status, screeningId, or userId fields using LIKE.
   * Includes user and screening associations.
   * @param {string} query - Search term.
   * @returns {Promise<BookingModel[]>} Array of matching BookingModel instances.
   */
  static async searchBookingSimple(query: string): Promise<BookingModel[]> {
    try {
      const bookings = await BookingModel.findAll({
        where: {
          [Op.or]: [
            { status: { [Op.like]: `%${query}%` } },
            { screeningId: { [Op.like]: `%${query}%` } },
            { userId: { [Op.like]: `%${query}%` } },
          ],
        },
        include: [
          {
            model: UserModel,
            as: 'user',
            required: false,
          },
          {
            model: ScreeningModel,
            as: 'screening',
            required: false,
          },
        ],
        order: [['bookingDate', 'DESC']],
      });

      return bookings;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Very simple booking search (no JOINs).
   * Searches status, screeningId, or userId fields using LIKE.
   * @param {string} query - Search term.
   * @returns {Promise<BookingModel[]>} Array of matching BookingModel instances.
   */
  static async searchBookingVerySimple(query: string): Promise<BookingModel[]> {
    try {
      const bookings = await BookingModel.findAll({
        where: {
          [Op.or]: [
            { status: { [Op.like]: `%${query}%` } },
            { screeningId: { [Op.like]: `%${query}%` } },
            { userId: { [Op.like]: `%${query}%` } },
          ],
        },
        order: [['bookingDate', 'DESC']],
      });

      return bookings;
    } catch (error) {
      throw error;
    }
  }
}
