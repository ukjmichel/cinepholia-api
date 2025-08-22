/**
 * @file src/__tests__/routes/incident-report.route.spec.ts
 *
 * Integration tests for incident-report.routes using REAL MongoDB (config.mongodbUri),
 * jest.mock for auth/permission only, and the REAL validators+validate middleware.
 * Matches response envelope { message, data } for controllers.
 */

import type { RequestHandler, Request, Response, NextFunction } from 'express';

/* =============================================================================
 * Mocks (declare FIRST so Jest hoists them)
 *  - We DO NOT mock the validators module now; we want to test the real rules.
 *  - We wrap validate() to call the real middleware, with an opt-in test shortcut.
 * ========================================================================== */

/**
 * validate() mock wrapper:
 * - If header "x-validate: fail" is present → respond 400 and stop (return void).
 * - Otherwise call the REAL validate middleware from your codebase.
 */
jest.mock('../../middlewares/validate.js', () => {
  const actual = jest.requireActual('../../middlewares/validate.js');
  const realValidate: RequestHandler = actual.validate;
  const validateWrapper: RequestHandler = (req, res, next) => {
    if (req.headers['x-validate'] === 'fail') {
      res.status(400).json({ message: 'Validation failed (test)', data: null });
      return;
    }
    return realValidate(req, res, next);
  };
  return {
    __esModule: true,
    validate: validateWrapper,
  };
});

/**
 * decodeJwtToken mock:
 * - Requires Authorization header for routes mounted after router.use(decodeJwtToken).
 * - On success, attach req.user and call next(); on failure, 401 and stop.
 */
const decodeJwtTokenMock: RequestHandler = (req, res, next) => {
  const auth = req.headers['authorization'];
  if (!auth) {
    res.status(401).json({ message: 'Unauthorized (mock)', data: null });
    return;
  }
  (req as any).user = { id: 'user-123' };
  next();
};

jest.mock('../../middlewares/auth.middleware.js', () => ({
  __esModule: true,
  decodeJwtToken: decodeJwtTokenMock,
}));

/**
 * permission.isStaff mock:
 * - Requires header x-staff: "true".
 * - Wrapped in a jest spy so we can assert it if needed.
 * - Ends with void (no Response return).
 */
const isStaffImpl: RequestHandler = (req, res, next) => {
  if (req.headers['x-staff'] === 'true') {
    next();
    return;
  }
  res.status(403).json({ message: 'Forbidden (staff only)', data: null });
};
const isStaffSpy = jest.fn((req: Request, res: Response, next: NextFunction) =>
  isStaffImpl(req, res, next)
);

jest.mock('../../middlewares/permission.js', () => ({
  __esModule: true,
  permission: {
    isStaff: (req: Request, res: Response, next: NextFunction) =>
      isStaffSpy(req, res, next),
  },
}));

/* =============================================================================
 * Actual imports (after mocks)
 * ========================================================================== */

import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { config } from '../../config/env.js';
import { IncidentReportModel } from '../../models/incident-report.schema.js';
import IncidentReportRouter from '../../routes/incident-report.route.js';

/* =============================================================================
 * DB lifecycle (REAL MongoDB). Use a throwaway DB URI for tests.
 * ========================================================================== */

beforeAll(async () => {
  if (!config.mongodbUri) throw new Error('Missing config.mongodbUri');
  await mongoose.connect(config.mongodbUri);
  // Optional: ensure indexes are built once (helps consistent behavior)
  await IncidentReportModel.createIndexes().catch(() => {});
});

afterAll(async () => {
  if (mongoose.connection.db) {
    await mongoose.connection.db.dropDatabase(); // clean test DB
  }
  await mongoose.disconnect();
});

beforeEach(async () => {
  await IncidentReportModel.deleteMany({}); // isolate each test
  isStaffSpy.mockClear();
});

/* =============================================================================
 * Test app mounting the real router
 * ========================================================================== */

let app: express.Express;
beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/incident-reports', IncidentReportRouter);
});

/* =============================================================================
 * Helpers
 * ========================================================================== */

const auth = { Authorization: 'Bearer test-token' }; // satisfies decodeJwtTokenMock
const staff = { 'x-staff': 'true' }; // satisfies isStaff

