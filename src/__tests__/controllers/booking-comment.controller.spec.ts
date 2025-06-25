import * as bookingCommentController from '../../controllers/booking-comment.controller.js';
import { bookingCommentService } from '../../services/booking-comment.service.js';
import { NotFoundError } from '../../errors/not-found-error.js';

jest.mock('../../services/booking-comment.service.js');

// Simple helper to mock Express' req, res, and next
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
  bookingId: '123',
  comment: 'Great movie!',
  rating: 5,
  status: 'pending' as const, // ensure correct type
  createdAt: new Date(),
  updatedAt: new Date(),
};

const formattedComment = {
  ...mockComment,
  user: {
    userId: '1',
    username: 'bob',
    firstName: 'Bob',
    lastName: 'Smith',
    email: 'bob@mail.com',
  },
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('BookingCommentController', () => {
  describe('getCommentByBookingId', () => {
    it('should return a formatted comment by bookingId', async () => {
      // Mock the service method to return the raw comment
      (
        bookingCommentService.getCommentByBookingId as jest.Mock
      ).mockResolvedValue(mockComment);

      // VERY IMPORTANT: mock the formatCommentResponse function
      // It must be mocked on the module instance, because the controller imports and uses it directly
      const formatSpy = jest
        .spyOn(bookingCommentController, 'formatCommentResponse')
        .mockResolvedValue(formattedComment);

      const req = mockRequest({}, { bookingId: mockComment.bookingId });
      const res = mockResponse();

      await bookingCommentController.getCommentByBookingId(req, res, mockNext);

      // Service is called with correct bookingId
      expect(bookingCommentService.getCommentByBookingId).toHaveBeenCalledWith(
        mockComment.bookingId
      );

      // Our formatting function is called once with the raw comment
      expect(formatSpy).toHaveBeenCalledWith(mockComment);

      // The response should be the formatted comment in the right structure
      expect(res.json).toHaveBeenCalledWith({
        message: 'Comment found',
        data: formattedComment,
      });

      // No error should have been forwarded
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with NotFoundError if not found', async () => {
      // Mock the service to throw a NotFoundError
      (
        bookingCommentService.getCommentByBookingId as jest.Mock
      ).mockRejectedValue(new NotFoundError('not found'));

      const req = mockRequest({}, { bookingId: '404' });
      const res = mockResponse();

      await bookingCommentController.getCommentByBookingId(req, res, mockNext);

      // Should call next with an instance of NotFoundError
      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
      // Should NOT call res.json
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
