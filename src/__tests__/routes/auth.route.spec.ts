import request from 'supertest';
import app from '../../app.js';
import { sequelize, syncDB } from '../../config/db.js';
import { UserModel } from '../../models/user.model.js';
import { AuthorizationModel } from '../../models/authorization.model.js';
import { UserTokenModel } from '../../models/user-token.model.js';
import { AuthService } from '../../services/auth.service.js';
import { userService } from '../../services/user.service.js';
import { config } from '../../config/env.js';

/** ✅ Helper to safely normalize cookies */
function getCookiesArray(res: request.Response): string[] {
  const raw = res.headers['set-cookie'];
  return Array.isArray(raw) ? raw : [raw || ''];
}

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

  beforeEach(async () => {
    // ✅ Disable foreign key checks only for MySQL, not SQLite
    if (sequelize.getDialect() !== 'sqlite') {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    }

    await UserTokenModel.destroy({ where: {}, truncate: true, cascade: true });
    await AuthorizationModel.destroy({
      where: {},
      truncate: true,
      cascade: true,
    });
    await UserModel.destroy({ where: {}, truncate: true, cascade: true });

    if (sequelize.getDialect() !== 'sqlite') {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    }

    authService.clearBlacklistedTokens();
    // @ts-ignore
    authService['loginAttempts'].clear();

    const admin = await UserModel.create(adminUser);
    await AuthorizationModel.create({
      userId: admin.userId,
      role: 'administrateur',
    });
    adminToken = authService.generateAccessToken(admin);
  });

  afterAll(async () => {
    config.sendWelcomeEmail = originalSendWelcomeEmail;

    if (sequelize.getDialect() !== 'sqlite') {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    }

    await UserTokenModel.destroy({ where: {}, truncate: true, cascade: true });
    await AuthorizationModel.destroy({
      where: {},
      truncate: true,
      cascade: true,
    });
    await UserModel.destroy({ where: {}, truncate: true, cascade: true });

    if (sequelize.getDialect() !== 'sqlite') {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    }

    await sequelize.close();
  });

  describe('Auth Routes E2E', () => {
    describe('POST /auth/register', () => {
      it('should register a new user successfully and set cookies', async () => {
        const res = await request(app)
          .post('/auth/register')
          .send(testUser)
          .expect(201);

        expect(res.body.message).toBe('User created successfully');
        expect(res.body.data.user.email).toBe(testUser.email);
        expect(res.body.data.user.role).toBe('utilisateur');

        const cookies = getCookiesArray(res);
        expect(cookies.join(';').toLowerCase()).toMatch(/accesstoken/);
        expect(cookies.join(';').toLowerCase()).toMatch(/refreshtoken/);
      });

      it('should fail with duplicate email', async () => {
        await request(app).post('/auth/register').send(testUser).expect(201);
        const res = await request(app)
          .post('/auth/register')
          .send({ ...testUser, username: 'otheruser' })
          .expect(409);

        expect(res.body.message).toMatch(/email.*exists/i);
      });

      it('should fail with duplicate username', async () => {
        await request(app).post('/auth/register').send(testUser).expect(201);
        const res = await request(app)
          .post('/auth/register')
          .send({ ...testUser, email: 'other@email.com' })
          .expect(409);

        expect(res.body.message).toMatch(/username.*exists/i);
      });
    });

    describe('POST /auth/register-employee', () => {
      it('should allow admin to create an employee', async () => {
        const res = await request(app)
          .post('/auth/register-employee')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            ...testUser,
            username: 'employee',
            email: 'employee@example.com',
          })
          .expect(201);

        expect(res.body.data.user.role).toBe('employé');
      });

     it('should forbid non-admin users', async () => {
       const nonAdminUser = {
         username: 'nonadmin',
         firstName: 'Not',
         lastName: 'Admin',
         email: 'nonadmin@example.com',
         password: 'Pass123!',
       };

       const user = await userService.createUser(nonAdminUser);
       await AuthorizationModel.create({
         userId: user.userId,
         role: 'utilisateur',
       });
       const token = authService.generateAccessToken(user);

       const res = await request(app)
         .post('/auth/register-employee')
         .set('Authorization', `Bearer ${token}`)
         .send({
           username: 'employee2',
           firstName: 'Emp',
           lastName: 'User',
           email: 'employee2@example.com',
           password: 'Pass123!',
         })
         .expect(403); // ✅ expect 403 instead of 401

       expect(res.body.message).toMatch(/forbidden|admin/i);
     });


    });

    describe('POST /auth/login', () => {
      beforeEach(async () => {
        const user = await userService.createUser(testUser);
        await AuthorizationModel.create({
          userId: user.userId,
          role: 'utilisateur',
        });
      });

      it('should login and return cookies', async () => {
        const res = await request(app)
          .post('/auth/login')
          .send({
            emailOrUsername: testUser.username,
            password: testUser.password,
          })
          .expect(200);

        expect(res.body.data.user.email).toBe(testUser.email);

        const cookies = getCookiesArray(res);
        expect(cookies.join(';')).toMatch(/accesstoken/i);
      });
      

      it('should login using email', async () => {
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
          .send({ emailOrUsername: testUser.username, password: 'wrongpass' })
          .expect(401);

        expect(res.body.message).toMatch(/invalid/i);
      });

      it('should fail with non-existent user', async () => {
        const res = await request(app)
          .post('/auth/login')
          .send({ emailOrUsername: 'nouser', password: 'somepass' })
          .expect(404);

        expect(res.body.message).toMatch(/user.*not.*found/i);
      });
    });

    describe('POST /auth/refresh', () => {
      it('should refresh tokens successfully', async () => {
        const agent = request.agent(app);

        await agent.post('/auth/register').send({
          username: 'refreshuser',
          firstName: 'Refresh',
          lastName: 'User',
          email: 'refreshuser@example.com',
          password: 'Password123!',
        });

        await agent.post('/auth/login').send({
          emailOrUsername: 'refreshuser',
          password: 'Password123!',
        });

        const res = await agent.post('/auth/refresh').expect(200);
        expect(res.body.message).toMatch(/Token refreshed/i);

        const cookies = getCookiesArray(res);
        expect(cookies.join(';')).toMatch(/accesstoken/i);
      });

      it('should fail refresh with invalid token', async () => {
        const res = await request(app)
          .post('/auth/refresh')
          .set('Cookie', ['refreshToken=invalidtoken'])
          .expect(401);

        expect(res.body.message).toMatch(/invalid|expired/i);
      });
    });

    describe('Integration: Full Auth Flow', () => {
      it('should register, login, and access protected route', async () => {
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

        const cookies = getCookiesArray(registerRes);
        const accessTokenCookie = cookies.find((c) =>
          c.toLowerCase().startsWith('accesstoken=')
        );
        expect(accessTokenCookie).toBeDefined();

        const protectedRes = await request(app)
          .get(`/users/${registerRes.body.data.user.userId}`)
          .set('Cookie', [accessTokenCookie!.split(';')[0]])
          .expect(200);

        expect(protectedRes.body.data.user.email).toBe('flow@example.com');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JWT', async () => {
      const res = await request(app)
        .get('/users')
        .set('Authorization', 'Bearer bad.token.parts')
        .expect(401);

      expect(res.body.message).toMatch(/invalid|malformed/i);
    });

    it('should handle missing Authorization header', async () => {
      const res = await request(app).get('/users').expect(401);
      expect(res.body.message).toMatch(/missing.*token/i);
    });
  });
});
