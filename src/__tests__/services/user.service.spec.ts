// src/__tests__/services/user.service.spec.ts
import { jest } from '@jest/globals';
import { UserService } from '../../services/user.service.js';
import { UserModel } from '../../models/user.model.js';
import { AuthorizationModel } from '../../models/authorization.model.js';
import * as queries from '../../queries/user.queries.js';
import type { MockedFunction } from 'jest-mock';

describe('UserService', () => {
  const svc = new UserService();

  const baseUser = {
    userId: 'u-1',
    username: 'john',
    firstName: 'John',
    lastName: 'Smith',
    email: 'john@example.com',
    verified: false,
    createdAt: new Date('2025-09-25T12:00:00Z'),
    updatedAt: new Date('2025-09-25T12:00:00Z'),
    password: 'hashed', // should be omitted in DTO
  };

  // Sequelize-like instance: only .get() is used by your service
  const makeRow = (over: Partial<typeof baseUser> = {}): UserModel =>
    ({ get: () => ({ ...baseUser, ...over }) }) as unknown as UserModel;

  beforeEach(() => {
    jest.restoreAllMocks(); // clears + restores spyOn
  });

  describe('create', () => {
    it('creates a user and returns a safe DTO', async () => {
      const createSpy = jest
        .spyOn(UserModel, 'create')
        .mockResolvedValue(makeRow());

      const dto = await svc.create({
        username: baseUser.username,
        firstName: baseUser.firstName,
        lastName: baseUser.lastName,
        email: baseUser.email,
        password: 'pass',
      } as any);

      expect(createSpy).toHaveBeenCalled();
      expect(dto).toEqual({
        userId: baseUser.userId,
        username: baseUser.username,
        firstName: baseUser.firstName,
        lastName: baseUser.lastName,
        email: baseUser.email,
        verified: baseUser.verified,
        createdAt: baseUser.createdAt,
        updatedAt: baseUser.updatedAt,
      });
      // @ts-expect-error dto must not expose password
      expect(dto.password).toBeUndefined();
    });
  });

  describe('get', () => {
    it('returns DTO when found', async () => {
      const spy = jest
        .spyOn(UserModel, 'findByPk')
        .mockResolvedValue(makeRow());

      const dto = await svc.get(baseUser.userId);
      expect(spy).toHaveBeenCalledWith(baseUser.userId, expect.any(Object));
      expect(dto?.email).toBe(baseUser.email);
      // @ts-expect-error no password in DTO
      expect(dto?.password).toBeUndefined();
    });

    it('returns null when not found', async () => {
      jest.spyOn(UserModel, 'findByPk').mockResolvedValue(null);
      const dto = await svc.get('nope');
      expect(dto).toBeNull();
    });
  });

  describe('update', () => {
    it('updates fields and returns DTO', async () => {
      const save = jest.fn(async () => {}); // no Promise<never>
      const set = jest.fn();

      // Properly type the spy with MockedFunction
      const findByPkSpy = jest.spyOn(
        UserModel,
        'findByPk'
      ) as unknown as MockedFunction<typeof UserModel.findByPk>;

      findByPkSpy.mockResolvedValue({
        set,
        save,
        get: () => ({ ...baseUser, firstName: 'Jane' }),
      } as unknown as UserModel);

      const dto = await svc.update(baseUser.userId, {
        firstName: 'Jane',
      } as any);

      expect(set).toHaveBeenCalledWith({ firstName: 'Jane' });
      expect(save).toHaveBeenCalled();
      expect(dto?.firstName).toBe('Jane');
      // @ts-expect-error DTO must not expose password
      expect(dto?.password).toBeUndefined();
    });

    it('returns null when not found', async () => {
      jest.spyOn(UserModel, 'findByPk').mockResolvedValue(null);
      const dto = await svc.update('missing', { firstName: 'Jane' } as any);
      expect(dto).toBeNull();
    });
  });

  describe('remove', () => {
    it('returns true when a row is deleted', async () => {
      const spy = jest.spyOn(UserModel, 'destroy').mockResolvedValue(1 as any);
      const ok = await svc.remove(baseUser.userId);
      expect(spy).toHaveBeenCalledWith({
        where: { userId: baseUser.userId },
        transaction: undefined,
      });
      expect(ok).toBe(true);
    });

    it('returns false when no row is deleted', async () => {
      jest.spyOn(UserModel, 'destroy').mockResolvedValue(0 as any);
      const ok = await svc.remove(baseUser.userId);
      expect(ok).toBe(false);
    });
  });

  describe('list', () => {
    it('returns paginated response (empty clamped to totalPages=1)', async () => {
      const spy = jest.spyOn(UserModel, 'findAndCountAll').mockResolvedValue({
        rows: [] as unknown as UserModel[],
        count: 0,
      } as any);

      const res = await svc.list({ page: 1, limit: 20 });
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ offset: 0, limit: 20, distinct: true })
      );
      expect(res.items).toEqual([]);
      expect(res.page).toBe(1);
      expect(res.limit).toBe(20);
      expect(res.totalItems ?? (res as any).total).toBe(0);
      expect(res.totalPages).toBe(1);
    });

    it('does NOT add Authorization include when role filter is absent', async () => {
      const facSpy = jest.spyOn(
        UserModel,
        'findAndCountAll'
      ) as unknown as MockedFunction<typeof UserModel.findAndCountAll>;

      facSpy.mockResolvedValue({ rows: [makeRow()] as any, count: 1 } as any);

      const res = await svc.list({
        page: 1,
        limit: 10,
        filters: { verified: false },
      });

      const arg = facSpy.mock.calls[0][0] as any;
      expect(arg.include).toBeUndefined(); // no role => no join
      expect(arg.offset).toBe(0);
      expect(arg.limit).toBe(10);
      expect(res.totalPages).toBe(1);
    });

    it('adds Authorization include when role filter is present', async () => {
      const facSpy = jest.spyOn(
        UserModel,
        'findAndCountAll'
      ) as unknown as MockedFunction<typeof UserModel.findAndCountAll>;

      facSpy.mockResolvedValue({
        rows: [makeRow()] as any,
        count: 1,
      } as any);

      const res = await svc.list({
        page: 2,
        limit: 10,
        filters: { role: 'admin' } as any,
      });

      // Normalize include to an array (it can be undefined | Includeable | Includeable[])
      const arg = facSpy.mock.calls[0][0] as any;
      const includeArr = (
        Array.isArray(arg.include) ? arg.include : [arg.include]
      ).filter(Boolean);

      expect(includeArr.length).toBeGreaterThan(0);

      const inc = includeArr[0];
      expect(inc.model).toBe(AuthorizationModel);
      expect(inc.required).toBe(true);
      expect(inc.where).toEqual({ role: 'admin' });
      expect(inc.attributes).toEqual([]);

      expect(res.page).toBe(2);
      expect(res.limit).toBe(10);
      expect(res.totalItems ?? (res as any).total).toBe(1);
      expect(res.totalPages).toBe(1);
      expect(res.items[0].email).toBe(baseUser.email);
    });

  });

  describe('search', () => {
    it('uses buildUserWhere(filters, q) and paginates', async () => {
      const whereMock = { some: 'where' } as any;
      const whereSpy = jest
        .spyOn(queries, 'buildUserWhere')
        .mockReturnValue(whereMock);

      const facSpy = jest
        .spyOn(UserModel, 'findAndCountAll')
        .mockResolvedValue({
          rows: [
            makeRow(),
            makeRow({
              userId: 'u-2',
              username: 'sue',
              email: 'sue@example.com',
            }),
          ] as any,
          count: 2,
        } as any);

      const params = {
        page: 1,
        limit: 2,
        q: 'John',
        filters: { verified: false },
      };
      const res = await svc.search(params as any);

      expect(whereSpy).toHaveBeenCalledWith(params.filters, params.q);
      expect(facSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: whereMock,
          offset: 0,
          limit: 2,
          distinct: true,
        })
      );
      expect(res.items).toHaveLength(2);
      expect(res.totalItems ?? (res as any).total).toBe(2);
      expect(res.page).toBe(1);
      expect(res.limit).toBe(2);
      expect(res.totalPages).toBe(1);

      whereSpy.mockRestore();
    });
  });

  it('adds Authorization include in search when role filter is present', async () => {
    const facSpy = jest.spyOn(
      UserModel,
      'findAndCountAll'
    ) as unknown as MockedFunction<typeof UserModel.findAndCountAll>;

    facSpy.mockResolvedValue({ rows: [makeRow()] as any, count: 1 } as any);

    const res = await svc.search({
      page: 1,
      limit: 10,
      q: 'jo',
      filters: { role: 'admin' } as any,
    });

    const arg = facSpy.mock.calls[0][0] as any;
    const includeArr = (
      Array.isArray(arg.include) ? arg.include : [arg.include]
    ).filter(Boolean);
    expect(includeArr.length).toBeGreaterThan(0);

    const inc = includeArr[0];
    expect(inc.model).toBe(AuthorizationModel);
    expect(inc.required).toBe(true);
    expect(inc.where).toEqual({ role: 'admin' });
    expect(inc.attributes).toEqual([]);
    expect(res.totalPages).toBe(1);
  });

  it('does NOT add Authorization include in search when role filter is absent', async () => {
    const facSpy = jest.spyOn(
      UserModel,
      'findAndCountAll'
    ) as unknown as MockedFunction<typeof UserModel.findAndCountAll>;

    facSpy.mockResolvedValue({ rows: [makeRow()] as any, count: 1 } as any);

    await svc.search({
      page: 1,
      limit: 10,
      q: 'john',
      filters: { verified: false } as any,
    });

    const arg = facSpy.mock.calls[0][0] as any;
    expect(arg.include).toBeUndefined(); // role not provided => no join
  });

  it('paginate falls back to DEFAULT_LIMIT when limit is falsy (branch cover)', () => {
    // Force limit=0 to take the "DEFAULT_LIMIT" arm of (limit || DEFAULT_LIMIT)
    const result = (svc as any).paginate([makeRow()] as any, 25, 1, 0);
    // DEFAULT_LIMIT in your service is 20, so 25/20 => ceil = 2
    expect(result.totalPages).toBe(2);
    // sanity: items mapped to DTO
    expect(Array.isArray(result.items)).toBe(true);
  });



});
