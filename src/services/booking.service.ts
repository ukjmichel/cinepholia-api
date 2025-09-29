/**
 * BookingService
 * --------------
 * Seat reservation management service following the movie service pattern.
 *
 * This service manages all operations related to reservations:
 * - Creation with verification of available seats.
 * - Reading by various identifiers with pagination support.
 * - Updating and deletion.
 * - Searching with structured filters and free-text search.
 * - List operations with sorting and filtering.
 *
 * Features:
 * - Secure creation of reservations (checks the number of remaining seats).
 * - Pagination support for all list operations.
 * - Structured filtering and search capabilities.
 * - DTO conversion for safe data exposure.
 * - Integration with user, screening, and hall models.
 *
 */

import {
  BookingModel,
  BookingAttributes,
  BookingCreationAttributes,
} from '../models/booking.model.js';
import { BookedSeatModel } from '../models/booked-seat.model.js';
import { MovieModel } from '../models/movie.model.js';
import type {
  CreateBookingDTO,
  UpdateBookingDTO,
  BookingDTO,
  PaginatedResponse,
} from '../interfaces/booking.js';
import { toBookingDTO } from '../interfaces/booking.js';
import { NotFoundError } from '../errors/not-found-error.js';
import { sequelize } from '../config/db.js';
import { Transaction, Op } from 'sequelize';
import { UserModel } from '../models/user.model.js';
import { ScreeningModel } from '../models/screening.model.js';
import {
  buildBookingWhere,
  buildOrder,
  buildUpcomingBookingsWhere,
  buildBookingsByUserWhere,
  buildBookingsByScreeningWhere,
  buildBookingsByStatusWhere,
  ListOptions,
  normalizeListOptions,
  SearchParams,
} from '../queries/booking.queries.js';

const DEFAULT_LIMIT = 20;

type ServiceOptions = {
  transaction?: Transaction;
};

/**
 * Standard include options for booking queries with all related data
 */
const getBookingIncludes = () => [
  {
    model: UserModel,
    as: 'user',
    attributes: ['userId', 'username', 'firstName', 'lastName', 'email'],
  },
  {
    model: ScreeningModel,
    as: 'screening',
    attributes: [
      'screeningId',
      'movieId',
      'theaterId',
      'hallId',
      'startTime',
      'price',
    ],
    include: [
      {
        model: MovieModel,
        as: 'movie',
        attributes: [
          'movieId',
          'title',
          'description',
          'ageRating',
          'genre',
          'releaseDate',
          'director',
          'durationMinutes',
          'posterUrl',
          'recommended',
        ],
      },
    ],
  },
  {
    model: BookedSeatModel,
    as: 'bookedSeats',
    attributes: ['screeningId', 'seatId', 'bookingId'],
  },
];

/**
 * Main service for CRUD operations and search on reservations.
 */
export class BookingService {
  /* =============== CRUD =============== */

  /** Create a new booking with seats and return a safe DTO */
  async createBookingWithSeats(
    payload: CreateBookingDTO,
    seatIds: string[],
    opts: ServiceOptions = {}
  ): Promise<BookingDTO> {
    return await sequelize.transaction(async (t: Transaction) => {
      const transaction = opts.transaction || t;

      console.log('BookingService - Creating booking with seats:', {
        payload,
        seatIds,
      });

      // 1. Create the booking first
      const booking = await BookingModel.create(payload as any, {
        transaction,
      });

      console.log('BookingService - Booking created:', booking.bookingId);

      // 2. Create the seat bookings
      const seatBookingsData = seatIds.map((seatId) => ({
        bookingId: booking.bookingId,
        screeningId: payload.screeningId,
        seatId,
      }));

      console.log('BookingService - Creating seats:', seatBookingsData);

      // Import BookedSeatModel and bookedSeatService at the top of the file
      const { bookedSeatService } = await import('./booked-seat.service.js');

      const createdSeats = await bookedSeatService.createMultipleSeatBookings(
        seatBookingsData,
        transaction
      );

      console.log('BookingService - Seats created:', createdSeats.length);

      // 3. Load with associations for DTO conversion
      const bookingWithAssoc = await BookingModel.findByPk(booking.bookingId, {
        include: getBookingIncludes(),
        transaction,
      });

      console.log(
        'BookingService - Booking loaded with associations, bookedSeats count:',
        (bookingWithAssoc as any)?.bookedSeats?.length || 0
      );

      return toBookingDTO(
        this.pickForDTO(bookingWithAssoc!),
        bookingWithAssoc?.user,
        bookingWithAssoc?.screening,
        (bookingWithAssoc?.screening as any)?.movie,
        (bookingWithAssoc as any)?.bookedSeats
      );
    });
  }

