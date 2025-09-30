/**
 * @module models/movie-theater.model.ts
 * @description Sequelize Model for Movie Theater Establishments.
 *
 *
 * This file defines the `MovieTheaterModel` which represents a movie theater establishment
 * in the cinema application. It manages comprehensive information including identification,
 * location, and contact details with robust validation.
 * It uses `sequelize-typescript` for entity declaration and strict typing.
 *
 * - Each theater has a unique, customizable identifier (`theaterId`) as primary key.
 * - Comprehensive address management with international support (postal codes, cities with accents).
 * - Strict validation for contact information (phone numbers, email addresses).
 * - Support for international characters in city names (accents, apostrophes, hyphens).
 * - Length and format constraints ensure data consistency and integrity.
 * - Automatic timestamp management (`createdAt`, `updatedAt`).
 * - The relationships with MovieHallModel, ScreeningModel, and IncidentReportModel
 *   are defined in associations.ts to prevent circular dependencies.
 */

import {
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { MovieHallModel } from './movie-hall.model.js';
import { ScreeningModel } from './screening.model.js';

/**
 * @interface MovieTheaterAttributes
 * @description Defines the complete structure of a movie theater establishment record
 *
 * @property {string} theaterId - Unique identifier for the movie theater (customizable)
 * @property {string} name - Human-readable name of the theater establishment
 * @property {string} address - Full street address (street name, number, etc.)
 * @property {string} postalCode - Postal/ZIP code (4-10 digits, international format)
 * @property {string} city - City name (supports international characters)
 * @property {string} phone - Contact phone number (international format accepted)
 * @property {string} email - Contact email address for the theater
 */
export interface MovieTheaterAttributes {
  theaterId: string;
  name: string;
  address: string;
  postalCode: string;
  city: string;
  phone: string;
  email: string;
}

/**
 * @class MovieTheaterModel
 * @extends {Model<MovieTheaterAttributes, MovieTheaterAttributes>}
 * @implements {MovieTheaterAttributes}
 * @description Sequelize model for managing movie theater establishments
 *
 * This model provides comprehensive management of theater establishments including
 * location data, contact information, and relationships with halls and screenings.
 * All validation rules ensure data consistency and support international formats.
 *
 * @example
 * // Creating a new movie theater
 * await MovieTheaterModel.create({
 *   theaterId: 'theater-downtown',
 *   name: 'Cinema Paradiso',
 *   address: '123 Main Street',
 *   postalCode: '75001',
 *   city: 'Paris',
 *   phone: '+33 1 42 86 57 50',
 *   email: 'contact@cinema-paradiso.fr'
 * });
 *
 * @example
 * // Finding theaters in a specific city
 * const parisTheaters = await MovieTheaterModel.findAll({
 *   where: { city: 'Paris' },
 *   include: [{ model: MovieHallModel, as: 'halls' }]
 * });
 *
 * @example
 * // Searching by postal code
 * const theaters = await MovieTheaterModel.findAll({
 *   where: { postalCode: '75001' }
 * });
 *
 * @example
 * // Updating theater contact information
 * await MovieTheaterModel.update(
 *   { phone: '+33 1 42 86 57 51', email: 'new-contact@cinema-paradiso.fr' },
 *   { where: { theaterId: 'theater-downtown' } }
 * );
 *
 * @example
 * // Finding a theater with all relationships
 * const theater = await MovieTheaterModel.findOne({
 *   where: { theaterId: 'theater-downtown' },
 *   include: [
 *     { model: MovieHallModel, as: 'halls' },
 *     { model: ScreeningModel, as: 'screenings' }
 *   ]
 * });
 */
@Table({ tableName: 'movie_theaters', timestamps: true })
export class MovieTheaterModel
  extends Model<MovieTheaterAttributes, MovieTheaterAttributes>
  implements MovieTheaterAttributes
{
  /**
   * @property {string} theaterId
   * @description Unique identifier for the movie theater (customizable primary key)
   * @type {string}
   * @primary
   * @unique
   * @required
   * @minLength 2
   * @maxLength 36
   * @pattern Alphanumeric characters, underscores, and hyphens only
   * @validate Must be 2-36 characters and contain only letters, numbers, underscores, or hyphens
   *
   * @example
   * // Valid theater IDs
   * 'theater-downtown'
   * 'cinema_123'
   * 'IMAX-Paris-01'
   *
   * @note Can be manually set or auto-generated (uncomment defaultValue for UUID generation)
   */
  @PrimaryKey
  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
    // defaultValue: () => uuidv4(), // Uncomment for automatic UUID generation
    validate: {
      len: {
        args: [2, 36],
        msg: 'theaterId must be between 2 and 36 characters',
      },
      is: {
        args: /^[a-zA-Z0-9_-]+$/,
        msg: 'theaterId must contain only letters, numbers, underscores or hyphens',
      },
    },
  })
  declare theaterId: string;

  /**
   * @property {string} name
   * @description Human-readable name of the movie theater establishment
   * @type {string}
   * @required
   * @minLength 1
   * @maxLength 255
   * @validate Must not be empty and be between 1-255 characters
   *
   * @example
   * 'Cinema Paradiso'
   * 'Grand Rex'
   * 'UGC Ciné Cité'
   */
  @Column({
    type: DataType.STRING,
    allowNull: false,
    validate: {
      len: {
        args: [1, 255],
        msg: 'Theater name must be between 1 and 255 characters',
      },
      notEmpty: {
        msg: 'Theater name cannot be empty',
      },
    },
  })
  declare name: string;

  /**
   * @property {string} address
   * @description Full street address of the movie theater
   * @type {string}
   * @required
   * @minLength 5
   * @maxLength 100
   * @validate Must be between 5-100 characters
   *
   * @example
   * '123 Main Street'
   * '1 Boulevard Poissonnière'
   * 'Avenue des Champs-Élysées 42'
   */
  @Column({
    type: DataType.STRING,
    allowNull: false,
    validate: {
      len: {
        args: [5, 100],
        msg: 'Address must be between 5 and 100 characters',
      },
    },
  })
  declare address: string;

  /**
   * @property {string} postalCode
   * @description Postal or ZIP code (international format, 4-10 digits)
   * @type {string}
   * @required
   * @pattern 4-10 numeric digits only
   * @validate Must be 4-10 consecutive digits
   *
   * @example
   * '75001' // France
   * '10001' // USA
   * '2000' // Australia
   * '1234567890' // Extended format
   */
  @Column({
    type: DataType.STRING,
    allowNull: false,
    validate: {
      is: {
        args: /^[0-9]{4,10}$/,
        msg: 'Postal code must be 4 to 10 digits',
      },
    },
  })
  declare postalCode: string;

  /**
   * @property {string} city
   * @description City name with support for international characters
   * @type {string}
   * @required
   * @minLength 2
   * @maxLength 50
   * @pattern Letters, spaces, hyphens, and apostrophes (including accented characters)
   * @validate Must be 2-50 characters and contain only valid characters
   *
   * @example
   * 'Paris'
   * 'Saint-Étienne'
   * "Aix-en-Provence"
   * 'São Paulo'
   * 'Zürich'
   */
  @Column({
    type: DataType.STRING,
    allowNull: false,
    validate: {
      len: {
        args: [2, 50],
        msg: 'City name must be between 2 and 50 characters',
      },
      is: {
        args: /^[a-zA-ZÀ-ÖØ-öø-ÿ' -]+$/u,
        msg: 'City name can only contain letters, spaces, hyphens, and apostrophes',
      },
    },
  })
  declare city: string;

  /**
   * @property {string} phone
   * @description Contact phone number (international format accepted)
   * @type {string}
   * @required
   * @minLength 6
   * @maxLength 20
   * @pattern International phone format with optional country code
   * @validate Must be 6-20 characters in valid phone format
   *
   * @example
   * '+33 1 42 86 57 50' // France with country code
   * '01 42 86 57 50' // France local
   * '+1-555-123-4567' // USA
   * '0123456789' // Simple format
   */
  @Column({
    type: DataType.STRING,
    allowNull: false,
    validate: {
      is: {
        args: /^(\+?\d{1,3})?[-. ]?(\d{2,4}[-. ]?){2,5}\d{2,4}$/,
        msg: 'Phone number format is invalid',
      },
      len: {
        args: [6, 20],
        msg: 'Phone number must be between 6 and 20 digits',
      },
    },
  })
  declare phone: string;

  /**
   * @property {string} email
   * @description Contact email address for the theater
   * @type {string}
   * @required
   * @validate Must be a valid email address format
   *
   * @example
   * 'contact@cinema-paradiso.fr'
   * 'info@grandtheater.com'
   * 'reservations@moviehouse.co.uk'
   */
  @Column({
    type: DataType.STRING,
    allowNull: false,
    validate: {
      isEmail: {
        msg: 'Email must be valid',
      },
    },
  })
  declare email: string;

  /**
   * @property {Date} createdAt
   * @description Timestamp when the theater record was created
   * @type {Date}
   * @readonly
   */
  declare readonly createdAt: Date;

  /**
   * @property {Date} updatedAt
   * @description Timestamp when the theater record was last updated
   * @type {Date}
   * @readonly
   */
  declare readonly updatedAt: Date;

  /**
   * ASSOCIATIONS - Defined in associations.ts
   * All relationships are centralized in associations.ts to prevent circular dependencies
   * and improve maintainability
   *
   * @property {MovieHallModel[]} halls
   * @description All movie halls belonging to this theater
   * @type {MovieHallModel[]}
   * @relation HasMany (defined in associations.ts)
   */
  declare halls: MovieHallModel[];

  /**
   * @property {ScreeningModel[]} screenings
   * @description All movie screenings hosted at this theater
   * @type {ScreeningModel[]}
   * @relation HasMany (defined in associations.ts)
   */
  declare screenings: ScreeningModel[];
}
