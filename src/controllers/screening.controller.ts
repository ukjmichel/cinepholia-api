// src/controllers/screening.controller.ts

import { Request, Response, NextFunction } from 'express';
import { ScreeningService } from '../services/screening.service.js';
import { ScreeningCreationAttributes } from '../models/screening.model.js';

// GET /screenings/:id
export async function getScreeningById(
  req: Request<{ screeningId: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const screening = await ScreeningService.getScreeningById(
      req.params.screeningId
    );
    res.json(screening);
  } catch (err) {
    next(err);
  }
}

// POST /screenings
export async function createScreening(
  req: Request<{}, {}, ScreeningCreationAttributes>,
  res: Response,
  next: NextFunction
) {
  try {
    const screening = await ScreeningService.createScreening(req.body);
    res.status(201).json(screening);
  } catch (err) {
    next(err);
  }
}

// PATCH /screenings/:id
export async function updateScreening(
  req: Request<
    { screeningId: string },
    {},
    Partial<ScreeningCreationAttributes>
  >,
  res: Response,
  next: NextFunction
) {
  try {
    const screening = await ScreeningService.updateScreening(
      req.params.screeningId,
      req.body
    );
    res.json(screening);
  } catch (err) {
    next(err);
  }
}

// DELETE /screenings/:id
export async function deleteScreening(
  req: Request<{ screeningId: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    await ScreeningService.deleteScreening(req.params.screeningId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// GET /screenings
export async function getAllScreenings(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const screenings = await ScreeningService.getAllScreenings();
    res.json(screenings);
  } catch (err) {
    next(err);
  }
}

// GET /screenings/search?q=IMAX
export async function searchScreenings(
  req: Request<{}, {}, {}, { q: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const { q } = req.query;
    const results = await ScreeningService.searchScreenings(q || '');
    res.json(results);
  } catch (err) {
    next(err);
  }
}

// GET /screenings/by-movie/:movieId
export async function getScreeningsByMovieId(
  req: Request<{ movieId: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const screenings = await ScreeningService.getScreeningsByMovieId(
      req.params.movieId
    );
    res.json(screenings);
  } catch (err) {
    next(err);
  }
}

// GET /screenings/by-theater/:theaterId
export async function getScreeningsByTheaterId(
  req: Request<{ theaterId: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const screenings = await ScreeningService.getScreeningsByTheaterId(
      req.params.theaterId
    );
    res.json(screenings);
  } catch (err) {
    next(err);
  }
}

// GET /screenings/by-hall/:hallId
export async function getScreeningsByHallId(
  req: Request<{ hallId: string }, {}, {}, { theaterId?: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    // Optionally allow filtering by theaterId in query
    const { theaterId } = req.query;
    const screenings = await ScreeningService.getScreeningsByHallId(
      req.params.hallId,
      theaterId
    );
    res.json(screenings);
  } catch (err) {
    next(err);
  }
}

// GET /screenings/by-date/:date
export async function getScreeningsByDate(
  req: Request<{ date: string }>,
  res: Response,
  next: NextFunction
): Promise<any> {
  try {
    const date = new Date(req.params.date);
    if (isNaN(date.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    const screenings = await ScreeningService.getScreeningsByDate(date);
    res.json(screenings);
  } catch (err) {
    next(err);
  }
}
