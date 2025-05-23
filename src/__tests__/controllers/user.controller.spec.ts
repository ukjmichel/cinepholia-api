// src/__tests__/controllers/user.controller.spec.ts

import request from 'supertest';
import express, { NextFunction, Request, Response } from 'express';
import * as userController from '../../controllers/user.controller.js';
import { userService } from '../../services/user.service.js';
import { authorizationService } from '../../services/authorization.service.js';
import { emailService } from '../../services/email.service.js';
import { NotFoundError } from '../../errors/not-found-error.js';


// ---- Important: MOCK emailClient to avoid API key issues ----
jest.mock(
  '../../config/emailClient',
  () => ({
    __esModule: true,
    default: {
      emails: { send: jest.fn() },
    },
  }),
  { virtual: true }
);

// ---- MOCK dependencies ----
jest.mock('../../services/user.service.js');
jest.mock('../../services/authorization.service.js');
jest.mock('../../services/email.service.js');
jest.mock('../../config/env.js', () => ({
  config: { sendWelcomeEmail: true },
}));

// ----- Setup Express app with error handler -----
const app = express();
app.use(express.json());

app.post('/users', userController.createUser);
app.get('/users/:userId', userController.getUserById);
app.put('/users/:userId', userController.updateUser);
app.delete('/users/:userId', userController.deleteUser);
app.get('/users', userController.listUsers);
app.patch('/users/:userId/password', userController.changePassword);
app.patch('/users/:userId/verify', userController.verifyUser);
app.post('/users/validate-password', userController.validatePassword);

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  // Express error handler for testing
  res.status(err.status || 500).json({ message: err.message, data: null });
});

// ----- Common Mocks -----
const mockUser = {
  userId: '1',
  username: 'test',
  firstName: 'Test',
  lastName: 'User',
  email: 'test@email.com',
  verified: false,
};

