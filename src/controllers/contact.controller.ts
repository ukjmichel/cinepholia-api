/**
 * @module controllers/contact.controller
 *
 * @description
 * Handles sending a contact message related to a specific theater. This endpoint is
 * intended for users (e.g., via a contact form) to send a personalized message about a
 * particular theater, which will then be forwarded via email.
 *
 * @features
 * - Sends an email containing a custom message associated with a `theaterId`.
 *
 * @security
 * - May be rate-limited to mitigate abuse (implementation dependent).
 * - Input is validated for presence; consider adding further validation (e.g., email format).
 *
 * @dependencies
 * - `emailService`: Service responsible for sending emails (Resend API).
 * - `BadRequestError`: Error class for missing/invalid input data.
 *
 * @response
 * On success:
 * ```json
 * { "message": "Email sent successfully" }
 * ```
 * On validation failure or send failure:
 * Delegated to error middleware (e.g., `{ "message": "Failed to send email" }`).
 */

import { Request, Response, NextFunction } from 'express';
import { emailService } from '../services/email.service.js';
import { BadRequestError } from '../errors/bad-request-error.js';

/**
 * Handles contact form submission for a specific movie theater.
 * Validates input and sends an email using the EmailService.
 *
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
export const handleSendTheaterContactMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { theaterId, email, message } = req.body;

  if (!theaterId || !email || !message) {
    return next(
      new BadRequestError(
        'Missing required fields: theaterId, email, and message are all required.'
      )
    );
  }

  try {
    await emailService.sendTheaterContactMessage(theaterId, email, message);
    res.status(200).json({ message: 'Email sent successfully' });
  } catch (error) {
    next(
      new BadRequestError(
        'Failed to send email',
        error instanceof Error ? error : undefined
      )
    );
  }
};
