import request from 'supertest';
import app from '../../app.js';
import { sequelize } from '../../config/db.js';
import { syncDB } from '../../config/db.js';
import { MovieHallModel } from '../../models/movie-hall.model.js';
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

// Example test theater and hall
const testTheater = {
  theaterId: 'cinema-lyon-01',
  address: '1 Rue de la République',
  postalCode: '69001',
  city: 'Lyon',
  phone: '+33456789012',
  email: 'contact@cinema-lyon.fr',
};
const testHall = {
  theaterId: testTheater.theaterId,
  hallId: 'grande-salle',
  seatsLayout: [
    ['A1', 'A2'],
    ['B1', 'B2'],
  ],
  quality: '2D' as '2D',
};

/**
 * Clean all relevant tables between tests
 */
const cleanDatabase = async () => {
  if (sequelize.getDialect() !== 'sqlite') {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
  }

  await AuthorizationModel.destroy({
    where: {},
    truncate: true,
    cascade: true,
  });
  await UserModel.destroy({ where: {}, truncate: true, cascade: true });
  await MovieHallModel.destroy({ where: {}, truncate: true, cascade: true });
  await MovieTheaterModel.destroy({ where: {}, truncate: true, cascade: true });

  if (sequelize.getDialect() !== 'sqlite') {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
  }
};

describe('MovieHall E2E Routes', () => {
  let staffToken: string;

  beforeAll(async () => {
    await syncDB();
  });

  beforeEach(async () => {
    await cleanDatabase();

    // Create a staff user with staff permissions
    const staffUser = await UserModel.create(staffUserData);
    await AuthorizationModel.create({
      userId: (staffUser as any).userId,
      role: 'employé', // or whatever role is staff in your app
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

  describe('POST /movie-halls', () => {
    it('should create a movie hall when authorized as staff and theater exists', async () => {
      await MovieTheaterModel.create(testTheater);

      const res = await request(app)
        .post('/movie-halls')
        .set('Authorization', `Bearer ${staffToken}`)
        .send(testHall)
        .expect(201);

      expect(res.body.hallId).toBe(testHall.hallId);
      expect(res.body.theaterId).toBe(testHall.theaterId);
    });

    it('should return 404 if theater does not exist', async () => {
      await request(app)
        .post('/movie-halls')
        .set('Authorization', `Bearer ${staffToken}`)
        .send(testHall)
        .expect(404);
    });

    it('should return 401 if not authenticated', async () => {
      await request(app).post('/movie-halls').send(testHall).expect(401);
    });

    it('should return 400 for invalid input', async () => {
      await request(app)
        .post('/movie-halls')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({}) // Missing required fields
        .expect(400);
    });
  });

  describe('GET /movie-halls', () => {
    it('should return all movie halls', async () => {
      await MovieTheaterModel.create(testTheater);
      await MovieHallModel.create(testHall);

      const res = await request(app).get('/movie-halls').expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  describe('GET /movie-halls/:theaterId/:hallId', () => {
    it('should get movie hall by theaterId and hallId', async () => {
      await MovieTheaterModel.create(testTheater);
      await MovieHallModel.create(testHall);

      const res = await request(app)
        .get(`/movie-halls/${testTheater.theaterId}/${testHall.hallId}`)
        .expect(200);

      expect(res.body.theaterId).toBe(testTheater.theaterId);
      expect(res.body.hallId).toBe(testHall.hallId);
    });

    it('should return 404 for non-existent hall', async () => {
      await request(app)
        .get(`/movie-halls/${testTheater.theaterId}/not-exist`)
        .expect(404);
    });
  });

  describe('PATCH /movie-halls/:theaterId/:hallId', () => {
    it('should update a hall when staff', async () => {
      await MovieTheaterModel.create(testTheater);
      await MovieHallModel.create(testHall);

      const res = await request(app)
        .patch(`/movie-halls/${testTheater.theaterId}/${testHall.hallId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ seatsLayout: [['A1', 'A2', 'A3']] })
        .expect(200);

      expect(res.body.seatsLayout[0]).toContain('A3');
    });

    it('should return 404 for non-existent hall', async () => {
      await MovieTheaterModel.create(testTheater);

      await request(app)
        .patch(`/movie-halls/${testTheater.theaterId}/not-exist`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ seatsLayout: [['A1']] })
        .expect(404);
    });

    it('should return 401 if not staff', async () => {
      await MovieTheaterModel.create(testTheater);
      await MovieHallModel.create(testHall);

      await request(app)
        .patch(`/movie-halls/${testTheater.theaterId}/${testHall.hallId}`)
        .send({ seatsLayout: [['A1', 'A2', 'A3']] })
        .expect(401);
    });
  });

  describe('DELETE /movie-halls/:theaterId/:hallId', () => {
    it('should delete a hall when staff', async () => {
      await MovieTheaterModel.create(testTheater);
      await MovieHallModel.create(testHall);

      await request(app)
        .delete(`/movie-halls/${testTheater.theaterId}/${testHall.hallId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      const hall = await MovieHallModel.findOne({
        where: { theaterId: testTheater.theaterId, hallId: testHall.hallId },
      });
      expect(hall).toBeNull();
    });

    it('should return 404 for non-existent hall', async () => {
      await MovieTheaterModel.create(testTheater);

      await request(app)
        .delete(`/movie-halls/${testTheater.theaterId}/not-exist`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(404);
    });

    it('should return 401 if not staff', async () => {
      await MovieTheaterModel.create(testTheater);
      await MovieHallModel.create(testHall);

      await request(app)
        .delete(`/movie-halls/${testTheater.theaterId}/${testHall.hallId}`)
        .expect(401);
    });
  });

  describe('GET /movie-halls/search', () => {
    beforeEach(async () => {
      await MovieTheaterModel.create(testTheater);
      await MovieHallModel.bulkCreate([
        testHall,
        { ...testHall, hallId: 'petite-salle', seatsLayout: [['B1', 'B2']] },
      ]);
    });

    it('should search by hallId', async () => {
      const res = await request(app)
        .get('/movie-halls/search?hallId=petite-salle')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].hallId).toBe('petite-salle');
    });

    it('should search by theaterId', async () => {
      const res = await request(app)
        .get(`/movie-halls/search?theaterId=${testTheater.theaterId}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].theaterId).toBe(testTheater.theaterId);
    });

    it('should return 404 if no results', async () => {
      await request(app)
        .get('/movie-halls/search?hallId=not-exist')
        .expect(404);
    });
  });
});
