/**
 * Auth Controller
 *
 * Gère l’authentification des utilisateurs (login).
 * - Vérifie les identifiants.
 * - Génère et envoie les tokens (JWT) en cookies sécurisés.
 * - Récupère le rôle de l’utilisateur via AuthorizationService.
 * - Retourne l’utilisateur sans données sensibles.
 *
 * Dépendances :
 * - AuthService : pour la vérification et la génération des tokens.
 * - UserService : pour la recherche utilisateur.
 * - AuthorizationService : pour déterminer le rôle de l’utilisateur.
 *
 */

import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { userService } from '../services/user.service.js';
import { BadRequestError } from '../errors/bad-request-error.js';
import { AuthorizationService } from '../services/authorization.service.js';

export const authorizationService = new AuthorizationService();

/**
 * Authentifie un utilisateur et renvoie les tokens JWT en cookies sécurisés,
 * ainsi que les informations publiques de l’utilisateur.
 *
 * @group Auth
 * @param {Request} req - Requête Express (body: emailOrUsername, password)
 * @param {Response} res - Réponse Express (user data et cookies)
 * @param {NextFunction} next - Fonction de gestion d’erreur Express
 * @returns {void}
 * @throws {BadRequestError} Si l’un des champs est manquant ou l’utilisateur inexistant
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { emailOrUsername, password } = req.body;
    if (!emailOrUsername || !password) {
      throw new BadRequestError('Email or username and password are required');
    }

    const tokens = await authService.login(emailOrUsername, password);
    const user = await userService.getUserByUsernameOrEmail(emailOrUsername);

    if (!user) {
      throw new BadRequestError('User not found');
    }

    let role = 'utilisateur';
    if (user.userId) {
      const authorization = await authorizationService.getAuthorizationByUserId(
        user.userId
      );
      if (authorization?.role) {
        role = authorization.role;
      }
    }

    // Clean user object: get rid of password and sequelize metadata
    const plainUser =
      typeof user.get === 'function' ? user.get({ plain: true }) : user;
    const { userId, username, firstName, lastName, email } = plainUser;

    // --- Set tokens as HTTP-only cookies ---
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60, // 1 hour
    });
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    });

    res.status(200).json({
      message: 'Login successful',
      data: {
        user: {
          userId,
          username,
          firstName,
          lastName,
          email,
          role,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};
