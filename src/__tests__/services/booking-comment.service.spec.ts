import {
  BookingCommentFilter,
  bookingCommentService,
} from '../../services/booking-comment.service.js';
import {
  BookingComment,
  BookingCommentModel,
} from '../../models/booking-comment.schema.js';
import { BookingModel } from '../../models/booking.model.js';
import { ScreeningModel } from '../../models/screening.model.js';
import { NotFoundError } from '../../errors/not-found-error.js';
import { ConflictError } from '../../errors/conflict-error.js';

jest.mock('../../models/booking-comment.schema.js');
jest.mock('../../models/booking.model.js');
jest.mock('../../models/screening.model.js');

describe('BookingCommentService (unit)', () => {
  const mockComment: BookingComment = {
    bookingId: 'B1',
    comment: 'text',
    rating: 4,
    status: 'pending', // now accepted
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCommentByBookingId', () => {
    it('returns the comment if found', async () => {
      (BookingCommentModel.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockComment),
      });
      const result = await bookingCommentService.getCommentByBookingId('B1');
      expect(result).toBe(mockComment);
      expect(BookingCommentModel.findOne).toHaveBeenCalledWith({
        bookingId: 'B1',
      });
    });

    it('throws NotFoundError if not found', async () => {
      (BookingCommentModel.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });
      await expect(
        bookingCommentService.getCommentByBookingId('BAD')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('createComment', () => {
    it('creates comment if booking exists and used, and not already commented', async () => {
      (BookingModel.findOne as jest.Mock).mockResolvedValue({ status: 'used' });
      (BookingCommentModel.exists as jest.Mock).mockResolvedValue(null);
      (BookingCommentModel.create as jest.Mock).mockResolvedValue({
        ...mockComment,
        toObject: () => mockComment,
      });

      const data = { ...mockComment };
      const result = await bookingCommentService.createComment(data);
      expect(result).toBe(mockComment);
      expect(BookingModel.findOne).toHaveBeenCalledWith({
        where: { bookingId: data.bookingId },
      });
      expect(BookingCommentModel.create).toHaveBeenCalledWith(data);
    });

    it('throws NotFoundError if booking not found', async () => {
      (BookingModel.findOne as jest.Mock).mockResolvedValue(null);
      await expect(
        bookingCommentService.createComment(mockComment)
      ).rejects.toThrow(NotFoundError);
    });

    it('throws ConflictError if booking status is not "used"', async () => {
      (BookingModel.findOne as jest.Mock).mockResolvedValue({
        status: 'pending',
      });
      await expect(
        bookingCommentService.createComment(mockComment)
      ).rejects.toThrow(ConflictError);
    });

    it('throws ConflictError if comment already exists', async () => {
      (BookingModel.findOne as jest.Mock).mockResolvedValue({ status: 'used' });
      (BookingCommentModel.exists as jest.Mock).mockResolvedValue(true);
      await expect(
        bookingCommentService.createComment(mockComment)
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('updateComment', () => {
    it('updates and returns the comment if found', async () => {
      (BookingCommentModel.findOneAndUpdate as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockComment),
      });
      const result = await bookingCommentService.updateComment('B1', {
        comment: 'edit',
      });
      expect(result).toBe(mockComment);
      expect(BookingCommentModel.findOneAndUpdate).toHaveBeenCalledWith(
        { bookingId: 'B1' },
        { comment: 'edit' },
        { new: true }
      );
    });

    it('throws NotFoundError if not found', async () => {
      (BookingCommentModel.findOneAndUpdate as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });
      await expect(
        bookingCommentService.updateComment('BAD', {})
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteComment', () => {
    it('deletes the comment if found', async () => {
      (BookingCommentModel.deleteOne as jest.Mock).mockResolvedValue({
        deletedCount: 1,
      });
      await expect(
        bookingCommentService.deleteComment('B1')
      ).resolves.toBeUndefined();
      expect(BookingCommentModel.deleteOne).toHaveBeenCalledWith({
        bookingId: 'B1',
      });
    });

    it('throws NotFoundError if not found', async () => {
      (BookingCommentModel.deleteOne as jest.Mock).mockResolvedValue({
        deletedCount: 0,
      });
      await expect(bookingCommentService.deleteComment('BAD')).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('getAllComments', () => {
    it('returns all comments, sorted', async () => {
      (BookingCommentModel.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([mockComment]),
        }),
      });
      const result = await bookingCommentService.getAllComments();
      expect(result).toEqual([mockComment]);
      expect(BookingCommentModel.find).toHaveBeenCalled();
    });
  });

  describe('getCommentsByMovie', () => {
    it('returns comments for a movie', async () => {
      (ScreeningModel.findAll as jest.Mock).mockResolvedValue([
        { screeningId: 'S1' },
      ]);
      (BookingModel.findAll as jest.Mock).mockResolvedValue([
        { bookingId: 'B1' },
      ]);
      (BookingCommentModel.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([mockComment]),
        }),
      });
      const result = await bookingCommentService.getCommentsByMovie('M1');
      expect(result).toEqual([mockComment]);
    });

    it('returns empty if no screenings', async () => {
      (ScreeningModel.findAll as jest.Mock).mockResolvedValue([]);
      const result = await bookingCommentService.getCommentsByMovie('NOPE');
      expect(result).toEqual([]);
    });

    it('returns empty if no bookings', async () => {
      (ScreeningModel.findAll as jest.Mock).mockResolvedValue([
        { screeningId: 'S1' },
      ]);
      (BookingModel.findAll as jest.Mock).mockResolvedValue([]);
      const result = await bookingCommentService.getCommentsByMovie('M1');
      expect(result).toEqual([]);
    });
  });

  describe('getCommentsByStatus', () => {
    it('returns comments with given status', async () => {
      (BookingCommentModel.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([mockComment]),
        }),
      });
      const result = await bookingCommentService.getCommentsByStatus('pending');
      expect(result).toEqual([mockComment]);
      expect(BookingCommentModel.find).toHaveBeenCalledWith({
        status: 'pending',
      });
    });
  });

  describe('searchComments', () => {
    it('searches by text', async () => {
      (BookingCommentModel.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([mockComment]),
        }),
      });
      const result = await bookingCommentService.searchComments('good', {});
      expect(result).toEqual([mockComment]);
      expect(BookingCommentModel.find).toHaveBeenCalledWith({
        comment: { $regex: 'good', $options: 'i' },
      });
    });

    it('searches by filters (status, rating, bookingId, createdAt)', async () => {
      (BookingCommentModel.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([mockComment]),
        }),
      });
      const filters: BookingCommentFilter = {
        status: 'pending',
        rating: 5,
        bookingId: 'B1',
        createdAt: new Date(),
      };
      await bookingCommentService.searchComments(undefined, filters);
      expect(BookingCommentModel.find).toHaveBeenCalled();
    });

    it('searches by movieId filter', async () => {
      (ScreeningModel.findAll as jest.Mock).mockResolvedValue([
        { screeningId: 'S1' },
      ]);
      (BookingModel.findAll as jest.Mock).mockResolvedValue([
        { bookingId: 'B1' },
      ]);
      (BookingCommentModel.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([mockComment]),
        }),
      });
      const filters = { movieId: 'M1' };
      await bookingCommentService.searchComments(undefined, filters);
      expect(ScreeningModel.findAll).toHaveBeenCalled();
      expect(BookingModel.findAll).toHaveBeenCalled();
      expect(BookingCommentModel.find).toHaveBeenCalledWith({
        bookingId: { $in: ['B1'] },
      });
    });
  });

  describe('confirmComment', () => {
    it('updates status to confirmed if found', async () => {
      (BookingCommentModel.findOneAndUpdate as jest.Mock).mockReturnValue({
        lean: jest
          .fn()
          .mockResolvedValue({ ...mockComment, status: 'confirmed' }),
      });
      const result = await bookingCommentService.confirmComment('B1');
      expect(result.status).toBe('confirmed');
    });

    it('throws NotFoundError if not found', async () => {
      (BookingCommentModel.findOneAndUpdate as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });
      await expect(bookingCommentService.confirmComment('BAD')).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('getAverageRatingForMovie', () => {
    it('returns average rating for movie', async () => {
      (ScreeningModel.findAll as jest.Mock).mockResolvedValue([
        { screeningId: 'S1' },
      ]);
      (BookingModel.findAll as jest.Mock).mockResolvedValue([
        { bookingId: 'B1' },
      ]);
      (BookingCommentModel.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue([{ rating: 4 }, { rating: 5 }]),
      });
      const avg = await bookingCommentService.getAverageRatingForMovie('M1');
      expect(avg).toBe(4.5);
    });

    it('returns null if no screenings', async () => {
      (ScreeningModel.findAll as jest.Mock).mockResolvedValue([]);
      const avg = await bookingCommentService.getAverageRatingForMovie('M1');
      expect(avg).toBeNull();
    });

    it('returns null if no bookings', async () => {
      (ScreeningModel.findAll as jest.Mock).mockResolvedValue([
        { screeningId: 'S1' },
      ]);
      (BookingModel.findAll as jest.Mock).mockResolvedValue([]);
      const avg = await bookingCommentService.getAverageRatingForMovie('M1');
      expect(avg).toBeNull();
    });

    it('returns null if no comments', async () => {
      (ScreeningModel.findAll as jest.Mock).mockResolvedValue([
        { screeningId: 'S1' },
      ]);
      (BookingModel.findAll as jest.Mock).mockResolvedValue([
        { bookingId: 'B1' },
      ]);
      (BookingCommentModel.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });
      const avg = await bookingCommentService.getAverageRatingForMovie('M1');
      expect(avg).toBeNull();
    });
  });
});
