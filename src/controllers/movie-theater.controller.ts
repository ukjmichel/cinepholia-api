/**
 * Contrôleur pour la gestion des cinémas/salles de cinéma.
 *
 * Fournit les gestionnaires de routes HTTP pour la création, la lecture,
 * la mise à jour, la suppression et la recherche de cinémas.
 * Toutes les opérations métier sont déléguées au service movieTheaterService.
 * Les erreurs sont gérées via le middleware Express.
 *
 * Toutes les méthodes sont statiques et utilisables directement comme handlers Express.
 *
 * @module controllers/movie-theater.controller
 * @since 2024
 */
import { Request, Response, NextFunction } from 'express';
import { movieTheaterService } from '../services/movie-theater.service.js';

/**
 * Controller for Movie Theater endpoints.
 */
export class MovieTheaterController {
  /**
   * Creates a new movie theater.
   * @param {Request} req - Express request object (expects theater data in body)
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next middleware function
   * @returns {Promise<void>} Sends the created theater in response.
   */
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const theater = await movieTheaterService.create(req.body);
      res.status(201).json(theater);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Gets all movie theaters.
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next middleware function
   * @returns {Promise<void>} Sends an array of theaters in response.
   */
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const theaters = await movieTheaterService.getAll();
      res.json(theaters);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Gets a movie theater by its ID.
   * @param {Request} req - Express request object (expects :id param)
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next middleware function
   * @returns {Promise<void>} Sends the found theater or 404 if not found.
   */
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const theater = await movieTheaterService.getById(req.params.id);
      res.json(theater);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Updates a movie theater by its ID.
   * @param {Request} req - Express request object (expects :id param and update data in body)
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next middleware function
   * @returns {Promise<void>} Sends the updated theater in response.
   */
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const theater = await movieTheaterService.update(req.params.id, req.body);
      res.json(theater);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Deletes a movie theater by its ID.
   * @param {Request} req - Express request object (expects :id param)
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next middleware function
   * @returns {Promise<void>} Sends status 204 if deleted.
   */
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await movieTheaterService.delete(req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }

  /**
   * Searches for movie theaters using query parameters (city, address, postalCode, theaterId).
   * @param {Request} req - Express request object (query params supported: city, address, postalCode, theaterId)
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next middleware function
   * @returns {Promise<void>} Sends an array of matched theaters.
   */
  static async search(req: Request, res: Response, next: NextFunction) {
    try {
      // Accept query parameters like ?city=Lyon&postalCode=69000
      const { city, address, postalCode, theaterId } = req.query;
      const theaters = await movieTheaterService.search({
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
