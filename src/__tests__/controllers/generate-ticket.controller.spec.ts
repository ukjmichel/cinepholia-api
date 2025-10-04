import { Request, Response, NextFunction } from 'express';
import { generateTicket } from '../../controllers/generate-ticket.controller';
import { bookingService } from '../../services/booking.service';
import QRCode from 'qrcode';
import { NotFoundError } from '../../errors/not-found-error';

// Mock dependencies
jest.mock('../../services/booking.service');
jest.mock('qrcode');

describe('generateTicket', () => {
  let mockRequest: any;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  const mockBooking = {
    bookingId: 'booking-123',
    userId: 'user-456',
    screeningId: 'screening-789',
    status: 'CONFIRMED',
    user: {
      id: 'user-456',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
    },
  };

  const mockQRDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA';

  beforeEach(() => {
    mockRequest = {
      params: {},
    };

    mockResponse = {
      setHeader: jest.fn(),
      send: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  describe('Successful ticket generation', () => {
    it('should generate ticket with valid booking and user data', async () => {
      mockRequest.params = { bookingId: 'booking-123' };

      (bookingService.getBookingById as jest.Mock).mockResolvedValue(
        mockBooking
      );
      (QRCode.toDataURL as jest.Mock).mockResolvedValue(mockQRDataUrl);

      await generateTicket(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(bookingService.getBookingById).toHaveBeenCalledWith('booking-123');
      expect(QRCode.toDataURL).toHaveBeenCalledWith('booking-123');
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'text/html; charset=utf-8'
      );
      expect(mockResponse.send).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();

      const htmlContent = (mockResponse.send as jest.Mock).mock.calls[0][0];
      expect(htmlContent).toContain('booking-123');
      expect(htmlContent).toContain('Doe');
      expect(htmlContent).toContain('John');
      expect(htmlContent).toContain(mockQRDataUrl);
    });

    it('should include QR code image in HTML', async () => {
      mockRequest.params = { bookingId: 'booking-456' };

      (bookingService.getBookingById as jest.Mock).mockResolvedValue(
        mockBooking
      );
      (QRCode.toDataURL as jest.Mock).mockResolvedValue(mockQRDataUrl);

      await generateTicket(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const htmlContent = (mockResponse.send as jest.Mock).mock.calls[0][0];
      expect(htmlContent).toContain(`<img class="qr" src="${mockQRDataUrl}"`);
      expect(htmlContent).toContain('alt="QR Code"');
    });

    it('should contain proper HTML structure', async () => {
      mockRequest.params = { bookingId: 'booking-123' };

      (bookingService.getBookingById as jest.Mock).mockResolvedValue(
        mockBooking
      );
      (QRCode.toDataURL as jest.Mock).mockResolvedValue(mockQRDataUrl);

      await generateTicket(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const htmlContent = (mockResponse.send as jest.Mock).mock.calls[0][0];
      expect(htmlContent).toContain('<!DOCTYPE html>');
      expect(htmlContent).toContain('<html lang="fr">');
      expect(htmlContent).toContain('</html>');
      expect(htmlContent).toContain('<title>Ticket de réservation</title>');
      expect(htmlContent).toContain('<div class="ticket">');
    });
  });

  describe('User data handling', () => {
    it('should use lastName and firstName when both are available', async () => {
      mockRequest.params = { bookingId: 'booking-123' };

      (bookingService.getBookingById as jest.Mock).mockResolvedValue(
        mockBooking
      );
      (QRCode.toDataURL as jest.Mock).mockResolvedValue(mockQRDataUrl);

      await generateTicket(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const htmlContent = (mockResponse.send as jest.Mock).mock.calls[0][0];
      expect(htmlContent).toContain('<strong>Nom:</strong> Doe');
      expect(htmlContent).toContain('<strong>Prénom:</strong> John');
    });

    it('should use N/A when user has no firstName or lastName', async () => {
      mockRequest.params = { bookingId: 'booking-123' };

      const bookingWithoutNames = {
        ...mockBooking,
        user: {
          id: 'user-456',
          email: 'user@example.com',
        },
      };

      (bookingService.getBookingById as jest.Mock).mockResolvedValue(
        bookingWithoutNames
      );
      (QRCode.toDataURL as jest.Mock).mockResolvedValue(mockQRDataUrl);

      await generateTicket(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const htmlContent = (mockResponse.send as jest.Mock).mock.calls[0][0];
      expect(htmlContent).toContain('<strong>Nom:</strong> N/A');
      expect(htmlContent).toContain('<strong>Prénom:</strong> N/A');
    });

    it('should use firstName as fallback for nom when lastName is missing', async () => {
      mockRequest.params = { bookingId: 'booking-123' };

      const bookingWithOnlyFirstName = {
        ...mockBooking,
        user: {
          id: 'user-456',
          firstName: 'Jane',
          email: 'jane@example.com',
        },
      };

      (bookingService.getBookingById as jest.Mock).mockResolvedValue(
        bookingWithOnlyFirstName
      );
      (QRCode.toDataURL as jest.Mock).mockResolvedValue(mockQRDataUrl);

      await generateTicket(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const htmlContent = (mockResponse.send as jest.Mock).mock.calls[0][0];
      expect(htmlContent).toContain('<strong>Nom:</strong> Jane');
    });

    it('should use lastName as fallback for prenom when firstName is missing', async () => {
      mockRequest.params = { bookingId: 'booking-123' };

      const bookingWithOnlyLastName = {
        ...mockBooking,
        user: {
          id: 'user-456',
          lastName: 'Smith',
          email: 'smith@example.com',
        },
      };

      (bookingService.getBookingById as jest.Mock).mockResolvedValue(
        bookingWithOnlyLastName
      );
      (QRCode.toDataURL as jest.Mock).mockResolvedValue(mockQRDataUrl);

      await generateTicket(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const htmlContent = (mockResponse.send as jest.Mock).mock.calls[0][0];
      expect(htmlContent).toContain('<strong>Prénom:</strong> Smith');
    });

    it('should handle null user gracefully', async () => {
      mockRequest.params = { bookingId: 'booking-123' };

      const bookingWithoutUser = {
        ...mockBooking,
        user: null,
      };

      (bookingService.getBookingById as jest.Mock).mockResolvedValue(
        bookingWithoutUser
      );
      (QRCode.toDataURL as jest.Mock).mockResolvedValue(mockQRDataUrl);

      await generateTicket(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const htmlContent = (mockResponse.send as jest.Mock).mock.calls[0][0];
      expect(htmlContent).toContain('<strong>Nom:</strong> N/A');
      expect(htmlContent).toContain('<strong>Prénom:</strong> N/A');
    });

    it('should handle undefined user gracefully', async () => {
      mockRequest.params = { bookingId: 'booking-123' };

      const bookingWithoutUser = {
        ...mockBooking,
        user: undefined,
      };

      (bookingService.getBookingById as jest.Mock).mockResolvedValue(
        bookingWithoutUser
      );
      (QRCode.toDataURL as jest.Mock).mockResolvedValue(mockQRDataUrl);

      await generateTicket(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const htmlContent = (mockResponse.send as jest.Mock).mock.calls[0][0];
      expect(htmlContent).toContain('N/A');
    });
  });

  describe('Booking not found', () => {
    it('should throw NotFoundError when booking does not exist', async () => {
      mockRequest.params = { bookingId: 'non-existent-booking' };

      (bookingService.getBookingById as jest.Mock).mockResolvedValue(null);

      await generateTicket(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(bookingService.getBookingById).toHaveBeenCalledWith(
        'non-existent-booking'
      );
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Booking not found',
        })
      );
      expect(mockResponse.send).not.toHaveBeenCalled();
    });

    it('should call next with NotFoundError instance', async () => {
      mockRequest.params = { bookingId: 'invalid-id' };

      (bookingService.getBookingById as jest.Mock).mockResolvedValue(null);

      await generateTicket(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
    });
  });

  describe('QR Code generation', () => {
    it('should generate QR code with bookingId', async () => {
      mockRequest.params = { bookingId: 'booking-xyz' };

      (bookingService.getBookingById as jest.Mock).mockResolvedValue(
        mockBooking
      );
      (QRCode.toDataURL as jest.Mock).mockResolvedValue(mockQRDataUrl);

      await generateTicket(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(QRCode.toDataURL).toHaveBeenCalledWith('booking-123');
    });

    it('should handle QR code generation failure', async () => {
      mockRequest.params = { bookingId: 'booking-123' };

      (bookingService.getBookingById as jest.Mock).mockResolvedValue(
        mockBooking
      );

      const qrError = new Error('QR generation failed');
      (QRCode.toDataURL as jest.Mock).mockRejectedValue(qrError);

      await generateTicket(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(qrError);
      expect(mockResponse.send).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should call next with error if bookingService throws', async () => {
      mockRequest.params = { bookingId: 'booking-123' };

      const serviceError = new Error('Database connection failed');
      (bookingService.getBookingById as jest.Mock).mockRejectedValue(
        serviceError
      );

      await generateTicket(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(serviceError);
      expect(mockResponse.send).not.toHaveBeenCalled();
    });

    it('should not send response when error occurs', async () => {
      mockRequest.params = { bookingId: 'booking-123' };

      (bookingService.getBookingById as jest.Mock).mockRejectedValue(
        new Error('Service error')
      );

      await generateTicket(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.setHeader).not.toHaveBeenCalled();
      expect(mockResponse.send).not.toHaveBeenCalled();
    });
  });

  describe('Response format', () => {
    it('should set correct Content-Type header', async () => {
      mockRequest.params = { bookingId: 'booking-123' };

      (bookingService.getBookingById as jest.Mock).mockResolvedValue(
        mockBooking
      );
      (QRCode.toDataURL as jest.Mock).mockResolvedValue(mockQRDataUrl);

      await generateTicket(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'text/html; charset=utf-8'
      );
    });

    it('should send HTML content as response', async () => {
      mockRequest.params = { bookingId: 'booking-123' };

      (bookingService.getBookingById as jest.Mock).mockResolvedValue(
        mockBooking
      );
      (QRCode.toDataURL as jest.Mock).mockResolvedValue(mockQRDataUrl);

      await generateTicket(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.send).toHaveBeenCalledTimes(1);
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.stringContaining('<!DOCTYPE html>')
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle bookingId with special characters', async () => {
      const specialBookingId = 'booking-123-abc-XYZ_456';
      mockRequest.params = { bookingId: specialBookingId };

      const bookingWithSpecialId = {
        ...mockBooking,
        bookingId: specialBookingId,
      };

      (bookingService.getBookingById as jest.Mock).mockResolvedValue(
        bookingWithSpecialId
      );
      (QRCode.toDataURL as jest.Mock).mockResolvedValue(mockQRDataUrl);

      await generateTicket(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(QRCode.toDataURL).toHaveBeenCalledWith(specialBookingId);

      const htmlContent = (mockResponse.send as jest.Mock).mock.calls[0][0];
      expect(htmlContent).toContain(specialBookingId);
    });

    it('should handle names with special characters', async () => {
      mockRequest.params = { bookingId: 'booking-123' };

      const bookingWithSpecialNames = {
        ...mockBooking,
        user: {
          id: 'user-456',
          firstName: 'Jean-François',
          lastName: "O'Connor",
          email: 'user@example.com',
        },
      };

      (bookingService.getBookingById as jest.Mock).mockResolvedValue(
        bookingWithSpecialNames
      );
      (QRCode.toDataURL as jest.Mock).mockResolvedValue(mockQRDataUrl);

      await generateTicket(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const htmlContent = (mockResponse.send as jest.Mock).mock.calls[0][0];
      expect(htmlContent).toContain("O'Connor");
      expect(htmlContent).toContain('Jean-François');
    });

    it('should handle very long booking IDs', async () => {
      const longBookingId = 'booking-' + 'a'.repeat(100);
      mockRequest.params = { bookingId: longBookingId };

      const bookingWithLongId = {
        ...mockBooking,
        bookingId: longBookingId,
      };

      (bookingService.getBookingById as jest.Mock).mockResolvedValue(
        bookingWithLongId
      );
      (QRCode.toDataURL as jest.Mock).mockResolvedValue(mockQRDataUrl);

      await generateTicket(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(QRCode.toDataURL).toHaveBeenCalledWith(longBookingId);
      expect(mockResponse.send).toHaveBeenCalled();
    });
  });
});
