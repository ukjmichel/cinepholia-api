/**
 * Sequelize Model for Movie Screenings (Screening).
 *
 * This file defines a relational database model for managing information
 * related to movie screenings in a cinema, using Sequelize as the ORM.
 * The model includes fields for the basic details of a screening, as well as associations
 * with the movie, cinema, and movie hall models.
 *
 * Key Points:
 * - `screeningId`: Unique identifier for the screening, automatically generated as a UUID.
 * - `movieId`: Identifier for the movie being screened, serving as a foreign key for association with the movie model.
 * - `theaterId`: Identifier for the cinema where the screening takes place, serving as a foreign key for association with the cinema model.
 * - `hallId`: Identifier for the cinema hall where the screening takes place, serving as a foreign key for association with the cinema hall model.
 * - `startTime`: Date and time when the screening starts.
 * - `price`: Price of the ticket for the screening, validated to ensure it is not negative.
 * - `quality`: Quality of the screening, validated to ensure it is among a list of allowed values.
 *
 * The model is designed for use with SQL databases and includes timestamps
 * to automatically track the creation and update dates of records.
 */

import {
  Table,
  Column,
  Model,
  PrimaryKey,
  DataType,
  Default,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { Optional } from 'sequelize';

import { MovieModel } from './movie.model.js';
import { MovieTheaterModel } from './movie-theater.model.js';

export interface ScreeningAttributes {
  screeningId: string;
  movieId: string;
  theaterId: string;
  hallId: string;
  startTime: Date;
  price: number;
  quality: string;
}

export interface ScreeningCreationAttributes
  extends Optional<ScreeningAttributes, 'screeningId'> {}

@Table({ tableName: 'screenings', timestamps: true })
export class ScreeningModel
  extends Model<ScreeningAttributes, ScreeningCreationAttributes>
  implements ScreeningAttributes
{
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    unique: true,
  })
  declare screeningId: string;

  @ForeignKey(() => MovieModel)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  declare movieId: string;

  @ForeignKey(() => MovieTheaterModel)
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare theaterId: string;

  @ForeignKey(() => MovieHallModel)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  declare hallId: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  declare startTime: Date;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0,
    },
  })
  declare price: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    validate: {
      isIn: [['2D', '3D', 'IMAX', '4DX', 'Dolby']],
    },
  })
  declare quality: string;

  // Non-circular associations: defined within the class
  @BelongsTo(() => MovieModel, {
    foreignKey: 'movieId',
    targetKey: 'movieId',
  })
  declare movie: MovieModel;

  @BelongsTo(() => MovieTheaterModel, {
    foreignKey: 'theaterId',
    targetKey: 'theaterId',
  })
  declare theater: MovieTheaterModel;

  declare hall: MovieHallModel;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

// Circular association: defined after the class to avoid circular references
import { MovieHallModel } from './movie-hall.model.js';
BelongsTo(() => MovieHallModel, {
  foreignKey: 'hallId',
  targetKey: 'hallId',
})(ScreeningModel.prototype, 'hall');
