// tests/auth-middleware.test.ts
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Module under test
import {
  decodeJwtToken,
  requireAdmin,
  requireStaffOrAdmin,
  requireSelfOrAdmin,
  getJwtPayload,
  getAuthUser,
  getUserRole,
  JwtPayload,
} from '../../middlewares/auth.middleware';

// Dependencies to mock (keep real types, mock implementations)
import { UnauthorizedError } from '../../errors/unauthorized-error.js';
import { NotFoundError } from '../../errors/not-found-error.js';
import { config } from '../../config/env.js';
import userService from '../../services/user.service.js';
import { authorizationService } from '../../services/authorization.service.js';
import { authService } from '../../services/auth.service.js';

// --- Jest Mocks (only app deps, not jsonwebtoken) ---
jest.mock('../../config/env.js', () => ({
  config: { jwtSecret: 'test-secret' },
}));
jest.mock('../../services/user.service.js', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));
jest.mock('../../services/authorization.service.js', () => ({
  authorizationService: { get: jest.fn() },
}));
jest.mock('../../services/auth.service.js', () => ({
  authService: { isTokenBlacklisted: jest.fn() },
}));

const mockedUserService = userService as unknown as {
  get: jest.MockedFunction<(id: any) => Promise<any>>;
};
const mockedAuthorizationService = authorizationService as unknown as {
  get: jest.MockedFunction<(id: any) => Promise<any>>;
};
const mockedAuthService = authService as unknown as {
  isTokenBlacklisted: jest.MockedFunction<(t: string) => Promise<boolean>>;
};

// We'll spy on jwt.verify so we preserve its signature for TS
let verifySpy: jest.SpyInstance<any, Parameters<typeof jwt.verify>>;

// --- Helpers ---
function mockReq(init?: Partial<Request>): Request {
  return {
    headers: {},
    cookies: {},
    params: {},
    ...init,
  } as unknown as Request;
}

function mockRes(): Response {
  const res: Partial<Response> = {};
  (res as any).status = jest.fn().mockImplementation((code: number) => {
    (res as any).statusCode = code;
    return res;
  });
  (res as any).json = jest.fn().mockImplementation((body: any) => body);
  return res as Response;
}

function mockNext() {
  return jest.fn() as jest.MockedFunction<NextFunction>;
}

beforeEach(() => {
  jest.clearAllMocks();
  if (verifySpy) verifySpy.mockRestore();
  verifySpy = jest.spyOn(jwt, 'verify');
  verifySpy.mockReset();
});

