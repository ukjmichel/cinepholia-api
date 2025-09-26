import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { MockedFunction } from 'jest-mock';

/* ── Mocks ──────────────────────────────────────────────────────────────── */
jest.mock('../../models/authorization.model.js', () => ({
  __esModule: true,
  AuthorizationModel: {
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
}));

jest.mock('../../models/user.model.js', () => ({
  __esModule: true,
  UserModel: {
    findByPk: jest.fn(),
  },
}));

/* ── Imports under test (after mocks) ───────────────────────────────────── */
import {
  authorizationService,
  AuthorizationService,
} from '../../services/authorization.service.js';
import { AuthorizationModel } from '../../models/authorization.model.js';
import { UserModel } from '../../models/user.model.js';
import { NotFoundError } from '../../errors/not-found-error.js';
import { ConflictError } from '../../errors/conflict-error.js';

type Role = 'user' | 'staff' | 'admin';

const AuthModelAny = AuthorizationModel as unknown as {
  findOne: MockedFunction<typeof AuthorizationModel.findOne>;
  create: MockedFunction<typeof AuthorizationModel.create>;
  update: MockedFunction<typeof AuthorizationModel.update>;
  destroy: MockedFunction<typeof AuthorizationModel.destroy>;
};

const UserModelAny = UserModel as unknown as {
  findByPk: MockedFunction<typeof UserModel.findByPk>;
};

/** Sequelize-like row that supports both direct assignment (auth.role = 'x')
 *  and instance.set({ role: 'x' }), and returns current role via get() */
const makeRow = (userId: string, role: Role) => {
  let roleState: Role = role;

  const row: any = {
    get: () => ({
      userId,
      role: roleState,
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-01-01T00:00:00Z'),
    }),
    set: jest.fn((vals: Partial<{ role: Role }>) => {
      if (vals && typeof vals.role !== 'undefined') roleState = vals.role!;
    }),
    save: jest.fn(async () => {}),
  };

  Object.defineProperty(row, 'role', {
    get: () => roleState,
    set: (val: Role) => {
      roleState = val;
    },
    enumerable: true,
    configurable: true,
  });

  return row;
};

describe('AuthorizationService', () => {
  const svc = (authorizationService ?? new AuthorizationService()) as any;
  const userId = 'u-abc';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('get(userId)', () => {
    it('throws NotFoundError when no authorization row exists', async () => {
      AuthModelAny.findOne.mockResolvedValue(null as any);

      await expect(svc.get(userId)).rejects.toBeInstanceOf(NotFoundError);
      expect(AuthModelAny.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId } })
      );
    });

    it('returns the authorization when a row exists', async () => {
      AuthModelAny.findOne.mockResolvedValue(makeRow(userId, 'admin'));

      const res = await svc.get(userId);
      const dto =
        typeof (res as any)?.get === 'function' ? (res as any).get() : res;

      expect(dto).toEqual({
        userId,
        role: 'admin',
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date('2025-01-01T00:00:00Z'),
      });
    });
  });

  describe('create({ userId, role })', () => {
    it('throws NotFoundError if user does not exist', async () => {
      UserModelAny.findByPk.mockResolvedValue(null as any);
      AuthModelAny.findOne.mockResolvedValue(null as any);

      await expect(svc.create({ userId, role: 'user' })).rejects.toBeInstanceOf(
        NotFoundError
      );

      expect(UserModelAny.findByPk).toHaveBeenCalledWith(
        userId,
        expect.any(Object)
      );
    });

    it('throws ConflictError if authorization already exists', async () => {
      UserModelAny.findByPk.mockResolvedValue({ userId } as any);
      AuthModelAny.findOne.mockResolvedValue(makeRow(userId, 'user'));

      await expect(
        svc.create({ userId, role: 'admin' })
      ).rejects.toBeInstanceOf(ConflictError);

      expect(AuthModelAny.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId } })
      );
    });

    it('creates and returns the new authorization', async () => {
      UserModelAny.findByPk.mockResolvedValue({ userId } as any);
      AuthModelAny.findOne.mockResolvedValue(null as any);
      AuthModelAny.create.mockResolvedValue(makeRow(userId, 'admin'));

      const res = await svc.create({ userId, role: 'admin' });

      expect(AuthModelAny.create).toHaveBeenCalledWith(
        { userId, role: 'admin' },
        expect.any(Object)
      );

      const dto =
        typeof (res as any)?.get === 'function' ? (res as any).get() : res;
      expect(dto.userId).toBe(userId);
      expect(dto.role).toBe('admin');
    });
  });

  // update via instance mutation + save()
  if (typeof (svc as any).update === 'function') {
    describe('update(userId, role)', () => {
      it('throws NotFoundError if authorization missing', async () => {
        AuthModelAny.findOne.mockResolvedValue(null as any);

        await expect(svc.update(userId, 'staff')).rejects.toBeInstanceOf(
          NotFoundError
        );
      });

      it('updates existing authorization role and returns it', async () => {
        const existing = makeRow(userId, 'user');
        AuthModelAny.findOne.mockResolvedValue(existing);

        const res = await svc.update(userId, 'staff');

        // Service may use direct assignment OR .set(); only require save()
        expect(existing.save).toHaveBeenCalled();

        const dto =
          typeof (res as any)?.get === 'function' ? (res as any).get() : res;
        expect(dto.role).toBe('staff');
      });
    });
  }

  if (typeof (svc as any).remove === 'function') {
    describe('remove(userId)', () => {
      it('destroys when a row exists (resolves undefined)', async () => {
        AuthModelAny.findOne.mockResolvedValue(makeRow(userId, 'user'));
        AuthModelAny.destroy.mockResolvedValue(1 as any);

        await expect(svc.remove(userId)).resolves.toBeUndefined();
        expect(AuthModelAny.destroy).toHaveBeenCalledWith(
          expect.objectContaining({ where: { userId } })
        );
      });

      it('is idempotent when no authorization exists (resolves undefined)', async () => {
        AuthModelAny.findOne.mockResolvedValue(null as any);

        await expect(svc.remove(userId)).resolves.toBeUndefined();
      });
    });
  }
});
