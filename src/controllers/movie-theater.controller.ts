import { Request, Response, NextFunction } from 'express';
import { MovieTheaterService } from '../services/movie-theater.service.js';


/**
 * Controller for Movie Theater endpoints.
 */
export class MovieTheaterController {
  /**
   * Creates a new movie theater.
   * @route POST /movie-theaters
   */
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const theater = await MovieTheaterService.create(req.body);
      res.status(201).json(theater);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Gets all movie theaters.
   * @route GET /movie-theaters
   */
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const theaters = await MovieTheaterService.getAll();
      res.json(theaters);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Gets a movie theater by its ID.
   * @route GET /movie-theaters/:id
   */
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const theater = await MovieTheaterService.getById(req.params.id);
      res.json(theater);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Updates a movie theater by its ID.
   * @route PUT /movie-theaters/:id
   */
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const theater = await MovieTheaterService.update(req.params.id, req.body);
      res.json(theater);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Deletes a movie theater by its ID.
   * @route DELETE /movie-theaters/:id
   */
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await MovieTheaterService.delete(req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }

  /**
   * Searches for movie theaters using query parameters (city, address, postalCode, theaterId).
   * @route GET /movie-theaters/search
   */
  static async search(req: Request, res: Response, next: NextFunction) {
    try {
      // Accept query parameters like ?city=Lyon&postalCode=69000
      const { city, address, postalCode, theaterId } = req.query;
      const theaters = await MovieTheaterService.search({
        city: city as string,
        address: address as string,
        postalCode: postalCode as string,
        theaterId: theaterId as string,
      });
      res.json(theaters);
    } catch (err) {
      next(err);
    }
  }
}
