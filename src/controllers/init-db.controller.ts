/**
 * @module controllers/init-db.controller
 *
 * @description
 * Controller for initializing cinema screenings in the database.
 *
 * @features
 * - Initialize all screenings for a given month and year.
 * - Add a day's schedule for a specific theater, hall, and movie.
 *
 * @dependencies
 * - `InitDbService`: Service handling the actual creation of screening records in the database.
 */

import { Request, Response } from 'express';
import { InitDbService } from '../services/init-db.service.js';

/**
 * Initializes all screenings for a specific month and year.
 *
 * @param {Request} req - Express request object containing `month` and `year` in the body.
 * @param {Response} res - Express response object used to send status and JSON data.
 * @returns {Promise<any>} 201 on success with a confirmation message, 400 if parameters are missing, 500 on server error.
 * @throws {Error} If database initialization fails.
 */
export async function initMonthHandler(
  req: Request,
  res: Response
): Promise<any> {
  const { month, year } = req.body;
  if (!month || !year) {
    return res.status(400).json({ error: 'month and year are required' });
  }
  try {
    await InitDbService.initMonth(month, year);
    return res
      .status(201)
      .json({ message: `Screenings initialized for ${month}/${year}` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Adds a schedule for a specific day for a given theater, hall, and movie.
 *
 * @param {Request} req - Express request object containing `theaterId`, `hallId`, `movieId`, and `date` in the body.
 * @param {Response} res - Express response object used to send status and JSON data.
 * @returns {Promise<any>} 201 on success with a confirmation message, 400 if parameters are missing, 500 on server error.
 * @throws {Error} If adding the day's schedule fails.
 */
export async function addDayScheduleHandler(
  req: Request,
  res: Response
): Promise<any> {
  const { theaterId, hallId, movieId, date } = req.body;
  if (!theaterId || !hallId || !movieId || !date) {
    return res
      .status(400)
      .json({ error: 'theaterId, hallId, movieId, and date are required' });
  }
  try {
    await InitDbService.addDaySchedule(
      theaterId,
      hallId,
      movieId,
      new Date(date)
    );
    return res
      .status(201)
      .json({ message: `Screenings initialized for ${date}` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
