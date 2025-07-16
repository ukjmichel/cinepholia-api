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
    originalSendWelcomeEmail = config.sendWelcomeEmail;
    config.sendWelcomeEmail = false;
  });

  afterAll(async () => {
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
    // @ts-ignore
    authService['loginAttempts'].clear();

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
        expect(res.body).toBeDefined();
        expect(res.body).toHaveProperty('message', 'User created successfully');
        expect(res.body.data).toHaveProperty('userId');
        expect(res.body.data.email).toBe(testUser.email);
        expect(res.body.data.role).toBe('utilisateur');
        expect(res.body.data).not.toHaveProperty('password');

        const rawCookies = res.headers['set-cookie'];
        const cookies: string[] = Array.isArray(rawCookies)
          ? rawCookies
          : [rawCookies || ''];
        expect(cookies.join(';').toLowerCase()).toMatch(/accesstoken/);
        expect(cookies.join(';').toLowerCase()).toMatch(/refreshtoken/);
      });

      it('should fail with duplicate email', async () => {
        await request(app).post('/auth/register').send(testUser).expect(201);
        const res = await request(app)
          .post('/auth/register')
          .send({ ...testUser, username: 'otheruser' })
          .expect(409);
        expect(res.body).toBeDefined();
        expect(res.body.message).toMatch(/email.*already.*exists/i);
      });

      it('should fail with duplicate username', async () => {
        await request(app).post('/auth/register').send(testUser).expect(201);
        const res = await request(app)
          .post('/auth/register')
          .send({ ...testUser, email: 'other@email.com' })
          .expect(409);
        expect(res.body).toBeDefined();
        expect(res.body.message).toMatch(/username.*already.*exists/i);
      });
    });

    describe('POST /auth/login', () => {
      beforeEach(async () => {
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

        expect(res.body).toBeDefined();
        expect(res.body.data.user.email).toBe(testUser.email);
        const rawCookies = res.headers['set-cookie'];
        const cookies: string[] = Array.isArray(rawCookies)
          ? rawCookies
          : [rawCookies || ''];
        expect(cookies.join(';').toLowerCase()).toMatch(/accesstoken/);
        expect(cookies.join(';').toLowerCase()).toMatch(/refreshtoken/);
      });

      it('should login with email and password', async () => {
        const res = await request(app)
          .post('/auth/login')
          .send({
            emailOrUsername: testUser.email,
            password: testUser.password,
          })
          .expect(200);
        expect(res.body).toBeDefined();
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

        expect(res.body).toBeDefined();
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

        expect(res.body).toBeDefined();
        expect(res.body.message).toMatch(/user.*not.*found/i);
      });
    });

    describe('POST /auth/refresh', () => {
      it('should refresh tokens with valid refresh token', async () => {
        const agent = request.agent(app);

        // Register
        await agent.post('/auth/register').send({
          username: 'refreshuser',
          email: 'refreshuser@example.com',
          password: 'Password123!',
          firstName: 'Refresh',
          lastName: 'User',
        });

        // Login
        const loginRes = await agent.post('/auth/login').send({
          emailOrUsername: 'refreshuser',
          password: 'Password123!',
        });

        // Print ALL cookies
        console.log('Set-Cookie header:', loginRes.headers['set-cookie']);
        // Print agent cookies (if accessible)
        // Supertest doesn't expose a method, but cookies are managed internally

        // Try refresh
        const refreshRes = await agent.post('/auth/refresh');
        console.log('Refresh status:', refreshRes.status);
        console.log('Refresh body:', refreshRes.body);

        expect(refreshRes.status).toBe(200);
        expect(refreshRes.body).toBeDefined();
        expect(refreshRes.body.message).toMatch(/Token refreshed/i);
      });

      it('should fail refresh with invalid token', async () => {
        const agent = request.agent(app); // <-- fresh agent per test
        const res = await agent
          .post('/auth/refresh')
          .set('Cookie', ['refreshToken=invalidtoken'])
          .expect(401);

        expect(res.body).toBeDefined();
        expect(res.body.message).toMatch(/invalid|expired/i);
      });

 
    });

    describe('Integration: full auth flow', () => {
      it('should register, login, and use access token for protected route', async () => {
        const registerRes = await request(app)
          .post('/auth/register')
          .send({
            username: 'flowuser',
            firstName: 'Flow',
            lastName: 'User',
            email: 'flow@example.com',
            password: 'Password123!',
          })
          .expect(201);

        const rawCookies = registerRes.headers['set-cookie'];
        const cookies: string[] = Array.isArray(rawCookies)
          ? rawCookies
          : [rawCookies || ''];

        const accessTokenCookie = cookies.find((c) =>
          c.toLowerCase().startsWith('accesstoken=')
        );
        expect(accessTokenCookie).toBeDefined();
        const accessTokenValue = accessTokenCookie!.split(';')[0];

        const protectedRes = await request(app)
          .get(`/users/${registerRes.body.data.userId}`)
          .set('Cookie', [accessTokenValue])
          .expect(200);

        expect(protectedRes.body).toBeDefined();
        expect(protectedRes.body.data.email).toBe('flow@example.com');
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

      expect(res.body).toBeDefined();
      expect(res.body.message).toMatch(/invalid|malformed/i);
    });

    it('should handle missing Authorization header', async () => {
      const res = await request(app).get('/users').expect(401);
      expect(res.body).toBeDefined();
      expect(res.body.message).toMatch(/missing.*token/i);
    });
  });
});
