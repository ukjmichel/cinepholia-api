import { Request, Response, NextFunction } from 'express';
import { MovieHallService } from '../services/movie-hall.service.js';

const service = new MovieHallService();

/**
 * Creates a new movie hall.
 * @param {Request} req - Express request (body: MovieHall info)
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express next middleware
 * @returns {Promise<void>}
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
 * Returns all movie halls, optionally paginated with ?limit= and ?offset=.
 * @param {Request} req - Express request (query: limit, offset)
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express next middleware
 * @returns {Promise<void>}
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
 * Returns all movie halls for a specific theater.
 * @param {Request} req - Express request (params: theaterId)
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express next middleware
 * @returns {Promise<void>}
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
 * Returns a single hall by theaterId and hallId.
 * @param {Request} req - Express request (params: theaterId, hallId)
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express next middleware
 * @returns {Promise<void>}
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
 * Updates a hall by theaterId and hallId.
 * @param {Request} req - Express request (params: theaterId, hallId; body: fields to update)
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express next middleware
 * @returns {Promise<void>}
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
 * Deletes a hall by theaterId and hallId.
 * @param {Request} req - Express request (params: theaterId, hallId)
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express next middleware
 * @returns {Promise<void>}
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
 * Searches movie halls by theaterId or hallId (?theaterId=...&hallId=...).
 * @param {Request} req - Express request (query: theaterId, hallId)
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express next middleware
 * @returns {Promise<void>}
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
