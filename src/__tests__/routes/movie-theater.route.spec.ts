import request from 'supertest';
import app from '../../app.js';
import { sequelize, syncDB } from '../../config/db.js';
import { MovieTheaterModel } from '../../models/movie-theater.model.js';
import { UserModel } from '../../models/user.model.js';
import { AuthorizationModel } from '../../models/authorization.model.js';
import { AuthService } from '../../services/auth.service.js';

const staffUserData = {
  username: 'staffuser',
  firstName: 'Staff',
  lastName: 'User',
  email: 'staff@movie.com',
  password: 'StaffPass123!',
};

const testTheater = {
  theaterId: 'cinema-lyon-01',
  address: '1 Rue de la République',
  postalCode: '69001',
  city: 'Lyon',
  phone: '+33456789012',
  email: 'contact@cinema-lyon.fr',
};

const altTheater = {
  ...testTheater,
  theaterId: 'cinema-paris-01',
  city: 'Paris',
  email: 'contact@cinema-paris.fr',
};

const cleanDatabase = async () => {
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
  await AuthorizationModel.destroy({
    where: {},
    truncate: true,
    cascade: true,
  });
  await UserModel.destroy({ where: {}, truncate: true, cascade: true });
  await MovieTheaterModel.destroy({ where: {}, truncate: true, cascade: true });
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
};

describe('MovieTheater E2E Routes', () => {
  let staffToken: string;
  let staffUserId: string;

  beforeAll(async () => {
    await syncDB();
  });

  beforeEach(async () => {
    await cleanDatabase();

    // Create staff user and get the actual userId
    const staffUser = await UserModel.create(staffUserData);
    staffUserId = (staffUser as any).userId;

    // Create authorization record
    await AuthorizationModel.create({
      userId: staffUserId,
      role: 'employé',
    });

    // Generate token with proper user data
    const authService = new AuthService();
    const tokenData = authService.generateTokens({
      userId: staffUserId,
      username: staffUserData.username,
      email: staffUserData.email,
      verified: true, // Set to true to avoid verification issues
    } as any);

    staffToken = tokenData.accessToken;

    // Debug: Log the token for troubleshooting
    console.log('Generated staff token:', staffToken);
  });

  afterAll(async () => {
    await cleanDatabase();
    await sequelize.close();
  });

  describe('POST /movie-theaters', () => {
    it('should create a movie theater when authorized as staff', async () => {
      const res = await request(app)
        .post('/movie-theaters')
        .set('Authorization', `Bearer ${staffToken}`)
        .send(testTheater);

      // Debug response if test fails
      if (res.status !== 201) {
        console.log('Response status:', res.status);
        console.log('Response body:', res.body);
        console.log('Response headers:', res.headers);
      }

      expect(res.status).toBe(201);
      expect(res.body.theaterId).toBe(testTheater.theaterId);

      // Verify the theater was actually created in the database
      const createdTheater = await MovieTheaterModel.findByPk(
        testTheater.theaterId
      );
      expect(createdTheater).not.toBeNull();
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app).post('/movie-theaters').send(testTheater);

      expect(res.status).toBe(401);
    });

    it('should return 409 for duplicate theaterId', async () => {
      // First, create a theater directly in the database
      await MovieTheaterModel.create(testTheater);

      const res = await request(app)
        .post('/movie-theaters')
        .set('Authorization', `Bearer ${staffToken}`)
        .send(testTheater);

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/already exists/i);
    });

    it('should return 400 for invalid input', async () => {
      const res = await request(app)
        .post('/movie-theaters')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({}); // Missing required fields

      expect(res.status).toBe(400);
    });
  });

  describe('GET /movie-theaters/:id', () => {
    it('should get movie theater by ID', async () => {
      // Create theater in database first
      await MovieTheaterModel.create(testTheater);

      const res = await request(app).get(
        `/movie-theaters/${testTheater.theaterId}`
      );

      expect(res.status).toBe(200);
      expect(res.body.theaterId).toBe(testTheater.theaterId);
    });

    it('should return 404 for non-existent ID', async () => {
      const res = await request(app).get('/movie-theaters/not-exist');

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /movie-theaters/:id', () => {
    it('should update theater when staff', async () => {
      // Create theater first
      await MovieTheaterModel.create(testTheater);

      const res = await request(app)
        .put(`/movie-theaters/${testTheater.theaterId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ city: 'Paris' });

      expect(res.status).toBe(200);
      expect(res.body.city).toBe('Paris');

      // Verify update in database
      const updatedTheater = await MovieTheaterModel.findByPk(
        testTheater.theaterId
      );
      expect((updatedTheater as any)?.city).toBe('Paris');
    });

    it('should return 404 for non-existent theater', async () => {
      const res = await request(app)
        .put('/movie-theaters/not-exist')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ city: 'Paris' });

      expect(res.status).toBe(404);
    });

    it('should return 401 if not authenticated', async () => {
      await MovieTheaterModel.create(testTheater);

      const res = await request(app)
        .put(`/movie-theaters/${testTheater.theaterId}`)
        .send({ city: 'Paris' });

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /movie-theaters/:id', () => {
    it('should delete theater when staff', async () => {
      // Create theater first
      await MovieTheaterModel.create(testTheater);

      const res = await request(app)
        .delete(`/movie-theaters/${testTheater.theaterId}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(204);

      // Verify deletion
      const theater = await MovieTheaterModel.findByPk(testTheater.theaterId);
      expect(theater).toBeNull();
    });

    it('should return 404 for non-existent theater', async () => {
      const res = await request(app)
        .delete('/movie-theaters/not-exist')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 401 if not authenticated', async () => {
      await MovieTheaterModel.create(testTheater);

      const res = await request(app).delete(
        `/movie-theaters/${testTheater.theaterId}`
      );

      expect(res.status).toBe(401);
    });
  });

  describe('GET /movie-theaters', () => {
    it('should list all theaters', async () => {
      // Create theaters first
      await MovieTheaterModel.bulkCreate([testTheater, altTheater]);

      const res = await request(app).get('/movie-theaters');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
    });

    it('should return empty array when no theaters exist', async () => {
      const res = await request(app).get('/movie-theaters');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);
    });
  });

  describe('GET /movie-theaters/search', () => {
    beforeEach(async () => {
      await MovieTheaterModel.bulkCreate([testTheater, altTheater]);
    });

    it('should search by city', async () => {
      const res = await request(app).get('/movie-theaters/search?city=Paris');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].city).toBe('Paris');
    });

    it('should search by partial address', async () => {
      const res = await request(app).get(
        '/movie-theaters/search?address=République'
      );

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('should return empty array for no matches', async () => {
      const res = await request(app).get(
        '/movie-theaters/search?city=NotExist'
      );

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);
    });

    it('should handle multiple search parameters', async () => {
      const res = await request(app).get(
        '/movie-theaters/search?city=Lyon&postalCode=69001'
      );

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].city).toBe('Lyon');
      expect(res.body[0].postalCode).toBe('69001');
    });
  });
});
