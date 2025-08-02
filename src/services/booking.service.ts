import {
  BookingModel,
  BookingAttributes,
  BookingCreationAttributes,
} from '../models/booking.model.js';
import { NotFoundError } from '../errors/not-found-error.js';
import { sequelize } from '../config/db.js';
import { Transaction, Op, Sequelize } from 'sequelize';
import { UserModel } from '../models/user.model.js';
import { ScreeningModel } from '../models/screening.model.js';

/**
 * Helper function to build the search query.
 * This function creates a dynamic search filter for the `findAll` method
 * by matching multiple fields (bookingId, status, userId, etc.) to the query term.
 *
 * @param {string} query - The search term entered by the user.
 * @returns {Object} A 'where' clause for filtering, to be passed to Sequelize.
 */
const buildSearchQuery = (query: string) => {
  return {
    [Op.or]: [
      { bookingId: { [Op.like]: `%${query}%` } },
      { status: { [Op.like]: `%${query}%` } },
      { screeningId: { [Op.like]: `%${query}%` } },
      { userId: { [Op.like]: `%${query}%` } },
      { seatsNumber: { [Op.like]: `%${query}%` } },
      { totalPrice: { [Op.like]: `%${query}%` } },
      { bookingDate: { [Op.like]: `%${query}%` } }, // Assuming query is a string like '2025-07-01'
    ],
  };
};

/**
 * Main service for CRUD operations and search on reservations (bookings).
 * This service interacts with the `BookingModel` (Sequelize model) to perform database operations.
 */
export class BookingService {
  // === CRUD Operations ===

  /**
   * Retrieves a reservation by its unique identifier (bookingId).
   * Includes related user and screening details.
   *
   * @param {string} bookingId - UUID of the reservation.
   * @param {Transaction} [transaction] - Optional transaction object for consistency.
   * @returns {Promise<BookingModel | null>} A promise that resolves to the found reservation or null.
   * @throws {NotFoundError} If no reservation is found with the provided bookingId.
   */
  async getBookingById(
    bookingId: string,
    transaction?: Transaction
  ): Promise<BookingModel | null> {
    const booking = await BookingModel.findByPk(bookingId, {
      include: [UserModel, ScreeningModel], // Include related user and screening models
      transaction, // Use transaction if provided
    });
    if (!booking) {
      throw new NotFoundError(`Booking with id ${bookingId} not found`);
    }
    return booking;
  }

  /**
   * Creates a new reservation.
   *
   * @param {BookingCreationAttributes} payload - The reservation data (e.g., userId, screeningId, seats).
   * @param {Transaction} [transaction] - Optional transaction for consistency.
   * @returns {Promise<BookingModel>} The created booking.
   * @throws {NotFoundError} If the screening or hall does not exist.
   * @throws {ConflictError} If requested seats are no longer available.
   */
  async createBooking(
    payload: BookingCreationAttributes,
    transaction?: Transaction
  ): Promise<BookingModel> {
    return BookingModel.create(payload, { transaction });
  }

  /**
   * Updates an existing reservation.
   *
   * @param {string} bookingId - UUID of the reservation to update.
   * @param {Partial<BookingAttributes>} update - The updates to apply to the booking.
   * @param {Transaction} [transaction] - Optional transaction object for consistency.
   * @returns {Promise<BookingModel>} The updated booking.
   * @throws {NotFoundError} If no reservation exists with the provided bookingId.
   */
  async updateBooking(
    bookingId: string,
    update: Partial<BookingAttributes>,
    transaction?: Transaction
  ): Promise<BookingModel> {
    const booking = await BookingModel.findByPk(bookingId, { transaction });
    if (!booking)
      throw new NotFoundError(`Booking with id ${bookingId} not found`);
    await booking.update(update, { transaction }); // Apply the updates
    await booking.reload({ transaction }); // Reload the updated booking from the database
    return booking;
  }

