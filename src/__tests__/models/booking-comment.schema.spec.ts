import mongoose from 'mongoose';
import { BookingCommentModel } from '../../models/booking-comment.schema';
import connectMongoDB from '../../config/mongo';
import { randomUUID } from 'crypto';

describe('BookingCommentModel (real DB)', () => {
  beforeAll(async () => {
    await connectMongoDB();
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  afterEach(async () => {
    await BookingCommentModel.deleteMany({});
  });

  it('should create a booking comment with required fields', async () => {
    const comment = await BookingCommentModel.create({
      bookingId: randomUUID(),
      comment: 'Great experience!',
      rating: 5,
    });

    expect(comment._id).toBeDefined();
    expect(comment.comment).toBe('Great experience!');
    expect(comment.bookingId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(comment.rating).toBe(5);
  });

  it('should fail if required fields are missing', async () => {
    await expect(
      BookingCommentModel.create({
        bookingId: randomUUID(),
        // missing rating + comment
      } as any)
    ).rejects.toThrow();
  });

  it('should update a comment text', async () => {
    const comment = await BookingCommentModel.create({
      bookingId: randomUUID(),
      comment: 'Initial text',
      rating: 3,
    });

    comment.comment = 'Updated text';
    await comment.save();

    const found = await BookingCommentModel.findById(comment._id);
    expect(found!.comment).toBe('Updated text');
  });

  it('should enforce unique bookingId constraint', async () => {
    const bookingId = randomUUID();

    // Create first comment
    await BookingCommentModel.create({
      bookingId,
      comment: 'First comment',
      rating: 4,
    });

    // Try to create second comment with same bookingId - should fail
    await expect(
      BookingCommentModel.create({
        bookingId, // Same bookingId
        comment: 'Second comment',
        rating: 5,
      })
    ).rejects.toThrow(/E11000 duplicate key/);
  });

  it('should retrieve all comments', async () => {
    // Create multiple comments with different bookingIds
    await BookingCommentModel.create({
      bookingId: randomUUID(),
      comment: 'First comment',
      rating: 4,
    });

    await BookingCommentModel.create({
      bookingId: randomUUID(), // Different bookingId
      comment: 'Second comment',
      rating: 5,
    });

    const comments = await BookingCommentModel.find({});
    expect(comments).toHaveLength(2);
    expect(comments.map((c) => c.comment)).toEqual(
      expect.arrayContaining(['First comment', 'Second comment'])
    );
  });

  it('should retrieve comment by bookingId', async () => {
    const bookingId = randomUUID();

    await BookingCommentModel.create({
      bookingId,
      comment: 'Specific booking comment',
      rating: 4,
    });

    const comment = await BookingCommentModel.findOne({ bookingId });
    expect(comment).toBeDefined();
    expect(comment!.bookingId).toBe(bookingId);
    expect(comment!.comment).toBe('Specific booking comment');
  });

  it('should filter comments by rating', async () => {
    await BookingCommentModel.create({
      bookingId: randomUUID(),
      comment: 'Low rating',
      rating: 2,
    });

    await BookingCommentModel.create({
      bookingId: randomUUID(),
      comment: 'High rating',
      rating: 5,
    });

    const highRatedComments = await BookingCommentModel.find({
      rating: { $gte: 4 },
    });
    expect(highRatedComments).toHaveLength(1);
    expect(highRatedComments[0].rating).toBe(5);
  });
});