describe('decodeJwtToken', () => {
  const token = 'abc.def.ghi';

  test('calls next(UnauthorizedError) when no token present', async () => {
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();

    await decodeJwtToken(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(UnauthorizedError);
    expect((err as any).message).toMatch(/missing access token/i);
  });

  test('extracts token from Authorization header if provided', async () => {
    const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
    const res = mockRes();
    const next = mockNext();

    mockedAuthService.isTokenBlacklisted.mockResolvedValue(false);
    verifySpy.mockReturnValue({ userId: 'u1' } as any);
    mockedUserService.get.mockResolvedValue({ userId: 'u1', email: 'a@b.c' });
    mockedAuthorizationService.get.mockResolvedValue({
      userId: 'u1',
      role: 'user',
    });

    await decodeJwtToken(req, res, next);

    expect(mockedAuthService.isTokenBlacklisted).toHaveBeenCalledWith(token);
    expect(verifySpy).toHaveBeenCalledWith(token, (config as any).jwtSecret);
    // middleware should attach payload, user, role
    expect(getJwtPayload(req)).toEqual({ userId: 'u1' });
    expect(getAuthUser(req)).toEqual({ userId: 'u1', email: 'a@b.c' });
    expect(getUserRole(req)).toBe('user');
    // success continues
    expect(next).toHaveBeenCalledWith();
  });

  test('uses cookie accessToken when available', async () => {
    const req = mockReq({ cookies: { accessToken: token } });
    const res = mockRes();
    const next = mockNext();

    mockedAuthService.isTokenBlacklisted.mockResolvedValue(false);
    verifySpy.mockReturnValue({ userId: 'cookieUser' } as any);
    mockedUserService.get.mockResolvedValue({ userId: 'cookieUser' });
    mockedAuthorizationService.get.mockResolvedValue({
      userId: 'cookieUser',
      role: 'admin',
    });

    await decodeJwtToken(req, res, next);
    expect(getJwtPayload(req)).toEqual({ userId: 'cookieUser' });
    expect(getUserRole(req)).toBe('admin');
    expect(next).toHaveBeenCalledWith();
  });

  test('rejects when token is blacklisted', async () => {
    const req = mockReq({ cookies: { accessToken: token } });
    const res = mockRes();
    const next = mockNext();

    mockedAuthService.isTokenBlacklisted.mockResolvedValue(true);

    await decodeJwtToken(req, res, next);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(UnauthorizedError);
    expect((err as any).message).toMatch(/revoked|blacklisted/i);
  });

  test('maps jwt verification errors to UnauthorizedError', async () => {
    const req = mockReq({ cookies: { accessToken: token } });
    const res = mockRes();
    const next = mockNext();

    mockedAuthService.isTokenBlacklisted.mockResolvedValue(false);
    const jwtErr: any = new Error('invalid signature');
    jwtErr.name = 'JsonWebTokenError';
    verifySpy.mockImplementation(() => {
      throw jwtErr;
    });

    await decodeJwtToken(req, res, next);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(UnauthorizedError);
    expect((err as any).message).toMatch(/invalid|expired/i);
  });

  test('when user not found -> NotFoundError', async () => {
    const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
    const res = mockRes();
    const next = mockNext();

    mockedAuthService.isTokenBlacklisted.mockResolvedValue(false);
    verifySpy.mockReturnValue({ userId: 'ghost' } as any);
    mockedUserService.get.mockResolvedValue(null);

    await decodeJwtToken(req, res, next);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(NotFoundError);
    expect((err as any).message).toMatch(/user not found/i);
  });

  test('sets user and role; default role "user" when auth record missing', async () => {
    const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
    const res = mockRes();
    const next = mockNext();

    mockedAuthService.isTokenBlacklisted.mockResolvedValue(false);
    verifySpy.mockReturnValue({ userId: 'u2' } as any);
    mockedUserService.get.mockResolvedValue({ userId: 'u2' });
    mockedAuthorizationService.get.mockResolvedValue(undefined as any);

    await decodeJwtToken(req, res, next);
    expect(getAuthUser(req)).toEqual({ userId: 'u2' });
    expect(getUserRole(req)).toBe('user');
    expect(next).toHaveBeenCalledWith();
  });
});

describe('requireAdmin', () => {
  test('forbids non-admin', () => {
    const req = mockReq() as any;
    (req as any).userRole = 'user';
    const res = mockRes();
    const next = mockNext();

    requireAdmin(req, res, next);
    expect(res.status as any).toHaveBeenCalledWith(403);
    expect(res.json as any).toHaveBeenCalledWith({
      message: 'Forbidden: admin only',
      data: null,
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('allows admin', () => {
    const req = mockReq() as any;
    (req as any).userRole = 'admin';
    const res = mockRes();
    const next = mockNext();

    requireAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('requireStaffOrAdmin', () => {
  test('forbids regular user', () => {
    const req = mockReq() as any;
    (req as any).userRole = 'user';
    const res = mockRes();
    const next = mockNext();

    requireStaffOrAdmin(req, res, next);
    expect(res.status as any).toHaveBeenCalledWith(403);
    expect(res.json as any).toHaveBeenCalledWith({
      message: 'Forbidden: staff or admin required',
      data: null,
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('allows staff', () => {
    const req = mockReq() as any;
    (req as any).userRole = 'staff';
    const res = mockRes();
    const next = mockNext();

    requireStaffOrAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('allows admin', () => {
    const req = mockReq() as any;
    (req as any).userRole = 'admin';
    const res = mockRes();
    const next = mockNext();

    requireStaffOrAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('requireSelfOrAdmin', () => {
  test('allows admin regardless of params', () => {
    const req = mockReq({ params: { userId: 'abc' } }) as any;
    (req as any).userRole = 'admin';
    (req as any).user = { userId: 'someone' };
    const res = mockRes();
    const next = mockNext();

    requireSelfOrAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('allows when acting on own account (user in bag)', () => {
    const req = mockReq({ params: { userId: 'u123' } }) as any;
    (req as any).userRole = 'user';
    (req as any).user = { userId: 'u123' };
    const res = mockRes();
    const next = mockNext();

    requireSelfOrAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('allows when acting on own account (payload only)', () => {
    const req = mockReq({ params: { userId: 'u999' } }) as any;
    (req as any).userRole = 'user';
    (req as any).userJwtPayload = { userId: 'u999' };
    const res = mockRes();
    const next = mockNext();

    requireSelfOrAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('forbids when acting on different account', () => {
    const req = mockReq({ params: { userId: 'target' } }) as any;
    (req as any).userRole = 'user';
    (req as any).user = { userId: 'self' };
    const res = mockRes();
    const next = mockNext();

    requireSelfOrAdmin(req, res, next);
    expect(res.status as any).toHaveBeenCalledWith(403);
    expect(res.json as any).toHaveBeenCalledWith({
      message: 'Forbidden: you can only act on your own account',
      data: null,
    });
    expect(next).not.toHaveBeenCalled();
  });
});
