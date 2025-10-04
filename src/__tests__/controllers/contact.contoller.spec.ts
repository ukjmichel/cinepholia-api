import { Request, Response, NextFunction } from 'express';
import { SendTheaterContactMessage } from '../../controllers/contact.controller';
import { emailService } from '../../services/email.service';
import movieTheaterService from '../../services/movie-theater.service';
import { BadRequestError } from '../../errors/bad-request-error';
import { NotFoundError } from '../../errors/not-found-error';

// Mock dependencies
jest.mock('../../services/email.service');
jest.mock('../../services/movie-theater.service');

describe('SendTheaterContactMessage', () => {
  let mockRequest: any;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  const mockTheater = {
    theaterId: 'theater-123',
    name: 'Grand Cinema',
    address: '123 Main St',
    city: 'New York',
  };

  beforeEach(() => {
    mockRequest = {
      body: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  describe('Successful email sending', () => {
    it('should send email successfully with all required fields', async () => {
      mockRequest.body = {
        theaterId: 'theater-123',
        email: 'user@example.com',
        message: 'I would like to inquire about your theater.',
      };

      (movieTheaterService.getById as jest.Mock).mockResolvedValue(mockTheater);
      (emailService.sendTheaterContactMessage as jest.Mock).mockResolvedValue(
        true
      );

      await SendTheaterContactMessage(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieTheaterService.getById).toHaveBeenCalledWith('theater-123');
      expect(emailService.sendTheaterContactMessage).toHaveBeenCalledWith(
        'theater-123',
        'user@example.com',
        'I would like to inquire about your theater.'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Email sent successfully',
        data: null,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Validation errors', () => {
    it('should throw BadRequestError if theaterId is missing', async () => {
      mockRequest.body = {
        email: 'user@example.com',
        message: 'Test message',
      };

      await SendTheaterContactMessage(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message:
            'Missing required fields: theaterId, email, and message are all required.',
        })
      );
      expect(movieTheaterService.getById).not.toHaveBeenCalled();
      expect(emailService.sendTheaterContactMessage).not.toHaveBeenCalled();
    });

    it('should throw BadRequestError if email is missing', async () => {
      mockRequest.body = {
        theaterId: 'theater-123',
        message: 'Test message',
      };

      await SendTheaterContactMessage(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
      expect(movieTheaterService.getById).not.toHaveBeenCalled();
      expect(emailService.sendTheaterContactMessage).not.toHaveBeenCalled();
    });

    it('should throw BadRequestError if message is missing', async () => {
      mockRequest.body = {
        theaterId: 'theater-123',
        email: 'user@example.com',
      };

      await SendTheaterContactMessage(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
      expect(movieTheaterService.getById).not.toHaveBeenCalled();
      expect(emailService.sendTheaterContactMessage).not.toHaveBeenCalled();
    });

    it('should throw BadRequestError if all fields are missing', async () => {
      mockRequest.body = {};

      await SendTheaterContactMessage(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message:
            'Missing required fields: theaterId, email, and message are all required.',
        })
      );
    });

    it('should throw BadRequestError if theaterId is empty string', async () => {
      mockRequest.body = {
        theaterId: '',
        email: 'user@example.com',
        message: 'Test message',
      };

      await SendTheaterContactMessage(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
    });

    it('should throw BadRequestError if email is empty string', async () => {
      mockRequest.body = {
        theaterId: 'theater-123',
        email: '',
        message: 'Test message',
      };

      await SendTheaterContactMessage(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
    });

    it('should throw BadRequestError if message is empty string', async () => {
      mockRequest.body = {
        theaterId: 'theater-123',
        email: 'user@example.com',
        message: '',
      };

      await SendTheaterContactMessage(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
    });
  });

  describe('Theater not found', () => {
    it('should call next with error if theater does not exist', async () => {
      mockRequest.body = {
        theaterId: 'non-existent-theater',
        email: 'user@example.com',
        message: 'Test message',
      };

      const notFoundError = new NotFoundError('Theater not found');
      (movieTheaterService.getById as jest.Mock).mockRejectedValue(
        notFoundError
      );

      await SendTheaterContactMessage(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieTheaterService.getById).toHaveBeenCalledWith(
        'non-existent-theater'
      );
      expect(emailService.sendTheaterContactMessage).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(notFoundError);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('Email service errors', () => {
    it('should call next with error if email service fails', async () => {
      mockRequest.body = {
        theaterId: 'theater-123',
        email: 'user@example.com',
        message: 'Test message',
      };

      (movieTheaterService.getById as jest.Mock).mockResolvedValue(mockTheater);

      const emailError = new Error('Email service unavailable');
      (emailService.sendTheaterContactMessage as jest.Mock).mockRejectedValue(
        emailError
      );

      await SendTheaterContactMessage(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(movieTheaterService.getById).toHaveBeenCalledWith('theater-123');
      expect(emailService.sendTheaterContactMessage).toHaveBeenCalledWith(
        'theater-123',
        'user@example.com',
        'Test message'
      );
      expect(mockNext).toHaveBeenCalledWith(emailError);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should call next with error if email sending times out', async () => {
      mockRequest.body = {
        theaterId: 'theater-123',
        email: 'user@example.com',
        message: 'Test message',
      };

      (movieTheaterService.getById as jest.Mock).mockResolvedValue(mockTheater);

      const timeoutError = new Error('Request timeout');
      (emailService.sendTheaterContactMessage as jest.Mock).mockRejectedValue(
        timeoutError
      );

      await SendTheaterContactMessage(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(timeoutError);
    });
  });

  describe('Edge cases', () => {
    it('should handle special characters in message', async () => {
      mockRequest.body = {
        theaterId: 'theater-123',
        email: 'user@example.com',
        message:
          'Special chars: <script>alert("xss")</script> & "quotes" & \'apostrophes\'',
      };

      (movieTheaterService.getById as jest.Mock).mockResolvedValue(mockTheater);
      (emailService.sendTheaterContactMessage as jest.Mock).mockResolvedValue(
        true
      );

      await SendTheaterContactMessage(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(emailService.sendTheaterContactMessage).toHaveBeenCalledWith(
        'theater-123',
        'user@example.com',
        expect.stringContaining('Special chars:')
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should handle very long messages', async () => {
      const longMessage = 'A'.repeat(10000);
      mockRequest.body = {
        theaterId: 'theater-123',
        email: 'user@example.com',
        message: longMessage,
      };

      (movieTheaterService.getById as jest.Mock).mockResolvedValue(mockTheater);
      (emailService.sendTheaterContactMessage as jest.Mock).mockResolvedValue(
        true
      );

      await SendTheaterContactMessage(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(emailService.sendTheaterContactMessage).toHaveBeenCalledWith(
        'theater-123',
        'user@example.com',
        longMessage
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should handle various email formats', async () => {
      mockRequest.body = {
        theaterId: 'theater-123',
        email: 'user+tag@subdomain.example.co.uk',
        message: 'Test message',
      };

      (movieTheaterService.getById as jest.Mock).mockResolvedValue(mockTheater);
      (emailService.sendTheaterContactMessage as jest.Mock).mockResolvedValue(
        true
      );

      await SendTheaterContactMessage(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(emailService.sendTheaterContactMessage).toHaveBeenCalledWith(
        'theater-123',
        'user+tag@subdomain.example.co.uk',
        'Test message'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('Service interaction order', () => {
    it('should verify theater exists before attempting to send email', async () => {
      mockRequest.body = {
        theaterId: 'theater-123',
        email: 'user@example.com',
        message: 'Test message',
      };

      const callOrder: string[] = [];

      (movieTheaterService.getById as jest.Mock).mockImplementation(
        async () => {
          callOrder.push('getById');
          return mockTheater;
        }
      );

      (emailService.sendTheaterContactMessage as jest.Mock).mockImplementation(
        async () => {
          callOrder.push('sendEmail');
          return true;
        }
      );

      await SendTheaterContactMessage(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(callOrder).toEqual(['getById', 'sendEmail']);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });
});
