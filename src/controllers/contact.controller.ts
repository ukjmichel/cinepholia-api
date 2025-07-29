/**
 * Contact Controller
 *
 * Handles the sending of a contact message related to a specific theater. This endpoint is
 * intended to allow users (e.g., via a contact form) to send a personalized message about a
 * particular theater, which will be forwarded via email.
 *
 * Main functionality:
 * - Sends an email containing a custom message associated with a theaterId.
 *
 * Dependencies:
 * - EmailService: Service responsible for sending emails via the Resend API.
 * - BadRequestError: Handles explicit errors related to missing or invalid input data.
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
