import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import {connectMongoDB} from '../../config/mongo.js';
import { bookingCommentService } from '../../services/booking-comment.service.js';
import { BookingCommentModel } from '../../models/booking-comment.schema.js';

// Minimal BookingModel for join logic in tests
const BookingSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  movieId: { type: String, required: true },
});
const BookingModel =
  mongoose.models.Booking || mongoose.model('Booking', BookingSchema);

describe('bookingCommentService', () => {
  beforeAll(async () => {
    await connectMongoDB();
  });

  afterAll(async () => {
    if (mongoose.connection.db) await mongoose.connection.db.dropDatabase();
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await BookingCommentModel.deleteMany({});
    await BookingModel.deleteMany({});
  });

  it('creates and fetches a comment by bookingId', async () => {
    const bookingId = uuidv4();
    const movieId = uuidv4();
    await BookingModel.create({ _id: bookingId, movieId });

    await bookingCommentService.createComment({
      bookingId,
      comment: 'Service test!',
      rating: 5,
      status: 'pending',
    });

    const fetched =
      await bookingCommentService.getCommentByBookingId(bookingId);
    expect(fetched.bookingId).toBe(bookingId);
    expect(fetched.comment).toBe('Service test!');
  });

  it('throws on duplicate bookingId', async () => {
    const bookingId = uuidv4();
    const movieId = uuidv4();
    await BookingModel.create({ _id: bookingId, movieId });

    await bookingCommentService.createComment({
      bookingId,
      comment: 'Once',
      rating: 4,
      status: 'pending',
    });
    await expect(
      bookingCommentService.createComment({
        bookingId,
        comment: 'Twice',
        rating: 2,
        status: 'pending',
      })
    ).rejects.toThrow();
  });

  it('updates a comment', async () => {
    const bookingId = uuidv4();
    const movieId = uuidv4();
    await BookingModel.create({ _id: bookingId, movieId });
    await bookingCommentService.createComment({
      bookingId,
      comment: 'Initial',
      rating: 2,
      status: 'pending',
    });

    const updated = await bookingCommentService.updateComment(bookingId, {
      comment: 'Updated',
      rating: 3,
    });
    expect(updated.comment).toBe('Updated');
    expect(updated.rating).toBe(3);
  });

  it('deletes a comment', async () => {
    const bookingId = uuidv4();
    const movieId = uuidv4();
    await BookingModel.create({ _id: bookingId, movieId });
    await bookingCommentService.createComment({
      bookingId,
      comment: 'Delete me',
      rating: 1,
      status: 'pending',
    });
    await bookingCommentService.deleteComment(bookingId);
    await expect(
      bookingCommentService.getCommentByBookingId(bookingId)
    ).rejects.toThrow();
  });

  it('gets all comments and filters by status', async () => {
    const booking1 = uuidv4();
    const booking2 = uuidv4();
    const movieId = uuidv4();
    await BookingModel.create([
      { _id: booking1, movieId },
      { _id: booking2, movieId },
    ]);
    await bookingCommentService.createComment({
      bookingId: booking1,
      comment: 'A',
      rating: 5,
      status: 'pending',
    });
    await bookingCommentService.createComment({
      bookingId: booking2,
      comment: 'B',
      rating: 4,
      status: 'confirmed',
    });

    const all = await bookingCommentService.getAllComments();
    expect(all.length).toBe(2);

    const confirmed =
      await bookingCommentService.getCommentsByStatus('confirmed');
    expect(confirmed.length).toBe(1);
    expect(confirmed[0].status).toBe('confirmed');
  });

  it('confirms a comment', async () => {
    const bookingId = uuidv4();
    const movieId = uuidv4();
    await BookingModel.create({ _id: bookingId, movieId });
    await bookingCommentService.createComment({
      bookingId,
      comment: 'Needs confirmation',
      rating: 3,
      status: 'pending',
    });
    const confirmed = await bookingCommentService.confirmComment(bookingId);
    expect(confirmed.status).toBe('confirmed');
  });

  it('finds comments by movieId', async () => {
    const movieA = uuidv4();
    const bookingA1 = uuidv4();
    const bookingA2 = uuidv4();
    await BookingModel.create([
      { _id: bookingA1, movieId: movieA },
      { _id: bookingA2, movieId: movieA },
    ]);
    await bookingCommentService.createComment({
      bookingId: bookingA1,
      comment: 'A1',
      rating: 5,
      status: 'pending',
    });
    await bookingCommentService.createComment({
      bookingId: bookingA2,
      comment: 'A2',
      rating: 3,
      status: 'confirmed',
    });

    const comments = await bookingCommentService.getCommentsByMovieId(movieA);
    expect(comments.length).toBe(2);
    expect(comments[0].comment).toMatch(/A/);
  });

  it('searches comments by text', async () => {
    const bookingId = uuidv4();
    const movieId = uuidv4();
    await BookingModel.create({ _id: bookingId, movieId });
    await bookingCommentService.createComment({
      bookingId,
      comment: 'Amazing experience!',
      rating: 5,
      status: 'pending',
    });

    const found = await bookingCommentService.searchComments('amazing');
    expect(found.length).toBe(1);
    expect(found[0].comment).toContain('Amazing');

    const foundByStatus = await bookingCommentService.searchComments('pending');
    expect(foundByStatus.some((c) => c.status === 'pending')).toBe(true);

    const foundById = await bookingCommentService.searchComments(bookingId);
    expect(foundById.some((c) => c.bookingId === bookingId)).toBe(true);
  });
});
