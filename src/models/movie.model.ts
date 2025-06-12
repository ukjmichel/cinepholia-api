/**
 * Sequelize Model for Movies (MovieModel).
 *
 * This file defines the data model for movies in the cinema application.
 * It manages the complete catalog of movies with their metadata,
 * technical information, and integrated recommendation system.
 * Implementation done with sequelize-typescript for strict typing and comprehensive
 * validation of movie data.
 *
 * Main Features:
 *  - Each movie has a unique auto-generated UUID identifier.
 *  - Comprehensive management of metadata: title, description, director, genre.
 *  - Age classification system with validation of standard international ratings.
 *  - Validation of release dates (future dates are prohibited).
 *  - Duration management with realistic constraints (1-1000 minutes).
 *  - Optional support for posters via URL with format validation.
 *  - Integrated recommendation system (boolean field recommended).
 *  - Length constraints tailored to business needs (descriptions up to 2000 characters).
 *  - Timestamps (createdAt, updatedAt) are automatically added thanks to the timestamps option.
 *
 * Associated Interfaces:
 *   - MovieAttributes: complete structure of a movie in the database.
 *   - MovieCreationAttributes: optional fields during creation (auto-generated movieId).
 *
 * Uses:
 *   - Management of the cinema's movie catalog.
 *   - Search and filtering by genre, director, classification.
 *   - Recommendation system for users.
 *   - Basis for relationships with screenings and projections.
 *   - Display of detailed movie information.
 */

import {
  Table,
  Column,
  Model,
  PrimaryKey,
  DataType,
  Default,
} from 'sequelize-typescript';
import { Optional } from 'sequelize';

// Complete structure of a movie
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
  recommended?: boolean; // Recommendation field for highlighting
}

// Optional fields during creation (auto-generated movieId)
export interface MovieCreationAttributes
  extends Optional<MovieAttributes, 'movieId'> {}

// Definition of the MovieModel
@Table({ tableName: 'movies', timestamps: true })
export class MovieModel
  extends Model<MovieAttributes, MovieCreationAttributes>
  implements MovieAttributes
{
  // Unique identifier for the movie (auto-generated UUID, primary key)
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

  // Movie title (required, up to 255 characters)
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

  // Movie description/synopsis (long text up to 2000 characters)
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

  // Age rating (accepted international standards)
  @Column({
    type: DataType.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Age rating is required' },
      isIn: {
        args: [['G', 'PG', 'PG-13', 'R', 'NC-17', 'U', 'UA', 'A', 'Not Rated']],
        msg: 'Age rating must be a valid rating (e.g., G, PG, R, etc.)',
      },
    },
  })
  declare ageRating: string;

  // Movie genre (categorization for filtering and search)
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

  // Release date (validation: no future dates)
  @Column({
    type: DataType.DATE,
    allowNull: false,
    validate: {
      isDate: true, // Date format validation
      isValidReleaseDate(value: Date) {
        if (value > new Date()) {
          throw new Error('Release date cannot be in the future');
        }
      },
    },
  })
  declare releaseDate: Date;

  // Name of the main director
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

  // Duration of the movie in minutes (realistic constraints)
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

  // URL of the movie poster (optional, URL validation)
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

  // Recommendation marker for highlighting (default: false)
  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  declare recommended: boolean;

  // Automatic timestamps (creation and update)
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}
