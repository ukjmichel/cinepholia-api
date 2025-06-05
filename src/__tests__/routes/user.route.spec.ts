import request from 'supertest';
import app from '../../app.js';
import { sequelize, syncDB } from '../../config/db.js';
import { UserModel } from '../../models/user.model.js';
import { AuthorizationModel } from '../../models/authorization.model.js';
import { UserTokenModel } from '../../models/user-token.model.js';
import { AuthService } from '../../services/auth.service.js';
import { v4 as uuidv4 } from 'uuid';

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

/**
 * Helper function to clean database safely
 */
const cleanDatabase = async (): Promise<void> => {
  try {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
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

const waitForOperation = async (ms: number = 100): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

describe('User E2E Routes with MySQL', () => {
  let userToken: string;
  let staffToken: string;
  let testUserId: string;
  let staffUserId: string;
  let authService: AuthService;

  beforeAll(async () => {
    await syncDB();
    authService = new AuthService();
    console.log('🚀 Test database synced and ready');
  });

  beforeEach(async () => {
    await cleanDatabase();
    const userRes = await request(app).post('/auth/register').send(userData);

    if (userRes.status === 201 && userRes.body.data?.tokens) {
      userToken = userRes.body.data.tokens.accessToken;
      testUserId = userRes.body.data.userId;
    } else {
      throw new Error(
        `Failed to create test user: ${userRes.status} - ${JSON.stringify(userRes.body)}`
      );
    }

    // Create staff user manually
    const staffUser = await UserModel.create(staffUserData);
    staffUserId = (staffUser as any).userId;

    // Create staff authorization
    await AuthorizationModel.create({
      userId: staffUserId,
      role: 'employé',
    });

    // Generate staff token manually
    staffToken = authService.generateTokens({
      userId: staffUserId,
      username: staffUserData.username,
      email: staffUserData.email,
      verified: false,
    } as any).accessToken;

    console.log('🧹 Test environment prepared with users and permissions');
  });

  afterAll(async () => {
    await cleanDatabase();
    await sequelize.close();
    console.log('🔌 Database connection closed');
  });

  describe('PATCH /users/:userId/password', () => {
    it('should change own password', async () => {
      const newPasswordData = {
        newPassword: 'NewPassword123!',
      };

      const res = await request(app)
        .patch(`/users/${testUserId}/password`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(newPasswordData)
        .expect(200);

      expect(res.body).toHaveProperty(
        'message',
        'Password changed successfully'
      );
      expect(res.body.data).toHaveProperty('userId', testUserId);
    });

    it('should change any user password when authenticated as staff', async () => {
      const newPasswordData = {
        newPassword: 'StaffChangedPassword123!',
      };

      const res = await request(app)
        .patch(`/users/${testUserId}/password`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send(newPasswordData)
        .expect(200);

      expect(res.body.message).toMatch(/password.*changed/i);
    });

    it("should prevent regular users from changing another user's password", async () => {
      // Create another user to try to change password
      const otherUser = await UserModel.create({
        ...userData,
        email: 'otheruser@test.com',
        username: 'otheruser',
      });

      const res = await request(app)
        .patch(`/users/${(otherUser as any).userId}/password`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ newPassword: 'MaliciousChange123!' })
        .expect(403);

      expect(res.body.message).toMatch(
        /unauthorized|forbidden|permission|not allowed to access/i
      );
    });

    it('should fail when not authenticated', async () => {
      const res = await request(app)
        .patch(`/users/${testUserId}/password`)
        .send({ newPassword: 'NewPassword123!' })
        .expect(401);

      expect(res.body.message).toMatch(/unauthorized|token|missing/i);
    });

    it('should fail when newPassword is missing', async () => {
      const res = await request(app)
        .patch(`/users/${testUserId}/password`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({})
        .expect(400);

      expect(res.body.message).toMatch(/validation|required|password/i);
    });

    it('should fail with weak password', async () => {
      const res = await request(app)
        .patch(`/users/${testUserId}/password`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ newPassword: '123' })
        .expect(400);

      expect(res.body.message).toMatch(/validation|password/i);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = uuidv4();
      const res = await request(app)
        .patch(`/users/${fakeId}/password`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ newPassword: 'NewPassword123!' })
        .expect(404);

      expect(res.body.message).toMatch(/not found/i);
    });

    it('should verify password change works with login', async () => {
      const newPassword = 'VerifiedNewPassword123!';

      // Change password
      await request(app)
        .patch(`/users/${testUserId}/password`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ newPassword })
        .expect(200);

      // Login with new password
      const loginRes = await request(app)
        .post('/auth/login')
        .send({
          emailOrUsername: userData.email,
          password: newPassword,
        })
        .expect(200);

      expect(loginRes.body).toHaveProperty('message', 'Login successful');
      const setCookie = loginRes.headers['set-cookie'];
      expect(setCookie).toBeDefined();
      const cookieArray = Array.isArray(setCookie) ? setCookie : [setCookie];
      expect(cookieArray.join(';')).toMatch(/accessToken/i);
      expect(loginRes.body.data).toHaveProperty('user');
      expect(loginRes.body.data.user.email).toBe(userData.email);
    });
  });

  describe('GET /users', () => {
    it('should list users when authenticated as staff', async () => {
      const res = await request(app)
        .get('/users')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('message', 'Users found successfully');
      expect(Array.isArray(res.body.data.users)).toBe(true);
      expect(res.body.data).toHaveProperty('total');
    });

    it('should fail when not authenticated', async () => {
      const res = await request(app).get('/users').expect(401);

      expect(res.body.message).toMatch(/unauthorized|token|missing/i);
    });

    it('should fail when authenticated as regular user (permission test)', async () => {
      const res = await request(app)
        .get('/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(res.body.message).toMatch(
        /forbidden|permission|not allowed|staff.*required|unauthorized/i
      );
    });

    it('should filter users by email when authenticated as staff', async () => {
      const res = await request(app)
        .get(`/users?email=${userData.email}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(Array.isArray(res.body.data.users)).toBe(true);
      expect(res.body.data.users.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty list for non-existent email filter', async () => {
      const res = await request(app)
        .get('/users?email=doesnotexist@nope.com')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(Array.isArray(res.body.data.users)).toBe(true);
      expect(res.body.data.users.length).toBe(0);
    });

    it('should filter users by username', async () => {
      const res = await request(app)
        .get(`/users?username=${userData.username}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(Array.isArray(res.body.data.users)).toBe(true);
      expect(res.body.data.users.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter users by verified status', async () => {
      const res = await request(app)
        .get('/users?verified=false')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(Array.isArray(res.body.data.users)).toBe(true);
    });

    it('should support pagination', async () => {
      const additionalUsers = [];
      for (let i = 1; i <= 5; i++) {
        const user = await UserModel.create({
          ...userData,
          email: `user${i}@test.com`,
          username: `user${i}`,
        });
        additionalUsers.push(user as never);
      }
      await waitForOperation(100);

      const res = await request(app)
        .get('/users?page=1&pageSize=3')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(res.body.data.users.length).toBeLessThanOrEqual(3);
      expect(res.body.data).toHaveProperty('page');
      expect(res.body.data).toHaveProperty('total');
      expect(res.body.data.total).toBeGreaterThanOrEqual(2);
    });
  });

  describe('GET /users/:userId', () => {
    it('should get user by ID when accessing own profile', async () => {
      const res = await request(app)
        .get(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('message', 'User found successfully');
      expect(res.body.data.email).toBe(userData.email);
      expect(res.body.data.userId).toBe(testUserId);
    });

    it('should get user by ID when authenticated as staff', async () => {
      const res = await request(app)
        .get(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(res.body.data.email).toBe(userData.email);
    });

    it('should fail when not authenticated', async () => {
      const res = await request(app).get(`/users/${testUserId}`).expect(401);

      expect(res.body.message).toMatch(/unauthorized|token|missing/i);
    });

    it('should return 404 for non-existent user ID', async () => {
      const fakeId = uuidv4();
      const res = await request(app)
        .get(`/users/${fakeId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(404);

      expect(res.body.message).toMatch(/not found/i);
    });

    it('should return 400 for invalid user ID format', async () => {
      const res = await request(app)
        .get('/users/invalid-id')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(400);

      expect(res.body.message).toMatch(/validation|invalid/i);
    });
  });

  describe('PUT /users/:userId', () => {
    it('should update own user profile', async () => {
      const updateData = {
        firstName: 'Jane',
        lastName: 'Smith',
      };

      const res = await request(app)
        .put(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(200);

      expect(res.body).toHaveProperty('message', 'User updated successfully');
      expect(res.body.data.firstName).toBe('Jane');
      expect(res.body.data.lastName).toBe('Smith');
    });

    it('should update any user when authenticated as staff', async () => {
      const updateData = {
        firstName: 'Updated by Staff',
      };

      const res = await request(app)
        .put(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send(updateData)
        .expect(200);

      expect(res.body.data.firstName).toBe('Updated by Staff');
    });

    it('should fail when not authenticated', async () => {
      const res = await request(app)
        .put(`/users/${testUserId}`)
        .send({ firstName: 'Jane' })
        .expect(401);

      expect(res.body.message).toMatch(/unauthorized|token|missing/i);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = uuidv4();
      const res = await request(app)
        .put(`/users/${fakeId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ firstName: 'Jane' })
        .expect(404);

      expect(res.body.message).toMatch(/not found/i);
    });

    it('should fail with invalid email format', async () => {
      const res = await request(app)
        .put(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(res.body.message).toMatch(/validation|email/i);
    });

    it('should prevent updating to existing email/username', async () => {
      const anotherUser = await UserModel.create({
        ...userData,
        email: 'another@user.com',
        username: 'anotheruser',
      });

      const res = await request(app)
        .put(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ email: 'another@user.com' })
        .expect(409);

      expect(res.body.message).toMatch(/validation|already exists|conflict/i);
    });
  });

  describe('DELETE /users/:userId', () => {
    it('should delete any user when authenticated as staff (with proper cleanup)', async () => {
      const testUser = await UserModel.create({
        ...userData,
        email: 'todelete@test.com',
        username: 'todelete',
      });

      const res = await request(app)
        .delete(`/users/${(testUser as any).userId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(res.body.message).toMatch(/deleted/i);

      const deletedUser = await UserModel.findByPk((testUser as any).userId);
      expect(deletedUser).toBeNull();
    });

    it('should fail when not authenticated', async () => {
      const res = await request(app).delete(`/users/${testUserId}`).expect(401);

      expect(res.body.message).toMatch(/unauthorized|token|missing/i);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = uuidv4();
      const res = await request(app)
        .delete(`/users/${fakeId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(404);

      expect(res.body.message).toMatch(/not found/i);
    });

    it('should return 400 for invalid user ID format', async () => {
      const res = await request(app)
        .delete('/users/invalid-id')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(400);

      expect(res.body.message).toMatch(/validation|invalid/i);
    });

    it('should prevent regular users from deleting other users', async () => {
      const otherUser = await UserModel.create({
        ...userData,
        email: 'other@test.com',
        username: 'otheruser',
      });

      const res = await request(app)
        .delete(`/users/${(otherUser as any).userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(res.body.message).toMatch(
        /unauthorized|forbidden|permission|not allowed to access/i
      );
    });
  });

  describe('Integration Tests - Complex Scenarios', () => {
    it('should handle user lifecycle: get, update, change password', async () => {
      await request(app)
        .get(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      await request(app)
        .put(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ firstName: 'Updated' })
        .expect(200);

      await request(app)
        .patch(`/users/${testUserId}/password`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ newPassword: 'NewPassword123!' })
        .expect(200);
    });

    it('should handle concurrent user operations', async () => {
      const users: UserModel[] = [];
      for (let i = 0; i < 3; i++) {
        const user = await UserModel.create({
          ...userData,
          email: `user${i}@test.com`,
          username: `user${i}`,
        });
        users.push(user);
      }
      const updatePromises = users.map((user) => {
        const userId = (user as any).userId;
        return request(app)
          .put(`/users/${userId}`)
          .set('Authorization', `Bearer ${staffToken}`)
          .send({ firstName: 'Updated Staff' })
          .expect(200);
      });
      const results = await Promise.all(updatePromises);
      expect(results).toHaveLength(3);
      results.forEach((res) => {
        expect(res.body.message).toBe('User updated successfully');
      });
    });

    it('should maintain data consistency during operations', async () => {
      await request(app)
        .put(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          firstName: 'Data-Consistency',
          email: 'consistency@test.com',
        })
        .expect(200);

      const getRes = await request(app)
        .get(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(getRes.body.data.firstName).toBe('Data-Consistency');
      expect(getRes.body.data.email).toBe('consistency@test.com');
    });

    it('should respect permission boundaries', async () => {
      const otherUser = await UserModel.create({
        ...userData,
        email: 'other@user.com',
        username: 'otheruser',
      });

      await request(app)
        .get(`/users/${(otherUser as any).userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      await request(app)
        .get(`/users/${(otherUser as any).userId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);
    });

    it('should handle authorization checks correctly', async () => {
      await request(app)
        .get(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      await request(app)
        .get(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      await request(app).get(`/users/${testUserId}`).expect(401);

      await request(app)
        .get(`/users/${testUserId}`)
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should validate request data properly', async () => {
      await request(app)
        .put(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ email: 'not-an-email' })
        .expect(400);

      await request(app)
        .patch(`/users/${testUserId}/password`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({})
        .expect(400);

      await request(app)
        .patch(`/users/${testUserId}/password`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ newPassword: '123' })
        .expect(400);
    });

    it('should handle edge cases gracefully', async () => {
      const longString = 'a'.repeat(1000);
      await request(app)
        .put(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ firstName: longString })
        .expect(400);

      await request(app)
        .put(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ firstName: 'José-María' })
        .expect(200);

      await request(app)
        .put(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ firstName: "'; DROP TABLE users; --" })
        .expect(400);
    });
  });
});