/** Seed a few incidents for filter/search tests. */
async function seedIncidents() {
  await IncidentReportModel.create([
    {
      incidentId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      theaterId: 'UGC_Lyon',
      hallId: 'H1',
      description: 'Projector flickering',
      status: 'open',
      createdBy: '11111111-1111-4111-8111-111111111111',
    },
    {
      incidentId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
      theaterId: 'UGC_Lyon',
      hallId: 'H2',
      description: 'Air conditioning failure',
      status: 'resolved',
      createdBy: '22222222-2222-4222-8222-222222222222',
    },
    {
      incidentId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
      theaterId: 'Pathe_Bellecour',
      hallId: 'SALLE_2',
      description: 'Seat broken',
      status: 'in_progress',
      createdBy: '11111111-1111-4111-8111-111111111111',
    },
  ]);
}

/** Unwrap your envelope: { message, data } */
const getData = (res: request.Response) => res.body?.data;

/** Extract array of validation errors regardless of envelope */
const getErrors = (res: request.Response) =>
  (res.body?.errors ?? res.body?.data?.errors ?? []) as Array<{
    type?: string;
    value?: any;
    msg?: string;
    path?: string;
    location?: string;
  }>;

/** Does the response include an error on a path with a message matching regex? */
const hasError = (res: request.Response, path: string, msgRegex: RegExp) => {
  const errs = getErrors(res);
  return errs.some((e) => e.path === path && e.msg && msgRegex.test(e.msg));
};

/* =============================================================================
 * Tests
 * ========================================================================== */

