import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import { MovieTheaterModel } from '../models/movie-theater.model.js';
import { MovieModel } from '../models/movie.model.js';
import { MovieHallModel } from '../models/movie-hall.model.js';
import { ScreeningModel } from '../models/screening.model.js';


const QUALITY_CHOICES = ['2D', '3D', 'IMAX', '4DX', 'Dolby'];
const PRICES = [10, 12, 15, 17, 20]; 

export class InitDbService {
  /**
   * Initialize all screenings for a specific month.
   * This method fills all theaters and all halls with screenings every 3 hours,
   * cycling through available movies.
   * @param month Month (1-12)
   * @param year Year (e.g., 2025)
   */
  static async initMonth(month: number, year: number): Promise<void> {
    const theaters = await MovieTheaterModel.findAll();
    const movies = await MovieModel.findAll();
    if (!theaters.length || !movies.length)
      throw new Error('No theaters or movies found');

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
   * Add a full day's screenings in a specific hall for a specific movie.
   * Creates screenings every 3 hours from 10:00 to 22:00 (inclusive).
   * @param theaterId
   * @param hallId
   * @param movieId
   * @param date Date of the screenings (JS Date object)
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
        quality: QUALITY_CHOICES[i % QUALITY_CHOICES.length],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    await ScreeningModel.bulkCreate(screenings);
  }
}

/**
 * Helper function: Returns the number of days in a month.
 */
function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}
