/**
 * Sequelize Model for Booked Seats in Screenings.
 *
 * This model manages the association between individual seat reservations
 * and screenings for a cinema application. Each record represents a seat
 * that has been booked for a particular screening as part of a booking.
 *
 * Key Fields:
 * - screeningId: The unique identifier for the screening (foreign key).
 * - seatId: The unique identifier for the seat within the screening.
 * - bookingId: The unique identifier for the booking (foreign key).
 *
 * Associations:
 * - Belongs to ScreeningModel (screeningId)
 * - Belongs to BookingModel (bookingId)
 *
 * Design:
 * - Composite primary key: (screeningId, seatId)
 * - No timestamps (as booking creation/update times are managed by BookingModel)
 * - CASCADE on delete for screeningId and bookingId (seats are released if screening or booking is deleted)
 */
import {
  Table,
  Model,
  Column,
  DataType,
  PrimaryKey,
  IsUUID,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { ScreeningModel } from './screening.model.js';
import { BookingModel } from './booking.model.js';

export interface BookedSeatAttributes {
  screeningId: string;
  seatId: string;
  bookingId: string;
}

@Table({
  tableName: 'seat_bookings',
  timestamps: false,
})
export class BookedSeatModel extends Model<BookedSeatAttributes> {
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

  @PrimaryKey
  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'seat_id',
  })
  seatId!: string;

  @IsUUID(4)
  @ForeignKey(() => BookingModel)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    field: 'booking_id',
    onDelete: 'CASCADE',
  })
  bookingId!: string;

  @BelongsTo(() => ScreeningModel)
  screening!: ScreeningModel;

  @BelongsTo(() => BookingModel)
  booking!: BookingModel;
}
