import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { sequelize, syncDB } from '../../config/db';
import { ScreeningModel } from '../../models/screening.model';
import { MovieModel } from '../../models/movie.model';
import { MovieHallModel } from '../../models/movie-hall.model';
import { MovieTheaterModel } from '../../models/movie-theater.model';
import { UserModel } from '../../models/user.model';
import { AuthorizationModel } from '../../models/authorization.model';
import { AuthService } from '../../services/auth.service';
import app from '../../app';

// Test data
const testMovie = {
  movieId: uuidv4(),
  title: 'Inception',
  genre: 'Sci-Fi',
  releaseDate: new Date('2010-07-16'),
  durationMinutes: 148,
  description: 'A mind-bending thriller.',
  ageRating: 'PG-13',
  director: 'Christopher Nolan',
};

const testTheater = {
  theaterId: 'theater-1',
  address: '123 Main St',
  postalCode: '10001',
  city: 'Metropolis',
  phone: '+11234567890',
  email: 'info@theater.com',
};

const testHall: {
  theaterId: string;
  hallId: string;
  seatsLayout: string[][];
  quality: '2D' | '3D' | 'IMAX' | '4DX';
} = {
  theaterId: testTheater.theaterId,
  hallId: 'grande-salle',
  seatsLayout: [
    ['A1', 'A2'],
    ['B1', 'B2'],
  ],
  quality: '2D', // ✅ Now TS knows it's valid!
};

const regularUserData = {
  username: 'regularuser',
  firstName: 'Regular',
  lastName: 'User',
  email: 'regular@theater.com',
  password: 'RegularPass123!',
};

const staffUserData = {
  username: 'staffuser',
  firstName: 'Staff',
  lastName: 'User',
  email: 'staff@theater.com',
  password: 'StaffPass123!',
};

describe('Screening E2E', () => {
  let staffToken: string;
  let staffUserId: string;
  let screeningId: string;

  beforeAll(async () => {
    await syncDB();
  });

  beforeEach(async () => {
    // Disable FK checks for MySQL
    if (sequelize.getDialect() === 'mysql') {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    }
    // Truncate in correct order: child to parent
    await AuthorizationModel.destroy({
      where: {},
      truncate: true,
      cascade: true,
    });
    await UserModel.destroy({ where: {}, truncate: true, cascade: true });
    await ScreeningModel.destroy({ where: {}, truncate: true, cascade: true });
    await MovieModel.destroy({ where: {}, truncate: true, cascade: true });
    await MovieHallModel.destroy({ where: {}, truncate: true, cascade: true });
    await MovieTheaterModel.destroy({
      where: {},
      truncate: true,
      cascade: true,
    });
    // Enable FK checks for MySQL
    if (sequelize.getDialect() === 'mysql') {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    }
    // Seed data
    await MovieTheaterModel.create(testTheater);
    await MovieHallModel.create(testHall);
    await MovieModel.create(testMovie);

    const staffUser = await UserModel.create(staffUserData);
    staffUserId = staffUser.userId!;
    await AuthorizationModel.create({ userId: staffUserId, role: 'employé' });

    staffToken = new AuthService().generateTokens({
      userId: staffUserId,
      username: staffUserData.username,
      email: staffUserData.email,
      verified: true,
    } as any).accessToken;

    const screening = await ScreeningModel.create({
      screeningId: uuidv4(),
      movieId: testMovie.movieId,
      theaterId: testTheater.theaterId,
      hallId: testHall.hallId,
      startTime: new Date('2025-07-01T18:00:00.000Z'),
      price: 12.5,
    });
    screeningId = screening.screeningId;
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('should list all screenings', async () => {
    const res = await request(app).get('/screenings').expect(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should search screenings', async () => {
    const res = await request(app)
      .get('/screenings/search?q=Inception')
      .expect(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should get a screening by ID', async () => {
    const res = await request(app)
      .get(`/screenings/${screeningId}`)
      .expect(200);
    expect(res.body.data.screeningId).toBe(screeningId);
  });

  it('should return 404 for non-existent screening', async () => {
    await request(app)
      .get(`/screenings/aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa`)
      .expect(404);
  });

  it('should create a new screening (staff only)', async () => {
    const res = await request(app)
      .post('/screenings')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        movieId: testMovie.movieId,
        theaterId: testTheater.theaterId,
        hallId: testHall.hallId,
        startTime: new Date('2025-07-01T21:00:00.000Z').toISOString(),
        price: 15,
      });
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('screeningId');
  });

  it('should update a screening (staff only)', async () => {
    const res = await request(app)
      .patch(`/screenings/${screeningId}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ price: 20 })
      .expect(200);
    expect(res.body.data.price).toBe(20);
  });

  it('should delete a screening (staff only)', async () => {
    await request(app)
      .delete(`/screenings/${screeningId}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(204);
  });

  it('should get screenings by movieId', async () => {
    const res = await request(app)
      .get(`/screenings/movie/${testMovie.movieId}`)
      .expect(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should get screenings by theaterId', async () => {
    const res = await request(app)
      .get(`/screenings/theater/${testTheater.theaterId}`)
      .expect(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should get screenings by hallId', async () => {
    const res = await request(app)
      .get(
        `/screenings/hall/${testHall.hallId}?theaterId=${testTheater.theaterId}`
      )
      .expect(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should get screenings by date', async () => {
    const res = await request(app)
      .get(`/screenings/date/2025-07-01`)
      .expect(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should list all booked seats for a screening', async () => {
    const res = await request(app)
      .get(`/screenings/${screeningId}/booked-seats`)
      .expect(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
