/**
 * Sequelize Model for Bookings (BookingModel).
 *
 * This file defines the data model for bookings in the cinema application.
 * It manages the reservation of seats by users for a given screening.
 * Implementation done with sequelize-typescript for strict typing and advanced
 * relationship management.
 *
 * Main Features:
 *  - Each booking has a unique identifier (UUID).
 *  - It references the user (userId) and the screening (screeningId) involved,
 *    with cascading deletion if the user or screening is deleted.
 *  - The number of seats booked and the total price are stored with validations (required minimums).
 *  - The status of the booking ("pending", "used", "canceled") changes according to the booking lifecycle.
 *  - The booking date is automatically recorded.
 *  - @BelongsTo relationships with UserModel and ScreeningModel for easy access to the related user and screening.
 *  - Indexes on userId and screeningId to optimize searches.
 *  - Timestamps (createdAt, updatedAt) are automatically added thanks to the `timestamps` option.
 *
 * Associated Interfaces:
 *   - BookingAttributes: structure of a booking in the database.
 *   - BookingCreationAttributes: optional fields during creation (bookingId, status, bookingDate).
 *
 * Uses:
 *   - Creation, update, and management of booking statuses.
 *   - Calculation of revenue per screening or user.
 *   - Attachment and history of bookings for each user or screening.
 */

import {
  Table,
  Column,
  Model,
  PrimaryKey,
  DataType,
  ForeignKey,
  BelongsTo,
  Index,
  Default,
} from 'sequelize-typescript';
import { Optional } from 'sequelize';
import { UserModel } from './user.model.js';
import { ScreeningModel } from './screening.model.js';

// Possible statuses for a booking
export type BookingStatus = 'pending' | 'used' | 'canceled';

// Complete structure of a booking
export interface BookingAttributes {
  bookingId: string;
  userId: string;
  screeningId: string;
  seatsNumber: number;
  totalPrice: number;
  status: BookingStatus;
  bookingDate: Date;
}

// Optional fields during creation (e.g., auto-generated)
export interface BookingCreationAttributes
  extends Optional<BookingAttributes, 'bookingId' | 'status' | 'bookingDate'> {}

// Definition of the BookingModel
@Table({ tableName: 'bookings', timestamps: true })
export class BookingModel
  extends Model<BookingAttributes, BookingCreationAttributes>
  implements BookingAttributes
{
  // Unique booking identifier (UUID, primary key)
  @PrimaryKey
  @Column({
    type: DataType.UUID,
    allowNull: false,
    unique: true,
    defaultValue: DataType.UUIDV4,
  })
  declare bookingId: string;

  // Foreign key to the user, indexed
  @Index
  @ForeignKey(() => UserModel)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    onDelete: 'CASCADE',
  })
  declare userId: string;

  // Foreign key to the screening, indexed
  @Index
  @ForeignKey(() => ScreeningModel)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    onDelete: 'CASCADE',
  })
  declare screeningId: string;

  // Number of seats booked (minimum 1)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
    },
  })
  declare seatsNumber: number;

  // Total price of the booking (decimal, minimum 0)
  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0,
    },
  })
  declare totalPrice: number;

  // Booking status (default value: "pending")
  @Default('pending')
  @Column({
    type: DataType.ENUM('pending', 'used', 'canceled'),
    allowNull: false,
  })
  declare status: BookingStatus;

  // Booking date (auto-filled at creation)
  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  declare bookingDate: Date;

  // Relationship: the booking belongs to a user
  @BelongsTo(() => UserModel, {
    foreignKey: 'userId',
    targetKey: 'userId',
  })
  declare user: UserModel;

  // Relationship: the booking belongs to a screening
  @BelongsTo(() => ScreeningModel, {
    foreignKey: 'screeningId',
    targetKey: 'screeningId',
  })
  declare screening: ScreeningModel;
}
