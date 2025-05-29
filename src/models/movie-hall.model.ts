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

export interface MovieHallAttributes {
  theaterId: string;
  hallId: string;
  seatsLayout: (string | number)[][];
}

@Table({ tableName: 'movie_halls', timestamps: true })
export class MovieHallModel
  extends Model<MovieHallAttributes>
  implements MovieHallAttributes
{
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

  // Associations non circulaires
  @BelongsTo(() => MovieTheaterModel, {
    foreignKey: 'theaterId',
    targetKey: 'theaterId',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  declare theater: MovieTheaterModel;
}

// -------------- ASSOCIATION CIRCULAIRE EN DEHORS DE LA CLASSE --------------
// On ajoute l'association après coup pour casser la boucle d'import
import { ScreeningModel } from './screening.model.js';

HasMany(() => ScreeningModel)(MovieHallModel.prototype, 'screenings');
