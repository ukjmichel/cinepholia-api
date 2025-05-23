import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Sequelize, DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { BookingCommentModel } from '../../models/booking-comment.schema.js';
// BookingModel will be defined below

// ---- Sequelize Stub Models ----
class UserModel extends Model {}
class MovieModel extends Model {}
class ScreeningModel extends Model {}
class BookingModel extends Model {}

function defineTestModels(sequelize: Sequelize) {
  UserModel.init(
    {
      userId: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
      },
    },
    { sequelize, tableName: 'users', timestamps: false }
  );

  MovieModel.init(
    {
      movieId: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
      },
    },
    { sequelize, tableName: 'movies', timestamps: false }
  );

  ScreeningModel.init(
    {
      screeningId: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
      },
      movieId: DataTypes.UUID,
    },
    { sequelize, tableName: 'screenings', timestamps: false }
  );

  BookingModel.init(
    {
      bookingId: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      screeningId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      seatsNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    { sequelize, tableName: 'bookings', timestamps: false }
  );
}

// ---- TESTS ----
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
    });

    defineTestModels(sequelize);

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

  async function createBookingWithUserAndScreening() {
    const bookingId = uuidv4();
    const userId = uuidv4();
    const screeningId = uuidv4();
    await UserModel.create({ userId });
    await ScreeningModel.create({ screeningId, movieId: uuidv4() });
    await BookingModel.create({
      bookingId,
      userId,
      screeningId,
      seatsNumber: 2,
    });
    return bookingId;
  }

  it('should create a comment with valid data if booking exists', async () => {
    const bookingId = await createBookingWithUserAndScreening();

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
    const bookingId = await createBookingWithUserAndScreening();

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
    const bookingId = await createBookingWithUserAndScreening();

    await expect(
      BookingCommentModel.create({
        bookingId,
        comment: 'Too good',
        rating: 6,
      })
    ).rejects.toThrow(/Rating must be at most 5/);
  });

  it('should enforce unique bookingId (one comment per booking)', async () => {
    const bookingId = await createBookingWithUserAndScreening();

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
