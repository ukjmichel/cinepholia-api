/**
 * @module models/associations.ts
 * @description Centralized Model Associations Registry
 *
 * This file defines all Sequelize model associations in one place for better
 * maintainability and to avoid circular dependency issues. All associations
 * are registered after models are loaded into Sequelize.
 *
 * Association Types:
 * - BelongsTo: Foreign key on source model
 * - HasMany: Foreign key on target model
 * - HasOne: Foreign key on target model (one-to-one)
 * - BelongsToMany: Through junction table (many-to-many)
 */

import { UserModel } from '../models/user.model.js';
import { AuthorizationModel } from '../models/authorization.model.js';
import { MovieModel } from '../models/movie.model.js';
import { MovieTheaterModel } from '../models/movie-theater.model.js';
import { MovieHallModel } from '../models/movie-hall.model.js';
import { ScreeningModel } from '../models/screening.model.js';
import { BookingModel } from '../models/booking.model.js';
import { BookedSeatModel } from '../models/booked-seat.model.js';
import { UserTokenModel } from '../models/user-token.model.js';


/**
 * Register all model associations.
 * Should be called after all models are loaded into Sequelize.
 *
 * @example
 * ```typescript
 * await loadModels();
 * registerAssociations();
 * await sequelize.sync();
 * ```
 */
