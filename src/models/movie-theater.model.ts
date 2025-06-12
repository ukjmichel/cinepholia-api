/**
 * Sequelize Model for Movie Theaters (MovieTheaterModel).
 *
 * This file defines the data model for movie theaters in the cinema application.
 * It manages the main information of a movie theater establishment,
 * including its address, contact details, and geographical location.
 * Implementation done with sequelize-typescript for strict typing and robust
 * data validation.
 *
 * Main Features:
 *  - Each movie theater has a unique customizable and validated identifier (theaterId).
 *  - Comprehensive management of the postal address with format validation (postal code, city).
 *  - Strict validation of contact information (phone, email).
 *  - Support for international characters in city names (accents, apostrophes).
 *  - Length and format constraints to ensure data consistency.
 *  - Timestamps (createdAt, updatedAt) are automatically added thanks to the timestamps option.
 *
 * Associated Interfaces:
 *   - MovieTheaterAttributes: complete structure of a movie theater in the database.
 *
 * Uses:
 *   - Creation and management of movie theater establishments.
 *   - Search for movie theaters by location (city, postal code).
 *   - Management of contact information for users.
 *   - Basis for relationships with halls and screenings.
 */

import {
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

// Complete structure of a movie theater
export interface MovieTheaterAttributes {
  theaterId: string;
  address: string;
  postalCode: string;
  city: string;
  phone: string;
  email: string;
}

// Definition of the MovieTheaterModel
@Table({ tableName: 'movie_theater', timestamps: true })
export class MovieTheaterModel
  extends Model<MovieTheaterAttributes, MovieTheaterAttributes>
  implements MovieTheaterAttributes
{
  // Unique identifier for the movie theater (customizable primary key)
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

  // Full address of the movie theater (street, number, etc.)
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

  // Postal code (international numeric validation)
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

  // City name (support for international characters)
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

  // Phone number (accepted international format)
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

  // Contact email address (standard validation)
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

  // Automatic timestamps (creation and update)
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}
