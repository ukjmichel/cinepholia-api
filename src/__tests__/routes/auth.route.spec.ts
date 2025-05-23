import request from 'supertest';
import app from '../../app.js';
import { sequelize, syncDB } from '../../config/db.js';
import { UserModel } from '../../models/user.model.js';
import { AuthorizationModel } from '../../models/authorization.model.js';
import { UserTokenModel } from '../../models/user-token.model.js';
import { AuthService } from '../../services/auth.service.js';
import { userService } from '../../services/user.service.js';
import { config } from '../../config/env.js';
import jwt from 'jsonwebtoken';

const testUser = {
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  password: 'TestPassword123!',
};

const adminUser = {
  username: 'admin',
  firstName: 'Admin',
  lastName: 'User',
  email: 'admin@example.com',
  password: 'AdminPassword123!',
};

describe('Authentication System Tests', () => {
  let authService: AuthService;
  let adminToken: string;
  let originalSendWelcomeEmail: boolean;

  beforeAll(async () => {
    await syncDB();
    authService = new AuthService();
    // Disable welcome emails to prevent 500 errors during tests
    originalSendWelcomeEmail = config.sendWelcomeEmail;
    config.sendWelcomeEmail = false;
  });

  afterAll(async () => {
    // Restore original email setting
    config.sendWelcomeEmail = originalSendWelcomeEmail;
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await UserTokenModel.destroy({ where: {}, truncate: true, cascade: true });
    await AuthorizationModel.destroy({
      where: {},
      truncate: true,
      cascade: true,
    });
    await UserModel.destroy({ where: {}, truncate: true, cascade: true });
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clean database
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await UserTokenModel.destroy({ where: {}, truncate: true, cascade: true });
    await AuthorizationModel.destroy({
      where: {},
      truncate: true,
      cascade: true,
    });
    await UserModel.destroy({ where: {}, truncate: true, cascade: true });
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

    // Clear auth service state
    authService.clearBlacklistedTokens();
    // Clear all login attempts to prevent test interference
    authService['loginAttempts'].clear();

    // Create admin user for protected routes
    const admin = await UserModel.create(adminUser);
    await AuthorizationModel.create({
      userId: (admin as any).userId,
      role: 'administrateur',
    });
    adminToken = authService.generateAccessToken(admin);
  });

  describe('AuthService Unit Tests', () => {
    describe('Token Generation and Verification', () => {
      let testUserModel: UserModel;

      beforeEach(async () => {
        testUserModel = await UserModel.create(testUser);
      });

      it('should generate valid access token', () => {
        const token = authService.generateAccessToken(testUserModel);
        expect(typeof token).toBe('string');
        expect(token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/); // JWT format
      });

      it('should generate valid refresh token', () => {
        const token = authService.generateRefreshToken(testUserModel);
        expect(typeof token).toBe('string');
        expect(token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/); // JWT format
      });

      it('should generate both tokens together', () => {
        const tokens = authService.generateTokens(testUserModel);
        expect(tokens).toHaveProperty('accessToken');
        expect(tokens).toHaveProperty('refreshToken');
        expect(typeof tokens.accessToken).toBe('string');
        expect(typeof tokens.refreshToken).toBe('string');
      });

      it('should verify access token and return payload', () => {
        const token = authService.generateAccessToken(testUserModel);
        const payload = authService.verifyAccessToken(token);

        expect(payload.userId).toBe((testUserModel as any).userId);
        expect(payload.username).toBe(testUser.username);
        expect(payload.email).toBe(testUser.email);
        expect(payload.verified).toBe(false);
      });

      it('should verify refresh token and return payload', () => {
        const token = authService.generateRefreshToken(testUserModel);
        const payload = authService.verifyRefreshToken(token);

        expect(payload.userId).toBe((testUserModel as any).userId);
      });

      it('should reject invalid access token', () => {
        expect(() => {
          authService.verifyAccessToken('invalid.token.here');
        }).toThrow('Invalid access token');
      });

      it('should reject invalid refresh token', () => {
        expect(() => {
          authService.verifyRefreshToken('invalid.token.here');
        }).toThrow('Invalid refresh token');
      });

      it('should reject expired token', () => {
        // Create token with past expiration
        const expiredToken = jwt.sign(
          { userId: (testUserModel as any).userId },
          config.jwtSecret,
          { expiresIn: '-1h' }
        );

        expect(() => {
          authService.verifyAccessToken(expiredToken);
        }).toThrow('Invalid access token');
      });
    });

    describe('Password Reset Tokens', () => {
      let testUserModel: UserModel;

      beforeEach(async () => {
        testUserModel = await UserModel.create(testUser);
      });

      it('should generate password reset token', () => {
        const token = authService.generatePasswordResetToken(testUserModel);
        expect(typeof token).toBe('string');
        expect(token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
      });

      it('should verify password reset token', () => {
        const token = authService.generatePasswordResetToken(testUserModel);
        const payload = authService.verifyPasswordResetToken(token);

        expect(payload.userId).toBe((testUserModel as any).userId);
      });

      it('should reject invalid password reset token', () => {
        expect(() => {
          authService.verifyPasswordResetToken('invalid.token');
        }).toThrow('Invalid or expired password reset token');
      });
    });

    describe('Login Functionality', () => {
      let testUserModel: UserModel;

      beforeEach(async () => {
        testUserModel = await UserModel.create(testUser);
        // Clear login attempts before each test
        authService.clearLoginAttempts(testUser.username);
        authService.clearLoginAttempts(testUser.email);
      });

      it('should login with valid credentials', async () => {
        const tokens = await authService.login(
          testUser.username,
          testUser.password
        );

        expect(tokens).toHaveProperty('accessToken');
        expect(tokens).toHaveProperty('refreshToken');
        expect(typeof tokens.accessToken).toBe('string');
        expect(typeof tokens.refreshToken).toBe('string');
      });

      it('should login with email instead of username', async () => {
        const tokens = await authService.login(
          testUser.email,
          testUser.password
        );

        expect(tokens).toHaveProperty('accessToken');
        expect(tokens).toHaveProperty('refreshToken');
      });

      it('should fail login with invalid password', async () => {
        await expect(
          authService.login(testUser.username, 'wrongpassword')
        ).rejects.toThrow('Invalid credentials');
      });

      it('should fail login with non-existent user', async () => {
        await expect(
          authService.login('nonexistent', 'password')
        ).rejects.toThrow('User not found');
      });

      it('should track failed login attempts', async () => {
        // Ensure clean state
        authService.clearLoginAttempts(testUser.username);

        // Make 3 failed attempts
        for (let i = 0; i < 3; i++) {
          try {
            await authService.login(testUser.username, 'wrongpassword');
          } catch (e) {
            // Expected to fail
          }
        }

        const attempts = authService.getLoginAttempts(testUser.username);
        expect(attempts?.count).toBe(3);
      });

      it('should block login after too many attempts', async () => {
        // Ensure clean state
        authService.clearLoginAttempts(testUser.username);

        // Make 5 failed attempts
        for (let i = 0; i < 5; i++) {
          try {
            await authService.login(testUser.username, 'wrongpassword');
          } catch (e) {
            // Expected to fail
          }
        }

        // 6th attempt should be rate limited
        await expect(
          authService.login(testUser.username, 'wrongpassword')
        ).rejects.toThrow('Too many login attempts');
      });

      it('should clear attempts on successful login', async () => {
        // Ensure clean state
        authService.clearLoginAttempts(testUser.username);

        // Make failed attempts
        try {
          await authService.login(testUser.username, 'wrongpassword');
        } catch (e) {}

        // Verify attempts were recorded
        const attemptsBeforeSuccess = authService.getLoginAttempts(
          testUser.username
        );
        expect(attemptsBeforeSuccess?.count).toBe(1);

        // Successful login should clear attempts
        await authService.login(testUser.username, testUser.password);

        const attempts = authService.getLoginAttempts(testUser.username);
        expect(attempts).toBeUndefined();
      });
    });

    describe('Token Refresh', () => {
      let testUserModel: UserModel;

      beforeEach(async () => {
        testUserModel = await UserModel.create(testUser);
      });

      it('should refresh tokens with valid refresh token', async () => {
        const originalTokens = authService.generateTokens(testUserModel);

        // Wait to ensure different timestamps
        await new Promise((resolve) => setTimeout(resolve, 1100));

        const newTokens = await authService.refreshTokens(
          originalTokens.refreshToken
        );

        expect(newTokens).toHaveProperty('accessToken');
        expect(newTokens).toHaveProperty('refreshToken');

        // Verify tokens are actually different
        expect(newTokens.accessToken).not.toBe(originalTokens.accessToken);
        expect(newTokens.refreshToken).not.toBe(originalTokens.refreshToken);

        // Verify tokens are valid
        const originalPayload = authService.verifyAccessToken(
          originalTokens.accessToken
        );
        const newPayload = authService.verifyAccessToken(newTokens.accessToken);

        // The tokens should have different issued-at times
        expect(originalPayload.iat).toBeDefined();
        expect(newPayload.iat).toBeDefined();
        expect(newPayload.iat!).toBeGreaterThan(originalPayload.iat!);
      });

      it('should fail refresh with invalid token', async () => {
        await expect(
          authService.refreshTokens('invalid.refresh.token')
        ).rejects.toThrow('Invalid refresh token');
      });
    });

    describe('Token Blacklisting', () => {
      let testUserModel: UserModel;

      beforeEach(async () => {
        testUserModel = await UserModel.create(testUser);
      });

      it('should blacklist token on logout', async () => {
        const token = authService.generateAccessToken(testUserModel);

        expect(authService.isTokenBlacklisted(token)).toBe(false);

        await authService.logout(token);

        expect(authService.isTokenBlacklisted(token)).toBe(true);
      });

      it('should clear blacklisted tokens', async () => {
        const token = authService.generateAccessToken(testUserModel);
        await authService.logout(token);

        expect(authService.isTokenBlacklisted(token)).toBe(true);

        authService.clearBlacklistedTokens();

        expect(authService.isTokenBlacklisted(token)).toBe(false);
      });
    });

    describe('Helper Methods', () => {
      it('should clear login attempts manually', () => {
        // Set some attempts manually
        authService['loginAttempts'].set('testuser', {
          count: 3,
          lastAttempt: new Date(),
        });

        expect(authService.getLoginAttempts('testuser')).toBeDefined();

        authService.clearLoginAttempts('testuser');

        expect(authService.getLoginAttempts('testuser')).toBeUndefined();
      });
    });
  });

  describe('Auth Routes E2E Tests', () => {
    describe('POST /auth/register', () => {
      it('should register a new user successfully', async () => {
        const res = await request(app)
          .post('/auth/register')
          .send(testUser)
          .expect(201);

        expect(res.body).toHaveProperty('message', 'User created successfully');
        expect(res.body.data).toHaveProperty('userId');
        expect(res.body.data).toHaveProperty('tokens');
        expect(res.body.data.email).toBe(testUser.email);
        expect(res.body.data.role).toBe('utilisateur');
        expect(res.body.data).not.toHaveProperty('password');
      });

      it('should fail with invalid email', async () => {
        const invalidUser = { ...testUser, email: 'invalid-email' };

        const res = await request(app)
          .post('/auth/register')
          .send(invalidUser)
          .expect(400);

        expect(res.body.message).toMatch(/validation|email/i);
      });

      it('should fail with weak password', async () => {
        const weakPasswordUser = { ...testUser, password: '123' };

        const res = await request(app)
          .post('/auth/register')
          .send(weakPasswordUser)
          .expect(400);

        expect(res.body.message).toMatch(/validation|password/i);
      });

      it('should fail with missing required fields', async () => {
        const res = await request(app)
          .post('/auth/register')
          .send({})
          .expect(400);

        expect(res.body.message).toMatch(/validation|required/i);
      });

      it('should fail with duplicate email', async () => {
        // Register first user
        await request(app).post('/auth/register').send(testUser).expect(201);

        // Try to register with same email
        const duplicateUser = { ...testUser, username: 'different' };

        const res = await request(app)
          .post('/auth/register')
          .send(duplicateUser)
          .expect(409);

        expect(res.body.message).toMatch(/email.*already.*exists/i);
      });

      it('should fail with duplicate username', async () => {
        // Register first user
        await request(app).post('/auth/register').send(testUser).expect(201);

        // Try to register with same username
        const duplicateUser = { ...testUser, email: 'different@email.com' };

        const res = await request(app)
          .post('/auth/register')
          .send(duplicateUser)
          .expect(409);

        expect(res.body.message).toMatch(/username.*already.*exists/i);
      });
    });

    describe('POST /auth/register-employee', () => {
      it('should register employee when authenticated as admin', async () => {
        const employeeData = {
          username: 'employee',
          firstName: 'Employee',
          lastName: 'User',
          email: 'employee@example.com',
          password: 'EmployeePass123!',
        };

        const res = await request(app)
          .post('/auth/register-employee')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(employeeData)
          .expect(201);

        expect(res.body.data.role).toBe('employé');
        expect(res.body.data.email).toBe(employeeData.email);
      });

      it('should fail when not authenticated', async () => {
        const employeeData = {
          username: 'employee',
          firstName: 'Employee',
          lastName: 'User',
          email: 'employee@example.com',
          password: 'EmployeePass123!',
        };

        const res = await request(app)
          .post('/auth/register-employee')
          .send(employeeData)
          .expect(401);

        expect(res.body.message).toMatch(/unauthorized|token|missing/i);
      });

      it('should fail when authenticated as non-admin', async () => {
        // Create regular user and get token
        const regularUser = await UserModel.create({
          ...testUser,
          username: 'regularuser',
          email: 'regular@example.com',
        });
        await AuthorizationModel.create({
          userId: (regularUser as any).userId,
          role: 'utilisateur',
        });
        const userToken = authService.generateAccessToken(regularUser);

        const employeeData = {
          username: 'employee',
          firstName: 'Employee',
          lastName: 'User',
          email: 'employee@example.com',
          password: 'EmployeePass123!',
        };

        const res = await request(app)
          .post('/auth/register-employee')
          .set('Authorization', `Bearer ${userToken}`)
          .send(employeeData)
          .expect(401);

        expect(res.body.message).toMatch(/admin.*required/i);
      });
    });

    describe('POST /auth/login', () => {
      beforeEach(async () => {
        // Create a user to login with using userService directly
        const createdUser = await userService.createUser(testUser);
        // Create the authorization record needed for login
        await AuthorizationModel.create({
          userId: (createdUser as any).userId,
          role: 'utilisateur',
        });
        // Clear any existing login attempts
        authService.clearLoginAttempts(testUser.username);
        authService.clearLoginAttempts(testUser.email);
      });

      it('should login with username and password', async () => {
        const res = await request(app)
          .post('/auth/login')
          .send({
            emailOrUsername: testUser.username,
            password: testUser.password,
          })
          .expect(200);

        expect(res.body).toHaveProperty('message');
        expect(res.body.data).toHaveProperty('user');
        expect(res.body.data).toHaveProperty('tokens');
        expect(res.body.data.user.email).toBe(testUser.email);
        expect(res.body.data.tokens).toHaveProperty('accessToken');
        expect(res.body.data.tokens).toHaveProperty('refreshToken');
      });

      it('should login with email and password', async () => {
        const res = await request(app)
          .post('/auth/login')
          .send({
            emailOrUsername: testUser.email,
            password: testUser.password,
          })
          .expect(200);

        expect(res.body.data.user.email).toBe(testUser.email);
      });

      it('should fail with wrong password', async () => {
        const res = await request(app)
          .post('/auth/login')
          .send({
            emailOrUsername: testUser.username,
            password: 'wrongpassword',
          })
          .expect(401);

        expect(res.body.message).toMatch(/invalid.*credentials/i);
      });

      it('should fail with non-existent user', async () => {
        const res = await request(app)
          .post('/auth/login')
          .send({
            emailOrUsername: 'nonexistent',
            password: 'password',
          })
          .expect(404);

        expect(res.body.message).toMatch(/user.*not.*found/i);
      });

      it('should fail with missing credentials', async () => {
        const res = await request(app).post('/auth/login').send({}).expect(400);

        expect(res.body.message).toMatch(/required|validation/i);
      });

      it('should rate limit after multiple failed attempts', async () => {
        // Clear any existing attempts
        authService.clearLoginAttempts(testUser.username);

        // Make 5 failed login attempts
        for (let i = 0; i < 5; i++) {
          await request(app)
            .post('/auth/login')
            .send({
              emailOrUsername: testUser.username,
              password: 'wrongpassword',
            })
            .expect(401);
        }

        // 6th attempt should be rate limited
        const res = await request(app)
          .post('/auth/login')
          .send({
            emailOrUsername: testUser.username,
            password: 'wrongpassword',
          })
          .expect(401);

        expect(res.body.message).toMatch(/too many.*attempts/i);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete auth flow: register → login → use token', async () => {
      // 1. Register
      const registerRes = await request(app)
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      const { tokens } = registerRes.body.data;

      // 2. Use access token to access protected route
      const protectedRes = await request(app)
        .get(`/users/${registerRes.body.data.userId}`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(protectedRes.body.data.email).toBe(testUser.email);
    });

    it('should handle admin workflow: create admin → register employee', async () => {
      const employeeData = {
        username: 'employee',
        firstName: 'Employee',
        lastName: 'User',
        email: 'employee@example.com',
        password: 'EmployeePass123!',
      };

      // Register employee using admin token
      const res = await request(app)
        .post('/auth/register-employee')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(employeeData)
        .expect(201);

      expect(res.body.data.role).toBe('employé');

      // Verify employee can access protected routes
      const employeeUser = await UserModel.findOne({
        where: { email: employeeData.email },
      });
      const employeeToken = authService.generateAccessToken(employeeUser!);

      await request(app)
        .get('/users')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);
    });

    it('should maintain security with invalid tokens', async () => {
      const invalidToken = 'invalid.jwt.token';

      // Try to access protected route with invalid token
      await request(app)
        .get('/users')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);

      // Try to register employee with invalid token
      await request(app)
        .post('/auth/register-employee')
        .set('Authorization', `Bearer ${invalidToken}`)
        .send(testUser)
        .expect(401);
    });

    it('should handle token expiration gracefully', async () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        {
          userId: 'test-id',
          username: 'test',
          email: 'test@test.com',
          verified: false,
        },
        config.jwtSecret,
        { expiresIn: '-1h' }
      );

      await request(app)
        .get('/users')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JWT tokens', async () => {
      const malformedToken = 'not.a.valid.jwt.token.format';

      const res = await request(app)
        .get('/users')
        .set('Authorization', `Bearer ${malformedToken}`)
        .expect(401);

      expect(res.body.message).toMatch(/invalid.*token/i);
    });

    it('should handle missing Authorization header', async () => {
      const res = await request(app).get('/users').expect(401);

      expect(res.body.message).toMatch(/missing.*token/i);
    });

    it('should handle invalid Authorization header format', async () => {
      const res = await request(app)
        .get('/users')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);

      expect(res.body.message).toMatch(/missing.*token/i);
    });
  });
});