  /**
   * Deletes a reservation.
   *
   * @param {string} bookingId - UUID of the reservation to delete.
   * @param {Transaction} [transaction] - Optional transaction for consistency.
   * @returns {Promise<void>} A promise that resolves when the booking is deleted.
   * @throws {NotFoundError} If no reservation exists with the provided bookingId.
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
      await booking.destroy({ transaction: t }); // Delete the booking
    };

    if (transaction) {
      return run(transaction); // If a transaction is provided, use it
    } else {
      return await sequelize.transaction(run); // Start a new transaction if none is provided
    }
  }

  // === Getters ===

  /**
   * Retrieves all reservations, sorted by descending booking date.
   *
   * @param {Transaction} [transaction] - Optional transaction for consistency.
   * @returns {Promise<BookingModel[]>} A list of all bookings, including user and screening details.
   */
  async getAllBookings(transaction?: Transaction): Promise<BookingModel[]> {
    return BookingModel.findAll({
      include: [UserModel, ScreeningModel], // Include related user and screening models
      order: [['bookingDate', 'DESC']], // Sort bookings by booking date (most recent first)
      transaction,
    });
  }

  // === Filters ===

  /**
   * Retrieves the reservations of a specific user.
   *
   * @param {string} userId - UUID of the user whose bookings are to be retrieved.
   * @param {Transaction} [transaction] - Optional transaction for consistency.
   * @returns {Promise<BookingModel[]>} A list of bookings for the user.
   */
  async getBookingsByUser(
    userId: string,
    transaction?: Transaction
  ): Promise<BookingModel[]> {
    return BookingModel.findAll({
      where: { userId },
      include: [ScreeningModel], // Include related screening models
      order: [['bookingDate', 'DESC']],
      transaction,
    });
  }

  /**
   * Retrieves the reservations associated with a specific screening.
   *
   * @param {string} screeningId - UUID of the screening whose bookings are to be retrieved.
   * @param {Transaction} [transaction] - Optional transaction for consistency.
   * @returns {Promise<BookingModel[]>} A list of bookings for the screening.
   */
  async getBookingsByScreening(
    screeningId: string,
    transaction?: Transaction
  ): Promise<BookingModel[]> {
    return BookingModel.findAll({
      where: { screeningId },
      include: [UserModel], // Include related user models
      order: [['bookingDate', 'DESC']],
      transaction,
    });
  }

  /**
   * Retrieves reservations by their status (e.g., pending, used, canceled).
   *
   * @param {string} status - The status of the bookings to retrieve.
   * @param {Transaction} [transaction] - Optional transaction for consistency.
   * @returns {Promise<BookingModel[]>} A list of bookings with the specified status.
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

  /**
   * Searches for reservations based on multiple parameters (bookingId, status, userId, etc.).
   * Optionally joins related User and Screening models.
   *
   * @param {Object} filters - The filters to apply for searching (userId, status, etc.).
   * @param {boolean} includeJoins - Whether to include the related User and Screening models.
   * @param {Transaction} [transaction] - Optional transaction for consistency.
   * @returns {Promise<BookingModel[]>} A list of bookings that match the search criteria.
   */
  async searchBooking(
    filters: {
      userId?: string;
      status?: string;
      bookingDate?: { [Op.gte]: Date; [Op.lte]: Date };
    },
    includeJoins: boolean = false,
    transaction?: Transaction
  ): Promise<BookingModel[]> {
    const whereClause: any = {};

    // Normalize the filters to avoid issues with ParsedQs
    if (filters.userId) {
      whereClause.userId = filters.userId;
    }

    if (filters.status) {
      whereClause.status = String(filters.status); // Normalize status to string
    }

    if (filters.bookingDate) {
      whereClause.bookingDate = filters.bookingDate; // Filter by date range
    }

    const queryOptions: any = {
      where: whereClause,
      order: [['bookingDate', 'DESC']], // Sort by booking date (most recent first)
      transaction,
    };

    // Include related models (User and Screening) if specified
    if (includeJoins) {
      queryOptions.include = [
        { model: UserModel, as: 'user', required: false },
        { model: ScreeningModel, as: 'screening', required: false },
      ];
    }

    return BookingModel.findAll(queryOptions);
  }
}

// Export the BookingService instance
export const bookingService = new BookingService();
