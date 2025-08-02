/**
 * Contrôleur pour la gestion des séances (Screenings).
 * Fournit les handlers Express pour CRUD, recherche et filtrage des séances de cinéma.
 *
 * Toutes les méthodes transmettent les erreurs à Express (next).
 *
 */

import { Request, Response, NextFunction } from 'express';
import { screeningService } from '../services/screening.service.js';
import { ScreeningCreationAttributes } from '../models/screening.model.js';
import { BadRequestError } from '../errors/bad-request-error.js';

/**
 * Récupère une séance par son identifiant unique.
 * @param {Request} req - Express request (params: screeningId)
 * @param {Response} res - Express response (JSON : séance)
 * @param {NextFunction} next - Express next middleware
 * @returns {Promise<void>}
 * @throws {NotFoundError} Si la séance n’existe pas.
 */
export async function getScreeningById(
  req: Request<{ screeningId: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const screening = await screeningService.getScreeningById(
      req.params.screeningId
    );
    res.json({ data: screening });
  } catch (err) {
    next(err);
  }
}

/**
 * Crée une nouvelle séance.
 * @param {Request} req - Express request (body: ScreeningCreationAttributes)
 * @param {Response} res - Express response (JSON : séance créée)
 * @param {NextFunction} next - Express next middleware
 * @returns {Promise<void>}
 * @throws {BadRequestError} En cas de données invalides.
 */
export async function createScreening(
  req: Request<{}, {}, ScreeningCreationAttributes>,
  res: Response,
  next: NextFunction
) {
  try {
    const screening = await screeningService.createScreening(req.body);
    res.status(201).json({ data: screening });
  } catch (err) {
    next(err);
  }
}

/**
 * Met à jour partiellement une séance existante.
 * @param {Request} req - Express request (params: screeningId, body: champs à mettre à jour)
 * @param {Response} res - Express response (JSON : séance mise à jour)
 * @param {NextFunction} next - Express next middleware
 * @returns {Promise<void>}
 * @throws {NotFoundError} Si la séance n’existe pas.
 */
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
    const screening = await screeningService.updateScreening(
      req.params.screeningId,
      req.body
    );
    res.json({ data: screening });
  } catch (err) {
    next(err);
  }
}

/**
 * Supprime une séance par son identifiant.
 * @param {Request} req - Express request (params: screeningId)
 * @param {Response} res - Express response (statut 204)
 * @param {NextFunction} next - Express next middleware
 * @returns {Promise<void>}
 * @throws {NotFoundError} Si la séance n’existe pas.
 */
export async function deleteScreening(
  req: Request<{ screeningId: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    await screeningService.deleteScreening(req.params.screeningId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/**
 * Récupère toutes les séances.
 * @param {Request} req - Express request
 * @param {Response} res - Express response (JSON : tableau de séances)
 * @param {NextFunction} next - Express next middleware
 * @returns {Promise<void>}
 */
export async function getAllScreenings(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const screenings = await screeningService.getAllScreenings();
    res.json({ data: screenings });
  } catch (err) {
    next(err);
  }
}

/**
 * Recherche des séances : soit par texte global (q), soit par filtres (admin).
 * @param {Request} req - Express request (query: q OU filtres avancés)
 * @param {Response} res - Express response (JSON : résultats de recherche)
 * @param {NextFunction} next - Express next middleware
 * @returns {Promise<void>}
 */
export async function searchScreenings(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (req.query.q) {
      // Recherche textuelle globale
      const results = await screeningService.searchScreenings(
        String(req.query.q)
      );
      res.json({ data: results });
    } else {
      // Recherche avancée par filtres
      const results = await screeningService.searchScreenings(req.query);
      res.json({ data: results });
    }
  } catch (err) {
    next(err);
  }
}

/**
 * Récupère toutes les séances pour un film donné.
 * @param {Request} req - Express request (params: movieId)
 * @param {Response} res - Express response (JSON : séances du film)
 * @param {NextFunction} next - Express next middleware
 * @returns {Promise<void>}
 */
export async function getScreeningsByMovieId(
  req: Request<{ movieId: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const screenings = await screeningService.getScreeningsByMovieId(
      req.params.movieId
    );
    res.json({ data: screenings });
  } catch (err) {
    next(err);
  }
}

/**
 * Récupère toutes les séances pour un cinéma donné.
 * @param {Request} req - Express request (params: theaterId)
 * @param {Response} res - Express response (JSON : séances du cinéma)
 * @param {NextFunction} next - Express next middleware
 * @returns {Promise<void>}
 */
export async function getScreeningsByTheaterId(
  req: Request<{ theaterId: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const screenings = await screeningService.getScreeningsByTheaterId(
      req.params.theaterId
    );
    res.json({ data: screenings });
  } catch (err) {
    next(err);
  }
}

/**
 * Récupère toutes les séances pour une salle donnée,
 * @param {Request} req - Express request (params: hallId, query: theaterId obligatoire)
 * @param {Response} res - Express response (JSON : séances de la salle)
 * @param {NextFunction} next - Express next middleware
 * @returns {Promise<void>}
 * @throws {BadRequestError} Si theaterId absent.
 */
export async function getScreeningsByHallId(
  req: Request<{ hallId: string }, {}, {}, { theaterId?: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const { theaterId } = req.query;
    if (!theaterId) {
      return next(new BadRequestError('theaterId is required'));
    }
    const screenings = await screeningService.getScreeningsByHallId(
      req.params.hallId,
      theaterId
    );
    res.json({ data: screenings });
  } catch (err) {
    next(err);
  }
}

/**
 * Récupère toutes les séances pour une date précise (format : YYYY-MM-DD).
 * @param {Request} req - Express request (params: date)
 * @param {Response} res - Express response (JSON : séances du jour)
 * @param {NextFunction} next - Express next middleware
 * @returns {Promise<void>}
 * @throws {BadRequestError} Si le format de date est invalide.
 */
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
    const screenings = await screeningService.getScreeningsByDate(date);
    res.json({ data: screenings });
  } catch (err) {
    next(err);
  }
}
