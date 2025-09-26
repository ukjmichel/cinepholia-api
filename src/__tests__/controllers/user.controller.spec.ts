// src/__tests__/controllers/user.controller.spec.ts
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

/* ── Helpers & typed mock fns ─────────────────────────────────────────── */

type Any = any;

// simple tx helper
const tx = () => ({
  commit: jest.fn(async () => {}),
  rollback: jest.fn(async () => {}),
});

type TxOpts = { transaction?: Any };

// Service mocks with explicit signatures so .mockResolvedValue accepts values
export const userCreateMock: jest.MockedFunction<
  (u: Any, opts?: TxOpts) => Promise<Any>
> = jest.fn();
export const userListMock: jest.MockedFunction<(args: Any) => Promise<Any>> =
  jest.fn();
export const userSearchMock: jest.MockedFunction<(args: Any) => Promise<Any>> =
  jest.fn();
export const userGetMock: jest.MockedFunction<(id: string) => Promise<Any>> =
  jest.fn();
export const userUpdateMock: jest.MockedFunction<
  (id: string, data: Any) => Promise<Any>
> = jest.fn();
export const userRemoveMock: jest.MockedFunction<
  (id: string) => Promise<boolean>
> = jest.fn();

export const authzCreateMock: jest.MockedFunction<
  (data: Any, opts?: TxOpts) => Promise<void>
> = jest.fn();

export const sendWelcomeEmailMock: jest.MockedFunction<
  (email: string, name: string) => Promise<void>
> = jest.fn();

export const genTokensMock: jest.MockedFunction<
  (u: Any) => { accessToken: string; refreshToken: string }
> = jest.fn();

const toPublicMock = jest.fn(async (u: Any, _opts?: Any) => ({
  ...u,
  role: 'utilisateur',
}));

const getAuthUserMock = jest.fn();

/* ── Hard mocks for external deps used by the controller ──────────────── */

// sequelize
jest.mock('../../config/db.js', () => ({
  __esModule: true,
  sequelize: {
    transaction: jest.fn(), // will be set per-test
  },
}));

// services used directly by controller (instances are created inside)
jest.mock('../../services/email.service.js', () => ({
  __esModule: true,
  EmailService: jest.fn().mockImplementation(() => ({
    sendWelcomeEmail: sendWelcomeEmailMock,
  })),
}));

jest.mock('../../services/auth.service.js', () => ({
  __esModule: true,
  AuthService: jest.fn().mockImplementation(() => ({
    generateTokens: genTokensMock,
  })),
}));

// config (only sendWelcomeEmail is used here)
jest.mock('../../config/env.js', () => ({
  __esModule: true,
  config: {
    sendWelcomeEmail: true,
  },
}));

// services injected by import (singletons / default obj)
jest.mock('../../services/user.service.js', () => ({
  __esModule: true,
  default: {
    create: (u: Any, opts?: TxOpts) => userCreateMock(u, opts),
    list: (args: Any) => userListMock(args),
    search: (args: Any) => userSearchMock(args),
    get: (id: string) => userGetMock(id),
    update: (id: string, data: Any) => userUpdateMock(id, data),
    remove: (id: string) => userRemoveMock(id),
  },
}));

jest.mock('../../services/authorization.service.js', () => ({
  __esModule: true,
  authorizationService: {
    create: (data: Any, opts?: TxOpts) => authzCreateMock(data, opts),
  },
}));

jest.mock('../../utils/to-public-user-with-role.js', () => ({
  __esModule: true,
  toPublicUserWithRole: (u: Any, opts?: Any) => toPublicMock(u, opts),
}));

jest.mock('../../middlewares/auth.middleware.js', () => ({
  __esModule: true,
  getAuthUser: (...args: Any[]) => getAuthUserMock(...args),
}));

/* ── Imports after mocks ──────────────────────────────────────────────── */
import { sequelize } from '../../config/db.js';
import { UserController } from '../../controllers/user.controller.js';

/* ── Local helpers ────────────────────────────────────────────────────── */
const mockReq = (over: Any = {}) =>
  ({
    params: {},
    query: {},
    body: {},
    ...over,
  }) as Any;

const mockRes = () => {
  const res: Any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  return res;
};

const next = jest.fn();

/* ── Shared data ──────────────────────────────────────────────────────── */
const baseUser = {
  userId: 'u-1',
  username: 'john',
  firstName: 'John',
  lastName: 'Smith',
  email: 'john@example.com',
  verified: false,
};

