import * as bookingCommentController from '../../controllers/booking-comment.controller.js';
import { bookingCommentService } from '../../services/booking-comment.service.js';
import { NotFoundError } from '../../errors/not-found-error.js';
import { BadRequestError } from '../../errors/bad-request-error.js';
jest.mock('../../services/booking-comment.service.js');

const mockRequest = (body = {}, params = {}, query = {}) =>
  ({ body, params, query }) as any;

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

const mockComment = {
  bookingId: 'e27163b0-08d7-47d0-bb62-b48d312c919f',
  comment: 'Great movie!',
  rating: 5,
  status: 'pending',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockComments = [mockComment];

beforeEach(() => {
  jest.clearAllMocks();
});

describe('BookingCommentController', () => {
  describe('getCommentByBookingId', () => {
    it('should return a comment by bookingId', async () => {
      (
        bookingCommentService.getCommentByBookingId as jest.Mock
      ).mockResolvedValue(mockComment);
      const req = mockRequest({}, { bookingId: mockComment.bookingId });
      const res = mockResponse();
      await bookingCommentController.getCommentByBookingId(req, res, mockNext);
      expect(bookingCommentService.getCommentByBookingId).toHaveBeenCalledWith(
        mockComment.bookingId
      );
      expect(res.json).toHaveBeenCalledWith({
        message: 'Comment found',
        data: mockComment,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with NotFoundError if not found', async () => {
      (
        bookingCommentService.getCommentByBookingId as jest.Mock
      ).mockRejectedValue(new NotFoundError('not found'));
      const req = mockRequest({}, { bookingId: '404' });
      const res = mockResponse();
      await bookingCommentController.getCommentByBookingId(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('createComment', () => {
    it('should create a comment and return 201', async () => {
      (bookingCommentService.createComment as jest.Mock).mockResolvedValue(
        mockComment
      );
      const req = mockRequest(mockComment);
      const res = mockResponse();
      await bookingCommentController.createComment(req, res, mockNext);
      expect(bookingCommentService.createComment).toHaveBeenCalledWith(
        req.body
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Comment created',
        data: mockComment,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with error if creation fails', async () => {
      (bookingCommentService.createComment as jest.Mock).mockRejectedValue(
        new Error('fail')
      );
      const req = mockRequest(mockComment);
      const res = mockResponse();
      await bookingCommentController.createComment(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(res.status).not.toHaveBeenCalledWith(201);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('updateComment', () => {
    it('should update and return a comment', async () => {
      const updated = { ...mockComment, status: 'confirmed' };
      (bookingCommentService.updateComment as jest.Mock).mockResolvedValue(
        updated
      );
      const req = mockRequest(
        { status: 'confirmed' },
        { bookingId: mockComment.bookingId }
      );
      const res = mockResponse();
      await bookingCommentController.updateComment(req, res, mockNext);
      expect(bookingCommentService.updateComment).toHaveBeenCalledWith(
        mockComment.bookingId,
        { status: 'confirmed' }
      );
      expect(res.json).toHaveBeenCalledWith({
        message: 'Comment updated',
        data: updated,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with NotFoundError if not found', async () => {
      (bookingCommentService.updateComment as jest.Mock).mockRejectedValue(
        new NotFoundError('not found')
      );
      const req = mockRequest({ status: 'confirmed' }, { bookingId: 'bad' });
      const res = mockResponse();
      await bookingCommentController.updateComment(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('deleteComment', () => {
    it('should delete a comment and return 204', async () => {
      (bookingCommentService.deleteComment as jest.Mock).mockResolvedValue(
        undefined
      );
      const req = mockRequest({}, { bookingId: mockComment.bookingId });
      const res = mockResponse();
      await bookingCommentController.deleteComment(req, res, mockNext);
      expect(bookingCommentService.deleteComment).toHaveBeenCalledWith(
        mockComment.bookingId
      );
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalledWith();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with NotFoundError if not found', async () => {
      (bookingCommentService.deleteComment as jest.Mock).mockRejectedValue(
        new NotFoundError('not found')
      );
      const req = mockRequest({}, { bookingId: 'bad' });
      const res = mockResponse();
      await bookingCommentController.deleteComment(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
      expect(res.status).not.toHaveBeenCalledWith(204);
    });
  });

  describe('getAllComments', () => {
    it('should return all comments', async () => {
      (bookingCommentService.getAllComments as jest.Mock).mockResolvedValue(
        mockComments
      );
      const req = mockRequest();
      const res = mockResponse();
      await bookingCommentController.getAllComments(req, res, mockNext);
      expect(bookingCommentService.getAllComments).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        message: 'All comments',
        data: mockComments,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next if error thrown', async () => {
      (bookingCommentService.getAllComments as jest.Mock).mockRejectedValue(
        new Error('fail')
      );
      const req = mockRequest();
      const res = mockResponse();
      await bookingCommentController.getAllComments(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getCommentsByStatus', () => {
    it('should return comments by status', async () => {
      (
        bookingCommentService.getCommentsByStatus as jest.Mock
      ).mockResolvedValue(mockComments);
      const req = mockRequest({}, { status: 'pending' });
      const res = mockResponse();
      await bookingCommentController.getCommentsByStatus(req, res, mockNext);
      expect(bookingCommentService.getCommentsByStatus).toHaveBeenCalledWith(
        'pending'
      );
      expect(res.json).toHaveBeenCalledWith({
        message: 'Comments with status pending',
        data: mockComments,
      });
    });

    it('should call next with BadRequestError if invalid status', async () => {
      const req = mockRequest({}, { status: 'invalid' });
      const res = mockResponse();
      await bookingCommentController.getCommentsByStatus(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('confirmComment', () => {
    it('should confirm a comment', async () => {
      const confirmed = { ...mockComment, status: 'confirmed' };
      (bookingCommentService.confirmComment as jest.Mock).mockResolvedValue(
        confirmed
      );
      const req = mockRequest({}, { bookingId: mockComment.bookingId });
      const res = mockResponse();
      await bookingCommentController.confirmComment(req, res, mockNext);
      expect(bookingCommentService.confirmComment).toHaveBeenCalledWith(
        mockComment.bookingId
      );
      expect(res.json).toHaveBeenCalledWith({
        message: 'Comment confirmed',
        data: confirmed,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with NotFoundError if not found', async () => {
      (bookingCommentService.confirmComment as jest.Mock).mockRejectedValue(
        new NotFoundError('not found')
      );
      const req = mockRequest({}, { bookingId: 'bad' });
      const res = mockResponse();
      await bookingCommentController.confirmComment(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('getCommentsByMovieId', () => {
    it('should return comments for a movie', async () => {
      (
        bookingCommentService.getCommentsByMovieId as jest.Mock
      ).mockResolvedValue(mockComments);
      const req = mockRequest({}, { movieId: 'movie-1' });
      const res = mockResponse();
      await bookingCommentController.getCommentsByMovieId(req, res, mockNext);
      expect(bookingCommentService.getCommentsByMovieId).toHaveBeenCalledWith(
        'movie-1'
      );
      expect(res.json).toHaveBeenCalledWith({
        message: 'Comments for movie movie-1',
        data: mockComments,
      });
    });
  });

  describe('searchComments', () => {
    it('should return comments matching the query', async () => {
      (bookingCommentService.searchComments as jest.Mock).mockResolvedValue(
        mockComments
      );
      const req = mockRequest({}, {}, { q: 'great' });
      const res = mockResponse();
      await bookingCommentController.searchComments(req, res, mockNext);
      expect(bookingCommentService.searchComments).toHaveBeenCalledWith(
        'great'
      );
      expect(res.json).toHaveBeenCalledWith({
        message: 'Comments search results',
        data: mockComments,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with BadRequestError if query is missing', async () => {
      const req = mockRequest({}, {}, {});
      const res = mockResponse();
      await bookingCommentController.searchComments(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
      expect(res.json).not.toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should call next if error thrown', async () => {
      (bookingCommentService.searchComments as jest.Mock).mockRejectedValue(
        new Error('fail')
      );
      const req = mockRequest({}, {}, { q: 'fail' });
      const res = mockResponse();
      await bookingCommentController.searchComments(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
