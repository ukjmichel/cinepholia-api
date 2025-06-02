import request from 'supertest';
import app from '../../app';
import { sequelize, syncDB } from '../../config/db';
import { v4 as uuidv4 } from 'uuid';

import { UserModel } from '../../models/user.model';
import { AuthorizationModel } from '../../models/authorization.model';
import { MovieTheaterModel } from '../../models/movie-theater.model';
import { MovieHallModel } from '../../models/movie-hall.model';
import { IncidentReportModel } from '../../models/incident-report.model';
import { AuthService } from '../../services/auth.service';

// Clean database for isolation
const cleanDatabase = async () => {
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
  await IncidentReportModel.destroy({
    where: {},
    truncate: true,
    cascade: true,
  });
  await AuthorizationModel.destroy({
    where: {},
    truncate: true,
    cascade: true,
  });
  await UserModel.destroy({ where: {}, truncate: true, cascade: true });
  await MovieHallModel.destroy({ where: {}, truncate: true, cascade: true });
  await MovieTheaterModel.destroy({ where: {}, truncate: true, cascade: true });
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
};

const testTheater = {
  theaterId: 'theater-ir-1',
  address: '1 Place du Cinéma',
  postalCode: '69000',
  city: 'Lyon',
  phone: '+3345555555',
  email: 'lyon@cinema.com',
};

const testHall = {
  theaterId: testTheater.theaterId,
  hallId: 'hall-ir-1',
  seatsLayout: [
    ['A1', 'A2', 'A3'],
    ['B1', 'B2', 'B3'],
  ],
};

const staffUserData = {
  username: 'staffuser',
  firstName: 'Marie',
  lastName: 'Curie',
  email: 'marie@cine.com',
  password: 'Test123!',
};

const regularUserData = {
  username: 'regularuser',
  firstName: 'Paul',
  lastName: 'Durand',
  email: 'paul@cine.com',
  password: 'Test123!',
};

const otherUserData = {
  username: 'otheruser',
  firstName: 'Other',
  lastName: 'User',
  email: 'other@cine.com',
  password: 'Other123!',
};

