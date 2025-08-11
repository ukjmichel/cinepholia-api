/**
 * @module controllers/generate-ticket.controller
 *
 * @description
 * Handles the generation of a booking ticket in HTML format, embedding booking details
 * and a unique QR code for verification. The endpoint produces a visual ticket intended
 * for printing or mobile display upon entry.
 *
 * @features
 * - Generate a personalized ticket with a QR code from a given `bookingId`.
 *
 * @dependencies
 * - `bookingService`: Retrieves booking and user details.
 * - `qrcode`: Generates the embedded QR code within the ticket.
 *
 */

import { Request, Response, NextFunction } from 'express';
import QRCode from 'qrcode';
import { bookingService } from '../services/booking.service.js';
import { NotFoundError } from '../errors/not-found-error.js';

/**
 * Generate a ticket with booking details and a QR code.
 * @param {Request} req - Express request object (expects bookingId in params)
 * @param {Response} res - Express response object (returns ticket HTML)
 * @param {NextFunction} next - Express next middleware
 * @returns {Promise<void>}
 * @async
 */
export const generateTicket = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Fetch booking data (and possibly user info)
    const booking = await bookingService.getBookingById(req.params.bookingId);
    // Let's assume booking.User is eager-loaded, and has "nom" and "prenom"
    if (!booking) {
      // handle not found (throw error, return 404, etc)
      throw new NotFoundError('Booking not found');
    }
    const { bookingId, user } = booking;
    const nom = user?.lastName || user?.firstName || 'N/A';
    const prenom = user?.firstName || user?.lastName || 'N/A';

    // Generate QR code with bookingId (can use more info if you want)
    const qrDataUrl = await QRCode.toDataURL(bookingId);

    // Render simple HTML ticket
    const html = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <title>Ticket de réservation</title>
        <style>
          body { font-family: Arial, sans-serif; background: #f6f6f6; padding: 2rem; }
          .ticket {
            background: white;
            padding: 2rem;
            max-width: 400px;
            margin: auto;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.12);
            text-align: center;
          }
          img.qr { margin-top: 1rem; }
          h2 { margin-bottom: 0.5rem; }
        </style>
      </head>
      <body>
        <div class="ticket">
          <h2>Votre Ticket</h2>
          <p><strong>ID Réservation:</strong> ${bookingId}</p>
          <p><strong>Nom:</strong> ${nom}</p>
          <p><strong>Prénom:</strong> ${prenom}</p>
          <img class="qr" src="${qrDataUrl}" alt="QR Code" />
        </div>
      </body>
      </html>
    `;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    next(err);
  }
};
