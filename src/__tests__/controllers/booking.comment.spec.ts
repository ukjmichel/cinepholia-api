import { Request, Response, NextFunction } from 'express';
import { BookingCommentController } from '../../controllers/booking-comment.controller';
import { bookingCommentService } from '../../services/booking-comment.service';
import { UserModel } from '../../models/user.model';
import { BookingModel } from '../../models/booking.model';
import { BadRequestError } from '../../errors/bad-request-error';

// Mock dependencies
jest.mock('../../services/booking-comment.service');
jest.mock('../../models/user.model');
jest.mock('../../models/booking.model');
jest.mock('dompurify', () => {
  return jest.fn(() => ({
    sanitize: jest.fn((input) => input.replace(/<[^>]*>/g, '')),
  }));
});
jest.mock('jsdom', () => ({
  JSDOM: jest.fn(() => ({ window: {} })),
}));

describe('BookingCommentController', () => {
  let controller: BookingCommentController;
  let mockRequest: any;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  const mockComment = {
    id: 'comment-1',
    bookingId: 'booking-123',
    comment: 'Great movie!',
    rating: 5,
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
    toObject: jest.fn().mockReturnThis(),
  };

  const mockUser = {
    id: 'user-123',
    username: 'john_doe',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
  };

  const mockBooking = {
    bookingId: 'booking-123',
    userId: 'user-123',
    user: mockUser,
  };

  beforeEach(() => {
    controller = new BookingCommentController();

    mockRequest = {
      params: {},
      query: {},
      body: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    // Mock BookingModel.findOne to return booking with user
    (BookingModel.findOne as jest.Mock) = jest
      .fn()
      .mockResolvedValue(mockBooking);

    jest.clearAllMocks();
  });

  describe('getAllComments', () => {
    it('should return all comments with user details', async () => {
      const mockComments = [mockComment, { ...mockComment, id: 'comment-2' }];
      (bookingCommentService.getAllComments as jest.Mock).mockResolvedValue(
        mockComments
      );

      await controller.getAllComments(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(bookingCommentService.getAllComments).toHaveBeenCalled();
      expect(BookingModel.findOne).toHaveBeenCalledTimes(2);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'All comments',
        data: expect.arrayContaining([
          expect.objectContaining({
            comment: 'Great movie!',
            user: expect.objectContaining({
              userId: 'user-123',
              username: 'john_doe',
            }),
          }),
        ]),
      });
    });

    it('should call next with error on failure', async () => {
      const error = new Error('Database error');
      (bookingCommentService.getAllComments as jest.Mock).mockRejectedValue(
        error
      );

      await controller.getAllComments(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getCommentsByMovie', () => {
    it('should return comments for a specific movie', async () => {
      mockRequest.params = { movieId: 'movie-123' };
      const mockComments = [mockComment];
      (bookingCommentService.getCommentsByMovie as jest.Mock).mockResolvedValue(
        mockComments
      );

      await controller.getCommentsByMovie(
        mockRequest,
        mockResponse as Response,
        mockNext
      );

      expect(bookingCommentService.getCommentsByMovie).toHaveBeenCalledWith(
        'movie-123'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Comments for movie',
        data: expect.arrayContaining([
          expect.objectContaining({ comment: 'Great movie!' }),
        ]),
      });
    });
  });

  describe('getCommentsByStatus', () => {
    it('should return comments filtered by pending status', async () => {
      mockRequest.params = { status: 'pending' };
      const mockComments = [mockComment];
      (
        bookingCommentService.getCommentsByStatus as jest.Mock
      ).mockResolvedValue(mockComments);

      await controller.getCommentsByStatus(
        mockRequest,
        mockResponse as Response,
        mockNext
      );

      expect(bookingCommentService.getCommentsByStatus).toHaveBeenCalledWith(
        'pending'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Comments with status pending',
        data: expect.any(Array),
      });
    });

    it('should return comments filtered by confirmed status', async () => {
      mockRequest.params = { status: 'confirmed' };
      const mockComments = [{ ...mockComment, status: 'confirmed' }];
      (
        bookingCommentService.getCommentsByStatus as jest.Mock
      ).mockResolvedValue(mockComments);

      await controller.getCommentsByStatus(
        mockRequest,
        mockResponse as Response,
        mockNext
      );

      expect(bookingCommentService.getCommentsByStatus).toHaveBeenCalledWith(
        'confirmed'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should throw BadRequestError for invalid status', async () => {
      mockRequest.params = { status: 'invalid' };

      await controller.getCommentsByStatus(
        mockRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid status. Must be pending or confirmed.',
        })
      );
    });
  });

  describe('getCommentByBookingId', () => {
    it('should return comment by booking ID', async () => {
      mockRequest.params = { bookingId: 'booking-123' };
      (
        bookingCommentService.getCommentByBookingId as jest.Mock
      ).mockResolvedValue(mockComment);

      await controller.getCommentByBookingId(
        mockRequest,
        mockResponse as Response,
        mockNext
      );

      expect(bookingCommentService.getCommentByBookingId).toHaveBeenCalledWith(
        'booking-123'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Comment found',
        data: expect.objectContaining({
          bookingId: 'booking-123',
        }),
      });
    });
  });

  describe('getCommentsByUser', () => {
    it('should return comments by user ID', async () => {
      mockRequest.params = { userId: 'user-123' };
      const mockComments = [mockComment, { ...mockComment, id: 'comment-2' }];
      (bookingCommentService.getCommentsByUser as jest.Mock).mockResolvedValue(
        mockComments
      );

      await controller.getCommentsByUser(
        mockRequest,
        mockResponse as Response,
        mockNext
      );

      expect(bookingCommentService.getCommentsByUser).toHaveBeenCalledWith(
        'user-123'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Comments by user user-123',
        data: expect.any(Array),
      });
    });
  });

  describe('createComment', () => {
    it('should create comment with sanitized input', async () => {
      mockRequest.params = { bookingId: 'booking-123' };
      mockRequest.body = {
        comment: '<script>alert("xss")</script>Nice movie!',
        rating: 4,
      };

      (bookingCommentService.createComment as jest.Mock).mockResolvedValue(
        mockComment
      );

      await controller.createComment(
        mockRequest,
        mockResponse as Response,
        mockNext
      );

      expect(bookingCommentService.createComment).toHaveBeenCalledWith({
        comment: expect.not.stringContaining('<script>'),
        rating: 4,
        bookingId: 'booking-123',
      });
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Comment created',
        data: expect.any(Object),
      });
    });

    it('should throw BadRequestError if bookingId is missing', async () => {
      mockRequest.params = {};
      mockRequest.body = { comment: 'Nice!', rating: 5 };

      await controller.createComment(
        mockRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'bookingId is required in URL',
        })
      );
    });

    it('should create comment without sanitization if no comment provided', async () => {
      mockRequest.params = { bookingId: 'booking-123' };
      mockRequest.body = { rating: 5 };

      (bookingCommentService.createComment as jest.Mock).mockResolvedValue(
        mockComment
      );

      await controller.createComment(
        mockRequest,
        mockResponse as Response,
        mockNext
      );

      expect(bookingCommentService.createComment).toHaveBeenCalledWith({
        rating: 5,
        bookingId: 'booking-123',
      });
    });
  });

  describe('updateComment', () => {
    it('should update comment with sanitized input', async () => {
      mockRequest.params = { bookingId: 'booking-123' };
      mockRequest.body = {
        comment: '<b>Updated</b> comment',
        rating: 3,
      };

      const updatedComment = {
        ...mockComment,
        comment: 'Updated comment',
        rating: 3,
      };
      (bookingCommentService.updateComment as jest.Mock).mockResolvedValue(
        updatedComment
      );

      await controller.updateComment(
        mockRequest,
        mockResponse as Response,
        mockNext
      );

      expect(bookingCommentService.updateComment).toHaveBeenCalledWith(
        'booking-123',
        expect.objectContaining({
          comment: expect.not.stringContaining('<b>'),
          rating: 3,
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Comment updated',
        data: expect.any(Object),
      });
    });

    it('should update without sanitization if no comment provided', async () => {
      mockRequest.params = { bookingId: 'booking-123' };
      mockRequest.body = { rating: 4 };

      (bookingCommentService.updateComment as jest.Mock).mockResolvedValue(
        mockComment
      );

      await controller.updateComment(
        mockRequest,
        mockResponse as Response,
        mockNext
      );

      expect(bookingCommentService.updateComment).toHaveBeenCalledWith(
        'booking-123',
        {
          rating: 4,
        }
      );
    });
  });

  describe('deleteComment', () => {
    it('should delete comment successfully', async () => {
      mockRequest.params = { bookingId: 'booking-123' };
      (bookingCommentService.deleteComment as jest.Mock).mockResolvedValue(
        true
      );

      await controller.deleteComment(
        mockRequest,
        mockResponse as Response,
        mockNext
      );

      expect(bookingCommentService.deleteComment).toHaveBeenCalledWith(
        'booking-123'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Comment deleted',
        data: null,
      });
    });

    it('should call next with error on failure', async () => {
      mockRequest.params = { bookingId: 'booking-123' };
      const error = new Error('Delete failed');
      (bookingCommentService.deleteComment as jest.Mock).mockRejectedValue(
        error
      );

      await controller.deleteComment(
        mockRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('confirmComment', () => {
    it('should confirm a pending comment', async () => {
      mockRequest.params = { bookingId: 'booking-123' };
      const confirmedComment = { ...mockComment, status: 'confirmed' };
      (bookingCommentService.confirmComment as jest.Mock).mockResolvedValue(
        confirmedComment
      );

      await controller.confirmComment(
        mockRequest,
        mockResponse as Response,
        mockNext
      );

      expect(bookingCommentService.confirmComment).toHaveBeenCalledWith(
        'booking-123'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Comment confirmed',
        data: expect.objectContaining({
          status: 'confirmed',
        }),
      });
    });
  });

  describe('searchComments', () => {
    it('should search comments with text query', async () => {
      mockRequest.query = { q: 'great' };
      const mockResults = [mockComment];
      (bookingCommentService.searchComments as jest.Mock).mockResolvedValue(
        mockResults
      );

      await controller.searchComments(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(bookingCommentService.searchComments).toHaveBeenCalledWith(
        'great',
        {}
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Search results',
        data: expect.any(Array),
      });
    });

    it('should search comments with filters', async () => {
      mockRequest.query = {
        q: 'movie',
        status: 'confirmed',
        rating: '5',
        movieId: 'movie-123',
      };
      const mockResults = [mockComment];
      (bookingCommentService.searchComments as jest.Mock).mockResolvedValue(
        mockResults
      );

      await controller.searchComments(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(bookingCommentService.searchComments).toHaveBeenCalledWith(
        'movie',
        {
          status: 'confirmed',
          rating: 5,
          movieId: 'movie-123',
        }
      );
    });

    it('should search with bookingId filter', async () => {
      mockRequest.query = { bookingId: 'booking-123' };
      (bookingCommentService.searchComments as jest.Mock).mockResolvedValue([
        mockComment,
      ]);

      await controller.searchComments(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(bookingCommentService.searchComments).toHaveBeenCalledWith(
        undefined,
        {
          bookingId: 'booking-123',
        }
      );
    });

    it('should search with createdAt filter', async () => {
      const date = '2025-01-01';
      mockRequest.query = { createdAt: date };
      (bookingCommentService.searchComments as jest.Mock).mockResolvedValue([]);

      await controller.searchComments(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(bookingCommentService.searchComments).toHaveBeenCalledWith(
        undefined,
        {
          createdAt: new Date(date),
        }
      );
    });

    it('should handle search without query or filters', async () => {
      mockRequest.query = {};
      (bookingCommentService.searchComments as jest.Mock).mockResolvedValue([]);

      await controller.searchComments(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(bookingCommentService.searchComments).toHaveBeenCalledWith(
        undefined,
        {}
      );
    });
  });

  describe('getAverageRatingForMovie', () => {
    it('should return average rating for a movie', async () => {
      mockRequest.params = { movieId: 'movie-123' };
      (
        bookingCommentService.getAverageRatingForMovie as jest.Mock
      ).mockResolvedValue(4.5);

      await controller.getAverageRatingForMovie(
        mockRequest,
        mockResponse as Response,
        mockNext
      );

      expect(
        bookingCommentService.getAverageRatingForMovie
      ).toHaveBeenCalledWith('movie-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Average rating',
        data: 4.5,
      });
    });

    it('should return 0 if no ratings exist', async () => {
      mockRequest.params = { movieId: 'movie-456' };
      (
        bookingCommentService.getAverageRatingForMovie as jest.Mock
      ).mockResolvedValue(0);

      await controller.getAverageRatingForMovie(
        mockRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Average rating',
        data: 0,
      });
    });
  });

  describe('formatCommentResponse edge cases', () => {
    it('should handle booking without user', async () => {
      (BookingModel.findOne as jest.Mock).mockResolvedValue({
        bookingId: 'booking-123',
        user: null,
      });

      const mockComments = [mockComment];
      (bookingCommentService.getAllComments as jest.Mock).mockResolvedValue(
        mockComments
      );

      await controller.getAllComments(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'All comments',
        data: expect.arrayContaining([
          expect.objectContaining({
            user: null,
          }),
        ]),
      });
    });

    it('should handle booking not found', async () => {
      (BookingModel.findOne as jest.Mock).mockResolvedValue(null);

      const mockComments = [mockComment];
      (bookingCommentService.getAllComments as jest.Mock).mockResolvedValue(
        mockComments
      );

      await controller.getAllComments(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'All comments',
        data: expect.arrayContaining([
          expect.objectContaining({
            user: null,
          }),
        ]),
      });
    });
  });
});
