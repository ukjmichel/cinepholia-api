import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  Sequelize,
  Table,
  Column,
  Model,
  PrimaryKey,
  DataType,
} from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import { BookingCommentModel } from '../../models/booking-comment.schema';
import { BookingModel } from '../../models/booking.model';

// --- Stub UserModel ---
@Table({ tableName: 'users', timestamps: false })
class UserModel extends Model {
  @PrimaryKey
  @Column(DataType.UUID)
  userId!: string;
}

// --- Stub MovieModel ---
@Table({ tableName: 'movies', timestamps: false })
class MovieModel extends Model {
  @PrimaryKey
  @Column(DataType.UUID)
  movieId!: string;
}

// --- Stub ScreeningModel ---
@Table({ tableName: 'screenings', timestamps: false })
class ScreeningModel extends Model {
  @PrimaryKey
  @Column(DataType.UUID)
  screeningId!: string;

  @Column(DataType.UUID)
  movieId!: string;
}

describe('CommentModel (integration with BookingModel)', () => {
  let mongo: MongoMemoryServer;
  let sequelize: Sequelize;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());

    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: ':memory:',
      logging: false,
      models: [BookingModel, UserModel, ScreeningModel, MovieModel],
    });

    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();

    if (sequelize) {
      await sequelize.close();
    }
  });

  beforeEach(async () => {
    await BookingCommentModel.deleteMany({});
    await BookingModel.destroy({ where: {} });
  });

  it('should create a comment with valid data if booking exists', async () => {
    const bookingId = uuidv4();
    const userId = uuidv4();
    const screeningId = uuidv4();

    // Create related User and Screening first
    await UserModel.create({ userId });
    await ScreeningModel.create({ screeningId, movieId: uuidv4() });

    await BookingModel.create({
      bookingId,
      userId,
      screeningId,
      seatsNumber: 2,
    });

    const comment = await BookingCommentModel.create({
      bookingId,
      comment: 'Great experience!',
      rating: 5,
    });

    expect(comment).toBeDefined();
    expect(comment.bookingId).toBe(bookingId);
    expect(comment.status).toBe('pending');
  });

  it('should reject non-integer rating', async () => {
    const bookingId = uuidv4();
    const userId = uuidv4();
    const screeningId = uuidv4();

    // Create related User and Screening first
    await UserModel.create({ userId });
    await ScreeningModel.create({ screeningId, movieId: uuidv4() });

    await BookingModel.create({
      bookingId,
      userId,
      screeningId,
      seatsNumber: 2,
    });

    await expect(
      BookingCommentModel.create({
        bookingId,
        comment: 'Invalid rating',
        rating: 4.5,
      })
    ).rejects.toThrow(/Rating must be an integer/);
  });

  it('should reject invalid UUID', async () => {
    await expect(
      BookingCommentModel.create({
        bookingId: 'invalid-uuid',
        comment: 'Bad UUID',
        rating: 4,
      })
    ).rejects.toThrow(/Invalid UUID format for bookingId/);
  });

  it('should reject rating > 5', async () => {
    const bookingId = uuidv4();
    const userId = uuidv4();
    const screeningId = uuidv4();

    // Create related User and Screening first
    await UserModel.create({ userId });
    await ScreeningModel.create({ screeningId, movieId: uuidv4() });

    await BookingModel.create({
      bookingId,
      userId,
      screeningId,
      seatsNumber: 2,
    });

    await expect(
      BookingCommentModel.create({
        bookingId,
        comment: 'Too good',
        rating: 6,
      })
    ).rejects.toThrow(/Rating must be at most 5/);
  });

  it('should enforce unique bookingId (one comment per booking)', async () => {
    const bookingId = uuidv4();
    const userId = uuidv4();
    const screeningId = uuidv4();

    // Create related User and Screening first
    await UserModel.create({ userId });
    await ScreeningModel.create({ screeningId, movieId: uuidv4() });

    await BookingModel.create({
      bookingId,
      userId,
      screeningId,
      seatsNumber: 2,
    });

    await BookingCommentModel.create({
      bookingId,
      comment: 'First comment',
      rating: 4,
    });

    await expect(
      BookingCommentModel.create({
        bookingId,
        comment: 'Duplicate comment',
        rating: 3,
      })
    ).rejects.toThrow(/E11000 duplicate key error/);
  });
});
