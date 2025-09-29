/**
 * @module controllers/contact.controller
 *
 * @description
 * Handles sending a contact message related to a specific theater. This endpoint is
 * intended for users (e.g., via a contact form) to send a personalized message about a
 * particular theater, which will then be forwarded via email.
 *
 * @features
 * - Validates that the theater exists before sending email
 * - Sends an email containing a custom message associated with a `theaterId`
 *
 * @security
 * - May be rate-limited to mitigate abuse (implementation dependent)
 * - Input is validated for presence and theater existence
 *
 * @dependencies
 * - `emailService`: Service responsible for sending emails (Resend API)
 * - `theaterService`: Service to verify theater existence
 * - `BadRequestError`: Error class for missing/invalid input data
 * - `NotFoundError`: Error class for non-existent theater
 *
 * @response
 * On success:
 * ```json
 * { "message": "Email sent successfully" }
 * ```
 * On validation failure or send failure:
 * Delegated to error middleware
 */

import { Request, Response, NextFunction } from 'express';
import { emailService } from '../services/email.service.js';
import movieTheaterService from '../services/movie-theater.service.js';
import { BadRequestError } from '../errors/bad-request-error.js';

/**
 * Handles contact form submission for a specific movie theater.
 * Validates input, verifies theater existence, and sends an email.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware
 * @returns {Promise<void>}
 */
export const SendTheaterContactMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { theaterId, email, message } = req.body;

    // Validate required fields
    if (!theaterId || !email || !message) {
      throw new BadRequestError(
        'Missing required fields: theaterId, email, and message are all required.'
      );
    }

    // Verify theater exists (throws NotFoundError if not found)
    const theater = await movieTheaterService.getById(theaterId);

    // Send email with theater information
    await emailService.sendTheaterContactMessage(theaterId, email, message);

    res.status(200).json({
      message: 'Email sent successfully',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
