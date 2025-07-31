// src/__tests__/routes/user-token.route.spec.ts

import request from 'supertest';
import app from '../../app';
import { loadModels, sequelize } from '../../config/db';
import { UserModel } from '../../models/user.model';
import { UserTokenModel } from '../../models/user-token.model';
import { v4 as uuidv4 } from 'uuid';

// ✅ Mock email sending to avoid real API calls
jest.mock('../../services/email.service', () => ({
  EmailService: jest.fn().mockImplementation(() => ({
    sendResetPasswordEmail: jest.fn().mockResolvedValue(true),
  })),
}));

const userData = {
  username: 'resetuser',
  firstName: 'Reset',
  lastName: 'User',
  email: 'reset@user.com',
  password: 'Password123!',
};

const waitFor = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

describe('Reset Password E2E Routes', () => {
  let testUserId: string = '';

  const cleanDatabase = async () => {
    await loadModels();
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await UserTokenModel.destroy({ where: {}, truncate: true, cascade: true });
    await UserModel.destroy({ where: {}, truncate: true, cascade: true });
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
  };

  beforeAll(async () => {
    await loadModels();
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    await cleanDatabase();
    const createdUser = await UserModel.create(userData);
    testUserId = createdUser.userId;
  });

  afterAll(async () => {
    await cleanDatabase();
    await sequelize.close();
  });

  // ========================= TESTS =============================

  describe('POST /auth/password-reset/request', () => {
    it('should request a reset password token with valid email', async () => {
      const res = await request(app)
        .post('/auth/password-reset/request')
        .send({ email: userData.email })
        .expect(200);

      expect(res.body).toHaveProperty(
        'message',
        'If this email is registered, you will receive a reset code.'
      );

      const user = await UserModel.findOne({
        where: { email: userData.email },
      });
      if (!user) throw new Error('Test user was not created');

      const token = await UserTokenModel.findOne({
        where: { userId: user.userId },
      });
      expect(token).toBeTruthy();
      expect(token?.type).toBe('reset_password');
    });

    it('should return error for missing email', async () => {
      await request(app)
        .post('/auth/password-reset/request')
        .send({})
        .expect(400);
    });

    it('should always return success message even if user does not exist', async () => {
      const res = await request(app)
        .post('/auth/password-reset/request')
        .send({ email: 'fake@nomail.com' })
        .expect(200);

      expect(res.body).toHaveProperty(
        'message',
        'If this email is registered, you will receive a reset code.'
      );
    });
  });

  describe('POST /auth/password-reset/validate', () => {
    let rawCode: string = '';

    beforeEach(async () => {
      // Create a token manually for testing
      const user = await UserModel.findOne({
        where: { email: userData.email },
      });
      if (!user) throw new Error('Test user was not created');

      rawCode = '123456';
      await UserTokenModel.create({
        userId: user.userId,
        type: 'reset_password',
        token: require('crypto')
          .createHash('sha256')
          .update(rawCode)
          .digest('hex'),
        expiresAt: new Date(Date.now() + 60 * 1000),
        attempts: 0,
        lastRequestAt: new Date(),
      });
    });

    it('should return valid for correct token', async () => {
      const res = await request(app)
        .post('/auth/password-reset/validate')
        .send({ token: rawCode })
        .expect(200);

      expect(res.body).toHaveProperty('message', 'Token is valid.');
    });

    it('should return error for missing token', async () => {
      await request(app)
        .post('/auth/password-reset/validate')
        .send({})
        .expect(400);
    });

    it('should return error for invalid token', async () => {
      await request(app)
        .post('/auth/password-reset/validate')
        .send({ token: 'wrong' })
        .expect(400);
    });
  });

  describe('POST /auth/password-reset/confirm', () => {
    let rawCode: string = '';

    beforeEach(async () => {
      const user = await UserModel.findOne({
        where: { email: userData.email },
      });
      if (!user) throw new Error('Test user was not created');

      rawCode = '654321';
      await UserTokenModel.create({
        userId: user.userId,
        type: 'reset_password',
        token: require('crypto')
          .createHash('sha256')
          .update(rawCode)
          .digest('hex'),
        expiresAt: new Date(Date.now() + 60 * 1000),
        attempts: 0,
        lastRequestAt: new Date(),
      });
    });

    it('should reset password with valid token', async () => {
      const res = await request(app)
        .post('/auth/password-reset/confirm')
        .send({ token: rawCode, password: 'NewPass123!' })
        .expect(200);

      expect(res.body).toHaveProperty('message', 'Password has been reset.');
    });

    it('should return error for missing fields', async () => {
      await request(app)
        .post('/auth/password-reset/confirm')
        .send({})
        .expect(400);
    });

    it('should return error for invalid or expired token', async () => {
      await request(app)
        .post('/auth/password-reset/confirm')
        .send({ token: 'wrong', password: 'NewPass123!' })
        .expect(400);
    });

    it('should not allow token reuse after successful password reset', async () => {
      await request(app)
        .post('/auth/password-reset/confirm')
        .send({ token: rawCode, password: 'AnotherPass123!' })
        .expect(200);

      await request(app)
        .post('/auth/password-reset/confirm')
        .send({ token: rawCode, password: 'FailPass123!' })
        .expect(400);
    });
  });
});
