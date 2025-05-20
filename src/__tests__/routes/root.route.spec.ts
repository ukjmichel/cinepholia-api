import request from 'supertest';
import express from 'express';
import rootRouter from '../../routes/root.route';

jest.mock('../../config/db', () => ({
  sequelize: {
    authenticate: jest.fn(),
  },
}));

import { sequelize } from '../../config/db';
import mongoose from 'mongoose';

// Helper to mock mongoose connection state and db
function mockMongoose(readyState: number, pingSucceeds = true) {
  // @ts-ignore
  mongoose.connection.readyState = readyState;
  // @ts-ignore
  mongoose.connection.db =
    readyState === 1
      ? {
          admin: () => ({
            ping: pingSucceeds
              ? jest.fn().mockResolvedValueOnce(true)
              : jest.fn().mockRejectedValueOnce(new Error('MongoDB down')),
          }),
        }
      : undefined;
}

const app = express();
app.use('/', rootRouter);

describe('Root Router', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /', () => {
    it('should return API root info', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('name');
      expect(res.body).toHaveProperty('version');
      expect(res.body).toHaveProperty('description');
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('links.docs');
      expect(res.body).toHaveProperty('links.health');
    });
  });

  describe('GET /health/db', () => {
    it('should return 200 if both MySQL and MongoDB are healthy', async () => {
      // @ts-ignore
      sequelize.authenticate.mockResolvedValueOnce(true);
      mockMongoose(1, true);

      const res = await request(app).get('/health/db');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.services.mysql).toBe('ok');
      expect(res.body.services.mongodb).toBe('ok');
      expect(res.body.message).toBe('Database connections are healthy');
    });

    it('should return 500 if MySQL is down', async () => {
      // @ts-ignore
      sequelize.authenticate.mockRejectedValueOnce(new Error('MySQL down'));
      mockMongoose(1, true);

      const res = await request(app).get('/health/db');
      expect(res.status).toBe(500);
      expect(res.body.status).toBe('error');
      expect(res.body.services.mysql).toBe('error');
      expect(res.body.services.mongodb).toBe('ok');
      expect(res.body.message).toBe('One or more database connections failed');
    });

    it('should return 500 if MongoDB is down', async () => {
      // @ts-ignore
      sequelize.authenticate.mockResolvedValueOnce(true);
      mockMongoose(1, false); // ping fails

      const res = await request(app).get('/health/db');
      expect(res.status).toBe(500);
      expect(res.body.status).toBe('error');
      expect(res.body.services.mysql).toBe('ok');
      expect(res.body.services.mongodb).toBe('error');
      expect(res.body.message).toBe('One or more database connections failed');
    });

    it('should return 500 if MongoDB is disconnected', async () => {
      // @ts-ignore
      sequelize.authenticate.mockResolvedValueOnce(true);
      mockMongoose(0); // Disconnected

      const res = await request(app).get('/health/db');
      expect(res.status).toBe(500);
      expect(res.body.status).toBe('error');
      expect(res.body.services.mysql).toBe('ok');
      expect(res.body.services.mongodb).toBe('error');
      expect(res.body.message).toBe('One or more database connections failed');
    });
  });
});
