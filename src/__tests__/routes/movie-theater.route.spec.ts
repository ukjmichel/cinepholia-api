import request from 'supertest';
import app from '../../app.js';
import { sequelize, syncDB } from '../../config/db.js';
import { MovieTheaterModel } from '../../models/movie-theater.model.js';
import { UserModel } from '../../models/user.model.js';
import { AuthorizationModel } from '../../models/authorization.model.js';
import { AuthService } from '../../services/auth.service.js';

// Example staff user data
const staffUserData = {
  username: 'staffuser',
  firstName: 'Staff',
  lastName: 'User',
  email: 'staff@movie.com',
  password: 'StaffPass123!',
};

// Example test theater
const testTheater = {
  theaterId: 'cinema-lyon-01',
  address: '1 Rue de la République',
  postalCode: '69001',
  city: 'Lyon',
  phone: '+33456789012',
  email: 'contact@cinema-lyon.fr',
};

/**
 * Clean all relevant tables between tests
 */
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

  beforeAll(async () => {
    await syncDB(); // Make sure to call this so tables exist!
  });

  beforeEach(async () => {
    await cleanDatabase();

    // Create a staff user with staff permissions
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

  describe('POST /movie-theaters', () => {
    it('should create a movie theater when authorized as staff', async () => {
      const res = await request(app)
        .post('/movie-theaters')
        .set('Authorization', `Bearer ${staffToken}`)
        .send(testTheater)
        .expect(201);

      expect(res.body.theaterId).toBe(testTheater.theaterId);
    });

    it('should return 401 if not authenticated', async () => {
      await request(app).post('/movie-theaters').send(testTheater).expect(401);
    });

    it('should return 409 for duplicate theaterId', async () => {
      await MovieTheaterModel.create(testTheater);

      const res = await request(app)
        .post('/movie-theaters')
        .set('Authorization', `Bearer ${staffToken}`)
        .send(testTheater)
        .expect(409);

      expect(res.body.message).toMatch(/already exists/i);
    });

    it('should return 400 for invalid input', async () => {
      await request(app)
        .post('/movie-theaters')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({}) // Missing required fields
        .expect(400);
    });
  });

  describe('GET /movie-theaters/:id', () => {
    it('should get movie theater by ID', async () => {
      await MovieTheaterModel.create(testTheater);

      const res = await request(app)
        .get(`/movie-theaters/${testTheater.theaterId}`)
        .expect(200);

      expect(res.body.theaterId).toBe(testTheater.theaterId);
    });

    it('should return 404 for non-existent ID', async () => {
      await request(app).get('/movie-theaters/not-exist').expect(404);
    });
  });

  describe('PUT /movie-theaters/:id', () => {
    it('should update theater when staff', async () => {
      await MovieTheaterModel.create(testTheater);

      const res = await request(app)
        .put(`/movie-theaters/${testTheater.theaterId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ city: 'Paris' })
        .expect(200);

      expect(res.body.city).toBe('Paris');
    });

    it('should return 404 for non-existent theater', async () => {
      await request(app)
        .put('/movie-theaters/not-exist')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ city: 'Paris' })
        .expect(404);
    });

    it('should return 401 if not staff', async () => {
      await MovieTheaterModel.create(testTheater);

      await request(app)
        .put(`/movie-theaters/${testTheater.theaterId}`)
        .send({ city: 'Paris' })
        .expect(401);
    });
  });

  describe('DELETE /movie-theaters/:id', () => {
    it('should delete theater when staff', async () => {
      await MovieTheaterModel.create(testTheater);

      await request(app)
        .delete(`/movie-theaters/${testTheater.theaterId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(204);

      const theater = await MovieTheaterModel.findByPk(testTheater.theaterId);
      expect(theater).toBeNull();
    });

    it('should return 404 for non-existent theater', async () => {
      await request(app)
        .delete('/movie-theaters/not-exist')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(404);
    });

    it('should return 401 if not staff', async () => {
      await MovieTheaterModel.create(testTheater);

      await request(app)
        .delete(`/movie-theaters/${testTheater.theaterId}`)
        .expect(401);
    });
  });

  describe('GET /movie-theaters', () => {
    it('should list all theaters', async () => {
      await MovieTheaterModel.bulkCreate([
        testTheater,
        {
          ...testTheater,
          theaterId: 'cinema-paris-01',
          city: 'Paris',
          email: 'contact@cinema-paris.fr',
        },
      ]);

      const res = await request(app).get('/movie-theaters').expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
    });
  });

  describe('GET /movie-theaters/search', () => {
    beforeEach(async () => {
      await MovieTheaterModel.bulkCreate([
        testTheater,
        {
          ...testTheater,
          theaterId: 'cinema-paris-01',
          city: 'Paris',
          email: 'contact@cinema-paris.fr',
        },
      ]);
    });

    it('should search by city', async () => {
      const res = await request(app)
        .get('/movie-theaters/search?city=Paris')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].city).toBe('Paris');
    });

    it('should search by partial address', async () => {
      const res = await request(app)
        .get('/movie-theaters/search?address=République')
        .expect(200);

      expect(res.body.length).toBeGreaterThan(0);
    });

    it('should return empty array for no matches', async () => {
      const res = await request(app)
        .get('/movie-theaters/search?city=NotExist')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);
    });
  });
});
