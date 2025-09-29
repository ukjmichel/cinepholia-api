// Quick fix for current database schema
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
import { Optional } from 'sequelize';
import { ScreeningModel } from './screening.model.js';
import { BookingModel } from './booking.model.js';

export interface BookedSeatAttributes {
  screeningId: string;
  seatId: string;
  bookingId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookedSeatCreationAttributes
  extends Optional<BookedSeatAttributes, 'createdAt' | 'updatedAt'> {}

@Table({
  tableName: 'booked_seats',
  timestamps: true,
})
export class BookedSeatModel extends Model<
  BookedSeatAttributes,
  BookedSeatCreationAttributes
> {
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

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  @BelongsTo(() => ScreeningModel)
  screening!: ScreeningModel;
}
