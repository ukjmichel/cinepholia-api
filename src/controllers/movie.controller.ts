/**
 * Contrôleur pour la gestion des films (Movies).
 *
 * Fournit les handlers Express pour toutes les opérations CRUD sur les films :
 * création (avec ou sans image), mise à jour, récupération (par ID ou tous),
 * suppression et recherche filtrée. Délègue toute la logique métier à movieService
 * et gère le formatage des réponses HTTP ainsi que la gestion des erreurs.
 *
 * Toutes les erreurs sont transmises au middleware Express suivant.
 */

import { Request, Response, NextFunction } from 'express';
import { movieService } from '../services/movie.service.js';

/**
 * Met à jour un film existant par son identifiant.
 * Accepte les champs à modifier dans le body, ainsi qu'un fichier d'image en option.
 * @route PUT /movies/:movieId
 * @param {Request} req - Requête Express (params: movieId, body: champs à modifier, file: image)
 * @param {Response} res - Réponse Express
 * @param {NextFunction} next - Middleware Express suivant
 * @returns {Promise<void>} Répond avec le film mis à jour ou une erreur.
 */
export async function updateMovie(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const movie = await movieService.updateMovie(
      req.params.movieId,
      req.body,
      req.file
    );
    res.json({ message: 'Movie updated successfully', data: movie });
  } catch (error) {
    next(error);
  }
}

/**
 * Crée un nouveau film (avec ou sans image d'affiche).
 * @route POST /movies
 * @param {Request} req - Requête Express (body: données du film, file: image en option)
 * @param {Response} res - Réponse Express
 * @param {NextFunction} next - Middleware Express suivant
 * @returns {Promise<void>} Répond avec le film créé.
 */
export async function createMovie(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const movie = await movieService.createMovie(req.body, req.file);
    res
      .status(201)
      .json({ message: 'Movie created successfully', data: movie });
  } catch (error) {
    next(error);
  }
}

/**
 * Récupère un film par son identifiant unique.
 * @route GET /movies/:movieId
 * @param {Request} req - Requête Express (params: movieId)
 * @param {Response} res - Réponse Express
 * @param {NextFunction} next - Middleware Express suivant
 * @returns {Promise<void>} Répond avec le film ou une erreur.
 */
export async function getMovieById(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const movie = await movieService.getMovieById(req.params.movieId);
    res.json({ message: 'Movie fetched successfully', data: movie });
  } catch (error) {
    next(error);
  }
}

/**
 * Supprime un film par son identifiant.
 * @route DELETE /movies/:movieId
 * @param {Request} req - Requête Express (params: movieId)
 * @param {Response} res - Réponse Express
 * @param {NextFunction} next - Middleware Express suivant
 * @returns {Promise<void>} Répond avec un message de suppression.
 */
export async function deleteMovie(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    await movieService.deleteMovie(req.params.movieId);
    res.status(204).json({ message: 'Movie deleted successfully', data: null });
  } catch (error) {
    next(error);
  }
}

/**
 * Récupère la liste de tous les films.
 * @route GET /movies
 * @param {Request} req - Requête Express
 * @param {Response} res - Réponse Express
 * @param {NextFunction} next - Middleware Express suivant
 * @returns {Promise<void>} Répond avec la liste des films.
 */
export async function getAllMovies(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const movies = await movieService.getAllMovies();
    res.json({
      message: 'Movies fetched successfully',
      data: movies,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Recherche de films par filtres multiples (titre, réalisateur, genre, etc.).
 * Tous les paramètres de req.query sont optionnels.
 * @route GET /movies/search
 * @param {Request} req - Requête Express (query: filtres de recherche)
 * @param {Response} res - Réponse Express
 * @param {NextFunction} next - Middleware Express suivant
 * @returns {Promise<void>} Répond avec la liste des films correspondants.
 */
export async function searchMovie(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const filters = req.query;
    const movies = await movieService.searchMovie(filters);
    res.json({ message: 'Movies search completed', data: movies });
  } catch (error) {
    next(error);
  }
}
