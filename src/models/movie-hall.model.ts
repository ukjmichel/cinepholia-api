/**
 * Sequelize Model for Movie Theater Hall (MovieHallModel).
 *
 * This model represents a cinema hall inside a movie theater, including layout and projection quality.
 *
 * Key Features:
 * - Composite primary key: theaterId + hallId
 * - seatsLayout: 2D array of seats (strings or numbers)
 * - quality: Type of projection (2D, 3D, IMAX, 4DX)
 * - BelongsTo: MovieTheaterModel
 * - HasMany: ScreeningModel (declared after class to avoid circular dependency)
 */

import {
  Table,
  Column,
  Model,
  PrimaryKey,
  DataType,
  ForeignKey,
  BelongsTo,
  HasMany,
} from 'sequelize-typescript';

/**
 * ⚠️ Important:
 * These imports are placed early to prevent circular dependency and temporal dead zone (TDZ) issues.
 * When decorators like @BelongsTo or @HasMany reference another model, that model must already be initialized.
 */
import { MovieTheaterModel } from './movie-theater.model.js';
import { ScreeningModel } from './screening.model.js';

/**
 * MovieHall attributes interface.
 */
export interface MovieHallAttributes {
  theaterId: string;
  hallId: string;
  seatsLayout: (string | number)[][];
  quality: '2D' | '3D' | 'IMAX' | '4DX';
}

/**
 * Sequelize model definition for movie_halls table.
 */
@Table({ tableName: 'movie_halls', timestamps: true })
export class MovieHallModel
  extends Model<MovieHallAttributes>
  implements MovieHallAttributes
{
  /**
   * Foreign key and part of the composite primary key.
   * Identifies the movie theater to which this hall belongs.
   */
  @PrimaryKey
  @ForeignKey(() => MovieTheaterModel)
  @Column({
    type: DataType.STRING,
    allowNull: false,
    validate: {
      len: {
        args: [2, 36],
        msg: 'theaterId must be between 2 and 36 characters',
      },
      is: {
        args: /^[a-zA-Z0-9_-]+$/,
        msg: 'theaterId must contain only letters, numbers, underscores, or hyphens',
      },
    },
  })
  declare theaterId: string;

  /**
   * Hall identifier (unique per theater)
   */
  @PrimaryKey
  @Column({
    type: DataType.STRING,
    allowNull: false,
    validate: {
      len: {
        args: [1, 16],
        msg: 'hallId must be between 1 and 16 characters',
      },
      is: {
        args: /^[a-zA-Z0-9_-]+$/,
        msg: 'hallId must contain only letters, numbers, underscores, or hyphens',
      },
    },
  })
  declare hallId: string;

  /**
   * Seat layout of the hall, stored as a 2D array of seat identifiers or numbers.
   */
  @Column({
    type: DataType.JSON,
    allowNull: false,
    validate: {
      isValidLayout(value: unknown) {
        if (
          !Array.isArray(value) ||
          value.length === 0 ||
          !value.every(
            (row) =>
              Array.isArray(row) &&
              row.length > 0 &&
              row.every(
                (seat) =>
                  (typeof seat === 'string' && seat.length > 0) ||
                  (typeof seat === 'number' &&
                    Number.isFinite(seat) &&
                    seat >= 0)
              )
          )
        ) {
          throw new Error(
            'seatsLayout must be a 2D array of non-empty rows, each seat a non-empty string or a non-negative number'
          );
        }
      },
    },
  })
  declare seatsLayout: (string | number)[][];

  /**
   * Projection quality of the hall (e.g. 2D, 3D, IMAX, 4DX).
   */
  @Column({
    type: DataType.ENUM('2D', '3D', 'IMAX', '4DX'),
    allowNull: false,
    defaultValue: '2D',
  })
  declare quality: '2D' | '3D' | 'IMAX' | '4DX';

  /**
   * Association: The hall belongs to a movie theater.
   */
  @BelongsTo(() => MovieTheaterModel, {
    foreignKey: 'theaterId',
    targetKey: 'theaterId',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  declare theater: MovieTheaterModel;

  /**
   * Association: The hall has many screenings (defined outside the class for circular safety).
   */
  @HasMany(() => ScreeningModel)
  declare screenings: ScreeningModel[];
}
