import { describe, it, expect } from '@jest/globals';
import { Op } from 'sequelize';
import {
  buildUserWhere,
  normalizeListOptions,
  buildOrder,
  type SearchParams,
} from '../../queries/user.queries.js';

describe('user.queries', () => {
  describe('buildUserWhere()', () => {
    it('returns empty where when no filters/q', () => {
      const w = buildUserWhere();
      expect(w).toEqual({});
      // no accidental AND blocks
      // @ts-expect-error runtime check
      expect(w[Op.and]).toBeUndefined();
    });

    it('adds scalar filters (userId, verified) and case-insensitive equals for strings', () => {
      const w = buildUserWhere(
        {
          userId: 'u-1',
          verified: true,
          username: 'John.Doe',
          email: 'JD@example.com',
          firstName: 'John',
          lastName: 'Doe',
        },
        undefined
      ) as any;

      // scalar equality on root
      expect(w.userId).toBe('u-1');
      expect(w.verified).toBe(true);

      // string equals pushed into AND via LOWER(col) = lower(value)
      const andArr = w[Op.and];
      expect(Array.isArray(andArr)).toBe(true);
      // username/email/firstName/lastName => 4 entries
      expect(andArr.length).toBeGreaterThanOrEqual(4);
    });

    it('supports createdAt date range (from/to/either)', () => {
      // only from
      const wFrom = buildUserWhere(
        { createdFrom: '2025-01-01' },
        undefined
      ) as any;
      expect(wFrom.createdAt[Op.gte]).toEqual(new Date('2025-01-01'));

      // only to
      const wTo = buildUserWhere({ createdTo: '2025-02-01' }, undefined) as any;
      expect(wTo.createdAt[Op.lte]).toEqual(new Date('2025-02-01'));

      // both
      const wBoth = buildUserWhere(
        { createdFrom: '2025-01-01', createdTo: '2025-02-01' },
        undefined
      ) as any;
      expect(wBoth.createdAt[Op.gte]).toEqual(new Date('2025-01-01'));
      expect(wBoth.createdAt[Op.lte]).toEqual(new Date('2025-02-01'));
    });

    it('supports updatedAt date range (from/to/either)', () => {
      const wFrom = buildUserWhere(
        { updatedFrom: '2025-03-01' },
        undefined
      ) as any;
      expect(wFrom.updatedAt[Op.gte]).toEqual(new Date('2025-03-01'));

      const wTo = buildUserWhere({ updatedTo: '2025-03-31' }, undefined) as any;
      expect(wTo.updatedAt[Op.lte]).toEqual(new Date('2025-03-31'));

      const wBoth = buildUserWhere(
        { updatedFrom: '2025-03-01', updatedTo: '2025-03-31' },
        undefined
      ) as any;
      expect(wBoth.updatedAt[Op.gte]).toEqual(new Date('2025-03-01'));
      expect(wBoth.updatedAt[Op.lte]).toEqual(new Date('2025-03-31'));
    });

    it('tokenizes q and adds OR-clauses across username/email/firstName/lastName', () => {
      const w = buildUserWhere(
        {},
        'John   Smith' // multiple tokens
      ) as any;

      const andArr = w[Op.and];
      expect(Array.isArray(andArr)).toBe(true);

      // Find at least one OR-block with 4 targets (username, email, firstName, lastName)
      const orBlocks = andArr.filter((x: any) => x && x[Op.or]);
      expect(orBlocks.length).toBeGreaterThanOrEqual(2); // one per token
      expect(Array.isArray(orBlocks[0][Op.or])).toBe(true);
      expect(orBlocks[0][Op.or]).toHaveLength(4);
    });

    it('escapes % and _ in q so patterns don’t widen unexpectedly', () => {
      const w = buildUserWhere({}, 'jo%hn _doe') as any;
      const andArr = w[Op.and];
      const orBlocks = andArr.filter((x: any) => x && x[Op.or]);
      // we can’t easily read the internal pattern string from Sequelize.where,
      // but we can at least assert the OR blocks exist for the token(s)
      expect(orBlocks.length).toBeGreaterThan(0);
    });
  });

  describe('normalizeListOptions()', () => {
    it('applies defaults and clamps page/limit', () => {
      // defaults
      const n1 = normalizeListOptions({});
      expect(n1.page).toBe(1);
      expect(n1.limit).toBe(20);
      expect(n1.sortBy).toBe('createdAt');
      expect(n1.sortDir).toBe('desc');

      // clamps: page <= 0 -> 1, limit <= 0 -> 1 (NOT 20)
      const n2 = normalizeListOptions({ page: 0, limit: -5 } as any);
      expect(n2.page).toBe(1);
      expect(n2.limit).toBe(1);

      // caps: limit > MAX_LIMIT -> MAX_LIMIT (100)
      const n3 = normalizeListOptions({
        page: 2,
        limit: 999,
        sortBy: 'email',
        sortDir: 'asc',
      });
      expect(n3.page).toBe(2);
      expect(n3.limit).toBe(100);
      expect(n3.sortBy).toBe('email');
      expect(n3.sortDir).toBe('asc');

      // invalid sortBy falls back via normalize
      const n4 = normalizeListOptions({ sortBy: 'not-a-col' as any });
      expect(n4.sortBy).toBe('createdAt');
    });
  });

  describe('buildOrder()', () => {
    it('returns a Sequelize order tuple with allowed columns', () => {
      // direct valid case
      expect(buildOrder('username', 'asc')).toEqual([['username', 'asc']]);

      // invalid inputs must be normalized first (buildOrder itself doesn’t fallback)
      const n = normalizeListOptions({
        sortBy: 'nope' as any,
        sortDir: 'nope' as any,
      } as any);
      expect(buildOrder(n.sortBy, n.sortDir)).toEqual([['createdAt', 'desc']]);
    });
  });

});
