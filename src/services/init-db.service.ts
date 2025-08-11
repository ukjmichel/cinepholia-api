/**
 *
 * This service provides utility methods to populate the `ScreeningModel` with generated data
 * for all theaters and halls, scheduled every 3 hours, for a specified month.
 * Intended for:
 * - Test data generation
 * - Demo environments
 * - Initial database population
 *
 * Dependencies:
 * - Sequelize models: MovieTheaterModel, MovieModel, MovieHallModel, ScreeningModel
 * - `uuid` for unique screening IDs
 * - `sequelize.Op` for date filtering
 */

import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import { MovieTheaterModel } from '../models/movie-theater.model.js';
import { MovieModel } from '../models/movie.model.js';
import { MovieHallModel } from '../models/movie-hall.model.js';
import { ScreeningModel } from '../models/screening.model.js';

const PRICES = [10, 12, 15, 17, 20];

/**
 * Service class for initializing the database with screening data.
 */
export class InitDbService {
  /**
   * Initializes all screenings for a specific month and year.
   *
   * Fills **all theaters** and **all halls** with screenings every 3 hours,
   * cycling through available movies.
   *
   * @param {number} month - Month (1-12).
   * @param {number} year - Year (e.g., 2025).
   * @returns {Promise<void>}
   * @throws {Error} If no theaters or movies are found in the database.
   */
  static async initMonth(month: number, year: number): Promise<void> {
    const theaters = await MovieTheaterModel.findAll();
    const movies = await MovieModel.findAll();
    if (!theaters.length || !movies.length) {
      throw new Error('No theaters or movies found');
    }

    // For each theater
    for (const theater of theaters) {
      // For each hall in the theater
      const halls = await MovieHallModel.findAll({
        where: { theaterId: theater.theaterId },
      });
      for (const hall of halls) {
        for (let day = 1; day <= daysInMonth(month, year); day++) {
          const date = new Date(year, month - 1, day);
          // Choose movie cyclically
          const movie = movies[(day + halls.indexOf(hall)) % movies.length];
          await this.addDaySchedule(
            theater.theaterId,
            hall.hallId,
            movie.movieId,
            date
          );
        }
      }
    }
  }

  /**
   * Adds a full day's screenings for a specific hall and movie.
   *
   * Creates screenings **every 3 hours** from 10:00 to 22:00 (inclusive).
   * Any pre-existing screenings for the same hall and date will be deleted before insertion.
   *
   * @param {string} theaterId - The ID of the theater.
   * @param {string} hallId - The ID of the hall.
   * @param {string} movieId - The ID of the movie.
   * @param {Date} date - Date of the screenings.
   * @returns {Promise<void>}
   */
  static async addDaySchedule(
    theaterId: string,
    hallId: string,
    movieId: string,
    date: Date
  ): Promise<void> {
    // Remove existing screenings for this hall and day
    await ScreeningModel.destroy({
      where: {
        theaterId,
        hallId,
        startTime: {
          [Op.gte]: new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            0,
            0,
            0
          ),
          [Op.lt]: new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate() + 1,
            0,
            0,
            0
          ),
        },
      },
    });

    const screenings = [];
    let hour = 10;
    for (let i = 0; hour <= 22; i++, hour += 3) {
      const screeningTime = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        hour,
        0,
        0
      );
      screenings.push({
        screeningId: uuidv4(),
        movieId,
        theaterId,
        hallId,
        startTime: screeningTime,
        price: PRICES[i % PRICES.length],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    await ScreeningModel.bulkCreate(screenings);
  }
}

/**
 * Helper function to get the number of days in a given month and year.
 *
 * @param {number} month - Month (1-12).
 * @param {number} year - Full year (e.g., 2025).
 * @returns {number} Number of days in the specified month.
 */
function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}