describe('IncidentReport E2E Routes (Full Coverage)', () => {
  let staffToken: string;
  let adminToken: string;
  let userToken: string;
  let otherUserToken: string;
  let staffUserId: string;
  let adminUserId: string;
  let regularUserId: string;
  let otherUserId: string;

  beforeAll(async () => {
    await syncDB();
  });

  beforeEach(async () => {
    await cleanDatabase();

    await MovieTheaterModel.create(testTheater);
    await MovieHallModel.create(testHall);

    // Staff
    const staffUser = await UserModel.create(staffUserData);
    staffUserId = staffUser.userId;
    await AuthorizationModel.create({ userId: staffUserId, role: 'employé' });
    staffToken = new AuthService().generateTokens({
      userId: staffUserId,
      username: staffUserData.username,
      email: staffUserData.email,
      verified: false,
    } as any).accessToken;

    // Admin
    const adminUser = await UserModel.create({
      ...staffUserData,
      username: 'adminuser',
      email: 'admin@cine.com',
    });
    adminUserId = adminUser.userId;
    await AuthorizationModel.create({
      userId: adminUserId,
      role: 'administrateur',
    });
    adminToken = new AuthService().generateTokens({
      userId: adminUserId,
      username: 'adminuser',
      email: 'admin@cine.com',
      verified: false,
    } as any).accessToken;

    // Regular user
    const regUser = await UserModel.create(regularUserData);
    regularUserId = regUser.userId;
    await AuthorizationModel.create({
      userId: regularUserId,
      role: 'utilisateur',
    });
    userToken = new AuthService().generateTokens({
      userId: regularUserId,
      username: regularUserData.username,
      email: regularUserData.email,
      verified: false,
    } as any).accessToken;

    // Other user
    const otherUser = await UserModel.create(otherUserData);
    otherUserId = otherUser.userId;
    await AuthorizationModel.create({
      userId: otherUserId,
      role: 'utilisateur',
    });
    otherUserToken = new AuthService().generateTokens({
      userId: otherUserId,
      username: otherUserData.username,
      email: otherUserData.email,
      verified: false,
    } as any).accessToken;

    await IncidentReportModel.create({
      incidentId: uuidv4(),
      theaterId: testTheater.theaterId,
      hallId: testHall.hallId,
      title: 'Fulfilled',
      description: 'Description long enough to pass validation',
      userId: staffUserId,
      status: 'fulfilled',
    });
  });

  afterAll(async () => {
    await cleanDatabase();
    await sequelize.close();
  });

  // ========== POST ==========
  describe('POST /incident-reports', () => {
    const validData = {
      theaterId: testTheater.theaterId,
      hallId: testHall.hallId,
      title: 'Water leak',
      description: 'A water leak was found near seat B2, water everywhere!',
    };

    it('should allow staff to create', async () => {
      const data = { ...validData, userId: staffUserId };
      const res = await request(app)
        .post('/incident-reports')
        .set('Authorization', `Bearer ${staffToken}`)
        .send(data)
        .expect(201);
      expect(res.body.data).toHaveProperty('incidentId');
    });

    it('should allow admin to create', async () => {
      const data = { ...validData, userId: adminUserId };
      const res = await request(app)
        .post('/incident-reports')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(data)
        .expect(201);
      expect(res.body.data.userId).toBe(adminUserId);
    });

    it('should 401 if unauthenticated', async () => {
      const data = { ...validData, userId: staffUserId };
      await request(app).post('/incident-reports').send(data).expect(401);
    });

    it('should 403 if regular user', async () => {
      const data = { ...validData, userId: regularUserId };
      await request(app)
        .post('/incident-reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send(data)
        .expect(403);
    });

    it('should 400 for invalid input', async () => {
      await request(app)
        .post('/incident-reports')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({}) // missing fields
        .expect(400);
    });
  });

  // ========== GET ALL ==========
  describe('GET /incident-reports', () => {
    beforeEach(async () => {
      await IncidentReportModel.create({
        incidentId: uuidv4(),
        theaterId: testTheater.theaterId,
        hallId: testHall.hallId,
        title: 'Lost phone',
        description: 'Lost phone in hall, black iPhone found under seat A3.',
        userId: staffUserId,
        status: 'pending',
      });
    });

    it('should get all (staff)', async () => {
      const res = await request(app)
        .get('/incident-reports')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should get all (admin)', async () => {
      await request(app)
        .get('/incident-reports')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should 401 if unauthenticated', async () => {
      await request(app).get('/incident-reports').expect(401);
    });

    it('should 403 if regular user', async () => {
      await request(app)
        .get('/incident-reports')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  // ========== GET BY ID ==========
  describe('GET /incident-reports/:incidentId', () => {
    let createdIncidentId: string;
    beforeEach(async () => {
      createdIncidentId = uuidv4();
      await IncidentReportModel.create({
        incidentId: createdIncidentId,
        theaterId: testTheater.theaterId,
        hallId: testHall.hallId,
        title: 'Lost phone',
        description:
          'Lost phone, iPhone 12 with a red case, contact desk if found.',
        userId: staffUserId,
        status: 'pending',
      });
    });

    it('should get by ID (staff)', async () => {
      await request(app)
        .get(`/incident-reports/${createdIncidentId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);
    });

    it('should get by ID (admin)', async () => {
      await request(app)
        .get(`/incident-reports/${createdIncidentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should 401 if unauthenticated', async () => {
      await request(app)
        .get(`/incident-reports/${createdIncidentId}`)
        .expect(401);
    });

    it('should 403 if regular user', async () => {
      await request(app)
        .get(`/incident-reports/${createdIncidentId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should 404 if not found', async () => {
      await request(app)
        .get('/incident-reports/aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(404);
    });

    it('should 400 for invalid id', async () => {
      await request(app)
        .get('/incident-reports/invalid-uuid')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(400);
    });
  });

  // ========== PATCH /incident-reports/:incidentId ==========
  describe('PATCH /incident-reports/:incidentId', () => {
    let incidentId: string;
    beforeEach(async () => {
      incidentId = uuidv4();
      await IncidentReportModel.create({
        incidentId,
        theaterId: testTheater.theaterId,
        hallId: testHall.hallId,
        title: 'Dirty seat',
        description: 'A very dirty seat, cleaning requested after screening.',
        userId: staffUserId,
        status: 'pending',
      });
    });

    it('should allow staff to patch', async () => {
      await request(app)
        .patch(`/incident-reports/${incidentId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          title: 'Fixed seat',
          description: 'Seat cleaned by staff at 17h.',
        })
        .expect(200);
    });

    it('should allow admin to patch', async () => {
      await request(app)
        .patch(`/incident-reports/${incidentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'Admin updated description, issue resolved.' })
        .expect(200);
    });

    it('should 403 for regular user', async () => {
      await request(app)
        .patch(`/incident-reports/${incidentId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Fail', description: 'Attempted by user.' })
        .expect(403);
    });

    it('should 401 if unauthenticated', async () => {
      await request(app)
        .patch(`/incident-reports/${incidentId}`)
        .send({ title: 'Fail', description: 'No token.' })
        .expect(401);
    });

    it('should 404 for not found', async () => {
      await request(app)
        .patch('/incident-reports/aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ title: 'Nope', description: 'Not found.' })
        .expect(404);
    });

    it('should 400 for invalid id', async () => {
      await request(app)
        .patch('/incident-reports/invalid-uuid')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ title: 'Nope', description: 'Invalid UUID.' })
        .expect(400);
    });

    it('should 400 for bad input', async () => {
      await request(app)
        .patch(`/incident-reports/${incidentId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ title: '' })
        .expect(400);
    });
  });

  // ========== DELETE ==========
  describe('DELETE /incident-reports/:incidentId', () => {
    let incidentId: string;
    beforeEach(async () => {
      incidentId = uuidv4();
      await IncidentReportModel.create({
        incidentId,
        theaterId: testTheater.theaterId,
        hallId: testHall.hallId,
        title: 'Broken seat',
        description: 'A seat was broken during screening, maintenance needed.',
        userId: staffUserId,
        status: 'pending',
      });
    });

    it('should allow staff to delete', async () => {
      await request(app)
        .delete(`/incident-reports/${incidentId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(204);
    });

    it('should allow admin to delete', async () => {
      // Recreate for admin
      const newId = uuidv4();
      await IncidentReportModel.create({
        incidentId: newId,
        theaterId: testTheater.theaterId,
        hallId: testHall.hallId,
        title: 'Admin delete',
        description: 'Report for admin delete scenario.',
        userId: adminUserId,
        status: 'pending',
      });
      await request(app)
        .delete(`/incident-reports/${newId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
    });

    it('should 403 for regular user', async () => {
      await request(app)
        .delete(`/incident-reports/${incidentId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should 401 if unauthenticated', async () => {
      await request(app).delete(`/incident-reports/${incidentId}`).expect(401);
    });

    it('should 404 for not found', async () => {
      await request(app)
        .delete('/incident-reports/aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(404);
    });

    it('should 400 for invalid id', async () => {
      await request(app)
        .delete('/incident-reports/invalid-uuid')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(400);
    });
  });

  // ========== PATCH STATUS ==========
  describe('PATCH /incident-reports/:incidentId/status', () => {
    let incidentId: string;
    beforeEach(async () => {
      incidentId = uuidv4();
      await IncidentReportModel.create({
        incidentId,
        theaterId: testTheater.theaterId,
        hallId: testHall.hallId,
        title: 'Unstable seat',
        description: 'An unstable seat that wobbles, customer complained.',
        userId: staffUserId,
        status: 'pending',
      });
    });

    it('should allow staff to update status', async () => {
      await request(app)
        .patch(`/incident-reports/${incidentId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'fulfilled' })
        .expect(200);
    });

    it('should allow admin to update status', async () => {
      await request(app)
        .patch(`/incident-reports/${incidentId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'fulfilled' })
        .expect(200);
    });

    it('should 400 for invalid status', async () => {
      await request(app)
        .patch(`/incident-reports/${incidentId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'invalid_status' })
        .expect(400);
    });

    it('should 403 for regular user', async () => {
      await request(app)
        .patch(`/incident-reports/${incidentId}/status`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ status: 'fulfilled' })
        .expect(403);
    });

    it('should 401 if unauthenticated', async () => {
      await request(app)
        .patch(`/incident-reports/${incidentId}/status`)
        .send({ status: 'fulfilled' })
        .expect(401);
    });
  });

  // ========== SEARCH ==========
  describe('GET /incident-reports/search', () => {
    beforeEach(async () => {
      await IncidentReportModel.create({
        incidentId: uuidv4(),
        theaterId: testTheater.theaterId,
        hallId: testHall.hallId,
        title: 'Flood',
        description: 'Major water damage on ground level after pipe burst.',
        userId: staffUserId,
        status: 'in_progress',
      });
    });

    it('should search by title', async () => {
      const res = await request(app)
        .get('/incident-reports/search?title=Flood')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);
      expect(res.body.data[0].title).toMatch(/Flood/);
    });

    it('should 400 if no params', async () => {
      await request(app)
        .get('/incident-reports/search')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(400);
    });

    it('should 404 if nothing found', async () => {
      await request(app)
        .get('/incident-reports/search?title=Zzztotallyabsent')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(404);
    });
  });

  // ========== STATISTICS ==========
  describe('GET /incident-reports/statistics', () => {
    beforeEach(async () => {
      await IncidentReportModel.create({
        incidentId: uuidv4(),
        theaterId: testTheater.theaterId,
        hallId: testHall.hallId,
        title: 'Stat seat',
        description: 'Statistics seat, count for stats.',
        userId: staffUserId,
        status: 'fulfilled',
      });
    });

    it('should get statistics (staff)', async () => {
      await request(app)
        .get('/incident-reports/statistics')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);
    });

    it('should get statistics by theaterId', async () => {
      await request(app)
        .get(`/incident-reports/statistics?theaterId=${testTheater.theaterId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);
    });

    it('should 401 if unauthenticated', async () => {
      await request(app).get('/incident-reports/statistics').expect(401);
    });
  });

  // ========== GET BY THEATER/HALL/USER/STATUS ==========
  describe('GET /incident-reports/theater/:theaterId', () => {
    beforeEach(async () => {
      await IncidentReportModel.create({
        incidentId: uuidv4(),
        theaterId: testTheater.theaterId,
        hallId: testHall.hallId,
        title: 'By theater',
        description: 'For theater reporting, full details inside.',
        userId: staffUserId,
        status: 'pending',
      });
    });
    it('should get by theater', async () => {
      await request(app)
        .get(`/incident-reports/theater/${testTheater.theaterId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);
    });
  });

  describe('GET /incident-reports/hall/:theaterId/:hallId', () => {
    beforeEach(async () => {
      await IncidentReportModel.create({
        incidentId: uuidv4(),
        theaterId: testTheater.theaterId,
        hallId: testHall.hallId,
        title: 'By hall',
        description: 'For hall reporting, full details provided.',
        userId: staffUserId,
        status: 'pending',
      });
    });
    it('should get by hall', async () => {
      await request(app)
        .get(`/incident-reports/hall/${testHall.theaterId}/${testHall.hallId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);
    });
  });

  describe('GET /incident-reports/user/:userId', () => {
    beforeEach(async () => {
      await IncidentReportModel.create({
        incidentId: uuidv4(),
        theaterId: testTheater.theaterId,
        hallId: testHall.hallId,
        title: 'By user',
        description: 'Incident report for a specific user test.',
        userId: staffUserId,
        status: 'pending',
      });
    });
    it('should get by user', async () => {
      await request(app)
        .get(`/incident-reports/user/${staffUserId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);
    });
  });

  describe('GET /incident-reports/status/:status', () => {
    beforeEach(async () => {
      await IncidentReportModel.create({
        incidentId: uuidv4(),
        theaterId: testTheater.theaterId,
        hallId: testHall.hallId,
        title: 'Fulfilled',
        description: 'Incident resolved and status set to fulfilled.',
        userId: staffUserId,
        status: 'fulfilled',
      });
    });
    it('should get by status', async () => {
      await request(app)
        .get(`/incident-reports/status/fulfilled`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);
    });
  });
});
