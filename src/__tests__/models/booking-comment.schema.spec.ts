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

  describe('Valid Comment Creation', () => {
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

    it('should create comment with default status when not provided', async () => {
      const input = {
        bookingId: 'e27163b0-08d7-47d0-bb62-b48d312c919f',
        comment: 'Default status test',
        rating: 4,
      };
      const doc = await BookingCommentModel.create(input);

      expect(doc.status).toBe('pending'); // Should default to 'pending'
    });

    it('should trim whitespace from comments', async () => {
      const input = {
        bookingId: 'e27163b0-08d7-47d0-bb62-b48d312c919f',
        comment: '  Whitespace test  ',
        rating: 3,
        status: 'pending' as const,
      };
      const doc = await BookingCommentModel.create(input);

      expect(doc.comment).toBe('Whitespace test');
    });
  });

  describe('UUID Validation', () => {
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

    it('should accept valid UUID v4 format', async () => {
      const validUUIDs = [
        'e27163b0-08d7-47d0-bb62-b48d312c919f',
        '123e4567-e89b-12d3-a456-426614174000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      ];

      for (const uuid of validUUIDs) {
        const doc = await BookingCommentModel.create({
          bookingId: uuid,
          comment: `Test for ${uuid}`,
          rating: 5,
          status: 'confirmed',
        });
        expect(doc.bookingId).toBe(uuid);

        // Clean up for next iteration
        await BookingCommentModel.deleteOne({ bookingId: uuid });
      }
    });

    it('should reject malformed UUIDs', async () => {
      const invalidUUIDs = [
        'e27163b0-08d7-47d0-bb62', // Too short
        'e27163b0-08d7-47d0-bb62-b48d312c919f-extra', // Too long
        'g27163b0-08d7-47d0-bb62-b48d312c919f', // Invalid character
        'e27163b008d747d0bb62b48d312c919f', // Missing dashes
        '', // Empty string
      ];

      for (const invalidUuid of invalidUUIDs) {
        await expect(
          BookingCommentModel.create({
            bookingId: invalidUuid,
            comment: 'Test',
            rating: 3,
            status: 'pending',
          })
        ).rejects.toThrow();
      }
    });
  });

  describe('Rating Validation', () => {
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

    it('should accept all valid integer ratings (0-5)', async () => {
      const validRatings = [0, 1, 2, 3, 4, 5];

      for (const rating of validRatings) {
        const doc = await BookingCommentModel.create({
          bookingId: `e27163b0-08d7-47d0-bb62-b48d312c91${rating}f`,
          comment: `Rating ${rating} test`,
          rating,
          status: 'pending',
        });
        expect(doc.rating).toBe(rating);
      }
    });
  });

  describe('Comment Validation', () => {
    it('should fail for missing comment', async () => {
      await expect(
        BookingCommentModel.create({
          bookingId: 'e27163b0-08d7-47d0-bb62-b48d312c919f',
          rating: 3,
          status: 'pending',
        })
      ).rejects.toThrow(/required/);
    });

    it('should fail for empty comment', async () => {
      await expect(
        BookingCommentModel.create({
          bookingId: 'e27163b0-08d7-47d0-bb62-b48d312c919f',
          comment: '',
          rating: 3,
          status: 'pending',
        })
      ).rejects.toThrow(/required/);
    });

    it('should fail for comment exceeding max length', async () => {
      const longComment = 'a'.repeat(1001); // Exceeds 1000 character limit

      await expect(
        BookingCommentModel.create({
          bookingId: 'e27163b0-08d7-47d0-bb62-b48d312c919f',
          comment: longComment,
          rating: 3,
          status: 'pending',
        })
      ).rejects.toThrow(/cannot exceed 1000 characters/);
    });

    it('should accept comment at max length', async () => {
      const maxLengthComment = 'a'.repeat(1000); // Exactly 1000 characters

      const doc = await BookingCommentModel.create({
        bookingId: 'e27163b0-08d7-47d0-bb62-b48d312c919f',
        comment: maxLengthComment,
        rating: 3,
        status: 'pending',
      });

      expect(doc.comment).toBe(maxLengthComment);
      expect(doc.comment.length).toBe(1000);
    });
  });

  describe('Status Validation', () => {
    it('should handle valid status values', async () => {
      const validStatuses = ['pending', 'confirmed'] as const;

      for (const status of validStatuses) {
        const doc = await BookingCommentModel.create({
          bookingId: `e27163b0-08d7-47d0-bb62-b48d312c91${status.length}f`,
          comment: `Comment with ${status} status`,
          rating: 3,
          status,
        });
        expect(doc.status).toBe(status);
      }
    });

    it('should fail for invalid status values', async () => {
      const invalidStatuses = [
        'rejected',
        'approved',
        'cancelled',
        'invalid-status',
      ];

      for (const invalidStatus of invalidStatuses) {
        await expect(
          BookingCommentModel.create({
            bookingId: 'e27163b0-08d7-47d0-bb62-b48d312c919f',
            comment: 'Invalid status test',
            rating: 3,
            status: invalidStatus as any,
          })
        ).rejects.toThrow();
      }
    });
  });

  describe('Required Fields Validation', () => {
    it('should fail for missing fields', async () => {
      await expect(BookingCommentModel.create({})).rejects.toThrow(/required/);
    });

    it('should fail for missing bookingId', async () => {
      await expect(
        BookingCommentModel.create({
          comment: 'Test comment',
          rating: 3,
          status: 'pending',
        })
      ).rejects.toThrow(/required/);
    });

    it('should fail for missing rating', async () => {
      await expect(
        BookingCommentModel.create({
          bookingId: 'e27163b0-08d7-47d0-bb62-b48d312c919f',
          comment: 'Test comment',
          status: 'pending',
        })
      ).rejects.toThrow(/required/);
    });
  });

  describe('Unique Constraint', () => {
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

    it('should allow updating existing comment without violating unique constraint', async () => {
      const doc = await BookingCommentModel.create({
        bookingId: 'e27163b0-08d7-47d0-bb62-b48d312c919f',
        comment: 'Original comment',
        rating: 3,
        status: 'pending',
      });

      doc.comment = 'Updated comment';
      doc.rating = 5;
      doc.status = 'confirmed';

      await expect(doc.save()).resolves.toBeTruthy();
      expect(doc.comment).toBe('Updated comment');
      expect(doc.rating).toBe(5);
      expect(doc.status).toBe('confirmed');
    });
  });

  describe('Concurrency', () => {
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

    it('should handle concurrent duplicate creation attempts gracefully', async () => {
      const input = {
        bookingId: 'e27163b0-08d7-47d0-bb62-b48d312c919f',
        comment: 'Duplicate test',
        rating: 3,
        status: 'pending' as const,
      };

      const promises = [
        BookingCommentModel.create(input),
        BookingCommentModel.create(input),
        BookingCommentModel.create(input),
      ];

      const results = await Promise.allSettled(promises);

      // One should succeed, others should fail with duplicate key error
      const successful = results.filter((r) => r.status === 'fulfilled');
      const failed = results.filter((r) => r.status === 'rejected');

      expect(successful).toHaveLength(1);
      expect(failed).toHaveLength(2);

      failed.forEach((result) => {
        if (result.status === 'rejected') {
          expect(result.reason.message).toMatch(/duplicate key/);
        }
      });
    });
  });

  describe('Timestamps', () => {
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

    it('should set timestamps on creation', async () => {
      const beforeCreation = new Date();

      const doc = await BookingCommentModel.create({
        bookingId: 'e27163b0-08d7-47d0-bb62-b48d312c919f',
        comment: 'Timestamp test',
        rating: 4,
        status: 'confirmed',
      });

      const afterCreation = new Date();

      expect(doc.createdAt).toBeDefined();
      expect(doc.updatedAt).toBeDefined();
      expect(doc.createdAt!.getTime()).toBeGreaterThanOrEqual(
        beforeCreation.getTime()
      );
      expect(doc.createdAt!.getTime()).toBeLessThanOrEqual(
        afterCreation.getTime()
      );
      expect(doc.updatedAt!.getTime()).toBeGreaterThanOrEqual(
        beforeCreation.getTime()
      );
      expect(doc.updatedAt!.getTime()).toBeLessThanOrEqual(
        afterCreation.getTime()
      );
    });
  });

  describe('JSON Transformation', () => {
    it('should transform _id to id in JSON output', async () => {
      const doc = await BookingCommentModel.create({
        bookingId: 'e27163b0-08d7-47d0-bb62-b48d312c919f',
        comment: 'JSON test',
        rating: 3,
        status: 'pending',
      });

      const json = doc.toJSON() as any;

      expect(json.id).toBeDefined();
      expect(typeof json.id).toBe('string');
      expect(json._id).toBeUndefined();
      expect(json.__v).toBeUndefined(); // versionKey should be excluded
      expect(json.bookingId).toBe('e27163b0-08d7-47d0-bb62-b48d312c919f');
      expect(json.comment).toBe('JSON test');
      expect(json.rating).toBe(3);
      expect(json.status).toBe('pending');
      expect(json.createdAt).toBeDefined();
      expect(json.updatedAt).toBeDefined();
    });
  });

  describe('Query Operations', () => {
    beforeEach(async () => {
      // Setup test data
      await BookingCommentModel.create([
        {
          bookingId: 'e27163b0-08d7-47d0-bb62-b48d312c919a',
          comment: 'Great service!',
          rating: 5,
          status: 'confirmed',
        },
        {
          bookingId: 'e27163b0-08d7-47d0-bb62-b48d312c919b',
          comment: 'Good experience',
          rating: 4,
          status: 'pending',
        },
        {
          bookingId: 'e27163b0-08d7-47d0-bb62-b48d312c919c',
          comment: 'Average service',
          rating: 3,
          status: 'confirmed',
        },
      ]);
    });

    it('should find comment by bookingId', async () => {
      const doc = await BookingCommentModel.findOne({
        bookingId: 'e27163b0-08d7-47d0-bb62-b48d312c919a',
      });

      expect(doc).toBeTruthy();
      expect(doc!.comment).toBe('Great service!');
      expect(doc!.rating).toBe(5);
    });

    it('should find comments by status', async () => {
      const confirmedComments = await BookingCommentModel.find({
        status: 'confirmed',
      });

      expect(confirmedComments).toHaveLength(2);
      confirmedComments.forEach((doc) => {
        expect(doc.status).toBe('confirmed');
      });
    });

    it('should find comments by rating range', async () => {
      const highRatedComments = await BookingCommentModel.find({
        rating: { $gte: 4 },
      });

      expect(highRatedComments).toHaveLength(2);
      highRatedComments.forEach((doc) => {
        expect(doc.rating).toBeGreaterThanOrEqual(4);
      });
    });

    it('should update comment by bookingId', async () => {
      const result = await BookingCommentModel.updateOne(
        { bookingId: 'e27163b0-08d7-47d0-bb62-b48d312c919b' },
        { status: 'confirmed', rating: 5 }
      );

      expect(result.modifiedCount).toBe(1);

      const updatedDoc = await BookingCommentModel.findOne({
        bookingId: 'e27163b0-08d7-47d0-bb62-b48d312c919b',
      });

      expect(updatedDoc!.status).toBe('confirmed');
      expect(updatedDoc!.rating).toBe(5);
    });

    it('should delete comment by bookingId', async () => {
      const result = await BookingCommentModel.deleteOne({
        bookingId: 'e27163b0-08d7-47d0-bb62-b48d312c919c',
      });

      expect(result.deletedCount).toBe(1);

      const deletedDoc = await BookingCommentModel.findOne({
        bookingId: 'e27163b0-08d7-47d0-bb62-b48d312c919c',
      });

      expect(deletedDoc).toBeNull();
    });
  });
});
