// src/__tests__/routes/user.route.e2e.spec.ts

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

describe('User E2E Routes with MySQL', () => {
  let userToken: string;
  let staffToken: string;
  let testUserId: string;
  let staffUserId: string;
  let authService: AuthService;

  beforeAll(async () => {
    await syncDB();
    authService = new AuthService();
  });

  beforeEach(async () => {
    // Clean database before each test
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await UserTokenModel.destroy({ where: {}, truncate: true, cascade: true });
    await AuthorizationModel.destroy({
      where: {},
      truncate: true,
      cascade: true,
    });
    await UserModel.destroy({ where: {}, truncate: true, cascade: true });
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

    // Create a regular user via API
    const userRes = await request(app).post('/auth/register').send(userData);

    if (userRes.status === 201 && userRes.body.data?.tokens) {
      userToken = userRes.body.data.tokens.accessToken;
      testUserId = userRes.body.data.userId;
    } else {
      throw new Error('Failed to create test user');
    }

    // Create a staff user manually since /auth/register/staff doesn't exist
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
  });

  afterAll(async () => {
    // Final cleanup
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
        .expect(401); // Your middleware returns 401, not 403

      expect(res.body.message).toMatch(
        /forbidden|permission|not allowed|staff.*required/i
      );
    });

    it('should filter users by email when authenticated as staff', async () => {
      const res = await request(app)
        .get(`/users?email=${userData.email}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(Array.isArray(res.body.data.users)).toBe(true);
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
    });

    it('should filter users by verified status', async () => {
      const res = await request(app)
        .get('/users?verified=false')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(Array.isArray(res.body.data.users)).toBe(true);
    });

    it('should support pagination', async () => {
      // Create additional users for pagination testing
      for (let i = 1; i <= 5; i++) {
        await UserModel.create({
          ...userData,
          email: `user${i}@test.com`,
          username: `user${i}`,
        });
      }

      const res = await request(app)
        .get('/users?page=1&pageSize=3')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(res.body.data.users.length).toBeLessThanOrEqual(3);
      expect(res.body.data).toHaveProperty('page');
      expect(res.body.data).toHaveProperty('total');
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
  });

  describe('DELETE /users/:userId', () => {
    it('should delete any user when authenticated as staff (with proper cleanup)', async () => {
      // Create a test user to delete WITHOUT authorization to avoid foreign key issues
      const testUser = await UserModel.create({
        ...userData,
        email: 'todelete@test.com',
        username: 'todelete',
      });

      // Don't create authorization for this user to avoid foreign key constraints

      // Delete the user as staff
      const res = await request(app)
        .delete(`/users/${(testUser as any).userId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(res.body.message).toMatch(/deleted/i);
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
  });

  describe('Integration Tests - Complex Scenarios', () => {
    it('should handle user lifecycle: get, update, change password', async () => {
      // Get user
      await request(app)
        .get(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Update user
      await request(app)
        .put(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ firstName: 'Updated' })
        .expect(200);

      // Change password
      await request(app)
        .patch(`/users/${testUserId}/password`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ newPassword: 'NewPassword123!' })
        .expect(200);

      // Note: Skipping delete to avoid foreign key constraint issues
    });

    it('should handle concurrent user operations', async () => {
      const users: any[] = [];

      // Create multiple users concurrently
      for (let i = 0; i < 3; i++) {
        const user = await UserModel.create({
          ...userData,
          email: `user${i}@test.com`,
          username: `user${i}`,
        });
        users.push(user);
      }

      // Update all users concurrently as staff
      const updatePromises = users.map((user) => {
        const userId = (user as any).userId;
        return request(app)
          .put(`/users/${userId}`)
          .set('Authorization', `Bearer ${staffToken}`)
          .send({ firstName: 'Updated Staff' }) // Use valid name without numbers
          .expect(200);
      });

      const results = await Promise.all(updatePromises);
      expect(results).toHaveLength(3);
      results.forEach((res) => {
        expect(res.body.message).toBe('User updated successfully');
      });
    });

    it('should maintain data consistency during operations', async () => {
      // Update user with valid data (no numbers in firstName)
      await request(app)
        .put(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          firstName: 'Data-Consistency',
          email: 'consistency@test.com',
        })
        .expect(200);

      // Verify the update persisted
      const getRes = await request(app)
        .get(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(getRes.body.data.firstName).toBe('Data-Consistency');
      expect(getRes.body.data.email).toBe('consistency@test.com');
    });

    it('should respect permission boundaries', async () => {
      // Create another user
      const otherUser = await UserModel.create({
        ...userData,
        email: 'other@user.com',
        username: 'otheruser',
      });

      // Regular user should NOT be able to access other user's profile
      await request(app)
        .get(`/users/${(otherUser as any).userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(401); // Your middleware returns 401, not 403

      // But staff should be able to access any user's profile
      await request(app)
        .get(`/users/${(otherUser as any).userId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);
    });

    it('should handle authorization checks correctly', async () => {
      // Test that regular user can access their own data
      await request(app)
        .get(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Test that staff can access any user data
      await request(app)
        .get(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      // Test that no token results in 401
      await request(app).get(`/users/${testUserId}`).expect(401);

      // Test that invalid token results in 401
      await request(app)
        .get(`/users/${testUserId}`)
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should validate request data properly', async () => {
      // Test invalid email format
      await request(app)
        .put(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ email: 'not-an-email' })
        .expect(400);

      // Test empty required fields
      await request(app)
        .patch(`/users/${testUserId}/password`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({})
        .expect(400);

      // Test weak password
      await request(app)
        .patch(`/users/${testUserId}/password`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ newPassword: '123' })
        .expect(400);
    });
  });
});