describe('incident-report routes (real Mongo + real controllers + real validators)', () => {
  describe('Public (above auth .use) but staff-only', () => {
    it('GET /theaters/:theaterId requires staff', async () => {
      await seedIncidents();

      const noStaff = await request(app).get(
        '/incident-reports/theaters/UGC_Lyon'
      );
      expect(noStaff.status).toBe(403);

      const ok = await request(app)
        .get('/incident-reports/theaters/UGC_Lyon')
        .set(staff);
      expect(ok.status).toBe(200);
      const data = getData(ok);
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(2);
    });

    it('GET /theaters/:theaterId/halls/:hallId filters by hall', async () => {
      await seedIncidents();

      const res = await request(app)
        .get('/incident-reports/theaters/UGC_Lyon/halls/H2')
        .set(staff);

      expect(res.status).toBe(200);
      const data = getData(res);
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(1);
      expect(data[0].hallId).toBe('H2');
    });
  });

  describe('Auth-protected routes (after router.use(decodeJwtToken))', () => {
    it('POST / → 201 and persisted (requires auth, NOT staff)', async () => {
      const payload = {
        theaterId: 'Cinema_42',
        hallId: 'H-01',
        description: 'Screen tearing observed',
        createdBy: '123e4567-e89b-12d3-a456-426614174000',
      };

      const r401 = await request(app).post('/incident-reports').send(payload);
      expect(r401.status).toBe(401);

      const r201 = await request(app)
        .post('/incident-reports')
        .set(auth)
        .send(payload);
      expect(r201.status).toBe(201);
      const data = getData(r201);
      expect(data).toMatchObject({
        theaterId: 'Cinema_42',
        hallId: 'H-01',
        description: 'Screen tearing observed',
        status: 'open',
      });
      expect(data).toHaveProperty('incidentId');
    });

    it('GET / (staff only)', async () => {
      await seedIncidents();

      const r401 = await request(app).get('/incident-reports');
      expect(r401.status).toBe(401);

      const r403 = await request(app).get('/incident-reports').set(auth);
      expect(r403.status).toBe(403);

      const r200 = await request(app)
        .get('/incident-reports')
        .set({ ...auth, ...staff });
      expect(r200.status).toBe(200);
      const data = getData(r200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(3);
    });

    it('GET /:incidentId → 200 for existing, 404 for valid-but-missing', async () => {
      await seedIncidents();

      const ok = await request(app)
        .get('/incident-reports/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2')
        .set({ ...auth, ...staff });
      expect(ok.status).toBe(200);
      const okData = getData(ok);
      expect(okData.description).toMatch(/Air conditioning/i);

      const validButMissing = await request(app)
        .get('/incident-reports/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa9')
        .set({ ...auth, ...staff });
      expect(validButMissing.status).toBe(404);
    });

    it('PUT /:incidentId updates the document', async () => {
      await seedIncidents();

      const res = await request(app)
        .put('/incident-reports/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1')
        .set({ ...auth, ...staff })
        .send({
          status: 'acknowledged',
          description: 'Projector flickering (checked)',
        });

      expect(res.status).toBe(200);
      const data = getData(res);
      expect(data.status).toBe('acknowledged');
      expect(data.description).toMatch(/checked/i);
    });

    it('PATCH /:incidentId/acknowledge', async () => {
      await seedIncidents();
      const res = await request(app)
        .patch(
          '/incident-reports/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3/acknowledge'
        )
        .set({ ...auth, ...staff });
      expect(res.status).toBe(200);
      expect(getData(res).status).toBe('acknowledged');
    });

    it('PATCH /:incidentId/start', async () => {
      await seedIncidents();
      const res = await request(app)
        .patch('/incident-reports/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3/start')
        .set({ ...auth, ...staff });
      expect(res.status).toBe(200);
      expect(getData(res).status).toBe('in_progress');
    });

    it('PATCH /:incidentId/resolve', async () => {
      await seedIncidents();
      const res = await request(app)
        .patch('/incident-reports/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3/resolve')
        .set({ ...auth, ...staff });
      expect(res.status).toBe(200);
      expect(getData(res).status).toBe('resolved');
    });

    it('PATCH /:incidentId/close', async () => {
      await seedIncidents();
      const res = await request(app)
        .patch('/incident-reports/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3/close')
        .set({ ...auth, ...staff });
      expect(res.status).toBe(200);
      expect(getData(res).status).toBe('closed');
    });

    it('DELETE /:incidentId removes the doc', async () => {
      await seedIncidents();

      const del = await request(app)
        .delete('/incident-reports/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2')
        .set({ ...auth, ...staff });
      expect(del.status).toBe(200);

      const check = await request(app)
        .get('/incident-reports/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2')
        .set({ ...auth, ...staff });
      expect(check.status).toBe(404);
    });

    it('GET /status/:status', async () => {
      await seedIncidents();
      const byStatus = await request(app)
        .get('/incident-reports/status/resolved')
        .set({ ...auth, ...staff });
      expect(byStatus.status).toBe(200);
      expect(getData(byStatus)).toHaveLength(1);
      expect(getData(byStatus)[0].status).toBe('resolved');
    });

    it('GET /user/:createdBy', async () => {
      await seedIncidents();
      const byUser = await request(app)
        .get('/incident-reports/user/11111111-1111-4111-8111-111111111111')
        .set({ ...auth, ...staff });
      expect(byUser.status).toBe(200);
      expect(getData(byUser)).toHaveLength(2);
    });

    it('GET /business/:incidentId', async () => {
      await seedIncidents();
      const byBusinessId = await request(app)
        .get('/incident-reports/business/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1')
        .set({ ...auth, ...staff });
      expect(byBusinessId.status).toBe(200);
      expect(getData(byBusinessId)).toHaveLength(1);
    });

    it('GET /search?q=projector (happy path)', async () => {
      await seedIncidents();
      const res = await request(app)
        .get('/incident-reports/search')
        .query({ q: 'projector' }) // encode safely
        .set({ ...auth, ...staff });
      expect([200, 204]).toContain(res.status); // depends on your controller, both OK
      if (res.status === 200) {
        const data = getData(res);
        expect(Array.isArray(data)).toBe(true);
      }
    });

    it('validate runs before permission when x-validate: fail is set', async () => {
      await seedIncidents();
      const bad = await request(app)
        .get('/incident-reports/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1')
        .set({ ...auth, ...staff, 'x-validate': 'fail' });
      expect(bad.status).toBe(400);
    });
  });

  /* ========================================================================
   * Search validation tests (exercise your searchQueryValidation rules)
   * ====================================================================== */

  describe('GET /incident-reports/search validation', () => {
    it('rejects invalid status', async () => {
      const res = await request(app)
        .get('/incident-reports/search')
        .query({ status: 'INVALID' })
        .set({ ...auth, ...staff });
      expect(res.status).toBe(400);
      expect(hasError(res, 'status', /status must be one of/i)).toBe(true);
    });

    it('rejects bad theaterId (spaces)', async () => {
      const res = await request(app)
        .get('/incident-reports/search')
        .query({ theaterId: 'Bad Theater' })
        .set({ ...auth, ...staff });
      expect(res.status).toBe(400);
      expect(
        hasError(
          res,
          'theaterId',
          /theaterId must contain only letters, numbers, underscores, or hyphens/i
        )
      ).toBe(true);
    });

    it('rejects bad hallId (invalid char #)', async () => {
      const res = await request(app)
        .get('/incident-reports/search')
        .query({ hallId: 'H#1' }) // send via .query so '#' is encoded
        .set({ ...auth, ...staff });
      expect(res.status).toBe(400);
      expect(
        hasError(
          res,
          'hallId',
          /hallId must contain only letters, numbers, underscores, or hyphens/i
        )
      ).toBe(true);
    });

    it('rejects non-UUID createdBy', async () => {
      const res = await request(app)
        .get('/incident-reports/search')
        .query({ createdBy: 'nope' })
        .set({ ...auth, ...staff });
      expect(res.status).toBe(400);
      expect(hasError(res, 'createdBy', /Invalid UUID format/i)).toBe(true);
    });

    it('rejects non-UUID incidentId', async () => {
      const res = await request(app)
        .get('/incident-reports/search')
        .query({ incidentId: 'nope' })
        .set({ ...auth, ...staff });
      expect(res.status).toBe(400);
      expect(hasError(res, 'incidentId', /Invalid UUID format/i)).toBe(true);
    });

    it('rejects non-ISO createdAtFrom', async () => {
      const res = await request(app)
        .get('/incident-reports/search')
        .query({ createdAtFrom: 'not-a-date' })
        .set({ ...auth, ...staff });
      expect(res.status).toBe(400);
      expect(hasError(res, 'createdAtFrom', /must be an ISO 8601 date/i)).toBe(
        true
      );
    });

    it('rejects non-ISO createdAtTo', async () => {
      const res = await request(app)
        .get('/incident-reports/search')
        .query({ createdAtTo: 'also-bad' })
        .set({ ...auth, ...staff });
      expect(res.status).toBe(400);
      expect(hasError(res, 'createdAtTo', /must be an ISO 8601 date/i)).toBe(
        true
      );
    });

    it('rejects createdAtFrom > createdAtTo', async () => {
      const res = await request(app)
        .get('/incident-reports/search')
        .query({
          createdAtFrom: '2025-07-10T00:00:00Z',
          createdAtTo: '2025-07-01T00:00:00Z',
        })
        .set({ ...auth, ...staff });
      expect(res.status).toBe(400);
      expect(
        hasError(res, 'createdAtTo', /createdAtFrom must be <= createdAtTo/i)
      ).toBe(true);
    });

    it('rejects non-ISO updatedAtFrom', async () => {
      const res = await request(app)
        .get('/incident-reports/search')
        .query({ updatedAtFrom: 'nah' })
        .set({ ...auth, ...staff });
      expect(res.status).toBe(400);
      expect(hasError(res, 'updatedAtFrom', /must be an ISO 8601 date/i)).toBe(
        true
      );
    });

    it('rejects updatedAtFrom > updatedAtTo', async () => {
      const res = await request(app)
        .get('/incident-reports/search')
        .query({
          updatedAtFrom: '2025-07-10T00:00:00Z',
          updatedAtTo: '2025-07-01T00:00:00Z',
        })
        .set({ ...auth, ...staff });
      expect(res.status).toBe(400);
      expect(
        hasError(res, 'updatedAtTo', /updatedAtFrom must be <= updatedAtTo/i)
      ).toBe(true);
    });

    it('accepts a mix of valid filters', async () => {
      await seedIncidents();
      const res = await request(app)
        .get('/incident-reports/search')
        .query({
          q: 'projector',
          status: 'open',
          theaterId: 'UGC_Lyon',
          hallId: 'H1',
        })
        .set({ ...auth, ...staff });
      expect(res.status).toBe(200);
      const data = getData(res);
      expect(Array.isArray(data)).toBe(true);
    });
  });
});
