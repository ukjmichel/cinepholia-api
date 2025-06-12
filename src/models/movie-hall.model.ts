/**
 * Sequelize Model for Movie Theater Hall (MovieHallModel).
 *
 * This file defines the structure and validations for a hall in a movie theater.
 * It relies on sequelize-typescript for typing and managing relationships between entities.
 *
 * Key Points:
 *  - A hall is identified by a composite primary key: theaterId + hallId.
 *  - theaterId: identifier of the cinema, with format and length validation.
 *  - hallId: identifier specific to the hall within the cinema, also validated.
 *  - seatsLayout: structure of the seats (hall layout), stored in JSON.
 *      * Validates that the layout is a non-empty 2D array, with each "seat" being a non-empty string or a positive number.
 *  - BelongsTo relationship with MovieTheaterModel (each hall belongs to a cinema).
 *      * Cascade deletion and updates on the associated cinema.
 *  - The HasMany association with ScreeningModel (a hall can host multiple screenings)
 *    is declared **outside the class** to avoid circular imports.
 *  - The generated SQL table is named 'movie_halls' and has automatic timestamps.
 *
 * Uses:
 *  - Manage the seat layout, reservations per hall, dynamic display of availability.
 *  - Associate each hall with a cinema and its screenings.
 */

import {
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
  HasMany,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { MovieTheaterModel } from './movie-theater.model.js';

// Structure of a movie theater hall
export interface MovieHallAttributes {
  theaterId: string; // Cinema identifier
  hallId: string; // Hall identifier
  seatsLayout: (string | number)[][]; // Seat layout (2D)
}

// Definition of the hall model
@Table({ tableName: 'movie_halls', timestamps: true })
export class MovieHallModel
  extends Model<MovieHallAttributes>
  implements MovieHallAttributes
{
  // Primary key and foreign key to the cinema
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

  // Primary key specific to the hall
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

  // Seat layout, stored in JSON format
  @Column({
    type: DataType.JSON,
    allowNull: false,
    validate: {
      isValidLayout(value: unknown) {
        // Custom validation: non-empty 2D array of strings or numbers >= 0
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

  // Association: the hall belongs to a cinema
  @BelongsTo(() => MovieTheaterModel, {
    foreignKey: 'theaterId',
    targetKey: 'theaterId',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  declare theater: MovieTheaterModel;
}

// -------------------------------------------------------------------------
// HasMany association declared outside the class to avoid circular imports
import { ScreeningModel } from './screening.model.js';

// A hall can host multiple screenings
HasMany(() => ScreeningModel)(MovieHallModel.prototype, 'screenings');
