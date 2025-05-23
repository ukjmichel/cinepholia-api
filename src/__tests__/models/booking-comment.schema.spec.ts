import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  BookingCommentModel,
  Comment,
} from '../../models/booking-comment.schema';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), {});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await BookingCommentModel.deleteMany({});
});

describe('BookingCommentModel', () => {
  it('should create a comment with valid data', async () => {
    const input: Omit<Comment, 'createdAt' | 'updatedAt'> = {
      bookingId: 'e27163b0-08d7-47d0-bb62-b48d312c919f',
      comment: 'Great!',
      rating: 5,
      status: 'confirmed',
    };
    const doc = await BookingCommentModel.create(input);

    expect(doc.bookingId).toBe(input.bookingId);
    expect(doc.comment).toBe(input.comment);
    expect(doc.rating).toBe(input.rating);
    expect(doc.status).toBe(input.status);
    expect(doc.createdAt).toBeInstanceOf(Date);
    expect(doc.updatedAt).toBeInstanceOf(Date);

    // toJSON
    const json = doc.toJSON() as any;
    expect(json.id).toBeDefined();
    expect(json._id).toBeUndefined();
  });

  it('should fail for invalid UUID', async () => {
    await expect(
      BookingCommentModel.create({
        bookingId: 'not-a-uuid',
        comment: 'Hello',
        rating: 3,
        status: 'pending',
      })
    ).rejects.toThrow(/Invalid UUID format/);
  });

  it('should fail for rating > 5 or < 0', async () => {
    await expect(
      BookingCommentModel.create({
        bookingId: 'e27163b0-08d7-47d0-bb62-b48d312c919f',
        comment: 'Bad!',
        rating: 10,
        status: 'pending',
      })
    ).rejects.toThrow(/at most 5/);

    await expect(
      BookingCommentModel.create({
        bookingId: 'e27163b0-08d7-47d0-bb62-b48d312c919f',
        comment: 'Bad!',
        rating: -1,
        status: 'pending',
      })
    ).rejects.toThrow(/at least 0/);
  });

  it('should fail for non-integer rating', async () => {
    await expect(
      BookingCommentModel.create({
        bookingId: 'e27163b0-08d7-47d0-bb62-b48d312c919f',
        comment: 'Float',
        rating: 4.5,
        status: 'pending',
      })
    ).rejects.toThrow(/integer/);
  });

  it('should fail for missing fields', async () => {
    await expect(BookingCommentModel.create({})).rejects.toThrow(/required/);
  });

  it('should fail for duplicate bookingId', async () => {
    await BookingCommentModel.create({
      bookingId: 'e27163b0-08d7-47d0-bb62-b48d312c919f',
      comment: 'First',
      rating: 3,
      status: 'pending',
    });
    await expect(
      BookingCommentModel.create({
        bookingId: 'e27163b0-08d7-47d0-bb62-b48d312c919f',
        comment: 'Second',
        rating: 4,
        status: 'pending',
      })
    ).rejects.toThrow(/duplicate key/);
  });
});
