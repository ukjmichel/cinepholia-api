/**
 * @module models/screening.model.ts
 * @description Sequelize Model for Movie Screenings.
 *
 *
 * This file defines the `ScreeningModel` which represents a scheduled movie screening
 * at a specific theater hall with timing and pricing information.
 * It uses `sequelize-typescript` for entity declaration and relationship management.
 *
 * - Each screening has a unique auto-generated UUID identifier (`screeningId`).
 * - Each screening references a movie (`movieId`), theater (`theaterId`), and hall (`hallId`) via foreign keys.
 * - The `startTime` records the exact date and time of the screening.
 * - The `price` field stores ticket pricing with validation to ensure non-negative values.
 * - Price is stored as DECIMAL(10,2) for precise monetary calculations.
 * - Multiple foreign key relationships enable complex queries across movies, theaters, and halls.
 * - The relationships with MovieModel, MovieTheaterModel, MovieHallModel, BookingModel,
 *   and BookedSeatModel are defined in associations.ts to prevent circular dependencies.
 */

import {
  Table,
  Column,
  Model,
  PrimaryKey,
  DataType,
  Default,
  ForeignKey,
} from 'sequelize-typescript';
import { Optional } from 'sequelize';

import { MovieModel } from './movie.model.js';
import { MovieTheaterModel } from './movie-theater.model.js';
import { MovieHallModel } from './movie-hall.model.js';
import { BookingModel } from './booking.model.js';
import { BookedSeatModel } from './booked-seat.model.js';

/**
 * @interface ScreeningAttributes
 * @description Defines the complete structure of a screening record in the database
 *
 * @property {string} screeningId - Unique identifier for the screening (auto-generated UUID)
 * @property {string} movieId - Unique identifier of the movie being screened
 * @property {string} theaterId - Unique identifier of the theater hosting the screening
 * @property {string} hallId - Identifier of the specific hall within the theater
 * @property {Date} startTime - Date and time when the screening begins
 * @property {number} price - Ticket price for this screening (non-negative decimal)
 */
export interface ScreeningAttributes {
  screeningId: string;
  movieId: string;
  theaterId: string;
  hallId: string;
  startTime: Date;
  price: number;
}

/**
 * @interface ScreeningCreationAttributes
 * @description Attributes required for creating a new screening record
 * @extends {ScreeningAttributes}
 * @description Makes screeningId optional as it is auto-generated
 */
export interface ScreeningCreationAttributes
  extends Optional<ScreeningAttributes, 'screeningId'> {}

/**
 * @class ScreeningModel
 * @extends {Model<ScreeningAttributes, ScreeningCreationAttributes>}
 * @implements {ScreeningAttributes}
 * @description Sequelize model for managing movie screenings across theaters and halls
 *
 * This model serves as the central entity connecting movies, theaters, and halls with
 * specific showtimes and pricing. It enables comprehensive scheduling, booking management,
 * and revenue tracking across the cinema system.
 *
 * @example
 * // Creating a new screening
 * await ScreeningModel.create({
 *   movieId: 'movie-uuid',
 *   theaterId: 'theater-downtown',
 *   hallId: 'hall-1',
 *   startTime: new Date('2025-10-15T19:30:00'),
 *   price: 12.50
 * });
 *
 * @example
 * // Finding all screenings for a specific movie
 * const movieScreenings = await ScreeningModel.findAll({
 *   where: { movieId: 'movie-uuid' },
 *   include: [
 *     { model: MovieModel, as: 'movie' },
 *     { model: MovieTheaterModel, as: 'theater' },
 *     { model: MovieHallModel, as: 'hall' }
 *   ],
 *   order: [['startTime', 'ASC']]
 * });
 *
 * @example
 * // Finding today's screenings at a specific theater
 * const today = new Date();
 * today.setHours(0, 0, 0, 0);
 * const tomorrow = new Date(today);
 * tomorrow.setDate(tomorrow.getDate() + 1);
 *
 * const todayScreenings = await ScreeningModel.findAll({
 *   where: {
 *     theaterId: 'theater-downtown',
 *     startTime: {
 *       [Op.gte]: today,
 *       [Op.lt]: tomorrow
 *     }
 *   },
 *   include: [{ model: MovieModel, as: 'movie' }]
 * });
 *
 * @example
 * // Finding available screenings (with seat availability check)
 * const screening = await ScreeningModel.findOne({
 *   where: { screeningId: 'screening-uuid' },
 *   include: [
 *     { model: BookedSeatModel, as: 'bookedSeats' },
 *     { model: MovieHallModel, as: 'hall' }
 *   ]
 * });
 * const totalSeats = screening.hall.seatsLayout.flat().length;
 * const availableSeats = totalSeats - screening.bookedSeats.length;
 *
 * @example
 * // Updating screening price
 * await ScreeningModel.update(
 *   { price: 15.00 },
 *   { where: { screeningId: 'screening-uuid' } }
 * );
 *
 * @example
 * // Finding screenings by price range
 * const affordableScreenings = await ScreeningModel.findAll({
 *   where: {
 *     price: { [Op.lte]: 10.00 }
 *   },
 *   include: [{ model: MovieModel, as: 'movie' }]
 * });
 *
 * @example
 * // Finding upcoming screenings in a specific hall
 * const hallScreenings = await ScreeningModel.findAll({
 *   where: {
 *     theaterId: 'theater-downtown',
 *     hallId: 'hall-1',
 *     startTime: { [Op.gt]: new Date() }
 *   },
 *   order: [['startTime', 'ASC']],
 *   limit: 10
 * });
 */
