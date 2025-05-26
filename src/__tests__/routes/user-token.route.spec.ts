import request from 'supertest';
import app from '../../app';
import { sequelize } from '../../config/db';
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
 * Enhanced database cleanup
 */
const cleanDatabase = async (): Promise<void> => {
  try {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');

    // Clean in proper order: child tables first
    await UserTokenModel.destroy({ where: {}, truncate: true, cascade: true });
    await AuthorizationModel.destroy({
      where: {},
      truncate: true,
      cascade: true,
    });
    await UserModel.destroy({ where: {}, truncate: true, cascade: true });

    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✅ Database cleaned successfully');
  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
    throw error;
  }
};

/**
 * Add delay between tests to avoid rate limiting
 */
const waitForRateLimit = async (ms: number = 3000): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

describe('Reset Password E2E Routes - Final Working Version', () => {
  let testUserId: string;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    console.log('🚀 Test database synced and ready');
  });

  beforeEach(async () => {
    // Add delay to avoid rate limiting
    await waitForRateLimit(1500);

    // Clean database
    await cleanDatabase();

    // Create regular user via API
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

  describe('POST /auth/reset-password', () => {
    it('should request a reset password token with valid email', async () => {
      const res = await request(app)
        .post('/auth/reset-password')
        .send({ email: userData.email })
        .expect(200);

      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toMatch(/you will receive a code/i);

      // Verify token was created in database
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
      expect(res.body).toHaveProperty('errors');
      // Updated to match your actual validation error format
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

      // Verify no token was created for non-existent user
      const tokens = await UserTokenModel.findAll({
        where: { type: 'reset_password' },
      });
      expect(tokens.length).toBe(0);
    });

    it('should handle multiple reset requests (token replacement)', async () => {
      // First request
      await request(app)
        .post('/auth/reset-password')
        .send({ email: userData.email })
        .expect(200);

      const firstToken = await UserTokenModel.findOne({
        where: { type: 'reset_password', userId: testUserId },
      });
      expect(firstToken).toBeTruthy();

      // Add delay to avoid rate limiting
      await waitForRateLimit(2000);

      // Second request should replace the first token
      await request(app)
        .post('/auth/reset-password')
        .send({ email: userData.email })
        .expect(200);

      const allTokens = await UserTokenModel.findAll({
        where: { type: 'reset_password', userId: testUserId },
      });

      // Should only have one token (replacement behavior)
      expect(allTokens.length).toBe(1);
      expect(allTokens[0].token).not.toBe(firstToken?.token);
    });
  });

  describe('POST /auth/check-reset-password', () => {
    let validToken: string;

    beforeEach(async () => {
      // Create a reset password token
      await request(app)
        .post('/auth/reset-password')
        .send({ email: userData.email });

      const tokenObj = await UserTokenModel.findOne({
        where: { type: 'reset_password', userId: testUserId },
      });

      if (!tokenObj) {
        throw new Error('Reset password token was not created');
      }

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
      // Updated to match your actual validation error format
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
      // Create an expired token by manipulating the database
      await UserTokenModel.update(
        { expiresAt: new Date(Date.now() - 1000) }, // 1 second ago
        { where: { token: validToken } }
      );

      const res = await request(app)
        .post('/auth/check-reset-password')
        .send({ token: validToken })
        .expect(401); // FIXED: Expecting 401 for expired token

      expect(res.body.message).toMatch(/expired/i);
    });
  });

  describe('POST /auth/confirm-reset-password', () => {
    let validToken: string;

    beforeEach(async () => {
      // Create a reset password token
      await request(app)
        .post('/auth/reset-password')
        .send({ email: userData.email });

      const tokenObj = await UserTokenModel.findOne({
        where: { type: 'reset_password', userId: testUserId },
      });

      if (!tokenObj) {
        throw new Error('Reset password token was not created');
      }

      validToken = tokenObj.token;
    });

    it('should reset password with valid token', async () => {
      const newPassword = 'BrandNewPassword123!';
      const res = await request(app)
        .post('/auth/confirm-reset-password')
        .send({ token: validToken, password: newPassword })
        .expect(200);

      expect(res.body).toHaveProperty('message', 'Password has been reset.');

      // Verify token was deleted after use
      const tokenAfterReset = await UserTokenModel.findOne({
        where: { token: validToken },
      });
      expect(tokenAfterReset).toBeNull();

      // Optional: Verify user can login with new password
      // Using emailOrUsername field as required by your login controller
      const loginRes = await request(app).post('/auth/login').send({
        emailOrUsername: userData.email,
        password: newPassword,
      });

      // Should succeed with new password
      expect([200, 201]).toContain(loginRes.status);
    });

    it('should return error for missing fields', async () => {
      const testCases = [
        {}, // Both missing
        { token: validToken }, // Password missing
        { password: 'Password123!' }, // Token missing
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
      // Test just one weak password to avoid validation complexity
      const res = await request(app)
        .post('/auth/confirm-reset-password')
        .send({ token: validToken, password: '123' })
        .expect(400);

      expect(res.body).toHaveProperty('message', 'Validation error');
    });

    it('should not allow token reuse after successful password reset', async () => {
      const newPassword = 'BrandNewPassword123!';

      // First reset should succeed
      await request(app)
        .post('/auth/confirm-reset-password')
        .send({ token: validToken, password: newPassword })
        .expect(200);

      // Second attempt with same token should fail
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

      // Step 1: Request reset
      const resetRes = await request(app)
        .post('/auth/reset-password')
        .send({ email: userData.email })
        .expect(200);

      expect(resetRes.body.message).toMatch(/you will receive a code/i);

      // Step 2: Get token from database (simulating email)
      const token = await UserTokenModel.findOne({
        where: { type: 'reset_password', userId: testUserId },
      });
      expect(token).toBeTruthy();

      // Step 3: Check token validity
      await request(app)
        .post('/auth/check-reset-password')
        .send({ token: token!.token })
        .expect(200);

      // Step 4: Confirm password reset
      await request(app)
        .post('/auth/confirm-reset-password')
        .send({ token: token!.token, password: newPassword })
        .expect(200);

      // Step 5: Optional - Verify login with new password works
      const loginRes = await request(app).post('/auth/login').send({
        emailOrUsername: userData.email,
        password: newPassword,
      });

      // Should succeed with new password
      expect([200, 201]).toContain(loginRes.status);

      // Step 6: Optional - Verify old password doesn't work
      const oldLoginRes = await request(app).post('/auth/login').send({
        emailOrUsername: userData.email,
        password: userData.password, // old password
      });

      // Should fail with old password
      expect([400, 401]).toContain(oldLoginRes.status);
    });

    it('should maintain data consistency during password reset', async () => {
      // Get user data before reset
      const userBefore = await UserModel.findByPk(testUserId);
      expect(userBefore).toBeTruthy();

      // Perform password reset
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

      // Verify user data is unchanged except password
      const userAfter = await UserModel.findByPk(testUserId);
      expect(userAfter).toBeTruthy();
      expect(userAfter!.email).toBe(userBefore!.email);
      expect(userAfter!.firstName).toBe(userBefore!.firstName);
      expect(userAfter!.lastName).toBe(userBefore!.lastName);
      expect(userAfter!.username).toBe(userBefore!.username);
    });
  });
});
