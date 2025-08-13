// ✅ Mock EmailService to prevent real API calls and errors
jest.mock('../../services/email.service', () => {
  return {
    EmailService: jest.fn().mockImplementation(() => ({
      sendWelcomeEmail: jest.fn().mockResolvedValue(true),
    })),
  };
});

import request from 'supertest';
import app from '../../app';
import { loadModels, sequelize } from '../../config/db';
import { UserModel } from '../../models/user.model';
import { AuthorizationModel } from '../../models/authorization.model';
import { v4 as uuidv4 } from 'uuid';

// --- Helpers to normalize response shapes ---
const extractUserFromRegister = (res: request.Response) =>
  res.body?.data?.user ?? res.body?.data;

const extractUser = (res: request.Response) =>
  res.body?.data?.user ?? res.body?.data;

// Test data
const userData = {
  username: 'johndoe',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@doe.com',
  password: 'Password123!',
};

const staffUserData = {
  username: 'staffuser',
  firstName: 'Staff',
  lastName: 'User',
  email: 'staff@example.com',
  password: 'StaffPass123!',
};

describe('User E2E Routes with MySQL', () => {
  let userCookie = '';
  let staffCookie = '';
  let testUserId = '';
  let staffUserId = '';

  const cleanDatabase = async () => {
    await loadModels();
    if (sequelize.getDialect() === 'mysql') {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    }
    await AuthorizationModel.destroy({
      where: {},
      truncate: true,
      cascade: true,
    });
    await UserModel.destroy({ where: {}, truncate: true, cascade: true });
    if (sequelize.getDialect() === 'mysql') {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    }
  };

  beforeAll(async () => {
    await loadModels();
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    await cleanDatabase();

    // Register a normal user through the API
    const userRes = await request(app).post('/auth/register').send(userData);

    const userSetCookie = userRes.headers['set-cookie'];
    if (Array.isArray(userSetCookie)) {
      userCookie = userSetCookie.map((c) => c.split(';')[0]).join('; ');
    } else if (typeof userSetCookie === 'string') {
      userCookie = userSetCookie
        .split(',')
        .map((c) => c.split(';')[0])
        .join('; ');
    } else {
      console.warn('⚠️ No Set-Cookie received during test setup.');
      userCookie = '';
    }

    if (userRes.status === 201) {
      const createdUser = extractUserFromRegister(userRes);
      if (!createdUser?.userId) {
        throw new Error(
          `Register response missing userId: ${JSON.stringify(userRes.body)}`
        );
      }
      testUserId = createdUser.userId;
    } else {
      throw new Error(
        `Failed to create test user: ${userRes.status} - ${JSON.stringify(userRes.body)}`
      );
    }

    // Create a staff user directly + grant role
    const staffUser = await UserModel.create(staffUserData);
    staffUserId = staffUser.userId;
    await AuthorizationModel.create({
      userId: staffUserId,
      role: 'administrateur',
    });

    // Login staff
    const staffLoginRes = await request(app).post('/auth/login').send({
      emailOrUsername: staffUserData.email,
      password: staffUserData.password,
    });

    const staffSetCookie = staffLoginRes.headers['set-cookie'];
    if (Array.isArray(staffSetCookie)) {
      staffCookie = staffSetCookie.map((c) => c.split(';')[0]).join('; ');
    } else if (typeof staffSetCookie === 'string') {
      staffCookie = staffSetCookie
        .split(',')
        .map((c) => c.split(';')[0])
        .join('; ');
    } else {
      throw new Error('No set-cookie header received from staff login');
    }

    if (![200, 201].includes(staffLoginRes.status)) {
      throw new Error(
        `Failed to login staff user: ${staffLoginRes.status} - ${JSON.stringify(
          staffLoginRes.body
        )}`
      );
    }
  });

  afterAll(async () => {
    await cleanDatabase();
    await sequelize.close();
  });

  // PATCH /users/:userId/password
  describe('PATCH /users/:userId/password', () => {
    it('should change own password', async () => {
      const res = await request(app)
        .patch(`/users/${testUserId}/password`)
        .set('Cookie', userCookie)
        .send({ newPassword: 'NewPassword123!' })
        .expect(200);

      expect(res.body).toHaveProperty(
        'message',
        'Password changed successfully'
      );
      const bodyUser = extractUser(res);
      expect(bodyUser).toHaveProperty('userId', testUserId);
    });

    it('should change any user password when authenticated as staff', async () => {
      const res = await request(app)
        .patch(`/users/${testUserId}/password`)
        .set('Cookie', staffCookie)
        .send({ newPassword: 'AnotherNewPassword123!' })
        .expect(200);

      expect(res.body).toHaveProperty(
        'message',
        'Password changed successfully'
      );
      const bodyUser = extractUser(res);
      expect(bodyUser).toHaveProperty('userId', testUserId);
    });

    it("should prevent regular users from changing another user's password", async () => {
      await request(app)
        .patch(`/users/${staffUserId}/password`)
        .set('Cookie', userCookie)
        .send({ newPassword: 'IllegalChange123!' })
        .expect(403);
    });

    it('should fail when not authenticated', async () => {
      await request(app)
        .patch(`/users/${testUserId}/password`)
        .send({ newPassword: 'NoAuth123!' })
        .expect(401);
    });

    it('should fail when newPassword is missing', async () => {
      await request(app)
        .patch(`/users/${testUserId}/password`)
        .set('Cookie', userCookie)
        .send({})
        .expect(400);
    });

    it('should fail with weak password', async () => {
      await request(app)
        .patch(`/users/${testUserId}/password`)
        .set('Cookie', userCookie)
        .send({ newPassword: '123' })
        .expect(400);
    });

    it('should return 404 for non-existent user ID', async () => {
      const missingUserId = uuidv4();
      await request(app)
        .patch(`/users/${missingUserId}/password`)
        .set('Cookie', staffCookie)
        .send({ newPassword: 'Anything123!' })
        .expect(404);
    });
  });

  // GET /users
  describe('GET /users', () => {
    it('should list users when authenticated as staff', async () => {
      const res = await request(app)
        .get('/users')
        .set('Cookie', staffCookie)
        .expect(200);

      expect(Array.isArray(res.body.data.users)).toBe(true);
      expect(res.body.data).toHaveProperty('total');
    });

    it('should fail when not authenticated', async () => {
      await request(app).get('/users').expect(401);
    });

    it('should fail when authenticated as regular user (permission test)', async () => {
      await request(app).get('/users').set('Cookie', userCookie).expect(403);
    });

    it('should filter users by email when authenticated as staff', async () => {
      const res = await request(app)
        .get('/users')
        .set('Cookie', staffCookie)
        .query({ email: userData.email })
        .expect(200);

      expect(res.body.data.users[0].email).toBe(userData.email);
    });

    it('should return empty list for non-existent email filter', async () => {
      const res = await request(app)
        .get('/users')
        .set('Cookie', staffCookie)
        .query({ email: 'noone@nowhere.com' })
        .expect(200);

      expect(res.body.data.users.length).toBe(0);
    });

    it('should filter users by username', async () => {
      const res = await request(app)
        .get('/users')
        .set('Cookie', staffCookie)
        .query({ username: userData.username })
        .expect(200);

      expect(res.body.data.users[0].username).toBe(userData.username);
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/users')
        .set('Cookie', staffCookie)
        .query({ page: 1, pageSize: 2 })
        .expect(200);

      expect(res.body.data).toHaveProperty('users');
      expect(res.body.data).toHaveProperty('total');
    });
  });

  // GET /users/:userId
  describe('GET /users/:userId', () => {
    it('should get user by ID when accessing own profile', async () => {
      const res = await request(app)
        .get(`/users/${testUserId}`)
        .set('Cookie', userCookie)
        .expect(200);

      const bodyUser = extractUser(res);
      expect(bodyUser).toHaveProperty('userId', testUserId);
    });

    it('should get user by ID when authenticated as staff', async () => {
      const res = await request(app)
        .get(`/users/${testUserId}`)
        .set('Cookie', staffCookie)
        .expect(200);

      const bodyUser = extractUser(res);
      expect(bodyUser).toHaveProperty('userId', testUserId);
    });

    it('should fail when not authenticated', async () => {
      await request(app).get(`/users/${testUserId}`).expect(401);
    });

    it('should return 404 for non-existent user ID', async () => {
      const missingUserId = uuidv4();
      await request(app)
        .get(`/users/${missingUserId}`)
        .set('Cookie', staffCookie)
        .expect(404);
    });

    it('should return 400 for invalid user ID format', async () => {
      await request(app)
        .get(`/users/invalid-uuid-format`)
        .set('Cookie', staffCookie)
        .expect(400);
    });
  });

  // PUT /users/:userId
  describe('PUT /users/:userId', () => {
    it('should update own user profile', async () => {
      const res = await request(app)
        .put(`/users/${testUserId}`)
        .set('Cookie', userCookie)
        .send({ firstName: 'Johnny', lastName: 'Doe' })
        .expect(200);

      const bodyUser = extractUser(res);
      expect(bodyUser).toHaveProperty('firstName', 'Johnny');
    });

    it('should update any user when authenticated as staff', async () => {
      const res = await request(app)
        .put(`/users/${testUserId}`)
        .set('Cookie', staffCookie)
        .send({ firstName: 'StaffEdit' })
        .expect(200);

      const bodyUser = extractUser(res);
      expect(bodyUser).toHaveProperty('firstName', 'StaffEdit');
    });

    it('should fail when not authenticated', async () => {
      await request(app)
        .put(`/users/${testUserId}`)
        .send({ firstName: 'NoAuth' })
        .expect(401);
    });

    it('should return 404 for non-existent user', async () => {
      const missingUserId = uuidv4();
      await request(app)
        .put(`/users/${missingUserId}`)
        .set('Cookie', staffCookie)
        .send({ firstName: 'DoesNotExist' })
        .expect(404);
    });

    it('should fail with invalid email format', async () => {
      await request(app)
        .put(`/users/${testUserId}`)
        .set('Cookie', userCookie)
        .send({ email: 'notanemail' })
        .expect(400);
    });

    it('should prevent updating to existing email/username', async () => {
      const anotherRes = await request(app).post('/auth/register').send({
        username: 'uniqueuser',
        firstName: 'Unique',
        lastName: 'User',
        email: 'unique@user.com',
        password: 'Password123!',
      });
      expect(anotherRes.status).toBe(201);

      await request(app)
        .put(`/users/${testUserId}`)
        .set('Cookie', userCookie)
        .send({ email: 'unique@user.com', username: 'uniqueuser' })
        .expect(409);
    });
  });

  // DELETE /users/:userId
  describe('DELETE /users/:userId', () => {
    it('should delete any user when authenticated as staff', async () => {
      const freshUserRes = await request(app).post('/auth/register').send({
        username: 'deleteuser',
        firstName: 'Del',
        lastName: 'User',
        email: 'delete@user.com',
        password: 'Password123!',
      });

      expect(freshUserRes.status).toBe(201);
      const freshUser = extractUserFromRegister(freshUserRes);
      const deleteUserId = freshUser.userId;

      const delRes = await request(app)
        .delete(`/users/${deleteUserId}`)
        .set('Cookie', staffCookie);

      expect([200, 204]).toContain(delRes.status);
    });

    it('should fail when not authenticated', async () => {
      await request(app).delete(`/users/${testUserId}`).expect(401);
    });

    it('should return 404 for non-existent user', async () => {
      const missingUserId = uuidv4();
      await request(app)
        .delete(`/users/${missingUserId}`)
        .set('Cookie', staffCookie)
        .expect(404);
    });

    it('should return 400 for invalid user ID format', async () => {
      await request(app)
        .delete(`/users/invalid-uuid`)
        .set('Cookie', staffCookie)
        .expect(400);
    });

    it('should prevent regular users from deleting other users', async () => {
      await request(app)
        .delete(`/users/${staffUserId}`)
        .set('Cookie', userCookie)
        .expect(403);
    });
  });

  // Integration: lifecycle
  describe('Integration Tests - Complex Scenarios', () => {
    it('should handle user lifecycle: get, update, change password', async () => {
      // Get user
      let res = await request(app)
        .get(`/users/${testUserId}`)
        .set('Cookie', userCookie)
        .expect(200);
      let bodyUser = extractUser(res);
      expect(bodyUser).toHaveProperty('userId', testUserId);

      // Update user
      res = await request(app)
        .put(`/users/${testUserId}`)
        .set('Cookie', userCookie)
        .send({ firstName: 'Lifecycle' })
        .expect(200);
      bodyUser = extractUser(res);
      expect(bodyUser).toHaveProperty('firstName', 'Lifecycle');

      // Change password
      res = await request(app)
        .patch(`/users/${testUserId}/password`)
        .set('Cookie', userCookie)
        .send({ newPassword: 'LifecyclePass123!' })
        .expect(200);
      expect(res.body).toHaveProperty(
        'message',
        'Password changed successfully'
      );
      bodyUser = extractUser(res);
      expect(bodyUser).toHaveProperty('userId', testUserId);
    });
  });
});
