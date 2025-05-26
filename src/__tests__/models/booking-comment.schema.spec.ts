import mongoose from 'mongoose';
import {
  BookingCommentModel,
  Comment,
} from '../../models/booking-comment.schema';
import { config } from '../../config/env.js';

describe('BookingCommentModel', () => {
  beforeAll(async () => {
    // Connect using the test MongoDB URI from config
    await mongoose.connect(config.mongodbUri);
  });

  afterAll(async () => {
    // Clean up the test database completely
    if (mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
    }
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    // Clean the collection before each test
    await BookingCommentModel.deleteMany({});
  });

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

  it('should handle valid status values', async () => {
    const validStatuses = ['pending', 'confirmed'] as const; // Removed 'rejected'

    for (const status of validStatuses) {
      const doc = await BookingCommentModel.create({
        bookingId: `e27163b0-08d7-47d0-bb62-b48d312c91${status.length}f`, // Unique UUIDs
        comment: `Comment with ${status} status`,
        rating: 3,
        status,
      });
      expect(doc.status).toBe(status);
    }
  });

  it('should fail for invalid status values', async () => {
    await expect(
      BookingCommentModel.create({
        bookingId: 'e27163b0-08d7-47d0-bb62-b48d312c919f',
        comment: 'Invalid status',
        rating: 3,
        status: 'invalid-status' as any,
      })
    ).rejects.toThrow();
  });

  it('should validate comment length constraints', async () => {
    // Test minimum length (if any)
    await expect(
      BookingCommentModel.create({
        bookingId: 'e27163b0-08d7-47d0-bb62-b48d312c919f',
        comment: '', // Empty comment
        rating: 3,
        status: 'pending',
      })
    ).rejects.toThrow(/required/);
  });

  it('should handle concurrent creation attempts', async () => {
    const baseInput = {
      comment: 'Concurrent test',
      rating: 4,
      status: 'pending' as const,
    };

    const promises = [
      BookingCommentModel.create({
        ...baseInput,
        bookingId: 'e27163b0-08d7-47d0-bb62-b48d312c919a',
      }),
      BookingCommentModel.create({
        ...baseInput,
        bookingId: 'e27163b0-08d7-47d0-bb62-b48d312c919b',
      }),
      BookingCommentModel.create({
        ...baseInput,
        bookingId: 'e27163b0-08d7-47d0-bb62-b48d312c919c',
      }),
    ];

    const results = await Promise.all(promises);
    expect(results).toHaveLength(3);
    results.forEach((doc) => {
      expect(doc).toBeTruthy();
      expect(doc.comment).toBe(baseInput.comment);
    });
  });

  it('should update timestamps correctly', async () => {
    const doc = await BookingCommentModel.create({
      bookingId: 'e27163b0-08d7-47d0-bb62-b48d312c919f',
      comment: 'Original comment',
      rating: 3,
      status: 'pending',
    });

    expect(doc.updatedAt).toBeDefined();
    expect(doc.createdAt).toBeDefined();

    const originalUpdatedAt = doc.updatedAt!;
    const originalCreatedAt = doc.createdAt!;

    // Wait a bit to ensure different timestamp
    await new Promise((resolve) => setTimeout(resolve, 10));

    doc.comment = 'Updated comment';
    await doc.save();

    expect(doc.updatedAt).toBeDefined();
    expect(doc.updatedAt!.getTime()).toBeGreaterThan(
      originalUpdatedAt.getTime()
    );
    expect(doc.createdAt).toEqual(originalCreatedAt); // createdAt should not change
  });
});
