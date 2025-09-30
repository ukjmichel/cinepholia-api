/**
 * @module models/movie.model.ts
 * @description Sequelize Model for Movies in the Cinema Catalog.
 *
 *
 * This file defines the `MovieModel` which represents movies in the cinema application.
 * It manages the complete movie catalog with comprehensive metadata, technical information,
 * and an integrated recommendation system.
 * It uses `sequelize-typescript` for entity declaration and strict typing.
 *
 * - Each movie has a unique auto-generated UUID identifier (`movieId`).
 * - Comprehensive metadata management: title, description, director, genre.
 * - Age classification system with validation of standard international ratings.
 * - Release date validation (future dates are prohibited).
 * - Duration management with realistic constraints (1-1000 minutes).
 * - Optional poster support via URL with format validation.
 * - Integrated recommendation system (boolean field for highlighting featured movies).
 * - Length constraints tailored to business needs (descriptions up to 2000 characters).
 * - Automatic timestamp management (`createdAt`, `updatedAt`).
 * - The relationship with ScreeningModel is defined in associations.ts to prevent circular dependencies.
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
import { ScreeningModel } from './screening.model.js';

/**
 * @typedef {('G'|'PG'|'PG-13'|'R'|'NC-17'|'U'|'UA'|'A'|'Not Rated')} AgeRating
 * @description Enumeration of accepted international age rating standards
 * - G: General Audiences (all ages admitted)
 * - PG: Parental Guidance Suggested
 * - PG-13: Parents Strongly Cautioned (children under 13)
 * - R: Restricted (under 17 requires parent/guardian)
 * - NC-17: Adults Only (no one 17 and under admitted)
 * - U: Universal (UK rating)
 * - UA: Parental Guidance (India rating)
 * - A: Adults Only (India rating)
 * - Not Rated: No rating assigned
 */
export type AgeRating =
  | 'G'
  | 'PG'
  | 'PG-13'
  | 'R'
  | 'NC-17'
  | 'U'
  | 'UA'
  | 'A'
  | 'Not Rated';

/**
 * @interface MovieAttributes
 * @description Defines the complete structure of a movie record in the database
 *
 * @property {string} movieId - Unique identifier for the movie (auto-generated UUID)
 * @property {string} title - Movie title (1-255 characters)
 * @property {string} description - Movie synopsis or description (1-2000 characters)
 * @property {string} ageRating - Age classification/rating (international standards)
 * @property {string} genre - Movie genre for categorization and filtering
 * @property {Date} releaseDate - Official release date (cannot be in the future)
 * @property {string} director - Name of the main director
 * @property {number} durationMinutes - Movie duration in minutes (1-1000)
 * @property {string} [posterUrl] - Optional URL to the movie poster image
 * @property {boolean} [recommended] - Recommendation flag for highlighting featured movies
 */
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
  recommended?: boolean;
}

/**
 * @interface MovieCreationAttributes
 * @description Attributes required for creating a new movie record
 * @extends {MovieAttributes}
 * @description Makes movieId optional as it is auto-generated
 */
export interface MovieCreationAttributes
  extends Optional<MovieAttributes, 'movieId'> {}

/**
 * @class MovieModel
 * @extends {Model<MovieAttributes, MovieCreationAttributes>}
 * @implements {MovieAttributes}
 * @description Sequelize model for managing the cinema's movie catalog
 *
 * This model provides comprehensive management of movie information including metadata,
 * classification, technical details, and a recommendation system. All validation rules
 * ensure data consistency and support international standards.
 *
 * @example
 * // Creating a new movie
 * await MovieModel.create({
 *   title: 'The Shawshank Redemption',
 *   description: 'Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.',
 *   ageRating: 'R',
 *   genre: 'Drama',
 *   releaseDate: new Date('1994-09-23'),
 *   director: 'Frank Darabont',
 *   durationMinutes: 142,
 *   posterUrl: 'https://example.com/posters/shawshank.jpg',
 *   recommended: true
 * });
 *
 * @example
 * // Finding all recommended movies
 * const recommendedMovies = await MovieModel.findAll({
 *   where: { recommended: true },
 *   order: [['releaseDate', 'DESC']]
 * });
 *
 * @example
 * // Searching movies by genre
 * const actionMovies = await MovieModel.findAll({
 *   where: { genre: 'Action' },
 *   include: [{ model: ScreeningModel, as: 'screenings' }]
 * });
 *
 * @example
 * // Finding movies by director
 * const directorMovies = await MovieModel.findAll({
 *   where: { director: 'Christopher Nolan' },
 *   order: [['releaseDate', 'DESC']]
 * });
 *
 * @example
 * // Updating movie recommendation status
 * await MovieModel.update(
 *   { recommended: true },
 *   { where: { movieId: 'movie-uuid' } }
 * );
 *
 * @example
 * // Finding movies suitable for children (G or PG rating)
 * const familyMovies = await MovieModel.findAll({
 *   where: {
 *     ageRating: ['G', 'PG']
 *   }
 * });
 *
 * @example
 * // Finding recent movies (released in the last 30 days)
 * const thirtyDaysAgo = new Date();
 * thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
 * const recentMovies = await MovieModel.findAll({
 *   where: {
 *     releaseDate: { [Op.gte]: thirtyDaysAgo }
 *   },
 *   order: [['releaseDate', 'DESC']]
 * });
 */
