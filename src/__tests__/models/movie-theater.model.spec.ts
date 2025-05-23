import { Sequelize } from 'sequelize-typescript';
import { MovieTheaterModel } from '../../models/movie-theater.model.js';

describe('MovieTheaterModel', () => {
  let sequelize: Sequelize;

  beforeAll(async () => {
    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: ':memory:',
      logging: false,
      models:[MovieTheaterModel]
    });
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('creates a valid movie theater', async () => {
    const theater = await MovieTheaterModel.create({
      theaterId: 'cinema_42',
      address: '123 Boulevard Saint-Germain',
      postalCode: '75006',
      city: 'Paris',
      phone: '+33123456789',
      email: 'contact@cinema42.fr',
    });

    expect(theater.theaterId).toBe('cinema_42');
    expect(theater.city).toBe('Paris');
    expect(theater.email).toBe('contact@cinema42.fr');
  });

  it('fails with invalid email', async () => {
    await expect(
      MovieTheaterModel.create({
        theaterId: 'theaterX',
        address: '10 rue des Invalides',
        postalCode: '75007',
        city: 'Paris',
        phone: '0123456789',
        email: 'not-an-email',
      })
    ).rejects.toThrow(/email/i);
  });

  it('fails with too short city', async () => {
    await expect(
      MovieTheaterModel.create({
        theaterId: 'theaterY',
        address: '99 avenue',
        postalCode: '75012',
        city: 'A',
        phone: '0123456789',
        email: 'theaterY@example.com',
      })
    ).rejects.toThrow(/city/i);
  });

  it('fails with invalid postal code', async () => {
    await expect(
      MovieTheaterModel.create({
        theaterId: 'theaterZ',
        address: '100 avenue Victor Hugo',
        postalCode: '75A06', // letters not allowed
        city: 'Paris',
        phone: '0123456789',
        email: 'theaterZ@example.com',
      })
    ).rejects.toThrow(/postal code/i);
  });

  it('fails with invalid phone number', async () => {
    await expect(
      MovieTheaterModel.create({
        theaterId: 'theaterW',
        address: '100 avenue Victor Hugo',
        postalCode: '75016',
        city: 'Paris',
        phone: 'short', // too short/invalid
        email: 'theaterW@example.com',
      })
    ).rejects.toThrow(/phone/i);
  });

  it('fails with invalid theaterId characters', async () => {
    await expect(
      MovieTheaterModel.create({
        theaterId: 'id with space!',
        address: '10 rue des Invalides',
        postalCode: '75007',
        city: 'Paris',
        phone: '0123456789',
        email: 'idspace@example.com',
      })
    ).rejects.toThrow(/theaterId/i);
  });

  it('fails with too short address', async () => {
    await expect(
      MovieTheaterModel.create({
        theaterId: 'theaterShortAddr',
        address: '12',
        postalCode: '75006',
        city: 'Paris',
        phone: '+33123456789',
        email: 'contact@shortaddr.fr',
      })
    ).rejects.toThrow(/address/i);
  });
});