export function registerAssociations(): void {
  // ==========================================
  // USER ASSOCIATIONS
  // ==========================================

  /**
   * User ↔ Authorization (One-to-One)
   * Each user has exactly one authorization/role
   */
  UserModel.hasOne(AuthorizationModel, {
    foreignKey: 'userId',
    sourceKey: 'userId',
    as: 'authorization',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  AuthorizationModel.belongsTo(UserModel, {
    foreignKey: 'userId',
    targetKey: 'userId',
    as: 'user',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  /**
   * User ↔ UserToken (One-to-One)
   * Each user can have only one active token at a time
   */
  UserModel.hasOne(UserTokenModel, {
    foreignKey: 'userId',
    sourceKey: 'userId',
    as: 'token',
    onDelete: 'CASCADE',
  });

  UserTokenModel.belongsTo(UserModel, {
    foreignKey: 'userId',
    targetKey: 'userId',
    as: 'user',
    onDelete: 'CASCADE',
  });

  /**
   * User ↔ Booking (One-to-Many)
   * A user can have multiple bookings
   */
  UserModel.hasMany(BookingModel, {
    foreignKey: 'userId',
    sourceKey: 'userId',
    as: 'bookings',
    onDelete: 'CASCADE',
  });

  BookingModel.belongsTo(UserModel, {
    foreignKey: 'userId',
    targetKey: 'userId',
    as: 'user',
    onDelete: 'CASCADE',
  });



  // ==========================================
  // MOVIE THEATER ASSOCIATIONS
  // ==========================================

  /**
   * MovieTheater ↔ MovieHall (One-to-Many)
   * A theater has multiple halls
   */
  MovieTheaterModel.hasMany(MovieHallModel, {
    foreignKey: 'theaterId',
    sourceKey: 'theaterId',
    as: 'halls',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  MovieHallModel.belongsTo(MovieTheaterModel, {
    foreignKey: 'theaterId',
    targetKey: 'theaterId',
    as: 'theater',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  /**
   * MovieTheater ↔ Screening (One-to-Many)
   * A theater hosts multiple screenings
   */
  MovieTheaterModel.hasMany(ScreeningModel, {
    foreignKey: 'theaterId',
    sourceKey: 'theaterId',
    as: 'screenings',
    onDelete: 'CASCADE',
  });

  ScreeningModel.belongsTo(MovieTheaterModel, {
    foreignKey: 'theaterId',
    targetKey: 'theaterId',
    as: 'theater',
    onDelete: 'CASCADE',
  });



  // ==========================================
  // MOVIE HALL ASSOCIATIONS
  // ==========================================

  /**
   * MovieHall ↔ Screening (One-to-Many)
   * A hall hosts multiple screenings
   */
  MovieHallModel.hasMany(ScreeningModel, {
    foreignKey: 'hallId',
    sourceKey: 'hallId',
    as: 'screenings',
    onDelete: 'CASCADE',
  });

  ScreeningModel.belongsTo(MovieHallModel, {
    foreignKey: 'hallId',
    targetKey: 'hallId',
    as: 'hall',
    onDelete: 'CASCADE',
  });

 

  // ==========================================
  // MOVIE ASSOCIATIONS
  // ==========================================

  /**
   * Movie ↔ Screening (One-to-Many)
   * A movie can have multiple screenings
   */
  MovieModel.hasMany(ScreeningModel, {
    foreignKey: 'movieId',
    sourceKey: 'movieId',
    as: 'screenings',
    onDelete: 'CASCADE',
  });

  ScreeningModel.belongsTo(MovieModel, {
    foreignKey: 'movieId',
    targetKey: 'movieId',
    as: 'movie',
    onDelete: 'CASCADE',
  });

  // ==========================================
  // SCREENING ASSOCIATIONS
  // ==========================================

  /**
   * Screening ↔ Booking (One-to-Many)
   * A screening can have multiple bookings
   */
  ScreeningModel.hasMany(BookingModel, {
    foreignKey: 'screeningId',
    sourceKey: 'screeningId',
    as: 'bookings',
    onDelete: 'CASCADE',
  });

  BookingModel.belongsTo(ScreeningModel, {
    foreignKey: 'screeningId',
    targetKey: 'screeningId',
    as: 'screening',
    onDelete: 'CASCADE',
  });

  /**
   * Screening ↔ BookedSeat (One-to-Many)
   * A screening has multiple booked seats
   */
  ScreeningModel.hasMany(BookedSeatModel, {
    foreignKey: 'screeningId',
    sourceKey: 'screeningId',
    as: 'bookedSeats',
    onDelete: 'CASCADE',
  });

  BookedSeatModel.belongsTo(ScreeningModel, {
    foreignKey: 'screeningId',
    targetKey: 'screeningId',
    as: 'screening',
    onDelete: 'CASCADE',
  });

  // ==========================================
  // BOOKING ASSOCIATIONS
  // ==========================================

  /**
   * Booking ↔ BookedSeat (One-to-Many)
   * A booking can have multiple seats
   */
  BookingModel.hasMany(BookedSeatModel, {
    foreignKey: 'bookingId',
    sourceKey: 'bookingId',
    as: 'bookedSeats',
    onDelete: 'CASCADE',
  });

  BookedSeatModel.belongsTo(BookingModel, {
    foreignKey: 'bookingId',
    targetKey: 'bookingId',
    as: 'booking',
    onDelete: 'CASCADE',
  });

  console.log('✅ Model associations registered successfully');
}

/**
 * Get a summary of all registered associations
 * Useful for debugging and documentation
 */
/**
 * Get a summary of all registered associations
 * Useful for debugging and documentation
 */
export function getAssociationsSummary(): Record<string, string[]> {
  return {
    UserModel: [
      'hasOne: AuthorizationModel',
      'hasOne: UserTokenModel',
      'hasMany: BookingModel',
      'hasMany: IncidentReportModel',
    ],
    AuthorizationModel: ['belongsTo: UserModel'],
    UserTokenModel: ['belongsTo: UserModel'],
    MovieModel: ['hasMany: ScreeningModel'],
    MovieTheaterModel: [
      'hasMany: MovieHallModel',
      'hasMany: ScreeningModel',
      'hasMany: IncidentReportModel',
    ],
    MovieHallModel: [
      'belongsTo: MovieTheaterModel',
      'hasMany: ScreeningModel',
      'hasMany: IncidentReportModel',
    ],
    ScreeningModel: [
      'belongsTo: MovieModel',
      'belongsTo: MovieTheaterModel',
      'belongsTo: MovieHallModel',
      'hasMany: BookingModel',
      'hasMany: BookedSeatModel',
    ],
    BookingModel: [
      'belongsTo: UserModel',
      'belongsTo: ScreeningModel',
      'hasMany: BookedSeatModel',
    ],
    BookedSeatModel: ['belongsTo: ScreeningModel', 'belongsTo: BookingModel'],
    IncidentReportModel: [
      'belongsTo: UserModel',
      'belongsTo: MovieTheaterModel',
      'belongsTo: MovieHallModel',
    ],
  };
}