  /** Create a new booking and return a safe DTO */
  async create(
    payload: CreateBookingDTO,
    opts: ServiceOptions = {}
  ): Promise<BookingDTO> {
    return await sequelize.transaction(async (t: Transaction) => {
      const transaction = opts.transaction || t;

      console.log('BookingService - Creating booking with payload:', payload);

      const booking = await BookingModel.create(payload as any, {
        transaction,
      });

      console.log('BookingService - Booking created:', booking.bookingId);

      // Load with associations for DTO conversion
      const bookingWithAssoc = await BookingModel.findByPk(booking.bookingId, {
        include: getBookingIncludes(),
        transaction,
      });

      console.log('BookingService - Booking loaded with associations');

      return toBookingDTO(
        this.pickForDTO(bookingWithAssoc!),
        bookingWithAssoc?.user,
        bookingWithAssoc?.screening,
        (bookingWithAssoc?.screening as any)?.movie,
        (bookingWithAssoc as any)?.bookedSeats
      );
    });
  }

  /** Retrieve a booking by id (DTO or null) */
  async get(
    bookingId: string,
    opts: ServiceOptions = {}
  ): Promise<BookingDTO | null> {
    const booking = await BookingModel.findByPk(bookingId, {
      include: getBookingIncludes(),
      transaction: opts.transaction,
    });

    return booking
      ? toBookingDTO(
          this.pickForDTO(booking),
          booking.user,
          booking.screening,
          (booking.screening as any)?.movie,
          (booking as any).bookedSeats
        )
      : null;
  }

  /** Get a booking by ID (throws if not found) */
  async getById(
    bookingId: string,
    opts: ServiceOptions = {}
  ): Promise<BookingDTO> {
    const booking = await this.get(bookingId, opts);
    if (!booking) {
      throw new NotFoundError(`Booking with id ${bookingId} not found`);
    }
    return booking;
  }

  /** Update selected fields of a booking and return DTO (or null if not found) */
  async update(
    bookingId: string,
    dto: UpdateBookingDTO,
    opts: ServiceOptions = {}
  ): Promise<BookingDTO | null> {
    return await sequelize.transaction(async (t: Transaction) => {
      const transaction = opts.transaction || t;

      const booking = await BookingModel.findByPk(bookingId, { transaction });
      if (!booking) return null;

      const updatable: UpdateBookingDTO = {} as UpdateBookingDTO;
      for (const key of Object.keys(dto) as (keyof UpdateBookingDTO)[]) {
        if (dto[key] !== undefined) (updatable as any)[key] = dto[key];
      }

      booking.set(updatable as any);
      await booking.save({ transaction });

      // Reload with associations
      await booking.reload({
        include: getBookingIncludes(),
        transaction,
      });

      return toBookingDTO(
        this.pickForDTO(booking),
        booking.user,
        booking.screening,
        (booking.screening as any)?.movie,
        (booking as any).bookedSeats
      );
    });
  }

