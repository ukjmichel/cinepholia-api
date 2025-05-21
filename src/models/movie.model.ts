import {
  Table,
  Column,
  Model,
  PrimaryKey,
  DataType,
  Default,
} from 'sequelize-typescript';
import { Optional } from 'sequelize';

export interface MovieAttributes {
  movieId: string;
  title: string;
  description: string;
  ageRating: string;
  genre: string;
  releaseDate: Date;
  director: string;
  durationMinutes: number;
  posterUrl?: string;
  recommended?: boolean; // <-- New field
}

export interface MovieCreationAttributes
  extends Optional<MovieAttributes, 'movieId'> {}

@Table({ tableName: 'movies', timestamps: true })
export class MovieModel
  extends Model<MovieAttributes, MovieCreationAttributes>
  implements MovieAttributes
{
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    unique: true,
    validate: {
      isUUID: 4,
    },
  })
  declare movieId: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Title is required' },
      len: {
        args: [1, 255],
        msg: 'Title must be between 1 and 255 characters',
      },
    },
  })
  declare title: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Description is required' },
      len: {
        args: [1, 2000],
        msg: 'Description must be between 1 and 2000 characters',
      },
    },
  })
  declare description: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Age rating is required' },
      isIn: {
        args: [['G', 'PG', 'PG-13', 'R', 'NC-17', 'U', 'UA', 'A', 'Not Rated']],
        msg: 'Age rating must be a valid rating (e.g. G, PG, R, etc.)',
      },
    },
  })
  declare ageRating: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Genre is required' },
      len: {
        args: [1, 100],
        msg: 'Genre must be between 1 and 100 characters',
      },
    },
  })
  declare genre: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    validate: {
      isDate: true, // Must be just "true" with sequelize-typescript
      isValidReleaseDate(value: Date) {
        if (value > new Date()) {
          throw new Error('Release date cannot be in the future');
        }
      },
    },
  })
  declare releaseDate: Date;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Director is required' },
      len: {
        args: [1, 255],
        msg: 'Director must be between 1 and 255 characters',
      },
    },
  })
  declare director: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    validate: {
      min: { args: [1], msg: 'Duration must be at least 1 minute' },
      max: { args: [1000], msg: 'Duration cannot exceed 1000 minutes' },
      isInt: { msg: 'Duration must be an integer value in minutes' },
    },
  })
  declare durationMinutes: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    validate: {
      isUrlOrEmpty(value: string | null) {
        if (value && typeof value === 'string' && value.length > 0) {
          const urlRegex = /^(https?:\/\/)[^\s$.?#].[^\s]*$/gm;
          if (!urlRegex.test(value)) {
            throw new Error('Poster URL must be a valid URL');
          }
        }
      },
      len: {
        args: [0, 500],
        msg: 'Poster URL must be less than 500 characters',
      },
    },
  })
  declare posterUrl?: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  declare recommended: boolean;
}
