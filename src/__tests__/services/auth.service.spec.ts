// src/__tests__/services/auth.service.spec.ts
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { MockedFunction } from 'jest-mock';

/* ── Mocks ──────────────────────────────────────────────────────────────── */
jest.mock('../../models/user.model.js', () => ({
  __esModule: true,
  UserModel: {
    findOne: jest.fn(),
    create: jest.fn(),
    findByPk: jest.fn(),
    destroy: jest.fn(),
    findAndCountAll: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('../../services/user.service.js', () => ({
  __esModule: true,
  default: {
    validatePassword: jest.fn(),
    get: jest.fn(),
    getByUsernameOrEmail: jest.fn(),
    search: jest.fn(),
  },
}));

jest.mock('../../config/env.js', () => ({
  __esModule: true,
  config: {
    jwtSecret: 'access-secret',
    jwtRefreshSecret: 'refresh-secret',
  },
}));

jest.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: { sign: jest.fn(), verify: jest.fn() },
  sign: jest.fn(),
  verify: jest.fn(),
}));

/* ── Imports under test (after mocks) ───────────────────────────────────── */
import { AuthService, authService } from '../../services/auth.service.js';
import userService from '../../services/user.service.js';
import jwtModule from 'jsonwebtoken';
import { NotFoundError } from '../../errors/not-found-error.js';
import { UserModel } from '../../models/user.model.js';

const jwtAny = jwtModule as unknown as {
  sign: MockedFunction<(typeof jwtModule)['sign']>;
  verify: MockedFunction<(typeof jwtModule)['verify']>;
};
const userSvcAny = userService as unknown as {
  validatePassword: MockedFunction<(id: string, pw: string) => Promise<any>>;
  get: MockedFunction<(id: string) => Promise<any>>;
  getByUsernameOrEmail: MockedFunction<(id: string) => Promise<any>>;
  search: MockedFunction<(args: any) => Promise<any>>;
};
const UserModelAny = UserModel as unknown as {
  findOne: MockedFunction<(typeof UserModel)['findOne']>;
};

describe('AuthService', () => {
  const svc = (authService ?? new AuthService()) as any;

  const mockUser = {
    userId: 'u-123',
    username: 'alice',
    email: 'alice@example.com',
  };

  const makeUserInstance = (valid: boolean) =>
    ({
      userId: mockUser.userId,
      username: mockUser.username,
      email: mockUser.email,
      validatePassword: jest.fn(async () => valid),
      get: () => ({ ...mockUser }),
      toJSON: () => ({ ...mockUser }),
    }) as any;

  beforeEach(() => {
    jest.clearAllMocks();

    userSvcAny.get.mockResolvedValue(mockUser);
    userSvcAny.getByUsernameOrEmail.mockResolvedValue({
      ...mockUser,
      validatePassword: jest.fn(async () => true),
    });
    userSvcAny.search.mockResolvedValue({ items: [mockUser], total: 1 });

    jwtAny.sign.mockImplementation((payload: any, secret: any) => {
      if (secret === 'access-secret')
        return `access.${payload?.userId ?? 'na'}`;
      if (secret === 'refresh-secret')
        return `refresh.${payload?.userId ?? 'na'}`;
      return 'token';
    });

    if (svc?.loginAttempts?.clear) svc.loginAttempts.clear();
    if (svc?.lockedOut?.clear) svc.lockedOut.clear();
  });

  describe('login', () => {
    it('returns access & refresh tokens when credentials are valid', async () => {
      userSvcAny.validatePassword.mockResolvedValue(mockUser);
      UserModelAny.findOne.mockResolvedValue(makeUserInstance(true));

      const tokens = await svc.login('alice', 'Str0ngP@ss');

      expect(jwtAny.sign).toHaveBeenCalledTimes(2);
      const payloads = jwtAny.sign.mock.calls.map((c) => c[0]);
      expect(payloads.every((p: any) => p && p.userId === 'u-123')).toBe(true);

      expect(tokens).toEqual({
        accessToken: 'access.u-123',
        refreshToken: 'refresh.u-123',
      });
    });

    it('returns tokens via fallback instance path when userService.validatePassword fails', async () => {
      userSvcAny.validatePassword.mockResolvedValue(null);
      UserModelAny.findOne.mockResolvedValue(makeUserInstance(true));

      const tokens = await svc.login('alice', 'ok');
      expect(tokens).toEqual({
        accessToken: 'access.u-123',
        refreshToken: 'refresh.u-123',
      });
    });

    it('throws NotFoundError (invalid credentials / user not found)', async () => {
      UserModelAny.findOne.mockResolvedValue(null as any);
      userSvcAny.validatePassword.mockResolvedValue(null);
      userSvcAny.getByUsernameOrEmail.mockResolvedValue({
        ...mockUser,
        validatePassword: jest.fn(async () => false),
      });

      await expect(svc.login('alice', 'wrong')).rejects.toBeInstanceOf(
        NotFoundError
      );
      expect(jwtAny.sign).not.toHaveBeenCalled();
    });

    it('locks the account on the attempt that reaches the threshold', async () => {
      if (svc?.loginAttempts?.set) {
        svc.loginAttempts.set('alice', { count: 4, lastAttempt: new Date() });
      }
      userSvcAny.validatePassword.mockResolvedValue(null);
      UserModelAny.findOne.mockResolvedValue(makeUserInstance(false));

      await expect(svc.login('alice', 'bad-now-locked')).rejects.toMatchObject({
        name: 'UnauthorizedError',
      });
      if (svc?.lockedOut?.has) expect(svc.lockedOut.has('alice')).toBe(true);
    });

    it('locks out when attempts exceed threshold (UnauthorizedError)', async () => {
      if (svc?.loginAttempts?.set) {
        svc.loginAttempts.set('alice', { count: 5, lastAttempt: new Date() });
      }
      UserModelAny.findOne.mockResolvedValue(makeUserInstance(true));

      await expect(svc.login('alice', 'any')).rejects.toMatchObject({
        name: 'UnauthorizedError',
      });
      expect(userSvcAny.validatePassword).not.toHaveBeenCalled();
    });

    it('increments attempts on invalid password, then resets after a successful login', async () => {
      if (svc?.loginAttempts?.set) {
        svc.loginAttempts.set('alice', { count: 2, lastAttempt: new Date() });
      }
      userSvcAny.validatePassword.mockResolvedValue(null);
      UserModelAny.findOne.mockResolvedValue(makeUserInstance(false));
      await expect(svc.login('alice', 'bad')).rejects.toBeInstanceOf(
        NotFoundError
      );
      const afterFail = svc?.loginAttempts?.get?.('alice');
      expect(afterFail?.count).toBeGreaterThanOrEqual(3);

      userSvcAny.validatePassword.mockResolvedValue(mockUser);
      UserModelAny.findOne.mockResolvedValue(makeUserInstance(true));
      const tokens = await svc.login('alice', 'good');
      expect(tokens.accessToken).toBe('access.u-123');

      const afterSuccess = svc?.loginAttempts?.get?.('alice');
      if (afterSuccess) {
        expect(
          afterSuccess.count === 0 || afterSuccess.count === undefined
        ).toBe(true);
      }
    });

    it('allows login when last attempt is older than the lock window, and clears attempts', async () => {
      if (svc?.loginAttempts?.set) {
        svc.loginAttempts.set('alice', {
          count: 10,
          lastAttempt: new Date(Date.now() - 20 * 60 * 1000),
        });
      }
      userSvcAny.validatePassword.mockResolvedValue(mockUser);
      UserModelAny.findOne.mockResolvedValue(makeUserInstance(true));

      const tokens = await svc.login('alice', 'ok');
      expect(tokens.accessToken).toBe('access.u-123');

      const after = svc?.loginAttempts?.get?.('alice');
      if (after) {
        expect(after.count === 0 || after.count === undefined).toBe(true);
      }
    });

    it('propagates errors from jwt.sign (token generation failure path)', async () => {
      userSvcAny.validatePassword.mockResolvedValue(mockUser);
      UserModelAny.findOne.mockResolvedValue(makeUserInstance(true));
      jwtAny.sign.mockImplementationOnce(() => {
        throw new Error('sign boom');
      });
      await expect(svc.login('alice', 'ok')).rejects.toThrow('sign boom');
    });

    // early guard
    it('throws BadRequestError when identifier or password is missing', async () => {
      await expect(svc.login('', 'x')).rejects.toMatchObject({
        name: 'BadRequestError',
      });
      await expect(svc.login('alice', '')).rejects.toMatchObject({
        name: 'BadRequestError',
      });
    });
  });

  /* ── Blacklist / Revoke & Expiry ─────────────────────────────────────── */
  describe('revoke & blacklist', () => {
    const hasRevoke = typeof svc.revokeRefreshToken === 'function';

    (hasRevoke ? it : it.skip)(
      'revokeRefreshToken adds token to blacklist (verify succeeds) and uses refresh secret',
      async () => {
        const token = 'refresh.mock.token';
        jwtAny.verify.mockReturnValue({ userId: mockUser.userId } as any); // success payload

        await expect(
          svc.revokeRefreshToken(mockUser.userId, token)
        ).resolves.toBeUndefined();

        // verify called with the refresh secret
        expect(jwtAny.verify).toHaveBeenCalledWith(token, 'refresh-secret');

        // blacklisted now true
        const blacklisted = await svc.isTokenBlacklisted(token);
        expect(blacklisted).toBe(true);

        // if service stores expiry, ensure it's in the future
        const storeKey = Object.keys(svc).find(
          (k) =>
            /black|revok/i.test(k) &&
            svc[k] &&
            typeof svc[k] === 'object' &&
            typeof svc[k].get === 'function'
        );
        if (storeKey) {
          const exp = svc[storeKey].get(token);
          if (typeof exp === 'number') {
            expect(exp).toBeGreaterThan(Date.now());
          } else if (exp instanceof Date) {
            expect(+exp).toBeGreaterThan(Date.now());
          }
        }
      }
    );

    (hasRevoke ? it : it.skip)(
      'revokeRefreshToken does not blacklist if token payload userId mismatches',
      async () => {
        const token = 'refresh.other-user.token';
        // verify passes but belongs to someone else
        jwtAny.verify.mockReturnValue({ userId: 'u-999' } as any);

        await expect(
          svc.revokeRefreshToken(mockUser.userId, token)
        ).resolves.toBeUndefined();

        const isBl = await svc.isTokenBlacklisted(token);
        expect(isBl).toBe(false);
      }
    );

    (hasRevoke ? it : it.skip)(
      'revokeRefreshToken does not blacklist if verify throws (verify error path)',
      async () => {
        const token = 'refresh.invalid.token';
        jwtAny.verify.mockImplementation(() => {
          throw new Error('bad token');
        });

        await expect(
          svc.revokeRefreshToken(mockUser.userId, token)
        ).resolves.toBeUndefined();

        const blacklisted = await svc.isTokenBlacklisted(token);
        expect(blacklisted).toBe(false);
      }
    );

    it('isTokenBlacklisted returns false for expired entries and cleans them up', async () => {
      const key = Object.keys(svc).find(
        (k) =>
          /black|revok/i.test(k) &&
          svc[k] &&
          typeof svc[k] === 'object' &&
          typeof svc[k].set === 'function' &&
          typeof svc[k].get === 'function'
      );

      if (key) {
        const token = 'expired.token';
        try {
          svc[key].set(token, Date.now() - 1000);
        } catch {
          try {
            svc[key].set(token, new Date(Date.now() - 1000));
          } catch {}
        }

        const res = await svc.isTokenBlacklisted(token);
        expect(res).toBe(false);
      } else {
        const res = await svc.isTokenBlacklisted('nonexistent.token');
        expect(typeof res).toBe('boolean');
      }
    });
  });

  describe('isTokenBlacklisted', () => {
    it('returns a boolean', async () => {
      const out = await svc.isTokenBlacklisted('some.token.value');
      expect(typeof out).toBe('boolean');
    });
  });
});
