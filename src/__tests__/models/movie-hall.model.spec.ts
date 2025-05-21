import { Sequelize } from 'sequelize-typescript';
import { MovieHallModel } from '../../models/movie-hall.model';
import { MovieTheaterModel } from '../../models/movie-theater.model';
import { ScreeningModel } from '../../models/screening.model';
import { MovieModel } from '../../models/movie.model';

describe('MovieHallModel', () => {
  let sequelize: Sequelize;

  beforeAll(async () => {
    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: ':memory:',
      logging: false,
      models: [MovieTheaterModel, MovieHallModel, ScreeningModel, MovieModel],
    });
    await sequelize.sync({ force: true });

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

  it('creates a valid movie hall', async () => {
    const hall = await MovieHallModel.create({
      theaterId: 'cinema42',
      hallId: 'main_hall',
      seatsLayout: [
        [1, 2, 3, 4, 5],
        [1, 2, 'A', 'B'],
        ['VIP', 2, 3],
      ],
    });

    expect(hall.theaterId).toBe('cinema42');
    expect(hall.hallId).toBe('main_hall');
    expect(Array.isArray(hall.seatsLayout)).toBe(true);
  });

  it('fails with too short theaterId', async () => {
    await expect(
      MovieHallModel.create({
        theaterId: 'a',
        hallId: 'hallA',
        seatsLayout: [[1, 2, 3]],
      })
    ).rejects.toThrow(/theaterId/);
  });

  it('fails with invalid characters in hallId', async () => {
    await expect(
      MovieHallModel.create({
        theaterId: 'cinema42',
        hallId: 'main hall!', // invalid chars
        seatsLayout: [[1, 2, 3]],
      })
    ).rejects.toThrow(/hallId/);
  });

  it('fails when seatsLayout is not a 2D array', async () => {
    await expect(
      MovieHallModel.create({
        theaterId: 'cinema42',
        hallId: 'A',
        seatsLayout: [1, 2, 3] as any, // not 2D
      })
    ).rejects.toThrow(/seatsLayout/);
  });

  it('fails when a row in seatsLayout is empty', async () => {
    await expect(
      MovieHallModel.create({
        theaterId: 'cinema42',
        hallId: 'B',
        seatsLayout: [[], [1, 2, 3]],
      })
    ).rejects.toThrow(/seatsLayout/);
  });

  it('fails when a seat is negative number', async () => {
    await expect(
      MovieHallModel.create({
        theaterId: 'cinema42',
        hallId: 'C',
        seatsLayout: [[1, 2, -3]], // negative number
      })
    ).rejects.toThrow(/seatsLayout/);
  });

  it('fails when a seat is an object', async () => {
    await expect(
      MovieHallModel.create({
        theaterId: 'cinema42',
        hallId: 'D',
        seatsLayout: [[1, {} as any, 3]], // object in row
      })
    ).rejects.toThrow(/seatsLayout/);
  });

  it('fails when a row in seatsLayout contains an empty string', async () => {
    await expect(
      MovieHallModel.create({
        theaterId: 'cinema42',
        hallId: 'E',
        seatsLayout: [[1, 2, 3], ['']], // Empty string seat
      })
    ).rejects.toThrow(/seatsLayout/);
  });

  it('fails if seatsLayout has an empty array as the only row', async () => {
    await expect(
      MovieHallModel.create({
        theaterId: 'cinema42',
        hallId: 'F',
        seatsLayout: [[]], // Only empty row
      })
    ).rejects.toThrow(/seatsLayout/);
  });

  it('fails if seatsLayout is an array of empty arrays', async () => {
    await expect(
      MovieHallModel.create({
        theaterId: 'cinema42',
        hallId: 'G',
        seatsLayout: [[], []], // All rows empty
      })
    ).rejects.toThrow(/seatsLayout/);
  });

  it('creates a hall with multiple valid rows and mixed types', async () => {
    const hall = await MovieHallModel.create({
      theaterId: 'cinema42',
      hallId: 'multirow',
      seatsLayout: [
        [1, 2, 3, 'A', 'B'],
        [4, 5, 6, 'C'],
        ['VIP', 1, 2, 3],
      ],
    });
    expect(hall.seatsLayout.length).toBe(3);
    expect(hall.seatsLayout[0][0]).toBe(1);
    expect(hall.seatsLayout[2][0]).toBe('VIP');
  });

  it('fails when a row contains undefined', async () => {
    await expect(
      MovieHallModel.create({
        theaterId: 'cinema42',
        hallId: 'undef',
        seatsLayout: [
          [1, 2, 3],
          [4, undefined as any, 6],
        ],
      })
    ).rejects.toThrow(/seatsLayout/);
  });

  it('fails when a seat is a boolean', async () => {
    await expect(
      MovieHallModel.create({
        theaterId: 'cinema42',
        hallId: 'bool',
        seatsLayout: [[1, 2, true as any]],
      })
    ).rejects.toThrow(/seatsLayout/);
  });

  it('fails if two halls have same theaterId and hallId', async () => {
    await MovieHallModel.create({
      theaterId: 'cinema42',
      hallId: 'dup',
      seatsLayout: [[1, 2, 3]],
    });

    await expect(
      MovieHallModel.create({
        theaterId: 'cinema42',
        hallId: 'dup',
        seatsLayout: [[1, 2, 3]],
      })
    ).rejects.toThrow(/validation error/i);
  });
});
