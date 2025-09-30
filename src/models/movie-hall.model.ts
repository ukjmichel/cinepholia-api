/**
 * @module models/movie-hall.model.ts
 * @description Sequelize Model for Movie Theater Halls.
 *
 *
 * This file defines the `MovieHallModel` which represents a cinema hall inside a movie theater,
 * including its seat layout and projection quality.
 * It uses `sequelize-typescript` for entity declaration and relationship management.
 *
 * - Uses a composite primary key: `theaterId` + `hallId` to uniquely identify each hall.
 * - The `seatsLayout` stores a 2D array representing rows and seats (strings or numbers).
 * - The `quality` field defines the projection type (2D, 3D, IMAX, 4DX).
 * - Each hall belongs to a movie theater via foreign key (`theaterId`).
 * - Custom validators ensure data integrity for IDs and seat layout structure.
 * - The relationships with MovieTheaterModel, ScreeningModel, and IncidentReportModel
 *   are defined in associations.ts to prevent circular dependencies.
 */

import {
  Table,
  Column,
  Model,
  PrimaryKey,
  DataType,
  ForeignKey,
} from 'sequelize-typescript';

import { MovieTheaterModel } from './movie-theater.model.js';
import { ScreeningModel } from './screening.model.js';
import {
  MovieHallAttributes,
  MovieHallCreationAttributes,
} from '../interfaces/movie-hall.js';

/**
 * @typedef {('2D'|'3D'|'IMAX'|'4DX')} HallQuality
 * @description Enumeration of available projection quality types for cinema halls
 */
export type HallQuality = '2D' | '3D' | 'IMAX' | '4DX';

/**
 * @class MovieHallModel
 * @extends {Model<MovieHallAttributes, MovieHallCreationAttributes>}
 * @implements {MovieHallAttributes}
 * @description Sequelize model for managing movie theater halls and their configurations
 *
 * This model uses a composite primary key (theaterId + hallId) to ensure each hall
 * is uniquely identified within its parent theater. The seat layout is stored as
 * a flexible 2D array structure that can accommodate various seating arrangements.
 *
 * @example
 * // Creating a new movie hall with seat layout
 * await MovieHallModel.create({
 *   theaterId: 'theater-123',
 *   hallId: 'hall-1',
 *   seatsLayout: [
 *     ['A1', 'A2', 'A3', 'A4', 'A5'],
 *     ['B1', 'B2', 'B3', 'B4', 'B5'],
 *     ['C1', 'C2', 'C3', 'C4', 'C5']
 *   ],
 *   quality: 'IMAX'
 * });
 *
 * @example
 * // Finding all halls in a specific theater
 * const halls = await MovieHallModel.findAll({
 *   where: { theaterId: 'theater-123' },
 *   include: [{ model: MovieTheaterModel, as: 'theater' }]
 * });
 *
 * @example
 * // Finding a specific hall by composite key
 * const hall = await MovieHallModel.findOne({
 *   where: {
 *     theaterId: 'theater-123',
 *     hallId: 'hall-1'
 *   }
 * });
 *
 * @example
 * // Updating hall quality
 * await MovieHallModel.update(
 *   { quality: '3D' },
 *   {
 *     where: {
 *       theaterId: 'theater-123',
 *       hallId: 'hall-1'
 *     }
 *   }
 * );
 *
 * @example
 * // Finding all IMAX halls across all theaters
 * const imaxHalls = await MovieHallModel.findAll({
 *   where: { quality: 'IMAX' },
 *   include: [{ model: MovieTheaterModel, as: 'theater' }]
 * });
 */
@Table({ tableName: 'movie_halls', timestamps: true })
export class MovieHallModel
  extends Model<MovieHallAttributes, MovieHallCreationAttributes>
  implements MovieHallAttributes
{
  /**
   * @property {string} theaterId
   * @description Theater identifier (composite primary key and foreign key to MovieTheaterModel)
   * @type {string}
   * @primary
   * @required
   * @minLength 2
   * @maxLength 36
   * @pattern Alphanumeric characters, underscores, and hyphens only
   * @validate Must be 2-36 characters and contain only letters, numbers, underscores, or hyphens
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
   * @property {string} hallId
   * @description Hall identifier unique within the theater (composite primary key)
   * @type {string}
   * @primary
   * @required
   * @minLength 1
   * @maxLength 16
   * @pattern Alphanumeric characters, underscores, and hyphens only
   * @validate Must be 1-16 characters and contain only letters, numbers, underscores, or hyphens
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
   * @property {(string|number)[][]} seatsLayout
   * @description 2D array representing the hall's seat layout
   * @type {(string|number)[][]}
   * @required
   * @format JSON array of arrays
   * @validate Must be a 2D array with non-empty rows; each seat must be a non-empty string or non-negative number
   *
   * @example
   * // String-based seat identifiers
   * [
   *   ['A1', 'A2', 'A3'],
   *   ['B1', 'B2', 'B3']
   * ]
   *
   * @example
   * // Numeric seat identifiers
   * [
   *   [1, 2, 3],
   *   [4, 5, 6]
   * ]
   *
   * @example
   * // Mixed layout (strings and numbers)
   * [
   *   ['A1', 'A2', 0],  // 0 could represent an aisle or empty space
   *   ['B1', 'B2', 'B3']
   * ]
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
   * @property {HallQuality} quality
   * @description Projection quality and technology available in the hall
   * @type {HallQuality}
   * @required
   * @default '2D'
   * @enum ['2D', '3D', 'IMAX', '4DX']
   */
  @Column({
    type: DataType.ENUM('2D', '3D', 'IMAX', '4DX'),
    allowNull: false,
    defaultValue: '2D',
  })
  declare quality: HallQuality;

  /**
   * @property {Date} createdAt
   * @description Timestamp when the hall record was created
   * @type {Date}
   * @readonly
   */
  declare readonly createdAt: Date;

  /**
   * @property {Date} updatedAt
   * @description Timestamp when the hall record was last updated
   * @type {Date}
   * @readonly
   */
  declare readonly updatedAt: Date;

  /**
   * All associations are now defined in associations.ts
   * This centralizes all relationships and prevents circular dependency issues
   *
   * @property {MovieTheaterModel} theater
   * @description Associated movie theater that contains this hall
   * @type {MovieTheaterModel}
   * @relation BelongsTo (defined in associations.ts)
   */
  declare theater: MovieTheaterModel;

  /**
   * @property {ScreeningModel[]} screenings
   * @description All movie screenings scheduled in this hall
   * @type {ScreeningModel[]}
   * @relation HasMany (defined in associations.ts)
   */
  declare screenings: ScreeningModel[];
}
