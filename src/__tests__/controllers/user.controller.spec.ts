// src/__tests__/controllers/user.controller.spec.ts

import * as userController from '../../controllers/user.controller.js';
import { userService } from '../../services/user.service.js';
import { authorizationService } from '../../services/authorization.service.js';
import { emailService } from '../../services/email.service.js';
import { authService } from '../../services/auth.service.js';
import { config } from '../../config/env.js';

import { NotFoundError } from '../../errors/not-found-error.js';
import { BadRequestError } from '../../errors/bad-request-error.js';
import { UnauthorizedError } from '../../errors/unauthorized-error.js';

// ✅ Proper Sequelize mock (supports callback and direct return)
jest.mock('../../config/db.js', () => ({
  sequelize: {
    transaction: jest.fn((cb?: any) => {
      const t = { commit: jest.fn(), rollback: jest.fn() };
      return cb ? cb(t) : Promise.resolve(t);
    }),
  },
}));

// ✅ Mock external services
jest.mock('../../services/user.service.js');
jest.mock('../../services/authorization.service.js');
jest.mock('../../services/email.service.js');
jest.mock('../../services/auth.service.js');

// ✅ Utility helpers
const mockRequest = (body = {}, params = {}, query = {}, user?: any) => ({
  body,
  params,
  query,
  user,
});
const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  return res;
};
const mockNext = jest.fn();

const mockUser = {
  userId: '1',
  username: 'test',
  firstName: 'Test',
  lastName: 'User',
  email: 'test@email.com',
  verified: false,
};

const withRole = (user = mockUser, role = 'utilisateur') => ({
  ...user,
  role,
});

beforeEach(() => {
  jest.clearAllMocks();
  config.sendWelcomeEmail = true;
  (
    authorizationService.getAuthorizationByUserId as jest.Mock
  ).mockResolvedValue({ userId: '1', role: 'utilisateur' });
});

//
// === TESTS ===
//
describe('userController.createAccount', () => {
  const handler = userController.createAccount('utilisateur');

  it('should create user, assign role, send email, set cookies, and return 201', async () => {
    (userService.createUser as jest.Mock).mockResolvedValue(mockUser);
    (authorizationService.createAuthorization as jest.Mock).mockResolvedValue({
      userId: '1',
      role: 'utilisateur',
    });
    (emailService.sendWelcomeEmail as jest.Mock).mockResolvedValue(undefined);
    (authService.generateTokens as jest.Mock).mockReturnValue({
      accessToken: 'a',
      refreshToken: 'r',
    });

    const req = mockRequest({ ...mockUser, password: 'pass' });
    const res = mockResponse();

    await handler(req as any, res as any, mockNext);

    expect(userService.createUser).toHaveBeenCalled();
    expect(res.cookie).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: 'User created successfully',
      data: { user: withRole() },
    });
  });

  it('should call next if userService.createUser fails', async () => {
    (userService.createUser as jest.Mock).mockRejectedValue(new Error('fail'));
    await handler(mockRequest({}) as any, mockResponse() as any, mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('userController.getUserById', () => {
  it('should return user', async () => {
    (userService.getUserById as jest.Mock).mockResolvedValue(mockUser);
    const res = mockResponse();
    await userController.getUserById(
      mockRequest({}, { userId: '1' }) as any,
      res,
      mockNext
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should call next if user not found', async () => {
    (userService.getUserById as jest.Mock).mockResolvedValue(null);
    await userController.getUserById(
      mockRequest({}, { userId: 'x' }) as any,
      mockResponse(),
      mockNext
    );
    expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
  });
});

describe('userController.getCurrentUser', () => {
  it('should return current authenticated user', async () => {
    (userService.getUserById as jest.Mock).mockResolvedValue(mockUser);
    const res = mockResponse();
    await userController.getCurrentUser(
      mockRequest({}, {}, {}, { userId: '1' }) as any,
      res,
      mockNext
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should return 401 if no user in req', async () => {
    const res = mockResponse();
    await userController.getCurrentUser(mockRequest() as any, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('userController.updateUser', () => {
  it('should update user', async () => {
    (userService.updateUser as jest.Mock).mockResolvedValue({
      ...mockUser,
      firstName: 'Changed',
    });
    const res = mockResponse();
    await userController.updateUser(
      mockRequest({ firstName: 'Changed' }, { userId: '1' }) as any,
      res,
      mockNext
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('userController.changePassword', () => {
  it('should change password', async () => {
    (userService.changePassword as jest.Mock).mockResolvedValue(mockUser);
    const res = mockResponse();
    await userController.changePassword(
      mockRequest({ newPassword: 'n' }, { userId: '1' }) as any,
      res,
      mockNext
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should call next with BadRequestError if no password', async () => {
    await userController.changePassword(
      mockRequest({}, { userId: '1' }) as any,
      mockResponse(),
      mockNext
    );
    expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
  });
});

describe('userController.verifyUser', () => {
  it('should verify user', async () => {
    (userService.verifyUser as jest.Mock).mockResolvedValue({
      ...mockUser,
      verified: true,
    });
    const res = mockResponse();
    await userController.verifyUser(
      mockRequest({}, { userId: '1' }) as any,
      res,
      mockNext
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('userController.deleteUser', () => {
  it('should delete user', async () => {
    (userService.deleteUser as jest.Mock).mockResolvedValue(true);
    const res = mockResponse();
    await userController.deleteUser(
      mockRequest({}, { userId: '1' }) as any,
      res,
      mockNext
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should call next if user not found', async () => {
    (userService.deleteUser as jest.Mock).mockResolvedValue(false);
    await userController.deleteUser(
      mockRequest({}, { userId: 'x' }) as any,
      mockResponse(),
      mockNext
    );
    expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
  });
});

describe('userController.listUsers', () => {
  it('should list users', async () => {
    (userService.listUsers as jest.Mock).mockResolvedValue({
      users: [mockUser],
      total: 1,
      page: 1,
      pageSize: 10,
    });
    const res = mockResponse();
    await userController.listUsers(
      mockRequest({}, {}, {}) as any,
      res,
      mockNext
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('userController.searchUsers', () => {
  it('should search and return users', async () => {
    (userService.searchUsers as jest.Mock).mockResolvedValue([mockUser]);
    const res = mockResponse();
    await userController.searchUsers(
      mockRequest({}, {}, { q: 'test' }) as any,
      res,
      mockNext
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('userController.validatePassword', () => {
  it('should validate credentials', async () => {
    (userService.validatePassword as jest.Mock).mockResolvedValue(mockUser);
    const res = mockResponse();
    await userController.validatePassword(
      mockRequest({ emailOrUsername: 'test', password: 'p' }) as any,
      res,
      mockNext
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should call next if invalid credentials', async () => {
    (userService.validatePassword as jest.Mock).mockResolvedValue(null);
    await userController.validatePassword(
      mockRequest({ emailOrUsername: 'x', password: 'p' }) as any,
      mockResponse(),
      mockNext
    );
    expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });
});
