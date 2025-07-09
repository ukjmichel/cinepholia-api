import { Sequelize } from 'sequelize-typescript';
import { MovieHallModel } from '../../models/movie-hall.model.js';
import { MovieTheaterModel } from '../../models/movie-theater.model.js';
import { ScreeningModel } from '../../models/screening.model.js';
import { MovieModel } from '../../models/movie.model.js';

describe('MovieHallModel', () => {
  let sequelize: Sequelize;

  beforeAll(async () => {
    // Initialize in-memory SQLite DB
    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: ':memory:',
      logging: false,
      models: [MovieTheaterModel, MovieHallModel, ScreeningModel, MovieModel],
    });
    await sequelize.sync({ force: true });

    // Create a theater for foreign key association
    await MovieTheaterModel.create({
      theaterId: 'cinema42',
      address: '123 Main St',
      postalCode: '12345',
      city: 'Paris',
      phone: '0123456789',
      email: 'cinema42@example.com',
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('creates a valid movie hall with seats and quality', async () => {
    const hall = await MovieHallModel.create({
      theaterId: 'cinema42',
      hallId: 'main_hall',
      seatsLayout: [
        [1, 2, 3, 4, 5],
        ['A', 'B', 'C'],
      ],
      quality: '2D',
    });

    expect(hall.theaterId).toBe('cinema42');
    expect(hall.hallId).toBe('main_hall');
    expect(hall.quality).toBe('2D');
    expect(Array.isArray(hall.seatsLayout)).toBe(true);
  });

  it('fails with too short theaterId', async () => {
    await expect(
      MovieHallModel.create({
        theaterId: 'a',
        hallId: 'hallA',
        seatsLayout: [[1, 2, 3]],
        quality: '2D',
      })
    ).rejects.toThrow(/theaterId/);
  });

  it('fails with invalid characters in hallId', async () => {
    await expect(
      MovieHallModel.create({
        theaterId: 'cinema42',
        hallId: 'main hall!', // invalid
        seatsLayout: [[1, 2, 3]],
        quality: '2D',
      })
    ).rejects.toThrow(/hallId/);
  });

  it('fails when seatsLayout is not a 2D array', async () => {
    await expect(
      MovieHallModel.create({
        theaterId: 'cinema42',
        hallId: 'invalidSeats',
        seatsLayout: [1, 2, 3] as any,
        quality: '2D',
      })
    ).rejects.toThrow(/seatsLayout/);
  });

  it('fails when a row in seatsLayout is empty', async () => {
    await expect(
      MovieHallModel.create({
        theaterId: 'cinema42',
        hallId: 'rowEmpty',
        seatsLayout: [[], [1, 2, 3]],
        quality: '2D',
      })
    ).rejects.toThrow(/seatsLayout/);
  });

  it('fails when a seat is a negative number', async () => {
    await expect(
      MovieHallModel.create({
        theaterId: 'cinema42',
        hallId: 'negSeat',
        seatsLayout: [[1, 2, -3]],
        quality: '3D',
      })
    ).rejects.toThrow(/seatsLayout/);
  });

  it('fails when a seat is an object', async () => {
    await expect(
      MovieHallModel.create({
        theaterId: 'cinema42',
        hallId: 'objectSeat',
        seatsLayout: [[1, {} as any, 3]],
        quality: '2D',
      })
    ).rejects.toThrow(/seatsLayout/);
  });

  it('fails when a seat is an empty string', async () => {
    await expect(
      MovieHallModel.create({
        theaterId: 'cinema42',
        hallId: 'emptyStrSeat',
        seatsLayout: [[1, '', 3]],
        quality: '2D',
      })
    ).rejects.toThrow(/seatsLayout/);
  });

  it('fails when seatsLayout has only empty rows', async () => {
    await expect(
      MovieHallModel.create({
        theaterId: 'cinema42',
        hallId: 'emptyRows',
        seatsLayout: [[], []],
        quality: '2D',
      })
    ).rejects.toThrow(/seatsLayout/);
  });

  it('creates hall with valid mixed seat types', async () => {
    const hall = await MovieHallModel.create({
      theaterId: 'cinema42',
      hallId: 'mixedTypes',
      seatsLayout: [
        [1, 2, 3, 'A', 'B'],
        ['VIP', 1, 2, 3],
      ],
      quality: 'IMAX',
    });
    expect(hall.quality).toBe('IMAX');
    expect(hall.seatsLayout.length).toBe(2);
  });

  it('fails when a seat is undefined', async () => {
    await expect(
      MovieHallModel.create({
        theaterId: 'cinema42',
        hallId: 'undefSeat',
        seatsLayout: [[1, 2, undefined as any]],
        quality: '3D',
      })
    ).rejects.toThrow(/seatsLayout/);
  });

  it('fails when a seat is a boolean', async () => {
    await expect(
      MovieHallModel.create({
        theaterId: 'cinema42',
        hallId: 'boolSeat',
        seatsLayout: [[true as any, 2, 3]],
        quality: '2D',
      })
    ).rejects.toThrow(/seatsLayout/);
  });

  it('fails if two halls have same theaterId and hallId (duplicate key)', async () => {
    await MovieHallModel.create({
      theaterId: 'cinema42',
      hallId: 'duplicate',
      seatsLayout: [[1, 2, 3]],
      quality: '2D',
    });

    await expect(
      MovieHallModel.create({
        theaterId: 'cinema42',
        hallId: 'duplicate',
        seatsLayout: [[1, 2, 3]],
        quality: '2D',
      })
    ).rejects.toThrow(/validation error/i);
  });

  it('accepts quality value "4DX"', async () => {
    const hall = await MovieHallModel.create({
      theaterId: 'cinema42',
      hallId: 'imax4dx',
      seatsLayout: [[1, 2, 3]],
      quality: '4DX',
    });

    expect(hall.quality).toBe('4DX');
  });
});
