/**
 * Movie Theater Controller
 *
 * Provides Express route handlers for managing movie theaters.
 * Supports creating, listing, retrieving, updating, deleting,
 * and searching theaters.
 *
 * All business logic is delegated to `movieTheaterService`.
 * Errors are passed to the Express error-handling middleware.
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
   * Create a new movie theater.
   *
   * @route POST /movie-theaters
   * @param req - Express request containing theater data in the body
   * @param res - Express response
   * @param next - Express next middleware
   * @returns {201 Created} `{ message, data: createdTheater }`
   */
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const theater = await movieTheaterService.create(req.body);
      res.status(201).json({ message: 'Movie theater created', data: theater });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get all movie theaters.
   *
   * @route GET /movie-theaters
   * @param req - Express request
   * @param res - Express response
   * @param next - Express next middleware
   * @returns {200 OK} `{ message, data: theaters[] }`
   */
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const theaters = await movieTheaterService.getAll();
      res.status(200).json({ message: 'All movie theaters', data: theaters });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get a movie theater by its ID.
   *
   * @route GET /movie-theaters/:id
   * @param req - Express request (expects `:id` param)
   * @param res - Express response
   * @param next - Express next middleware
   * @returns {200 OK} `{ message, data: theater }` or {404 Not Found}
   */
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const theater = await movieTheaterService.getById(req.params.id);
      if (!theater) {
        res
          .status(404)
          .json({ message: 'Movie theater not found', data: null });
        return;
      }
      res.status(200).json({ message: 'Movie theater found', data: theater });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update a movie theater by its ID.
   *
   * @route PATCH /movie-theaters/:id
   * @param req - Express request (expects `:id` param and body data)
   * @param res - Express response
   * @param next - Express next middleware
   * @returns {200 OK} `{ message, data: updatedTheater }`
   */
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const theater = await movieTheaterService.update(req.params.id, req.body);
      res.status(200).json({ message: 'Movie theater updated', data: theater });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Delete a movie theater by its ID.
   *
   * @route DELETE /movie-theaters/:id
   * @param req - Express request (expects `:id` param)
   * @param res - Express response
   * @param next - Express next middleware
   * @returns {204 No Content} `{ message, data: null }`
   */
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await movieTheaterService.delete(req.params.id);
      res.status(204).json({ message: 'Movie theater deleted', data: null });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Search for movie theaters using query parameters.
   *
   * @route GET /movie-theaters/search
   * @query {string} city - Optional city filter
   * @query {string} address - Optional address filter
   * @query {string} postalCode - Optional postal code filter
   * @query {string} theaterId - Optional theater ID filter
   *
   * @param req - Express request with query parameters
   * @param res - Express response
   * @param next - Express next middleware
   * @returns {200 OK} `{ message, data: matchedTheaters[] }`
   */
  static async search(req: Request, res: Response, next: NextFunction) {
    try {
      const { city, address, postalCode, theaterId } = req.query;
      const theaters = await movieTheaterService.search({
        city: city as string,
        address: address as string,
        postalCode: postalCode as string,
        theaterId: theaterId as string,
      });
      res.status(200).json({ message: 'Search results', data: theaters });
    } catch (err) {
      next(err);
    }
  }
}
