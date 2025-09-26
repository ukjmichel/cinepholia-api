// src/__tests__/routes/auth.routes.spec.ts
import express from 'express';
import request from 'supertest';

let calls: string[] = [];

// --- Mocks ---
jest.mock('../../validators/user.validator.js', () => ({
  validateCreateUser: (_req: any, _res: any, next: any) => {
    calls.push('validateCreateUser');
    next();
  },
}));

jest.mock('../../validators/auth.validator.js', () => ({
  validateLogin: (_req: any, _res: any, next: any) => {
    calls.push('validateLogin');
    next();
  },
}));

jest.mock('../../middlewares/auth.middleware.js', () => ({
  decodeJwtToken: (_req: any, _res: any, next: any) => {
    calls.push('decodeJwtToken');
    next();
  },
  requireAdmin: (_req: any, _res: any, next: any) => {
    calls.push('requireAdmin');
    next();
  },
}));

const mockLogin = jest.fn((_req, res) =>
  res.status(200).json({ ok: true, action: 'login' })
);
const mockRefresh = jest.fn((_req, res) =>
  res.status(200).json({ ok: true, action: 'refresh' })
);
const mockLogout = jest.fn((_req, res) =>
  res.status(200).json({ ok: true, action: 'logout' })
);

jest.mock('../../controllers/auth.controller.js', () => ({
  authController: {
    login: mockLogin,
    refreshToken: mockRefresh,
    logout: mockLogout,
  },
}));

// Track which roles were used to create account handlers
const createAccountCalls: string[] = [];

jest.mock('../../controllers/user.controller.js', () => ({
  userController: {
    createAccount: (role: 'user' | 'staff') => {
      createAccountCalls.push(role);
      return (_req: any, res: any) => {
        calls.push(`createAccount:handler:${role}`);
        return res.status(201).json({ ok: true, role });
      };
    },
  },
}));

// --- Import router after mocks (fixed path) ---
import authRouter from '../../routes/auth.route';

// --- Test helpers ---
function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/auth', authRouter);
  return app;
}

beforeEach(() => {
  calls = [];
  mockLogin.mockClear();
  mockRefresh.mockClear();
  mockLogout.mockClear();
  // Note: createAccountCalls is populated when routes are set up, not cleared between tests
});

describe('auth.routes', () => {
  test('POST /auth/register', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'a@b.c', password: 'pw' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ ok: true, role: 'user' });

    // Verify that createAccount was called with 'user' when setting up routes
    expect(createAccountCalls).toContain('user');

    expect(calls).toContain('validateCreateUser');
    expect(calls).toContain('createAccount:handler:user');
  });

  test('POST /auth/register-staff', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/auth/register-staff')
      .send({ email: 's@b.c', password: 'pw' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ ok: true, role: 'staff' });

    // Verify that createAccount was called with 'staff' when setting up routes
    expect(createAccountCalls).toContain('staff');

    // Check ordering
    const dIdx = calls.indexOf('decodeJwtToken');
    const aIdx = calls.indexOf('requireAdmin');
    const vIdx = calls.indexOf('validateCreateUser');
    const hIdx = calls.indexOf('createAccount:handler:staff');
    expect(dIdx).toBeLessThan(aIdx);
    expect(aIdx).toBeLessThan(vIdx);
    expect(vIdx).toBeLessThan(hIdx);
  });

  test('POST /auth/login', async () => {
    const app = makeApp();
    const res = await request(app).post('/auth/login').send({});
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, action: 'login' });
    expect(mockLogin).toHaveBeenCalled();
    expect(calls).toContain('validateLogin');
  });

  test('POST /auth/refresh', async () => {
    const app = makeApp();
    const res = await request(app).post('/auth/refresh').send({});
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, action: 'refresh' });
    expect(mockRefresh).toHaveBeenCalled();
  });

  test('POST /auth/logout', async () => {
    const app = makeApp();
    const res = await request(app).post('/auth/logout').send({});
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, action: 'logout' });
    expect(mockLogout).toHaveBeenCalled();
  });
});