// ----- TESTS -----
describe('User Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create user, authorization, and send email', async () => {
      (userService.createUser as jest.Mock).mockResolvedValue(mockUser);
      (authorizationService.createAuthorization as jest.Mock).mockResolvedValue(
        { userId: '1', role: 'utilisateur' }
      );
      (emailService.sendWelcomeEmail as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app)
        .post('/users')
        .send({ ...mockUser, password: 'pass', role: 'utilisateur' });

      expect(res.status).toBe(201);
      expect(res.body.message).toMatch(/created/i);
      expect(res.body.data).toMatchObject({ userId: '1', username: 'test' });
      expect(userService.createUser).toHaveBeenCalled();
      expect(authorizationService.createAuthorization).toHaveBeenCalled();
      expect(emailService.sendWelcomeEmail).toHaveBeenCalled();
    });

    it('should handle error from userService.createUser', async () => {
      (userService.createUser as jest.Mock).mockRejectedValue(
        new Error('DB Error')
      );

      const res = await request(app)
        .post('/users')
        .send({ ...mockUser, password: 'pass', role: 'utilisateur' });

      expect(res.status).toBe(500);
      expect(res.body.message).toMatch(/db error/i);
    });

    it('should handle error from authorizationService.createAuthorization', async () => {
      (userService.createUser as jest.Mock).mockResolvedValue(mockUser);
      (authorizationService.createAuthorization as jest.Mock).mockRejectedValue(
        new Error('Auth Error')
      );

      const res = await request(app)
        .post('/users')
        .send({ ...mockUser, password: 'pass', role: 'utilisateur' });

      expect(res.status).toBe(500);
      expect(res.body.message).toMatch(/auth error/i);
    });
  });

  describe('getUserById', () => {
    it('should return user', async () => {
      (userService.getUserById as jest.Mock).mockResolvedValue(mockUser);
      const res = await request(app).get('/users/1');
      expect(res.status).toBe(200);
      expect(res.body.data.userId).toBe('1');
    });

    it('should return 404 if not found', async () => {
      (userService.getUserById as jest.Mock).mockResolvedValue(null);
      const res = await request(app).get('/users/999');
      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/not found/i);
    });
  });

  describe('updateUser', () => {
    it('should update and return user', async () => {
      (userService.updateUser as jest.Mock).mockResolvedValue({
        ...mockUser,
        firstName: 'Changed',
      });
      const res = await request(app)
        .put('/users/1')
        .send({ firstName: 'Changed' });
      expect(res.status).toBe(200);
      expect(res.body.data.firstName).toBe('Changed');
    });

    it('should handle error from userService.updateUser', async () => {
      (userService.updateUser as jest.Mock).mockRejectedValue(
        new NotFoundError('User not found')
      );
      const res = await request(app)
        .put('/users/999')
        .send({ firstName: 'New' });
      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/not found/i);
    });
  });

  describe('deleteUser', () => {
    it('should delete user', async () => {
      (userService.deleteUser as jest.Mock).mockResolvedValue(true);
      const res = await request(app).delete('/users/1');
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/deleted/i);
    });

    it('should return 404 if not found', async () => {
      (userService.deleteUser as jest.Mock).mockResolvedValue(false);
      const res = await request(app).delete('/users/2');
      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/not found/i);
    });
  });

  describe('listUsers', () => {
    it('should list users', async () => {
      (userService.listUsers as jest.Mock).mockResolvedValue({
        users: [mockUser],
        total: 1,
        page: 1,
        pageSize: 10,
      });
      const res = await request(app).get('/users');
      expect(res.status).toBe(200);
      expect(res.body.data.users.length).toBe(1);
      expect(res.body.data.total).toBe(1);
    });

    it('should handle filters', async () => {
      (userService.listUsers as jest.Mock).mockResolvedValue({
        users: [],
        total: 0,
        page: 1,
        pageSize: 10,
      });
      const res = await request(app).get(
        '/users?username=noone&verified=false'
      );
      expect(res.status).toBe(200);
      expect(res.body.data.users.length).toBe(0);
      expect(userService.listUsers).toHaveBeenCalledWith({
        page: undefined,
        pageSize: undefined,
        filters: {
          username: 'noone',
          email: undefined,
          verified: false,
        },
      });
    });
  });

  describe('changePassword', () => {
    it('should change password', async () => {
      (userService.changePassword as jest.Mock).mockResolvedValue(mockUser);
      const res = await request(app)
        .patch('/users/1/password')
        .send({ newPassword: 'newPass' });
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/changed/i);
    });

    it('should fail if missing password', async () => {
      const res = await request(app).patch('/users/1/password').send({});
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/required/i);
    });
  });

  describe('verifyUser', () => {
    it('should verify user', async () => {
      (userService.verifyUser as jest.Mock).mockResolvedValue({
        ...mockUser,
        verified: true,
      });
      const res = await request(app).patch('/users/1/verify');
      expect(res.status).toBe(200);
      expect(res.body.data.verified).toBe(true);
    });

    it('should handle error from userService.verifyUser', async () => {
      (userService.verifyUser as jest.Mock).mockRejectedValue(
        new NotFoundError('User not found')
      );
      const res = await request(app).patch('/users/999/verify');
      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/not found/i);
    });
  });

  describe('validatePassword', () => {
    it('should validate and return user', async () => {
      (userService.validatePassword as jest.Mock).mockResolvedValue(mockUser);
      const res = await request(app)
        .post('/users/validate-password')
        .send({ emailOrUsername: 'test', password: 'pass' });
      expect(res.status).toBe(200);
      expect(res.body.data.userId).toBe('1');
    });

    it('should return 401 on invalid credentials', async () => {
      (userService.validatePassword as jest.Mock).mockResolvedValue(null);
      const res = await request(app)
        .post('/users/validate-password')
        .send({ emailOrUsername: 'test', password: 'bad' });
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/invalid/i);
    });

    it('should return 400 if missing params', async () => {
      const res = await request(app).post('/users/validate-password').send({});
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/required/i);
    });
  });
});
