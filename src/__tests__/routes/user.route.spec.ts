import request from 'supertest';
import app from '../../app'; // Adjust path if needed
import { sequelize } from '../../config/db';
import { UserModel } from '../../models/user.model';
import { AuthorizationModel } from '../../models/authorization.model';
import { v4 as uuidv4 } from 'uuid';

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
  let userCookie: string = '';
  let staffCookie: string = '';
  let testUserId: string = '';
  let staffUserId: string = '';

  // Utility to clean the database between tests
  const cleanDatabase = async () => {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await AuthorizationModel.destroy({
      where: {},
      truncate: true,
      cascade: true,
    });
    await UserModel.destroy({ where: {}, truncate: true, cascade: true });
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
  };

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  // Setup runs before each test
  beforeEach(async () => {
    // Clean the DB before each test for isolation
    await cleanDatabase();

    // 1. Register a normal user through the API to get a login cookie
    const userRes = await request(app).post('/auth/register').send(userData);

    // Handle set-cookie being array or string depending on Node/Express version
    const userSetCookie = userRes.headers['set-cookie'];
    if (Array.isArray(userSetCookie)) {
      userCookie = userSetCookie.map((c) => c.split(';')[0]).join('; ');
    } else if (typeof userSetCookie === 'string') {
      // Sometimes 'set-cookie' can be a string with multiple comma-separated cookies
      userCookie = userSetCookie
        .split(',')
        .map((c) => c.split(';')[0])
        .join('; ');
    } else {
      throw new Error('No set-cookie header received from register route');
    }

    if (userRes.status === 201 && userRes.body?.data?.userId) {
      testUserId = userRes.body.data.userId;
    } else {
      throw new Error(
        `Failed to create test user: ${userRes.status} - ${JSON.stringify(userRes.body)}`
      );
    }

    // 2. Create a staff user directly in the DB
    const staffUser = await UserModel.create(staffUserData);
    staffUserId = staffUser.userId;
    await AuthorizationModel.create({
      userId: staffUserId,
      role: 'administrateur',
    });

    // 3. Log in the staff user to get their cookie
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

    if (staffLoginRes.status !== 200) {
      throw new Error(
        `Failed to create staff user: ${staffLoginRes.status} - ${JSON.stringify(staffLoginRes.body)}`
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
      expect(res.body.data).toHaveProperty('userId', testUserId);
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
      expect(res.body.data).toHaveProperty('userId', testUserId);
    });

    it("should prevent regular users from changing another user's password", async () => {
      const res = await request(app)
        .patch(`/users/${staffUserId}/password`)
        .set('Cookie', userCookie)
        .send({ newPassword: 'IllegalChange123!' })
        .expect(403);

      expect(res.body).toHaveProperty('message');
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

      expect(res.body.data).toHaveProperty('userId', testUserId);
    });

    it('should get user by ID when authenticated as staff', async () => {
      const res = await request(app)
        .get(`/users/${testUserId}`)
        .set('Cookie', staffCookie)
        .expect(200);

      expect(res.body.data).toHaveProperty('userId', testUserId);
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

      expect(res.body.data).toHaveProperty('firstName', 'Johnny');
    });

    it('should update any user when authenticated as staff', async () => {
      const res = await request(app)
        .put(`/users/${testUserId}`)
        .set('Cookie', staffCookie)
        .send({ firstName: 'StaffEdit' })
        .expect(200);

      expect(res.body.data).toHaveProperty('firstName', 'StaffEdit');
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
      // First, create another user
      await request(app)
        .post('/auth/register')
        .send({
          ...userData,
          email: 'unique@user.com',
          username: 'uniqueuser',
        });

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
      await request(app)
        .delete(`/users/${testUserId}`)
        .set('Cookie', staffCookie)
        .expect(200);
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

  // Example integration test: User lifecycle
  describe('Integration Tests - Complex Scenarios', () => {
    it('should handle user lifecycle: get, update, change password', async () => {
      // Get user
      let res = await request(app)
        .get(`/users/${testUserId}`)
        .set('Cookie', userCookie)
        .expect(200);
      expect(res.body.data).toHaveProperty('userId', testUserId);

      // Update user
      res = await request(app)
        .put(`/users/${testUserId}`)
        .set('Cookie', userCookie)
        .send({ firstName: 'Lifecycle' })
        .expect(200);
      expect(res.body.data).toHaveProperty('firstName', 'Lifecycle');

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
    });
  });
});