@Table({ tableName: 'screenings', timestamps: true })
export class ScreeningModel
  extends Model<ScreeningAttributes, ScreeningCreationAttributes>
  implements ScreeningAttributes
{
  /**
   * @property {string} screeningId
   * @description Unique identifier for the screening (auto-generated UUIDv4)
   * @type {string}
   * @primary
   * @unique
   * @required
   * @default Auto-generated UUIDv4
   *
   * @example
   * '7c9e6679-7425-40de-944b-e07fc1f90ae7'
   */
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    unique: true,
  })
  declare screeningId: string;

  /**
   * @property {string} movieId
   * @description Movie identifier (foreign key to MovieModel)
   * @type {string}
   * @required
   * @foreignKey References MovieModel.movieId
   *
   * @example
   * '550e8400-e29b-41d4-a716-446655440000'
   */
  @ForeignKey(() => MovieModel)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  declare movieId: string;

  /**
   * @property {string} theaterId
   * @description Theater identifier (foreign key to MovieTheaterModel)
   * @type {string}
   * @required
   * @foreignKey References MovieTheaterModel.theaterId
   *
   * @example
   * 'theater-downtown'
   * 'cinema-westside'
   */
  @ForeignKey(() => MovieTheaterModel)
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare theaterId: string;

  /**
   * @property {string} hallId
   * @description Hall identifier (foreign key to MovieHallModel, part of composite key with theaterId)
   * @type {string}
   * @required
   * @foreignKey References MovieHallModel.hallId (combined with theaterId)
   *
   * @example
   * 'hall-1'
   * 'imax-hall'
   * 'premium-3'
   */
  @ForeignKey(() => MovieHallModel)
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare hallId: string;

  /**
   * @property {Date} startTime
   * @description Date and time when the screening begins
   * @type {Date}
   * @required
   *
   * @example
   * new Date('2025-10-15T19:30:00') // October 15, 2025 at 7:30 PM
   * new Date('2025-10-16T14:00:00') // October 16, 2025 at 2:00 PM (matinee)
   * new Date('2025-10-16T22:45:00') // October 16, 2025 at 10:45 PM (late show)
   */
  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  declare startTime: Date;

  /**
   * @property {number} price
   * @description Ticket price for this screening in the local currency
   * @type {number}
   * @required
   * @format DECIMAL(10, 2) for precise monetary values
   * @validate Must be non-negative (minimum: 0)
   *
   * @example
   * 12.50 // Standard ticket price
   * 8.00  // Matinee discount
   * 15.00 // Premium/IMAX screening
   * 25.50 // Special event or opening night
   * 0.00  // Free screening or promotional event
   *
   * @note Stored as DECIMAL(10,2) to prevent floating-point precision issues
   */
  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0,
    },
  })
  declare price: number;

  /**
   * @property {Date} createdAt
   * @description Timestamp when the screening record was created
   * @type {Date}
   * @readonly
   */
  declare readonly createdAt: Date;

  /**
   * @property {Date} updatedAt
   * @description Timestamp when the screening record was last updated
   * @type {Date}
   * @readonly
   */
  declare readonly updatedAt: Date;

  /**
   * ASSOCIATIONS - Defined in associations.ts
   * All relationships are centralized in associations.ts to prevent circular dependencies
   * and improve maintainability. Previously these were defined after the class with
   * post-class BelongsTo and HasMany decorators, but that approach caused issues.
   *
   * @property {MovieModel} movie
   * @description The movie being shown in this screening
   * @type {MovieModel}
   * @relation BelongsTo (defined in associations.ts)
   */
  declare movie: MovieModel;

  /**
   * @property {MovieTheaterModel} theater
   * @description The theater hosting this screening
   * @type {MovieTheaterModel}
   * @relation BelongsTo (defined in associations.ts)
   */
  declare theater: MovieTheaterModel;

  /**
   * @property {MovieHallModel} hall
   * @description The specific hall where this screening takes place
   * @type {MovieHallModel}
   * @relation BelongsTo (defined in associations.ts)
   */
  declare hall: MovieHallModel;

  /**
   * @property {BookingModel[]} bookings
   * @description All bookings made for this screening
   * @type {BookingModel[]}
   * @relation HasMany (defined in associations.ts)
   */
  declare bookings: BookingModel[];

  /**
   * @property {BookedSeatModel[]} bookedSeats
   * @description All seats that have been reserved for this screening
   * @type {BookedSeatModel[]}
   * @relation HasMany (defined in associations.ts)
   */
  declare bookedSeats: BookedSeatModel[];
}
