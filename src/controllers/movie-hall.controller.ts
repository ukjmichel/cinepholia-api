import { Request, Response, NextFunction } from 'express';
import { MovieHallService } from '../services/movie-hall.service.js';

const service = new MovieHallService();

/**
 * Create a new movie hall
 */
export async function createMovieHall(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const hall = await service.create(req.body);
    res.status(201).json(hall);
  } catch (err) {
    next(err);
  }
}

/**
 * Get all movie halls (optionally paginated: ?limit=, ?offset=)
 */
export async function getAllMovieHalls(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { limit, offset } = req.query;
    const halls = await service.findAll({
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
    res.json(halls);
  } catch (err) {
    next(err);
  }
}

/**
 * Get all halls by theaterId
 */
export async function getMovieHallsByTheater(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const halls = await service.findAllByTheaterId(req.params.theaterId);
    res.json(halls);
  } catch (err) {
    next(err);
  }
}

/**
 * Get a single hall by composite PK
 */
export async function getMovieHall(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const hall = await service.findByTheaterIdAndHallId(
      req.params.theaterId,
      req.params.hallId
    );
    res.json(hall);
  } catch (err) {
    next(err);
  }
}

/**
 * Update a hall by composite PK
 */
export async function updateMovieHall(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const hall = await service.updateByTheaterIdAndHallId(
      req.params.theaterId,
      req.params.hallId,
      req.body
    );
    res.json(hall);
  } catch (err) {
    next(err);
  }
}

/**
 * Delete a hall by composite PK
 */
export async function deleteMovieHall(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await service.deleteByTheaterIdAndHallId(
      req.params.theaterId,
      req.params.hallId
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * Search halls by theaterId or hallId (?theaterId=...&hallId=...)
 */
export async function searchMovieHalls(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { theaterId, hallId } = req.query;
    const halls = await service.searchByTheaterIdOrHallId({
      theaterId: theaterId as string | undefined,
      hallId: hallId as string | undefined,
    });
    res.json(halls);
  } catch (err) {
    next(err);
  }
}