  /** Permanently remove a booking (true if deleted) */
  async remove(bookingId: string, opts: ServiceOptions = {}): Promise<boolean> {
    return await sequelize.transaction(async (t: Transaction) => {
      const transaction = opts.transaction || t;

      const booking = await BookingModel.findByPk(bookingId, { transaction });
      if (!booking) return false;

      const deleted = await BookingModel.destroy({
        where: { bookingId },
        transaction,
      });

      return deleted > 0;
    });
  }

  /* =============== LIST / SEARCH =============== */

  /**
   * List bookings with pagination, optional sorting, and filters.
   */
  async list(
    optsList: ListOptions = {},
    opts: ServiceOptions = {}
  ): Promise<PaginatedResponse<BookingDTO>> {
    const { page, limit, sortBy, sortDir } = normalizeListOptions(optsList);
    const where = buildBookingWhere(optsList.filters);

    const { rows, count } = await BookingModel.findAndCountAll({
      where,
      include: getBookingIncludes(),
      offset: (page - 1) * limit,
      limit,
      order: buildOrder(sortBy, sortDir),
      transaction: opts.transaction,
    });

    return this.paginate(rows, count, page, limit);
  }

  /**
   * Search by free-text query (q) plus structured filters.
   */
  async search(
    params: SearchParams,
    opts: ServiceOptions = {}
  ): Promise<PaginatedResponse<BookingDTO>> {
    const { page, limit, sortBy, sortDir } = normalizeListOptions(params);
    const where = buildBookingWhere(params.filters, params.q);

    const { rows, count } = await BookingModel.findAndCountAll({
      where,
      include: getBookingIncludes(),
      offset: (page - 1) * limit,
      limit,
      order: buildOrder(sortBy, sortDir),
      transaction: opts.transaction,
    });

    return this.paginate(rows, count, page, limit);
  }

  /* =============== SPECIALIZED QUERIES =============== */

  /**
   * Retrieve bookings by user with pagination support.
   */
  async getByUser(
    userId: string,
    optsList: Omit<ListOptions, 'filters'> = {},
    opts: ServiceOptions = {}
  ): Promise<PaginatedResponse<BookingDTO>> {
    const { page, limit, sortBy, sortDir } = normalizeListOptions({
      ...optsList,
      sortBy: optsList.sortBy || 'bookingDate',
      sortDir: optsList.sortDir || 'desc',
    });

    const where = buildBookingsByUserWhere(userId);

    const { rows, count } = await BookingModel.findAndCountAll({
      where,
      include: [
        {
          model: ScreeningModel,
          as: 'screening',
          attributes: [
            'screeningId',
            'movieId',
            'theaterId',
            'hallId',
            'startTime',
            'price',
          ],
          include: [
            {
              model: MovieModel,
              as: 'movie',
              attributes: [
                'movieId',
                'title',
                'description',
                'ageRating',
                'genre',
                'releaseDate',
                'director',
                'durationMinutes',
                'posterUrl',
                'recommended',
              ],
            },
          ],
        },
        {
          model: BookedSeatModel,
          as: 'bookedSeats',
          attributes: ['screeningId', 'seatId', 'bookingId'],
        },
      ],
      offset: (page - 1) * limit,
      limit,
      order: buildOrder(sortBy, sortDir),
      transaction: opts.transaction,
    });

    return this.paginate(rows, count, page, limit);
  }