@Table({ tableName: 'movies', timestamps: true })
export class MovieModel
  extends Model<MovieAttributes, MovieCreationAttributes>
  implements MovieAttributes
{
  /**
   * @property {string} movieId
   * @description Unique identifier for the movie (auto-generated UUIDv4)
   * @type {string}
   * @primary
   * @unique
   * @required
   * @default Auto-generated UUIDv4
   * @validate Must be a valid UUID version 4
   *
   * @example
   * '550e8400-e29b-41d4-a716-446655440000'
   */
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

  /**
   * @property {string} title
   * @description Movie title
   * @type {string}
   * @required
   * @minLength 1
   * @maxLength 255
   * @validate Must not be empty and be between 1-255 characters
   *
   * @example
   * 'The Shawshank Redemption'
   * 'Inception'
   * 'The Lord of the Rings: The Return of the King'
   */
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

  /**
   * @property {string} description
   * @description Movie synopsis or detailed description
   * @type {string}
   * @required
   * @minLength 1
   * @maxLength 2000
   * @validate Must not be empty and be between 1-2000 characters
   *
   * @example
   * 'Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.'
   * 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a CEO.'
   */
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

  /**
   * @property {AgeRating} ageRating
   * @description Age classification using international rating standards
   * @type {AgeRating}
   * @required
   * @enum ['G', 'PG', 'PG-13', 'R', 'NC-17', 'U', 'UA', 'A', 'Not Rated']
   * @validate Must be one of the accepted rating standards
   *
   * @example
   * 'PG-13' // USA rating
   * 'R' // USA restricted
   * 'U' // UK universal
   * 'UA' // India parental guidance
   */
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

  /**
   * @property {string} genre
   * @description Movie genre for categorization and filtering
   * @type {string}
   * @required
   * @minLength 1
   * @maxLength 100
   * @validate Must not be empty and be between 1-100 characters
   *
   * @example
   * 'Drama'
   * 'Action'
   * 'Science Fiction'
   * 'Horror/Thriller'
   * 'Romantic Comedy'
   */
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

  /**
   * @property {Date} releaseDate
   * @description Official release date of the movie
   * @type {Date}
   * @required
   * @validate Must be a valid date (future dates are prohibited by business logic)
   *
   * @example
   * new Date('1994-09-23') // The Shawshank Redemption
   * new Date('2010-07-16') // Inception
   * new Date('2003-12-17') // The Return of the King
   */
  @Column({
    type: DataType.DATE,
    allowNull: false,
    validate: {
      isDate: true,
    },
  })
  declare releaseDate: Date;

  /**
   * @property {string} director
   * @description Name of the main director
   * @type {string}
   * @required
   * @minLength 1
   * @maxLength 255
   * @validate Must not be empty and be between 1-255 characters
   *
   * @example
   * 'Frank Darabont'
   * 'Christopher Nolan'
   * 'Peter Jackson'
   * 'Quentin Tarantino'
   */
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

  /**
   * @property {number} durationMinutes
   * @description Duration of the movie in minutes
   * @type {number}
   * @required
   * @min 1
   * @max 1000
   * @validate Must be an integer between 1 and 1000 minutes
   *
   * @example
   * 142 // The Shawshank Redemption (2h 22m)
   * 148 // Inception (2h 28m)
   * 201 // The Return of the King (3h 21m)
   * 90 // Typical short film
   */
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

  /**
   * @property {string} posterUrl
   * @description URL to the movie poster image (optional)
   * @type {string}
   * @optional
   * @maxLength 500
   * @validate Must be a valid HTTP/HTTPS URL if provided
   *
   * @example
   * 'https://example.com/posters/shawshank.jpg'
   * 'https://cdn.moviedb.com/images/inception-poster.png'
   * 'https://images.cinema.com/lotr-rotk.webp'
   *
   * @note Must start with http:// or https://
   */
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

  /**
   * @property {boolean} recommended
   * @description Recommendation flag for highlighting featured or promoted movies
   * @type {boolean}
   * @required
   * @default false
   *
   * @example
   * true // Movie is recommended/featured
   * false // Movie is not highlighted
   *
   * @note Useful for homepage features, "Editor's Choice", or promotional campaigns
   */
  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  declare recommended: boolean;

  /**
   * @property {Date} createdAt
   * @description Timestamp when the movie record was created
   * @type {Date}
   * @readonly
   */
  declare readonly createdAt: Date;

  /**
   * @property {Date} updatedAt
   * @description Timestamp when the movie record was last updated
   * @type {Date}
   * @readonly
   */
  declare readonly updatedAt: Date;

  /**
   * ASSOCIATIONS - Defined in associations.ts
   * All relationships are centralized in associations.ts to prevent circular dependencies
   * and improve maintainability
   *
   * @property {ScreeningModel[]} screenings
   * @description All screenings of this movie across all theaters and halls
   * @type {ScreeningModel[]}
   * @relation HasMany (defined in associations.ts)
   */
  declare screenings: ScreeningModel[];
}
