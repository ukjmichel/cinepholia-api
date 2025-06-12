/**
 * Booking Comment Controller
 *
 * Gère les opérations CRUD sur les commentaires de réservation :
 * - Création, lecture, modification, suppression de commentaires liés à une réservation.
 * - Recherche de commentaires par statut, par film, ou texte libre.
 * - Confirmation des commentaires.
 *
 * Dépendances :
 * - bookingCommentService : logique métier pour la gestion des commentaires.
 * - NotFoundError, BadRequestError : gestion des erreurs explicites.
 *
 * Chaque handler Express respecte l’API REST : status code, message, et structure de réponse.
 *
 * @module controllers/booking-comment.controller
 * @since 2024
 */

import { Request, Response, NextFunction } from 'express';
import { bookingCommentService } from '../services/booking-comment.service.js';
import { NotFoundError } from '../errors/not-found-error.js';
import { BadRequestError } from '../errors/bad-request-error.js';

/**
 * Récupère un commentaire par bookingId.
 * @param {Request} req - Requête Express (params: bookingId)
 * @param {Response} res - Réponse Express
 * @param {NextFunction} next - Gestionnaire d’erreur
 */
export async function getCommentByBookingId(
  req: Request<{ bookingId: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const { bookingId } = req.params;
    const comment =
      await bookingCommentService.getCommentByBookingId(bookingId);
    res.json({ message: 'Comment found', data: comment });
  } catch (error) {
    next(error);
  }
}

/**
 * Crée un commentaire pour une réservation.
 * @param {Request} req - Requête Express (body: comment fields)
 * @param {Response} res - Réponse Express
 * @param {NextFunction} next - Gestionnaire d’erreur
 */
export async function createComment(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const created = await bookingCommentService.createComment(req.body);
    res.status(201).json({ message: 'Comment created', data: created });
  } catch (error) {
    next(error);
  }
}

/**
 * Met à jour un commentaire par bookingId.
 * @param {Request} req - Requête Express (params: bookingId, body: updates)
 * @param {Response} res - Réponse Express
 * @param {NextFunction} next - Gestionnaire d’erreur
 */
export async function updateComment(
  req: Request<{ bookingId: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const { bookingId } = req.params;
    const updated = await bookingCommentService.updateComment(
      bookingId,
      req.body
    );
    res.json({ message: 'Comment updated', data: updated });
  } catch (error) {
    next(error);
  }
}

/**
 * Supprime un commentaire par bookingId.
 * @param {Request} req - Requête Express (params: bookingId)
 * @param {Response} res - Réponse Express
 * @param {NextFunction} next - Gestionnaire d’erreur
 */
export async function deleteComment(
  req: Request<{ bookingId: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const { bookingId } = req.params;
    await bookingCommentService.deleteComment(bookingId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * Récupère tous les commentaires.
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
export async function getAllComments(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const comments = await bookingCommentService.getAllComments();
    res.json({ message: 'All comments', data: comments });
  } catch (error) {
    next(error);
  }
}

/**
 * Récupère les commentaires par statut ('pending' ou 'confirmed').
 * @param {Request} req - (params: status)
 * @param {Response} res
 * @param {NextFunction} next
 */
export async function getCommentsByStatus(
  req: Request<{ status: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const { status } = req.params;
    if (!['pending', 'confirmed'].includes(status)) {
      return next(new BadRequestError('Invalid status'));
    }
    const comments = await bookingCommentService.getCommentsByStatus(
      status as 'pending' | 'confirmed'
    );
    res.json({ message: `Comments with status ${status}`, data: comments });
  } catch (error) {
    next(error);
  }
}

/**
 * Confirme un commentaire (met son statut à 'confirmed').
 * @param {Request} req - (params: bookingId)
 * @param {Response} res
 * @param {NextFunction} next
 */
export async function confirmComment(
  req: Request<{ bookingId: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const { bookingId } = req.params;
    const updated = await bookingCommentService.confirmComment(bookingId);
    res.json({ message: 'Comment confirmed', data: updated });
  } catch (error) {
    next(error);
  }
}

/**
 * Récupère tous les commentaires liés à un film donné.
 * @param {Request} req - (params: movieId)
 * @param {Response} res
 * @param {NextFunction} next
 */
export async function getCommentsByMovieId(
  req: Request<{ movieId: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const { movieId } = req.params;
    const comments = await bookingCommentService.getCommentsByMovieId(movieId);
    res.json({ message: `Comments for movie ${movieId}`, data: comments });
  } catch (error) {
    next(error);
  }
}

/**
 * Recherche de commentaires (par texte, statut, bookingId).
 * @param {Request} req - (query: q)
 * @param {Response} res
 * @param {NextFunction} next
 */
export async function searchComments(
  req: Request<{}, {}, {}, { q?: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const { q } = req.query;
    if (!q) {
      return next(new BadRequestError('Query parameter q is required'));
    }
    const results = await bookingCommentService.searchComments(q);
    res.json({ message: 'Comments search results', data: results });
  } catch (error) {
    next(error);
  }
}
