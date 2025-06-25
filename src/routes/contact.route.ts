import { Router } from 'express';
import { handleSendTheaterContactMessage } from '../controllers/contact.controller.js';
import { contactMessageValidator } from '../validators/contact.validator.js';
import { handleValidationError } from '../middlewares/handleValidatonError.middleware.js';

const router = Router();

/**
 * @swagger
 * /api/contact:
 *   post:
 *     summary: Envoyer un message de contact pour un cinéma
 *     tags:
 *       - Contact
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - theaterId
 *               - email
 *               - message
 *             properties:
 *               theaterId:
 *                 type: string
 *                 example: "cinema-lyon-01"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "client@example.com"
 *               message:
 *                 type: string
 *                 example: "Bonjour, pouvez-vous me confirmer les horaires du film ?"
 *     responses:
 *       200:
 *         description: Message envoyé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Email sent successfully
 *       400:
 *         description: Données manquantes ou invalides
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: BadRequestError
 *                     message:
 *                       type: string
 *                       example: "Missing required fields: theaterId, email, and message"
 *       500:
 *         description: Erreur serveur lors de l’envoi de l’email
 */
router.post(
  '/',
  contactMessageValidator,
  handleValidationError,
  handleSendTheaterContactMessage
);

export default router;
