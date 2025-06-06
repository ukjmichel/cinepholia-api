import * as userController from '../../controllers/user.controller.js';
import { userService } from '../../services/user.service.js';
import { config } from '../../config/env.js';
import { sequelize } from '../../config/db.js';

import { NotFoundError } from '../../errors/not-found-error.js';
import { BadRequestError } from '../../errors/bad-request-error.js';
import { UnauthorizedError } from '../../errors/unauthorized-error.js';

// Mock all external services
jest.mock('../../services/user.service.js');
jest.mock('../../services/authorization.service.js');
jest.mock('../../services/email.service.js');

// Mock Sequelize transaction to avoid "Transaction finished" errors
beforeAll(() => {
  jest.spyOn(sequelize, 'transaction').mockImplementation(
    async () =>
      ({
        commit: jest.fn().mockResolvedValue(undefined),
        rollback: jest.fn().mockResolvedValue(undefined),
      }) as any
  );
});

const mockRequest = (body = {}, params = {}, query = {}) => ({
  body,
  params,
  query,
});
const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
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
  toJSON: function () {
    return {
      userId: this.userId,
      username: this.username,
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      verified: this.verified,
    };
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  // Force welcome email to be sent in all tests
  config.sendWelcomeEmail = true;
});

describe('userController.createAccount (controller factory)', () => {
  const handler = userController.createAccount('utilisateur');

  it('should create user, create authorization, send email, and return 201', async () => {
    (userService.createUser as jest.Mock).mockResolvedValue(mockUser);
    (
      userController.authorizationService.createAuthorization as jest.Mock
    ).mockResolvedValue({
      userId: '1',
      role: 'utilisateur',
    });
    jest
      .spyOn(userController.emailService, 'sendWelcomeEmail')
      .mockResolvedValue(undefined);

    const req = mockRequest({
      ...mockUser,
      password: 'pass',
    });
    const res = mockResponse();

    await handler(req as any, res as any, mockNext);
    console.log('mockNext:', mockNext.mock.calls);
    console.log('res.status:', res.status.mock.calls);
    console.log('res.json:', res.json.mock.calls);

    expect(userService.createUser).toHaveBeenCalled();
    expect(
      userController.authorizationService.createAuthorization
    ).toHaveBeenCalledWith(
      { userId: mockUser.userId, role: 'utilisateur' },
      expect.any(Object)
    );
    expect(userController.emailService.sendWelcomeEmail).toHaveBeenCalledWith(
      mockUser.email,
      mockUser.firstName
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: 'User created successfully',
      data: expect.objectContaining({
        userId: '1',
        username: 'test',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@email.com',
        verified: false,
        role: 'utilisateur',
      }),
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should call next with error if userService.createUser fails', async () => {
    (userService.createUser as jest.Mock).mockRejectedValue(
      new Error('DB error')
    );
    const req = mockRequest({ ...mockUser, password: 'pass' });
    const res = mockResponse();

    await handler(req as any, res as any, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it('should call next with error if authorizationService.createAuthorization fails', async () => {
    (userService.createUser as jest.Mock).mockResolvedValue(mockUser);
    (
      userController.authorizationService.createAuthorization as jest.Mock
    ).mockRejectedValue(new Error('Auth error'));
    jest
      .spyOn(userController.emailService, 'sendWelcomeEmail')
      .mockResolvedValue(undefined);

    const req = mockRequest({
      ...mockUser,
      password: 'pass',
    });
    const res = mockResponse();

    await handler(req as any, res as any, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe('userController.getUserById', () => {
  it('should return user and 200', async () => {
    (userService.getUserById as jest.Mock).mockResolvedValue(mockUser);
    const req = mockRequest({}, { userId: '1' });
    const res = mockResponse();

    await userController.getUserById(req as any, res as any, mockNext);

    expect(userService.getUserById).toHaveBeenCalledWith('1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'User found successfully',
      data: mockUser,
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should call next with NotFoundError if user not found', async () => {
    (userService.getUserById as jest.Mock).mockResolvedValue(null);
    const req = mockRequest({}, { userId: '999' });
    const res = mockResponse();

    await userController.getUserById(req as any, res as any, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe('userController.updateUser', () => {
  it('should update and return user', async () => {
    (userService.updateUser as jest.Mock).mockResolvedValue({
      ...mockUser,
      firstName: 'Changed',
    });
    const req = mockRequest({ firstName: 'Changed' }, { userId: '1' });
    const res = mockResponse();

    await userController.updateUser(req as any, res as any, mockNext);

    expect(userService.updateUser).toHaveBeenCalledWith('1', {
      firstName: 'Changed',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'User updated successfully',
      data: { ...mockUser, firstName: 'Changed' },
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should call next if update fails', async () => {
    (userService.updateUser as jest.Mock).mockRejectedValue(
      new NotFoundError('User not found')
    );
    const req = mockRequest({ firstName: 'Changed' }, { userId: '2' });
    const res = mockResponse();

    await userController.updateUser(req as any, res as any, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe('userController.changePassword', () => {
  it('should change password and return 200', async () => {
    (userService.changePassword as jest.Mock).mockResolvedValue(mockUser);
    const req = mockRequest({ newPassword: 'newpass' }, { userId: '1' });
    const res = mockResponse();

    await userController.changePassword(req as any, res as any, mockNext);

    expect(userService.changePassword).toHaveBeenCalledWith('1', 'newpass');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Password changed successfully',
      data: mockUser,
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should call next with BadRequestError if no password', async () => {
    const req = mockRequest({}, { userId: '1' });
    const res = mockResponse();

    await userController.changePassword(req as any, res as any, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
    expect(userService.changePassword).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should call next if changePassword fails', async () => {
    (userService.changePassword as jest.Mock).mockRejectedValue(
      new Error('Fail')
    );
    const req = mockRequest({ newPassword: 'x' }, { userId: '1' });
    const res = mockResponse();

    await userController.changePassword(req as any, res as any, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('userController.verifyUser', () => {
  it('should verify and return user', async () => {
    (userService.verifyUser as jest.Mock).mockResolvedValue({
      ...mockUser,
      verified: true,
    });
    const req = mockRequest({}, { userId: '1' });
    const res = mockResponse();

    await userController.verifyUser(req as any, res as any, mockNext);

    expect(userService.verifyUser).toHaveBeenCalledWith('1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'User verified',
      data: { ...mockUser, verified: true },
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should call next if verifyUser fails', async () => {
    (userService.verifyUser as jest.Mock).mockRejectedValue(
      new NotFoundError('User not found')
    );
    const req = mockRequest({}, { userId: '2' });
    const res = mockResponse();

    await userController.verifyUser(req as any, res as any, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('userController.deleteUser', () => {
  it('should delete user and return 200', async () => {
    (userService.deleteUser as jest.Mock).mockResolvedValue(true);
    const req = mockRequest({}, { userId: '1' });
    const res = mockResponse();

    await userController.deleteUser(req as any, res as any, mockNext);

    expect(userService.deleteUser).toHaveBeenCalledWith('1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'User deleted',
      data: null,
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should call next with NotFoundError if user not found', async () => {
    (userService.deleteUser as jest.Mock).mockResolvedValue(false);
    const req = mockRequest({}, { userId: '2' });
    const res = mockResponse();

    await userController.deleteUser(req as any, res as any, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should call next if deleteUser fails', async () => {
    (userService.deleteUser as jest.Mock).mockRejectedValue(new Error('Fail'));
    const req = mockRequest({}, { userId: '3' });
    const res = mockResponse();

    await userController.deleteUser(req as any, res as any, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('userController.listUsers', () => {
  it('should list users and return 200', async () => {
    (userService.listUsers as jest.Mock).mockResolvedValue({
      users: [mockUser],
      total: 1,
      page: 1,
      pageSize: 10,
    });
    const req = mockRequest({}, {}, {});
    const res = mockResponse();

    await userController.listUsers(req as any, res as any, mockNext);

    expect(userService.listUsers).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Users found successfully',
      data: {
        users: [mockUser],
        total: 1,
        page: 1,
        pageSize: 10,
      },
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should handle filters', async () => {
    (userService.listUsers as jest.Mock).mockResolvedValue({
      users: [],
      total: 0,
      page: 1,
      pageSize: 10,
    });
    const req = mockRequest({}, {}, { username: 'noone', verified: 'false' });
    const res = mockResponse();

    await userController.listUsers(req as any, res as any, mockNext);

    expect(userService.listUsers).toHaveBeenCalledWith({
      page: undefined,
      pageSize: undefined,
      filters: {
        username: 'noone',
        email: undefined,
        verified: false,
      },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Users found successfully',
      data: {
        users: [],
        total: 0,
        page: 1,
        pageSize: 10,
      },
    });
  });

  it('should call next if listUsers fails', async () => {
    (userService.listUsers as jest.Mock).mockRejectedValue(new Error('Fail'));
    const req = mockRequest({}, {}, {});
    const res = mockResponse();

    await userController.listUsers(req as any, res as any, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('userController.validatePassword', () => {
  it('should validate and return user', async () => {
    (userService.validatePassword as jest.Mock).mockResolvedValue(mockUser);
    const req = mockRequest({ emailOrUsername: 'test', password: 'pass' }, {});
    const res = mockResponse();

    await userController.validatePassword(req as any, res as any, mockNext);

    expect(userService.validatePassword).toHaveBeenCalledWith('test', 'pass');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'User validated successfully',
      data: mockUser,
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should call next with UnauthorizedError if credentials invalid', async () => {
    (userService.validatePassword as jest.Mock).mockResolvedValue(null);
    const req = mockRequest({ emailOrUsername: 'wrong', password: 'fail' }, {});
    const res = mockResponse();

    await userController.validatePassword(req as any, res as any, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should call next with BadRequestError if missing params', async () => {
    const req = mockRequest({}, {});
    const res = mockResponse();

    await userController.validatePassword(req as any, res as any, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
    expect(userService.validatePassword).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should call next if validatePassword throws', async () => {
    (userService.validatePassword as jest.Mock).mockRejectedValue(
      new Error('Unexpected')
    );
    const req = mockRequest({ emailOrUsername: 'test', password: 'pass' }, {});
    const res = mockResponse();

    await userController.validatePassword(req as any, res as any, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    expect(res.status).not.toHaveBeenCalled();
  });
});
