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
import { MovieHallModel } from './movie-hall.model.js';

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
    type: DataType.UUID,
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

  @BelongsTo(() => MovieHallModel, {
    foreignKey: 'hallId',
    targetKey: 'hallId',
  })
  declare hall: MovieHallModel;

  // (optional) For TypeScript typing support for timestamps:
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}
