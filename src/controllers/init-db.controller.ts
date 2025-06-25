import { Request, Response } from 'express';
import { InitDbService } from '../services/init-db.service.js';


export async function initMonthHandler(req: Request, res: Response):Promise<any> {
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
