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
    await syncDB(); // Reset database schema
    authService = new AuthService();
    originalSendWelcomeEmail = config.sendWelcomeEmail;
    config.sendWelcomeEmail = false; // Disable welcome emails during tests
  });

  afterAll(async () => {
    config.sendWelcomeEmail = originalSendWelcomeEmail;
    // Clean up all data from user, token, and authorization tables
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await UserTokenModel.destroy({ where: {}, truncate: true, cascade: true });
    await AuthorizationModel.destroy({
      where: {},
      truncate: true,
      cascade: true,
    });
    await UserModel.destroy({ where: {}, truncate: true, cascade: true });
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    await sequelize.close(); // Close DB connection
  });

  beforeEach(async () => {
    // Clean DB before each test
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await UserTokenModel.destroy({ where: {}, truncate: true, cascade: true });
    await AuthorizationModel.destroy({
      where: {},
      truncate: true,
      cascade: true,
    });
    await UserModel.destroy({ where: {}, truncate: true, cascade: true });
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

    authService.clearBlacklistedTokens();
    // Clear login attempts tracking
    // @ts-ignore
    authService['loginAttempts'].clear();

    // Create admin user and assign admin role
    const admin = await UserModel.create(adminUser);
    await AuthorizationModel.create({
      userId: (admin as any).userId,
      role: 'administrateur',
    });
    adminToken = authService.generateAccessToken(admin);
  });

  describe('Auth Routes E2E Tests', () => {
    describe('POST /auth/register', () => {
      it('should register a new user successfully and set cookies', async () => {
        const res = await request(app)
          .post('/auth/register')
          .send(testUser)
          .expect(201);

        expect(res.body).toHaveProperty('message', 'User created successfully');
        expect(res.body.data).toHaveProperty('userId');
        expect(res.body.data.email).toBe(testUser.email);
        expect(res.body.data.role).toBe('utilisateur');
        expect(res.body.data).not.toHaveProperty('password');

        // Check cookies are set for accessToken and refreshToken
        const setCookie = res.headers['set-cookie'];
        expect(setCookie).toBeDefined();

        const cookies = Array.isArray(setCookie)
          ? setCookie.join(';')
          : setCookie;
        expect(cookies.toLowerCase()).toMatch(/accesstoken/);
        expect(cookies.toLowerCase()).toMatch(/refreshtoken/);
      });

      it('should fail with duplicate email', async () => {
        await request(app).post('/auth/register').send(testUser).expect(201);
        const res = await request(app)
          .post('/auth/register')
          .send({ ...testUser, username: 'otheruser' })
          .expect(409);
        expect(res.body.message).toMatch(/email.*already.*exists/i);
      });

      it('should fail with duplicate username', async () => {
        await request(app).post('/auth/register').send(testUser).expect(201);
        const res = await request(app)
          .post('/auth/register')
          .send({ ...testUser, email: 'other@email.com' })
          .expect(409);
        expect(res.body.message).toMatch(/username.*already.*exists/i);
      });
    });

    describe('POST /auth/login', () => {
      beforeEach(async () => {
        // Create a user before login tests
        const createdUser = await userService.createUser(testUser);
        await AuthorizationModel.create({
          userId: (createdUser as any).userId,
          role: 'utilisateur',
        });
        authService.clearLoginAttempts(testUser.username);
        authService.clearLoginAttempts(testUser.email);
      });

      it('should login with username and password and set cookies', async () => {
        const res = await request(app)
          .post('/auth/login')
          .send({
            emailOrUsername: testUser.username,
            password: testUser.password,
          })
          .expect(200);

        expect(res.body.data.user.email).toBe(testUser.email);

        // Check tokens cookies present
        const setCookie = res.headers['set-cookie'];
        const cookieArray = Array.isArray(setCookie) ? setCookie : [setCookie];
        expect(cookieArray.join(';').toLowerCase()).toMatch(/accesstoken/);
        expect(cookieArray.join(';').toLowerCase()).toMatch(/refreshtoken/);
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
            emailOrUsername: 'nouser',
            password: 'somepass',
          })
          .expect(404);

        expect(res.body.message).toMatch(/user.*not.*found/i);
      });
    });

    describe('POST /auth/refresh', () => {
      let refreshToken: string;

      beforeAll(async () => {
        const registerRes = await request(app).post('/auth/register').send({
          username: 'refreshuser',
          email: 'refresh@example.com',
          password: 'Password123!',
        });

        const rawCookies = registerRes.headers['set-cookie'] || [];
        const cookies = Array.isArray(rawCookies) ? rawCookies : [rawCookies];
        const refreshCookie = cookies.find((cookie) =>
          cookie.toLowerCase().startsWith('refreshtoken=')
        );

        expect(refreshCookie).toBeDefined();
        refreshToken = refreshCookie!.split(';')[0].split('=')[1];
      });

      it('should refresh tokens with valid refresh token', async () => {
        const res = await request(app)
          .post('/auth/refresh')
          .set('Cookie', [`refreshToken=${refreshToken}`])
          .expect(200);

        expect(res.body.message).toMatch(/refreshed/i);

        const setCookie = res.headers['set-cookie'] || [];
        const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];

        expect(cookies.some((c) => c.startsWith('accessToken='))).toBe(true);
        expect(cookies.some((c) => c.startsWith('refreshToken='))).toBe(true);
      });

      it('should fail refresh with invalid token', async () => {
        const res = await request(app)
          .post('/auth/refresh')
          .set('Cookie', ['refreshToken=invalidtoken'])
          .expect(401);

        expect(res.body.message).toMatch(/invalid|expired/i);
      });

      it('should fail refresh when user does not exist', async () => {
        const fakeUserId = '00000000-0000-0000-0000-000000000000';
        const fakeRefreshToken = jwt.sign(
          { userId: fakeUserId },
          config.jwtSecret,
          { expiresIn: '7d' }
        );

        const res = await request(app)
          .post('/auth/refresh')
          .set('Cookie', [`refreshToken=${fakeRefreshToken}`])
          .expect(404);

        expect(res.body.message).toMatch(/user.*not.*found/i);
      });
    });

    describe('Integration: full auth flow', () => {
      it('should register, login, and use access token for protected route', async () => {
        const registerRes = await request(app)
          .post('/auth/register')
          .send(testUser)
          .expect(201);

        const setCookieArr = Array.isArray(registerRes.headers['set-cookie'])
          ? registerRes.headers['set-cookie']
          : [registerRes.headers['set-cookie']];

        const accessTokenCookie = setCookieArr.find((c) =>
          c.toLowerCase().startsWith('accesstoken=')
        );
        expect(accessTokenCookie).toBeDefined();
        const accessTokenValue = accessTokenCookie!.split(';')[0];

        // Access a protected route using the access token cookie
        const protectedRes = await request(app)
          .get(`/users/${registerRes.body.data.userId}`)
          .set('Cookie', accessTokenValue)
          .expect(200);

        expect(protectedRes.body.data.email).toBe(testUser.email);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JWT tokens', async () => {
      const malformedToken = 'bad.token.parts';
      const res = await request(app)
        .get('/users')
        .set('Authorization', `Bearer ${malformedToken}`)
        .expect(401);

      expect(res.body.message).toMatch(/invalid|malformed/i);
    });

    it('should handle missing Authorization header', async () => {
      const res = await request(app).get('/users').expect(401);
      expect(res.body.message).toMatch(/missing.*token/i);
    });
  });
});
