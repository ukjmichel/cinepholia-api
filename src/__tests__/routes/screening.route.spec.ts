// src/__tests__/routes/screening.route.spec.ts

import request from 'supertest';
import app from '../../app.js';
import { sequelize } from '../../config/db.js';
import { syncDB } from '../../config/db.js';
import { ScreeningModel } from '../../models/screening.model.js';
import { MovieModel } from '../../models/movie.model.js';
import { MovieTheaterModel } from '../../models/movie-theater.model.js';
import { MovieHallModel } from '../../models/movie-hall.model.js';
import { UserModel } from '../../models/user.model.js';
import { AuthorizationModel } from '../../models/authorization.model.js';
import { AuthService } from '../../services/auth.service.js';
import { v4 as uuidv4 } from 'uuid';

// Example Movie with all required fields
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

// Example Theater and Hall
const testTheater = {
  theaterId: 'theater-1',
  address: '123 Main St',
  postalCode: '10001',
  city: 'Metropolis',
  phone: '+11234567890',
  email: 'info@theater.com',
};
const testHall = {
  theaterId: testTheater.theaterId,
  hallId: 'hall-1',
  seatsLayout: [
    ['A1', 'A2'],
    ['B1', 'B2'],
  ],
};

// Example Staff User
const staffUserData = {
  username: 'staffuser',
  firstName: 'Staff',
  lastName: 'User',
  email: 'staff@theater.com',
  password: 'StaffPass123!',
};

// Screening with correct typing for DB creation (startTime is Date)
const testScreening = {
  screeningId: uuidv4(),
  movieId: testMovie.movieId,
  theaterId: testTheater.theaterId,
  hallId: testHall.hallId,
  startTime: new Date('2024-07-01T18:00:00.000Z'),
  price: 12.5,
  quality: 'IMAX',
};

const cleanDatabase = async () => {
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
  await AuthorizationModel.destroy({
    where: {},
    truncate: true,
    cascade: true,
  });
  await UserModel.destroy({ where: {}, truncate: true, cascade: true });
  await ScreeningModel.destroy({ where: {}, truncate: true, cascade: true });
  await MovieModel.destroy({ where: {}, truncate: true, cascade: true });
  await MovieHallModel.destroy({ where: {}, truncate: true, cascade: true });
  await MovieTheaterModel.destroy({ where: {}, truncate: true, cascade: true });
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
};

describe('Screening E2E Routes', () => {
  let staffToken: string;

  beforeAll(async () => {
    await syncDB();
  });

  beforeEach(async () => {
    await cleanDatabase();

    // Create data needed for screenings
    await MovieTheaterModel.create(testTheater);
    await MovieHallModel.create(testHall);
    await MovieModel.create(testMovie);

    // Create staff user
    const staffUser = await UserModel.create(staffUserData);
    await AuthorizationModel.create({
      userId: (staffUser as any).userId,
      role: 'employé',
    });
    staffToken = new AuthService().generateTokens({
      userId: (staffUser as any).userId,
      username: staffUserData.username,
      email: staffUserData.email,
      verified: false,
    } as any).accessToken;
  });

  afterAll(async () => {
    await cleanDatabase();
    await sequelize.close();
  });

  describe('POST /screenings', () => {
    it('should create a screening with staff JWT', async () => {
      const body = {
        ...testScreening,
        startTime: testScreening.startTime.toISOString(),
      };
      const res = await request(app)
        .post('/screenings')
        .set('Authorization', `Bearer ${staffToken}`)
        .send(body)
        .expect(201);

      expect(res.body.movieId).toBe(testScreening.movieId);
      expect(res.body.hallId).toBe(testScreening.hallId);
      expect(res.body.quality).toBe('IMAX');
    });

    it('should 401 if unauthenticated', async () => {
      const body = {
        ...testScreening,
        startTime: testScreening.startTime.toISOString(),
      };
      await request(app).post('/screenings').send(body).expect(401);
    });

    it('should 400 for invalid input', async () => {
      await request(app)
        .post('/screenings')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({}) // missing fields
        .expect(400);
    });
  });

  describe('GET /screenings', () => {
    it('should return all screenings', async () => {
      await ScreeningModel.create(testScreening);
      const res = await request(app).get('/screenings').expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  describe('GET /screenings/:id', () => {
    it('should get screening by ID', async () => {
      await ScreeningModel.create(testScreening);
      const res = await request(app)
        .get(`/screenings/${testScreening.screeningId}`)
        .expect(200);

      expect(res.body.screeningId).toBe(testScreening.screeningId);
    });

    it('should 404 if not found', async () => {
      await request(app)
        .get('/screenings/aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa')
        .expect(404);
    });
  });

  describe('PATCH /screenings/:id', () => {
    it('should update a screening when staff', async () => {
      await ScreeningModel.create(testScreening);

      const res = await request(app)
        .patch(`/screenings/${testScreening.screeningId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ price: 20, quality: 'IMAX' })
        .expect(200);

      expect(res.body.price).toBe(20.0);
      expect(res.body.quality).toBe('IMAX');
    });

    it('should 404 if not found', async () => {
      await request(app)
        .patch('/screenings/aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ price: 20 })
        .expect(404);
    });

    it('should 401 if not staff', async () => {
      await ScreeningModel.create(testScreening);
      await request(app)
        .patch(`/screenings/${testScreening.screeningId}`)
        .send({ price: 20 })
        .expect(401);
    });
  });

  describe('DELETE /screenings/:id', () => {
    it('should delete a screening when staff', async () => {
      await ScreeningModel.create(testScreening);

      await request(app)
        .delete(`/screenings/${testScreening.screeningId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(204);

      const s = await ScreeningModel.findByPk(testScreening.screeningId);
      expect(s).toBeNull();
    });

    it('should 404 for not found', async () => {
      await request(app)
        .delete('/screenings/aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(404);
    });

    it('should 401 if not staff', async () => {
      await ScreeningModel.create(testScreening);
      await request(app)
        .delete(`/screenings/${testScreening.screeningId}`)
        .expect(401);
    });
  });

  describe('GET /screenings/search', () => {
    beforeEach(async () => {
      await ScreeningModel.create(testScreening);
    });

    it('should search by quality', async () => {
      const res = await request(app)
        .get('/screenings/search?quality=IMAX')
        .expect(200);
      expect(res.body.data.some((s: any) => s.quality === 'IMAX')).toBe(true);
    });

    it('should filter by hallId', async () => {
      const res = await request(app)
        .get(`/screenings/search?hallId=${testScreening.hallId}`)
        .expect(200);
      expect(
        res.body.data.some((s: any) => s.hallId === testScreening.hallId)
      ).toBe(true);
    });

    it('should filter by theaterId', async () => {
      const res = await request(app)
        .get(`/screenings/search?theaterId=${testScreening.theaterId}`)
        .expect(200);
      expect(
        res.body.data.some((s: any) => s.theaterId === testScreening.theaterId)
      ).toBe(true);
    });

    it('should filter by movieId', async () => {
      const res = await request(app)
        .get(`/screenings/search?movieId=${testScreening.movieId}`)
        .expect(200);
      expect(
        res.body.data.some((s: any) => s.movieId === testScreening.movieId)
      ).toBe(true);
    });

    it('should filter by date', async () => {
      const date = (testScreening.startTime as Date)
        .toISOString()
        .substring(0, 10);
      const res = await request(app)
        .get(`/screenings/search?date=${date}`)
        .expect(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should 400 for invalid filters', async () => {
      await request(app)
        .get('/screenings/search?movieId=not-a-uuid')
        .expect(400);
    });
  });
});
