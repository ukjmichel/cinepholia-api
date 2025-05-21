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
import { UserModel } from './user.model';
import { ScreeningModel } from './screening.model';

export type BookingStatus = 'pending' | 'used' | 'canceled';

export interface BookingAttributes {
  bookingId: string;
  userId: string;
  screeningId: string;
  seatsNumber: number;
  status: BookingStatus;
  bookingDate: Date;
}

export interface BookingCreationAttributes
  extends Optional<BookingAttributes, 'bookingId' | 'status' | 'bookingDate'> {}

@Table({ tableName: 'bookings', timestamps: true })
export class BookingModel
  extends Model<BookingAttributes, BookingCreationAttributes>
  implements BookingAttributes
{
  @PrimaryKey
  @Column({
    type: DataType.UUID,
    allowNull: false,
    unique: true,
    defaultValue: DataType.UUIDV4,
  })
  declare bookingId: string;

  @Index
  @ForeignKey(() => UserModel)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    onDelete: 'CASCADE',
  })
  declare userId: string;

  @Index
  @ForeignKey(() => ScreeningModel)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    onDelete: 'CASCADE',
  })
  declare screeningId: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
    },
  })
  declare seatsNumber: number;

  @Default('pending')
  @Column({
    type: DataType.ENUM('pending', 'used', 'canceled'),
    allowNull: false,
  })
  declare status: BookingStatus;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW, // Set the default value to the current date and time
  })
  declare bookingDate: Date;

  @BelongsTo(() => UserModel, {
    foreignKey: 'userId',
    targetKey: 'userId',
  })
  declare user: UserModel;

  @BelongsTo(() => ScreeningModel, {
    foreignKey: 'screeningId',
    targetKey: 'screeningId',
  })
  declare screening: ScreeningModel;
}
