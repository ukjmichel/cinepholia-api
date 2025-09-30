/**
 * @module models/booked-seat.model.ts
 * @description Sequelize BookedSeat Model for Managing Seat Reservations.
 *
 *
 * This file defines the `BookedSeatModel` which represents a reserved seat for a specific screening.
 * It creates a composite primary key relationship between screenings, seats, and bookings.
 * It uses `sequelize-typescript` for entity declaration and relationship management.
 *
 * - Each booked seat references a screening via a foreign key (`screeningId`).
 * - Each booked seat references a booking via a foreign key (`bookingId`).
 * - The combination of `screeningId` and `seatId` forms a composite primary key.
 * - Deletion of a screening or booking is propagated (CASCADE).
 * - The relationship to ScreeningModel and BookingModel should be established in associations.ts
 */
import {
  Table,
  Model,
  Column,
  DataType,
  PrimaryKey,
  IsUUID,
  ForeignKey,
} from 'sequelize-typescript';
import { Optional } from 'sequelize';
import { ScreeningModel } from './screening.model.js';
import { BookingModel } from './booking.model.js';

/**
 * @interface BookedSeatAttributes
 * @description Defines the structure of a booked seat record
 *
 * @property {string} screeningId - Unique identifier of the screening (part of composite primary key)
 * @property {string} seatId - Identifier of the seat (part of composite primary key)
 * @property {string} bookingId - Unique identifier of the booking
 * @property {Date} createdAt - Timestamp when the seat was booked
 * @property {Date} updatedAt - Timestamp when the booking was last updated
 */
export interface BookedSeatAttributes {
  screeningId: string;
  seatId: string;
  bookingId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * @interface BookedSeatCreationAttributes
 * @description Attributes required for creating a new booked seat record
 * @extends {BookedSeatAttributes}
 * @description Makes createdAt and updatedAt optional as they are auto-generated
 */
export interface BookedSeatCreationAttributes
  extends Optional<BookedSeatAttributes, 'createdAt' | 'updatedAt'> {}

/**
 * @class BookedSeatModel
 * @extends {Model<BookedSeatAttributes, BookedSeatCreationAttributes>}
 * @description Sequelize model for managing seat reservations for screenings
 *
 * @example
 * // Creating a new seat booking
 * await BookedSeatModel.create({
 *   screeningId: 'screening-uuid',
 *   seatId: 'A-12',
 *   bookingId: 'booking-uuid'
 * });
 *
 * @example
 * // Finding all booked seats for a screening
 * const bookedSeats = await BookedSeatModel.findAll({
 *   where: { screeningId: 'screening-uuid' }
 * });
 *
 * @example
 * // Checking if a specific seat is available
 * const isBooked = await BookedSeatModel.findOne({
 *   where: { screeningId: 'screening-uuid', seatId: 'A-12' }
 * });
 * if (!isBooked) {
 *   // Seat is available
 * }
 */
@Table({
  tableName: 'booked_seats',
  timestamps: true,
})
export class BookedSeatModel extends Model<
  BookedSeatAttributes,
  BookedSeatCreationAttributes
> {
  /**
   * @property {string} screeningId
   * @description Screening identifier (composite primary key and foreign key to ScreeningModel)
   * @type {string}
   * @primary
   * @required
   */
  @PrimaryKey
  @IsUUID(4)
  @ForeignKey(() => ScreeningModel)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    field: 'screening_id',
    onDelete: 'CASCADE',
  })
  screeningId!: string;

  /**
   * @property {string} seatId
   * @description Seat identifier (composite primary key)
   * @type {string}
   * @primary
   * @required
   */
  @PrimaryKey
  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'seat_id',
  })
  seatId!: string;

  /**
   * @property {string} bookingId
   * @description Booking identifier (foreign key to BookingModel)
   * @type {string}
   * @required
   */
  @IsUUID(4)
  @ForeignKey(() => BookingModel)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    field: 'booking_id',
    onDelete: 'CASCADE',
  })
  bookingId!: string;

  /**
   * @property {Date} createdAt
   * @description Timestamp when the seat booking was created
   * @type {Date}
   * @readonly
   */
  declare readonly createdAt: Date;

  /**
   * @property {Date} updatedAt
   * @description Timestamp when the seat booking was last updated
   * @type {Date}
   * @readonly
   */
  declare readonly updatedAt: Date;

  /**
   * @property {ScreeningModel} screening
   * @description Associated screening for this booked seat
   * @type {ScreeningModel}
   */
  declare screening: ScreeningModel;

  /**
   * @property {BookingModel} booking
   * @description Associated booking that reserved this seat
   * @type {BookingModel}
   */
  declare booking: BookingModel;
}