/* ── Tests ────────────────────────────────────────────────────────────── */
describe('UserController', () => {
  const controller = new UserController();

  beforeEach(() => {
    jest.clearAllMocks();

    // Make a fresh fake transaction each test
    const fakeTx = tx();

    // Tell our mocked sequelize.transaction to resolve to the fake tx
    (
      sequelize.transaction as unknown as jest.MockedFunction<
        () => Promise<Any>
      >
    ).mockResolvedValue(fakeTx);

    // Default service stubs
    userCreateMock.mockResolvedValue({ ...baseUser });
    authzCreateMock.mockResolvedValue(undefined);
    userListMock.mockResolvedValue({
      items: [{ ...baseUser }],
      totalItems: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    userSearchMock.mockResolvedValue({
      items: [{ ...baseUser }],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    userGetMock.mockResolvedValue({ ...baseUser });
    userUpdateMock.mockResolvedValue({ ...baseUser, firstName: 'Jane' });
    userRemoveMock.mockResolvedValue(true);

    genTokensMock.mockReturnValue({
      accessToken: 'access.token',
      refreshToken: 'refresh.token',
    });

    sendWelcomeEmailMock.mockResolvedValue(undefined);

    // Default public user mapper
    toPublicMock.mockImplementation(async (u: Any) => ({
      userId: u.userId,
      username: u.username,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      role: 'utilisateur',
    }));
  });

  describe('createAccount(role)', () => {
    it('creates user, role and sends welcome email; sets cookies for role=user', async () => {
      const res = mockRes();
      const req = mockReq({ body: { ...baseUser } });

      await controller.createAccount('user')(req, res, next);

      // transaction used
      expect(sequelize.transaction).toHaveBeenCalled();

      // Pull the exact transaction passed to services
      const t = (userCreateMock.mock.calls[0][1] as { transaction: Any })
        .transaction;

      // user + role created with the same transaction
      expect(userCreateMock).toHaveBeenCalledWith(req.body, { transaction: t });
      expect(authzCreateMock).toHaveBeenCalledWith(
        { userId: baseUser.userId, role: 'user' },
        { transaction: t }
      );

      // email sent (config.sendWelcomeEmail = true in mock)
      expect(sendWelcomeEmailMock).toHaveBeenCalledWith(
        baseUser.email,
        baseUser.firstName
      );

      // tokens + cookies for basic user
      expect(genTokensMock).toHaveBeenCalledWith(
        expect.objectContaining(baseUser)
      );
      expect(res.cookie).toHaveBeenCalledTimes(2);

      // committed & 201 response
      expect((t as Any).commit).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User created successfully',
        data: { user: expect.objectContaining({ role: 'utilisateur' }) },
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('does not set cookies when role is admin', async () => {
      const res = mockRes();
      const req = mockReq({ body: { ...baseUser } });

      await controller.createAccount('admin')(req, res, next);

      expect(res.cookie).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('rolls back and calls next(error) on failure', async () => {
      const res = mockRes();
      const req = mockReq({ body: { ...baseUser } });
      const t = tx();

      // Ensure this test uses our specific tx instance
      (
        sequelize.transaction as unknown as jest.MockedFunction<
          () => Promise<Any>
        >
      ).mockResolvedValueOnce(t);

      const boom = new Error('db fail');
      userCreateMock.mockRejectedValueOnce(boom);

      await controller.createAccount('user')(req, res, next);

      expect(t.rollback).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(boom);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('listUsers', () => {
    it('lists with filters and maps to public users', async () => {
      const res = mockRes();
      const req = mockReq({
        query: {
          page: '2',
          pageSize: '10',
          username: 'john',
          verified: '1',
          role: 'admin',
        },
      });

      await controller.listUsers(req, res, next);

      expect(userListMock).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        filters: expect.objectContaining({
          username: 'john',
          verified: true,
          role: 'admin',
        }),
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Users found successfully',
        data: expect.objectContaining({
          users: [expect.objectContaining({ role: 'utilisateur' })],
          total: 1,
          page: 1,
          pageSize: 20, // controller uses result.limit
          totalPages: 1,
        }),
      });
    });
  });

  describe('searchUsers', () => {
    it('normalizes pagination and refetches if requested page > totalPages', async () => {
      const res = mockRes();

      // First call: total=3, pageSize=2, asked page 3 > totalPages(2) => refetch
      userSearchMock
        .mockResolvedValueOnce({
          items: [{ ...baseUser }],
          total: 3,
          page: 3,
          limit: 2,
          totalPages: 2,
        })
        .mockResolvedValueOnce({
          items: [{ ...baseUser }],
          total: 3,
          page: 2,
          limit: 2,
          totalPages: 2,
        });

      const req = mockReq({
        query: { page: '3', pageSize: '2', q: 'john', verified: '0' },
      });

      await controller.searchUsers(req, res, next);

      // First call with page=3...
      expect(userSearchMock).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          page: 3,
          limit: 2,
          q: 'john',
          filters: expect.objectContaining({ verified: false }),
        })
      );

      // ...then refetch with page=2
      expect(userSearchMock).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          page: 2,
          limit: 2,
          q: 'john',
          filters: expect.objectContaining({ verified: false }),
        })
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Users found successfully',
        data: expect.objectContaining({
          total: 3,
          page: 2,
          pageSize: 2, // controller returns normalized pageSize
          totalPages: 2,
        }),
      });
    });
  });

  describe('getUserById', () => {
    it('returns 200 with public user when found', async () => {
      const res = mockRes();
      const req = mockReq({ params: { userId: 'u-1' } });

      await controller.getUserById(req, res, next);

      expect(userGetMock).toHaveBeenCalledWith('u-1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User found successfully',
        data: { user: expect.objectContaining({ userId: 'u-1' }) },
      });
    });

    it('calls next(NotFoundError) when missing', async () => {
      const res = mockRes();
      const req = mockReq({ params: { userId: 'nope' } });
      userGetMock.mockResolvedValueOnce(null);

      await controller.getUserById(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect((next.mock.calls[0][0] as Error).name).toBe('NotFoundError');
    });
  });

  describe('getCurrentUser', () => {
    it('returns 401 if not authenticated', async () => {
      const res = mockRes();
      const req = mockReq();
      getAuthUserMock.mockReturnValueOnce(null);

      await controller.getCurrentUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Not authenticated',
        data: null,
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 404 if auth ok but user not found', async () => {
      const res = mockRes();
      const req = mockReq();
      getAuthUserMock.mockReturnValueOnce({ userId: 'missing' });
      userGetMock.mockResolvedValueOnce(null);

      await controller.getCurrentUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User not found',
        data: null,
      });
    });

    it('returns 200 with current user', async () => {
      const res = mockRes();
      const req = mockReq();
      getAuthUserMock.mockReturnValueOnce({ userId: baseUser.userId });

      await controller.getCurrentUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Current user found',
        data: { user: expect.objectContaining({ userId: baseUser.userId }) },
      });
    });
  });

  describe('updateUser', () => {
    it('updates and returns the public user', async () => {
      const res = mockRes();
      const req = mockReq({
        params: { userId: baseUser.userId },
        body: { firstName: 'Jane' },
      });

      await controller.updateUser(req, res, next);

      expect(userUpdateMock).toHaveBeenCalledWith(baseUser.userId, {
        firstName: 'Jane',
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User updated successfully',
        data: { user: expect.objectContaining({ firstName: 'Jane' }) },
      });
    });
  });

  describe('changePassword', () => {
    it('errors when newPassword missing', async () => {
      const res = mockRes();
      const req = mockReq({ params: { userId: 'x' }, body: {} });

      await controller.changePassword(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect((next.mock.calls[0][0] as Error).name).toBe('BadRequestError');
    });

    it('updates via service and returns 200', async () => {
      const res = mockRes();
      const req = mockReq({
        params: { userId: 'x' },
        body: { newPassword: 'NewP@ssw0rd' },
      });

      await controller.changePassword(req, res, next);

      expect(userUpdateMock).toHaveBeenCalledWith('x', {
        password: 'NewP@ssw0rd' as any,
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Password changed successfully',
        data: { user: expect.any(Object) },
      });
    });
  });

  describe('deleteUser', () => {
    it('returns 200 when a row is deleted', async () => {
      const res = mockRes();
      const req = mockReq({ params: { userId: 'dead' } });
      userRemoveMock.mockResolvedValueOnce(true);

      await controller.deleteUser(req, res, next);

      expect(userRemoveMock).toHaveBeenCalledWith('dead');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User deleted',
        data: null,
      });
    });

    it('calls next(NotFoundError) when nothing to delete', async () => {
      const res = mockRes();
      const req = mockReq({ params: { userId: 'ghost' } });
      userRemoveMock.mockResolvedValueOnce(false);

      await controller.deleteUser(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect((next.mock.calls[0][0] as Error).name).toBe('NotFoundError');
    });
  });

  describe('verifyUser', () => {
    it('sets verified=true and returns 200', async () => {
      const res = mockRes();
      const req = mockReq({ params: { userId: 'u-1' } });

      await controller.verifyUser(req, res, next);

      expect(userUpdateMock).toHaveBeenCalledWith('u-1', {
        verified: true,
      } as any);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User verified',
        data: { user: expect.objectContaining({ userId: 'u-1' }) },
      });
    });
  });
});