  /**
   * Retrieve bookings by screening with pagination support.
   */
  async getByScreening(
    screeningId: string,
    optsList: Omit<ListOptions, 'filters'> = {},
    opts: ServiceOptions = {}
  ): Promise<PaginatedResponse<BookingDTO>> {
    const { page, limit, sortBy, sortDir } = normalizeListOptions({
      ...optsList,
      sortBy: optsList.sortBy || 'bookingDate',
      sortDir: optsList.sortDir || 'desc',
    });

    const where = buildBookingsByScreeningWhere(screeningId);

    const { rows, count } = await BookingModel.findAndCountAll({
      where,
      include: [
        {
          model: UserModel,
          as: 'user',
          attributes: ['userId', 'username', 'firstName', 'lastName', 'email'],
        },
        {
          model: ScreeningModel,
          as: 'screening',
          attributes: [
            'screeningId',
            'movieId',
            'theaterId',
            'hallId',
            'startTime',
            'price',
          ],
          include: [
            {
              model: MovieModel,
              as: 'movie',
              attributes: [
                'movieId',
                'title',
                'description',
                'ageRating',
                'genre',
                'releaseDate',
                'director',
                'durationMinutes',
                'posterUrl',
                'recommended',
              ],
            },
          ],
        },
        {
          model: BookedSeatModel,
          as: 'bookedSeats',
          attributes: ['screeningId', 'seatId', 'bookingId'],
        },
      ],
      offset: (page - 1) * limit,
      limit,
      order: buildOrder(sortBy, sortDir),
      transaction: opts.transaction,
    });

    return this.paginate(rows, count, page, limit);
  }

  /**
   * Retrieve bookings by status with pagination support.
   */
  async getByStatus(
    status: string,
    optsList: Omit<ListOptions, 'filters'> = {},
    opts: ServiceOptions = {}
  ): Promise<PaginatedResponse<BookingDTO>> {
    const { page, limit, sortBy, sortDir } = normalizeListOptions({
      ...optsList,
      sortBy: optsList.sortBy || 'bookingDate',
      sortDir: optsList.sortDir || 'desc',
    });

    const where = buildBookingsByStatusWhere(status);

    const { rows, count } = await BookingModel.findAndCountAll({
      where,
      include: getBookingIncludes(),
      offset: (page - 1) * limit,
      limit,
      order: buildOrder(sortBy, sortDir),
      transaction: opts.transaction,
    });

    return this.paginate(rows, count, page, limit);
  }

  /**
   * Retrieve upcoming bookings for a user starting from a given date.
   */
  async getUpcomingByUser(
    userId: string,
    fromDate: Date = new Date(),
    optsList: Omit<ListOptions, 'filters'> = {},
    opts: ServiceOptions = {}
  ): Promise<PaginatedResponse<BookingDTO>> {
    const { page, limit, sortBy, sortDir } = normalizeListOptions({
      ...optsList,
      sortBy: optsList.sortBy || 'bookingDate',
      sortDir: optsList.sortDir || 'asc',
    });

    const { rows, count } = await BookingModel.findAndCountAll({
      where: { userId },
      include: [
        {
          model: ScreeningModel,
          as: 'screening',
          where: {
            startTime: { [Op.gte]: fromDate },
          },
          attributes: [
            'screeningId',
            'movieId',
            'theaterId',
            'hallId',
            'startTime',
            'price',
          ],
          include: [
            {
              model: MovieModel,
              as: 'movie',
              attributes: [
                'movieId',
                'title',
                'description',
                'ageRating',
                'genre',
                'releaseDate',
                'director',
                'durationMinutes',
                'posterUrl',
                'recommended',
              ],
            },
          ],
        },
        {
          model: BookedSeatModel,
          as: 'bookedSeats',
          attributes: ['screeningId', 'seatId', 'bookingId'],
        },
      ],
      offset: (page - 1) * limit,
      limit,
      order: [[{ model: ScreeningModel, as: 'screening' }, 'startTime', 'ASC']],
      transaction: opts.transaction,
    });

    return this.paginate(rows, count, page, limit);
  }

  /* =============== LEGACY METHODS (for backward compatibility) =============== */

  /** @deprecated Use getById instead */
  async getBookingById(
    bookingId: string,
    transaction?: Transaction
  ): Promise<BookingModel | null> {
    const booking = await BookingModel.findByPk(bookingId, {
      include: getBookingIncludes(),
      transaction,
    });
    if (!booking) {
      throw new NotFoundError(`Booking with id ${bookingId} not found`);
    }
    return booking;
  }

