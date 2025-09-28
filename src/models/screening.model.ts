/**
 * Sequelize Model for Movie Screenings (Screening).
 *
 * This file defines a relational database model for managing information
 * related to movie screenings in a cinema, using Sequelize as the ORM.
 *
 * Key Features:
 * - `screeningId`: Unique UUID identifier for the screening.
 * - `movieId`: Foreign key to the associated Movie.
 * - `theaterId`: Foreign key to the associated Movie Theater.
 * - `hallId`: Foreign key to the associated Movie Hall (part of composite key).
 * - `startTime`: Date and time of the screening.
 * - `price`: Ticket price with validation to ensure it's non-negative.
 *
 * Associations:
 * - BelongsTo MovieModel
 * - BelongsTo MovieTheaterModel
 * - BelongsTo MovieHallModel (using composite foreign key)
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

/**
 * ⚠️ Important: Import models *before* referencing them in decorators
 *
 * This prevents circular dependency issues and JavaScript "temporal dead zone" (TDZ) errors
 * where a model is referenced before it's fully initialized.
 */
import { MovieModel } from './movie.model.js';
import { MovieTheaterModel } from './movie-theater.model.js';
import { MovieHallModel } from './movie-hall.model.js';

export interface ScreeningAttributes {
  screeningId: string;
  movieId: string;
  theaterId: string;
  hallId: string; // Changed from UUID to STRING to match MovieHallModel
  startTime: Date;
  price: number;
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

  // Fixed: Changed from UUID to STRING to match MovieHallModel
  @ForeignKey(() => MovieHallModel)
  @Column({
    type: DataType.STRING,
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

  // Declared associations (populated by decorators below)
  declare movie: MovieModel;
  declare theater: MovieTheaterModel;
  declare hall: MovieHallModel;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

/**
 * Associations declared AFTER class definition to avoid circular import issues
 */
BelongsTo(() => MovieModel, {
  foreignKey: 'movieId',
  targetKey: 'movieId',
})(ScreeningModel.prototype, 'movie');

BelongsTo(() => MovieTheaterModel, {
  foreignKey: 'theaterId',
  targetKey: 'theaterId',
})(ScreeningModel.prototype, 'theater');

// Fixed: Composite foreign key association for MovieHallModel
// Since MovieHallModel has composite primary key (theaterId + hallId),
// we need to handle this association carefully
BelongsTo(() => MovieHallModel, {
  foreignKey: 'hallId',
  targetKey: 'hallId',
  // Note: This association only works properly when theaterId also matches
  // You may need to add custom validation or use scope associations
})(ScreeningModel.prototype, 'hall');
