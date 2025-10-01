// src/__tests__/services/booking-comment.service.spec.ts
import { jest } from '@jest/globals';
import { BookingCommentService } from '../../services/booking-comment.service.js';
import { BookingCommentModel } from '../../models/booking-comment.schema.js';
import { BookingModel } from '../../models/booking.model.js';
import { ScreeningModel } from '../../models/screening.model.js';
import { NotFoundError } from '../../errors/not-found-error.js';
import { ConflictError } from '../../errors/conflict-error.js';

describe('BookingCommentService', () => {
  const svc = new BookingCommentService();

  const baseComment = {
    bookingId: 'booking-123',
    userId: 'user-123',
    comment: 'Great movie experience!',
    rating: 5,
    status: 'pending' as const,
    createdAt: new Date('2025-09-25T12:00:00Z'),
    updatedAt: new Date('2025-09-25T12:00:00Z'),
  };

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('getCommentByBookingId', () => {
    it('returns comment when found', async () => {
      // @ts-ignore
      const leanSpy = jest.fn().mockResolvedValue(baseComment);
      jest.spyOn(BookingCommentModel, 'findOne').mockReturnValue({
        lean: leanSpy,
      } as any);

      const result = await svc.getCommentByBookingId('booking-123');

      expect(result).toEqual(baseComment);
      expect(leanSpy).toHaveBeenCalled();
    });

    it('throws NotFoundError when comment not found', async () => {
      // @ts-ignore
      const leanSpy = jest.fn().mockResolvedValue(null);
      jest.spyOn(BookingCommentModel, 'findOne').mockReturnValue({
        lean: leanSpy,
      } as any);

      await expect(svc.getCommentByBookingId('nonexistent')).rejects.toThrow(
        NotFoundError
      );
      await expect(svc.getCommentByBookingId('nonexistent')).rejects.toThrow(
        'No comment found for bookingId nonexistent'
      );
    });
  });

  describe('createComment', () => {
    it('creates comment successfully for USED booking', async () => {
      jest.spyOn(BookingModel, 'findOne').mockResolvedValue({
        status: 'USED',
      } as any);

      // @ts-ignore
      const toObjectSpy = jest.fn().mockReturnValue(baseComment);
      jest.spyOn(BookingCommentModel, 'create').mockResolvedValue({
        toObject: toObjectSpy,
      } as any);

      const result = await svc.createComment(baseComment as any);

      expect(result).toEqual(baseComment);
      expect(toObjectSpy).toHaveBeenCalled();
    });

    it('throws NotFoundError when booking does not exist', async () => {
      jest.spyOn(BookingModel, 'findOne').mockResolvedValue(null);

      await expect(svc.createComment(baseComment as any)).rejects.toThrow(
        NotFoundError
      );
      await expect(svc.createComment(baseComment as any)).rejects.toThrow(
        'Booking with id booking-123 not found'
      );
    });

    it('throws ConflictError when booking is not USED', async () => {
      jest.spyOn(BookingModel, 'findOne').mockResolvedValue({
        status: 'PENDING',
      } as any);

      await expect(svc.createComment(baseComment as any)).rejects.toThrow(
        ConflictError
      );
      await expect(svc.createComment(baseComment as any)).rejects.toThrow(
        'You can only comment on used bookings'
      );
    });

    it('throws ConflictError when comment already exists (duplicate)', async () => {
      jest.spyOn(BookingModel, 'findOne').mockResolvedValue({
        status: 'USED',
      } as any);

      const duplicateError: any = new Error('Duplicate key');
      duplicateError.code = 11000;
      jest
        .spyOn(BookingCommentModel, 'create')
        .mockRejectedValue(duplicateError);

      await expect(svc.createComment(baseComment as any)).rejects.toThrow(
        ConflictError
      );
      await expect(svc.createComment(baseComment as any)).rejects.toThrow(
        'Comment already exists for bookingId booking-123'
      );
    });

    it('re-throws other errors during creation', async () => {
      jest.spyOn(BookingModel, 'findOne').mockResolvedValue({
        status: 'USED',
      } as any);

      const otherError = new Error('Database error');
      jest.spyOn(BookingCommentModel, 'create').mockRejectedValue(otherError);

      await expect(svc.createComment(baseComment as any)).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('updateComment', () => {
    it('updates comment successfully', async () => {
      const updatedComment = { ...baseComment, rating: 4 };
      // @ts-ignore
      const leanSpy = jest.fn().mockResolvedValue(updatedComment);

      jest.spyOn(BookingCommentModel, 'findOneAndUpdate').mockReturnValue({
        lean: leanSpy,
      } as any);

      const result = await svc.updateComment('booking-123', {
        rating: 4,
      } as any);

      expect(result).toEqual(updatedComment);
      expect(leanSpy).toHaveBeenCalled();
    });

    it('throws NotFoundError when comment not found', async () => {
      // @ts-ignore
      const leanSpy = jest.fn().mockResolvedValue(null);
      jest.spyOn(BookingCommentModel, 'findOneAndUpdate').mockReturnValue({
        lean: leanSpy,
      } as any);

      await expect(
        svc.updateComment('nonexistent', { rating: 3 } as any)
      ).rejects.toThrow(NotFoundError);
    });

    it('passes correct parameters to findOneAndUpdate', async () => {
      // @ts-ignore
      const leanSpy = jest.fn().mockResolvedValue(baseComment);
      const spy = jest
        .spyOn(BookingCommentModel, 'findOneAndUpdate')
        .mockReturnValue({
          lean: leanSpy,
        } as any);

      await svc.updateComment('booking-123', { status: 'confirmed' } as any);

      expect(spy).toHaveBeenCalledWith(
        { bookingId: 'booking-123' },
        { status: 'confirmed' },
        { new: true }
      );
    });
  });

  describe('deleteComment', () => {
    it('deletes comment successfully', async () => {
      jest
        .spyOn(BookingCommentModel, 'deleteOne')
        .mockResolvedValue({ deletedCount: 1 } as any);

      await expect(svc.deleteComment('booking-123')).resolves.not.toThrow();
    });

    it('throws NotFoundError when comment not found', async () => {
      jest
        .spyOn(BookingCommentModel, 'deleteOne')
        .mockResolvedValue({ deletedCount: 0 } as any);

      await expect(svc.deleteComment('nonexistent')).rejects.toThrow(
        NotFoundError
      );
      await expect(svc.deleteComment('nonexistent')).rejects.toThrow(
        'No comment found for bookingId nonexistent'
      );
    });
  });

  describe('getAllComments', () => {
    it('returns all comments sorted by createdAt descending', async () => {
      const comments = [
        { ...baseComment, bookingId: 'booking-1' },
        { ...baseComment, bookingId: 'booking-2' },
      ];
      // @ts-ignore
      const leanSpy = jest.fn().mockResolvedValue(comments);
      // @ts-ignore
      const sortSpy = jest.fn().mockReturnValue({ lean: leanSpy });
      jest.spyOn(BookingCommentModel, 'find').mockReturnValue({
        sort: sortSpy,
      } as any);

      const result = await svc.getAllComments();

      expect(result).toEqual(comments);
      expect(sortSpy).toHaveBeenCalledWith({ createdAt: -1 });
    });
  });

  describe('getCommentsByMovie', () => {
    it('returns comments for a specific movie', async () => {
      jest
        .spyOn(ScreeningModel, 'findAll')
        .mockResolvedValue([
          { screeningId: 'screening-1' },
          { screeningId: 'screening-2' },
        ] as any);

      jest
        .spyOn(BookingModel, 'findAll')
        .mockResolvedValue([
          { bookingId: 'booking-1' },
          { bookingId: 'booking-2' },
        ] as any);

      const comments = [
        { ...baseComment, bookingId: 'booking-1' },
        { ...baseComment, bookingId: 'booking-2' },
      ];
      // @ts-ignore
      const leanSpy = jest.fn().mockResolvedValue(comments);
      // @ts-ignore
      const sortSpy = jest.fn().mockReturnValue({ lean: leanSpy });
      jest.spyOn(BookingCommentModel, 'find').mockReturnValue({
        sort: sortSpy,
      } as any);

      const result = await svc.getCommentsByMovie('movie-123');

      expect(result).toEqual(comments);
    });

    it('returns empty array when no screenings found', async () => {
      jest.spyOn(ScreeningModel, 'findAll').mockResolvedValue([]);

      const result = await svc.getCommentsByMovie('movie-123');

      expect(result).toEqual([]);
    });

    it('returns empty array when no bookings found', async () => {
      jest
        .spyOn(ScreeningModel, 'findAll')
        .mockResolvedValue([{ screeningId: 'screening-1' }] as any);
      jest.spyOn(BookingModel, 'findAll').mockResolvedValue([]);

      const result = await svc.getCommentsByMovie('movie-123');

      expect(result).toEqual([]);
    });
  });

  describe('getCommentsByStatus', () => {
    it('returns comments filtered by status', async () => {
      const pendingComments = [{ ...baseComment, status: 'pending' as const }];
      // @ts-ignore
      const leanSpy = jest.fn().mockResolvedValue(pendingComments);
      // @ts-ignore
      const sortSpy = jest.fn().mockReturnValue({ lean: leanSpy });
      jest.spyOn(BookingCommentModel, 'find').mockReturnValue({
        sort: sortSpy,
      } as any);

      const result = await svc.getCommentsByStatus('pending');

      expect(result).toEqual(pendingComments);
    });
  });

  describe('getCommentsByUser', () => {
  it('returns enriched comments with movie information', async () => {
    // Mock bookings
    jest.spyOn(BookingModel, 'findAll').mockResolvedValue([
      { bookingId: 'booking-123', screeningId: 'screening-1' }, // Use booking-123 to match baseComment
    ] as any);

    // Mock comments
    // @ts-ignore
    const leanSpy = jest.fn().mockResolvedValue([baseComment]);
    const sortSpy = jest.fn().mockReturnValue({ lean: leanSpy });
    jest.spyOn(BookingCommentModel, 'find').mockReturnValue({
      sort: sortSpy,
    } as any);

    // Mock screenings - this should match the screeningId from booking
    jest.spyOn(ScreeningModel, 'findAll').mockResolvedValue([
      {
        screeningId: 'screening-1',
        movie: { movieId: 'movie-1', title: 'Test Movie' },
      },
    ] as any);

    const result = await svc.getCommentsByUser('user-123');

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      ...baseComment,
      movieId: 'movie-1',
      movieTitle: 'Test Movie',
    });
  });
    it('returns empty array when user has no bookings', async () => {
      jest.spyOn(BookingModel, 'findAll').mockResolvedValue([]);

      const result = await svc.getCommentsByUser('user-123');

      expect(result).toEqual([]);
    });

    it('returns empty array when no comments found', async () => {
      jest
        .spyOn(BookingModel, 'findAll')
        .mockResolvedValue([
          { bookingId: 'booking-1', screeningId: 'screening-1' },
        ] as any);
      // @ts-ignore
      const leanSpy = jest.fn().mockResolvedValue([]);
      // @ts-ignore
      const sortSpy = jest.fn().mockReturnValue({ lean: leanSpy });
      jest.spyOn(BookingCommentModel, 'find').mockReturnValue({
        sort: sortSpy,
      } as any);

      const result = await svc.getCommentsByUser('user-123');

      expect(result).toEqual([]);
    });
  });

  describe('searchComments', () => {
    it('searches by text query', async () => {
      // @ts-ignore
      const leanSpy = jest.fn().mockResolvedValue([baseComment]);
      // @ts-ignore
      const sortSpy = jest.fn().mockReturnValue({ lean: leanSpy });
      const spy = jest.spyOn(BookingCommentModel, 'find').mockReturnValue({
        sort: sortSpy,
      } as any);

      await svc.searchComments('great');

      expect(spy).toHaveBeenCalledWith({
        comment: { $regex: 'great', $options: 'i' },
      });
    });

    it('searches by status filter', async () => {
      // @ts-ignore
      const leanSpy = jest.fn().mockResolvedValue([baseComment]);
      // @ts-ignore
      const sortSpy = jest.fn().mockReturnValue({ lean: leanSpy });
      const spy = jest.spyOn(BookingCommentModel, 'find').mockReturnValue({
        sort: sortSpy,
      } as any);

      await svc.searchComments(undefined, { status: 'confirmed' });

      expect(spy).toHaveBeenCalledWith({ status: 'confirmed' });
    });

    it('searches by rating filter', async () => {
      // @ts-ignore
      const leanSpy = jest.fn().mockResolvedValue([baseComment]);
      // @ts-ignore
      const sortSpy = jest.fn().mockReturnValue({ lean: leanSpy });
      const spy = jest.spyOn(BookingCommentModel, 'find').mockReturnValue({
        sort: sortSpy,
      } as any);

      await svc.searchComments(undefined, { rating: 5 });

      expect(spy).toHaveBeenCalledWith({ rating: 5 });
    });

    it('searches by movieId filter', async () => {
      jest
        .spyOn(ScreeningModel, 'findAll')
        .mockResolvedValue([{ screeningId: 'screening-1' }] as any);
      jest
        .spyOn(BookingModel, 'findAll')
        .mockResolvedValue([{ bookingId: 'booking-1' }] as any);

      // @ts-ignore
      const leanSpy = jest.fn().mockResolvedValue([baseComment]);
      // @ts-ignore
      const sortSpy = jest.fn().mockReturnValue({ lean: leanSpy });
      const spy = jest.spyOn(BookingCommentModel, 'find').mockReturnValue({
        sort: sortSpy,
      } as any);

      await svc.searchComments(undefined, { movieId: 'movie-123' });

      expect(spy).toHaveBeenCalledWith({
        bookingId: { $in: ['booking-1'] },
      });
    });

    it('returns empty array when movieId has no screenings', async () => {
      jest.spyOn(ScreeningModel, 'findAll').mockResolvedValue([]);

      const result = await svc.searchComments(undefined, {
        movieId: 'movie-123',
      });

      expect(result).toEqual([]);
    });

    it('combines text query and filters', async () => {
      // @ts-ignore
      const leanSpy = jest.fn().mockResolvedValue([baseComment]);
      // @ts-ignore
      const sortSpy = jest.fn().mockReturnValue({ lean: leanSpy });
      const spy = jest.spyOn(BookingCommentModel, 'find').mockReturnValue({
        sort: sortSpy,
      } as any);

      await svc.searchComments('excellent', {
        status: 'confirmed',
        rating: 5,
      });

      expect(spy).toHaveBeenCalledWith({
        status: 'confirmed',
        rating: 5,
        comment: { $regex: 'excellent', $options: 'i' },
      });
    });
  });

  describe('confirmComment', () => {
    it('confirms comment successfully', async () => {
      const confirmedComment = {
        ...baseComment,
        status: 'confirmed' as const,
      };
      // @ts-ignore
      const leanSpy = jest.fn().mockResolvedValue(confirmedComment);
      jest.spyOn(BookingCommentModel, 'findOneAndUpdate').mockReturnValue({
        lean: leanSpy,
      } as any);

      const result = await svc.confirmComment('booking-123');

      expect(result).toEqual(confirmedComment);
      expect(result.status).toBe('confirmed');
    });

    it('throws NotFoundError when comment not found', async () => {
      // @ts-ignore
      const leanSpy = jest.fn().mockResolvedValue(null);
      jest.spyOn(BookingCommentModel, 'findOneAndUpdate').mockReturnValue({
        lean: leanSpy,
      } as any);

      await expect(svc.confirmComment('nonexistent')).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('getAverageRatingForMovie', () => {
    it('calculates average rating for a movie', async () => {
      jest
        .spyOn(ScreeningModel, 'findAll')
        .mockResolvedValue([{ screeningId: 'screening-1' }] as any);
      jest
        .spyOn(BookingModel, 'findAll')
        .mockResolvedValue([{ bookingId: 'booking-1' }] as any);

      jest
        .spyOn(BookingCommentModel, 'aggregate')
        .mockResolvedValue([{ _id: null, avgRating: 4.5 }] as any);

      const result = await svc.getAverageRatingForMovie('movie-123');

      expect(result).toBe(4.5);
    });

    it('returns null when no screenings found', async () => {
      jest.spyOn(ScreeningModel, 'findAll').mockResolvedValue([]);

      const result = await svc.getAverageRatingForMovie('movie-123');

      expect(result).toBeNull();
    });

    it('returns null when no bookings found', async () => {
      jest
        .spyOn(ScreeningModel, 'findAll')
        .mockResolvedValue([{ screeningId: 'screening-1' }] as any);
      jest.spyOn(BookingModel, 'findAll').mockResolvedValue([]);

      const result = await svc.getAverageRatingForMovie('movie-123');

      expect(result).toBeNull();
    });

    it('returns null when no confirmed comments found', async () => {
      jest
        .spyOn(ScreeningModel, 'findAll')
        .mockResolvedValue([{ screeningId: 'screening-1' }] as any);
      jest
        .spyOn(BookingModel, 'findAll')
        .mockResolvedValue([{ bookingId: 'booking-1' }] as any);
      jest.spyOn(BookingCommentModel, 'aggregate').mockResolvedValue([]);

      const result = await svc.getAverageRatingForMovie('movie-123');

      expect(result).toBeNull();
    });

    it('rounds average rating to 2 decimal places', async () => {
      jest
        .spyOn(ScreeningModel, 'findAll')
        .mockResolvedValue([{ screeningId: 'screening-1' }] as any);
      jest
        .spyOn(BookingModel, 'findAll')
        .mockResolvedValue([{ bookingId: 'booking-1' }] as any);
      jest
        .spyOn(BookingCommentModel, 'aggregate')
        .mockResolvedValue([{ _id: null, avgRating: 4.666666 }] as any);

      const result = await svc.getAverageRatingForMovie('movie-123');

      expect(result).toBe(4.67);
    });
  });
});
