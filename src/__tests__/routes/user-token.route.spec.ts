import request from 'supertest';
import app from '../../app';
import { loadModels, sequelize, syncDB } from '../../config/db';
import { UserModel } from '../../models/user.model';
import { UserTokenModel } from '../../models/user-token.model';
import { AuthorizationModel } from '../../models/authorization.model'; 

const userData = {
  username: 'johndoe',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  password: 'Password123!',
};

/**
 * Database cleanup utility
 */
const cleanDatabase = async (): Promise<void> => {
  try {
    await loadModels(); 
    if (sequelize.getDialect() === 'mysql') {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    }
    await UserTokenModel.destroy({ where: {}, truncate: true, cascade: true });
    await AuthorizationModel.destroy({
      where: {},
      truncate: true,
      cascade: true,
    });
    await UserModel.destroy({ where: {}, truncate: true, cascade: true });
    if (sequelize.getDialect() === 'mysql') {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    }
    console.log('✅ Database cleaned successfully');
  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
    throw error;
  }
};

/**
 * Add delay between tests to avoid rate limiting or async race
 */
const waitForRateLimit = async (ms: number = 500): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

describe('Reset Password E2E Routes - Final Working Version', () => {
  let testUserId: string;

  beforeAll(async () => {
    await loadModels(); // ✅ Make sure models are registered
    await syncDB(); // ✅ Sync database after loading models
    console.log('🚀 Test database synced and ready');
  });

  beforeEach(async () => {
    await waitForRateLimit(500);

    // Clean database
    await cleanDatabase();

    // Create user via API (tu as un vrai /auth/register)
    const userRes = await request(app).post('/auth/register').send(userData);
    if (userRes.status === 201 && userRes.body.data?.userId) {
      testUserId = userRes.body.data.userId;
    } else {
      throw new Error(
        `Failed to create test user: ${userRes.status} - ${JSON.stringify(userRes.body)}`
      );
    }
    console.log('🧹 Test environment prepared');
  });

  afterAll(async () => {
    await cleanDatabase();
    await sequelize.close();
    console.log('🔌 Database connection closed');
  });

  // =================== TESTS =======================

  describe('POST /auth/reset-password', () => {
    it('should request a reset password token with valid email', async () => {
      const res = await request(app)
        .post('/auth/reset-password')
        .send({ email: userData.email })
        .expect(200);

      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toMatch(/you will receive a code/i);

      const token = await UserTokenModel.findOne({
        where: {
          type: 'reset_password',
          userId: testUserId,
        },
      });
      expect(token).toBeTruthy();
      expect(token?.type).toBe('reset_password');
      expect(token?.userId).toBe(testUserId);
    });

    it('should return error for missing email', async () => {
      const res = await request(app)
        .post('/auth/reset-password')
        .send({})
        .expect(400);

      expect(res.body).toHaveProperty('message', 'Validation error');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: 'email',
            msg: expect.any(String),
          }),
        ])
      );
    });

    it('should return error for invalid email format', async () => {
      const res = await request(app)
        .post('/auth/reset-password')
        .send({ email: 'not-an-email' })
        .expect(400);

      expect(res.body).toHaveProperty('message', 'Validation error');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: 'email',
            msg: expect.any(String),
          }),
        ])
      );
    });

    it('should always return success message even if user does not exist', async () => {
      const res = await request(app)
        .post('/auth/reset-password')
        .send({ email: 'ghost@fake.com' })
        .expect(200);

      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toMatch(/you will receive a code/i);

      const tokens = await UserTokenModel.findAll({
        where: { type: 'reset_password' },
      });
      expect(tokens.length).toBe(0);
    });

    it('should handle multiple reset requests (token replacement)', async () => {
      await request(app)
        .post('/auth/reset-password')
        .send({ email: userData.email })
        .expect(200);

      const firstToken = await UserTokenModel.findOne({
        where: { type: 'reset_password', userId: testUserId },
      });
      expect(firstToken).toBeTruthy();

      await waitForRateLimit(500);

      await request(app)
        .post('/auth/reset-password')
        .send({ email: userData.email })
        .expect(200);

      const allTokens = await UserTokenModel.findAll({
        where: { type: 'reset_password', userId: testUserId },
      });
      expect(allTokens.length).toBe(1);
      expect(allTokens[0].token).not.toBe(firstToken?.token);
    });
  });

  describe('POST /auth/check-reset-password', () => {
    let validToken: string;

    beforeEach(async () => {
      await request(app)
        .post('/auth/reset-password')
        .send({ email: userData.email });

      const tokenObj = await UserTokenModel.findOne({
        where: { type: 'reset_password', userId: testUserId },
      });
      if (!tokenObj) throw new Error('Reset password token was not created');
      validToken = tokenObj.token;
    });

    it('should return valid for correct token', async () => {
      const res = await request(app)
        .post('/auth/check-reset-password')
        .send({ token: validToken })
        .expect(200);

      expect(res.body).toHaveProperty('message', 'Token is valid.');
    });

    it('should return error for missing token', async () => {
      const res = await request(app)
        .post('/auth/check-reset-password')
        .send({})
        .expect(400);

      expect(res.body).toHaveProperty('message', 'Validation error');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: 'token',
            msg: expect.any(String),
          }),
        ])
      );
    });

    it('should return error for invalid token', async () => {
      const res = await request(app)
        .post('/auth/check-reset-password')
        .send({ token: 'invalid-token-123' })
        .expect(404);

      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toMatch(/not found/i);
    });

    it('should return error for expired token', async () => {
      await UserTokenModel.update(
        { expiresAt: new Date(Date.now() - 1000) },
        { where: { token: validToken } }
      );
      const res = await request(app)
        .post('/auth/check-reset-password')
        .send({ token: validToken })
        .expect(401);

      expect(res.body.message).toMatch(/expired/i);
    });
  });

  describe('POST /auth/confirm-reset-password', () => {
    let validToken: string;

    beforeEach(async () => {
      await request(app)
        .post('/auth/reset-password')
        .send({ email: userData.email });

      const tokenObj = await UserTokenModel.findOne({
        where: { type: 'reset_password', userId: testUserId },
      });
      if (!tokenObj) throw new Error('Reset password token was not created');
      validToken = tokenObj.token;
    });

    it('should reset password with valid token', async () => {
      const newPassword = 'BrandNewPassword123!';
      const res = await request(app)
        .post('/auth/confirm-reset-password')
        .send({ token: validToken, password: newPassword })
        .expect(200);

      expect(res.body).toHaveProperty('message', 'Password has been reset.');

      const tokenAfterReset = await UserTokenModel.findOne({
        where: { token: validToken },
      });
      expect(tokenAfterReset).toBeNull();

      const loginRes = await request(app).post('/auth/login').send({
        emailOrUsername: userData.email,
        password: newPassword,
      });
      expect([200, 201]).toContain(loginRes.status);
    });

    it('should return error for missing fields', async () => {
      const testCases = [
        {},
        { token: validToken },
        { password: 'Password123!' },
      ];

      for (const testCase of testCases) {
        const res = await request(app)
          .post('/auth/confirm-reset-password')
          .send(testCase)
          .expect(400);

        expect(res.body).toHaveProperty('message', 'Validation error');
      }
    });

    it('should return error for invalid or expired token', async () => {
      const res = await request(app)
        .post('/auth/confirm-reset-password')
        .send({ token: 'invalid-token', password: 'AnotherGoodPass123!' })
        .expect(404);

      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toMatch(/not found/i);
    });

    it('should return error for weak password', async () => {
      const res = await request(app)
        .post('/auth/confirm-reset-password')
        .send({ token: validToken, password: '123' })
        .expect(400);

      expect(res.body).toHaveProperty('message', 'Validation error');
    });

    it('should not allow token reuse after successful password reset', async () => {
      const newPassword = 'BrandNewPassword123!';
      await request(app)
        .post('/auth/confirm-reset-password')
        .send({ token: validToken, password: newPassword })
        .expect(200);

      const res = await request(app)
        .post('/auth/confirm-reset-password')
        .send({ token: validToken, password: 'AnotherPassword123!' })
        .expect(404);

      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toMatch(/not found/i);
    });
  });

  describe('Integration Tests - Core Functionality', () => {
    it('should handle complete password reset workflow', async () => {
      const newPassword = 'CompleteWorkflowPassword123!';

      const resetRes = await request(app)
        .post('/auth/reset-password')
        .send({ email: userData.email })
        .expect(200);

      expect(resetRes.body.message).toMatch(/you will receive a code/i);

      const token = await UserTokenModel.findOne({
        where: { type: 'reset_password', userId: testUserId },
      });
      expect(token).toBeTruthy();

      await request(app)
        .post('/auth/check-reset-password')
        .send({ token: token!.token })
        .expect(200);

      await request(app)
        .post('/auth/confirm-reset-password')
        .send({ token: token!.token, password: newPassword })
        .expect(200);

      const loginRes = await request(app).post('/auth/login').send({
        emailOrUsername: userData.email,
        password: newPassword,
      });
      expect([200, 201]).toContain(loginRes.status);

      const oldLoginRes = await request(app).post('/auth/login').send({
        emailOrUsername: userData.email,
        password: userData.password,
      });
      expect([400, 401]).toContain(oldLoginRes.status);
    });

    it('should maintain data consistency during password reset', async () => {
      const userBefore = await UserModel.findByPk(testUserId);
      expect(userBefore).toBeTruthy();

      await request(app)
        .post('/auth/reset-password')
        .send({ email: userData.email });

      const token = await UserTokenModel.findOne({
        where: { type: 'reset_password', userId: testUserId },
      });

      await request(app).post('/auth/confirm-reset-password').send({
        token: token!.token,
        password: 'ConsistencyPassword123!',
      });

      const userAfter = await UserModel.findByPk(testUserId);
      expect(userAfter).toBeTruthy();
      expect(userAfter!.email).toBe(userBefore!.email);
      expect(userAfter!.firstName).toBe(userBefore!.firstName);
      expect(userAfter!.lastName).toBe(userBefore!.lastName);
      expect(userAfter!.username).toBe(userBefore!.username);
    });
  });
});