  /** @deprecated Use create instead */
  async createBooking(
    payload: BookingCreationAttributes,
    transaction?: Transaction
  ): Promise<BookingModel> {
    return BookingModel.create(payload, { transaction });
  }

  /** @deprecated Use update instead */
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

  /** @deprecated Use remove instead */
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

  /** @deprecated Use list instead */
  async getAllBookings(transaction?: Transaction): Promise<BookingModel[]> {
    return BookingModel.findAll({
      include: getBookingIncludes(),
      order: [['bookingDate', 'DESC']],
      transaction,
    });
  }

  /** @deprecated Use getByUser instead */
  async getBookingsByUser(
    userId: string,
    transaction?: Transaction
  ): Promise<BookingModel[]> {
    return BookingModel.findAll({
      where: { userId },
      include: [
        {
          model: ScreeningModel,
          as: 'screening',
          include: [{ model: MovieModel, as: 'movie' }],
        },
      ],
      order: [['bookingDate', 'DESC']],
      transaction,
    });
  }

  /** @deprecated Use getByScreening instead */
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

  /** @deprecated Use getByStatus instead */
  async getBookingsByStatus(
    status: string,
    transaction?: Transaction
  ): Promise<BookingModel[]> {
    return BookingModel.findAll({
      where: { status },
      include: getBookingIncludes(),
      order: [['bookingDate', 'DESC']],
      transaction,
    });
  }

  /** @deprecated Use search instead */
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
        {
          model: ScreeningModel,
          as: 'screening',
          required: false,
          include: [{ model: MovieModel, as: 'movie' }],
        },
      ],
      order: [['bookingDate', 'DESC']],
      transaction,
    });
  }

  /** @deprecated Use getUpcomingByUser instead */
  async getBookingsByUserUpcoming(
    userId: string,
    fromDate: Date,
    transaction?: Transaction
  ): Promise<BookingModel[]> {
    return BookingModel.findAll({
      where: { userId },
      include: [
        {
          model: ScreeningModel,
          as: 'screening',
          where: {
            startTime: { [Op.gte]: fromDate },
          },
          include: [{ model: MovieModel, as: 'movie' }],
        },
      ],
      order: [[{ model: ScreeningModel, as: 'screening' }, 'startTime', 'ASC']],
      transaction,
    });
  }

  /* =============== Helpers =============== */

  /** Convert raw rows into a paginated DTO response */
  private paginate(
    rows: BookingModel[],
    count: number,
    page: number,
    limit: number
  ): PaginatedResponse<BookingDTO> {
    const items = rows.map((booking) => {
      // Debug logging to see what bookedSeats data we're getting
      console.log('Service - Processing booking:', booking.bookingId);
      console.log(
        'Service - Raw booking data:',
        JSON.stringify(booking.get(), null, 2)
      );
      console.log(
        'Service - bookedSeats on booking:',
        (booking as any).bookedSeats
      );

      return toBookingDTO(
        this.pickForDTO(booking),
        booking.user,
        booking.screening,
        (booking.screening as any)?.movie,
        (booking as any).bookedSeats
      );
    });
    const pagesRaw = Math.ceil(count / Math.max(1, limit || DEFAULT_LIMIT));
    const totalPages = Math.max(1, pagesRaw);

    return {
      items,
      page,
      limit,
      total: count,
      totalItems: count,
      totalPages,
    };
  }

  /** Pick only safe fields for DTO mapping */
  private pickForDTO(model: BookingModel) {
    const booking = model.get() as BookingAttributes;
    return {
      bookingId: booking.bookingId,
      userId: booking.userId,
      screeningId: booking.screeningId,
      seatsNumber: booking.seatsNumber,
      totalPrice: booking.totalPrice,
      status: booking.status,
      bookingDate: booking.bookingDate,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    };
  }
}

/** Singleton instance for app-wide use */
export const bookingService = new BookingService();
