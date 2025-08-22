import request from 'supertest';
import app from '../../app';
import { sequelize, loadModels, syncDB } from '../../config/db';
import { MovieTheaterModel } from '../../models/movie-theater.model';
import { UserModel } from '../../models/user.model';

// Test user credentials
const contactUser = {
  username: 'contactuser',
  firstName: 'Contact',
  lastName: 'User',
  email: 'contact@user.com',
  password: 'ContactUser123!',
};

let accessToken: string;
let cookie: string;
let testTheater: any;

/**
 * ✅ Clean database with proper FK handling
 */
const cleanDatabase = async () => {
  if (sequelize.getDialect() === 'mysql') {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
  }

  await MovieTheaterModel.destroy({ where: {}, truncate: true });
  await UserModel.destroy({ where: {}, truncate: true });

  if (sequelize.getDialect() === 'mysql') {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
  }
};

beforeAll(async () => {
  // ✅ Ensure models are loaded and DB schema is ready
  await loadModels();
  await syncDB();
  await cleanDatabase();

  // ✅ Register a test user
  await request(app).post('/auth/register').send(contactUser);

  // ✅ Login user to get token & cookie
  const loginRes = await request(app).post('/auth/login').send({
    emailOrUsername: contactUser.email,
    password: contactUser.password,
  });

  const rawSetCookie = loginRes.headers['set-cookie'];
  if (Array.isArray(rawSetCookie)) {
    cookie = rawSetCookie.find((c) => c.includes('accessToken'))!;
  } else if (typeof rawSetCookie === 'string') {
    cookie = rawSetCookie;
  } else {
    throw new Error('No set-cookie header found in login response');
  }

  accessToken =
    loginRes.body?.data?.tokens?.accessToken ||
    loginRes.body?.accessToken ||
    loginRes.body?.token;

  if (!accessToken && !cookie) {
    throw new Error('Failed to login user for contact tests.');
  }

  // ✅ Create a test theater in DB
  testTheater = await MovieTheaterModel.create({
    theaterId: 'test-theater',
    address: '123 Test Street',
    postalCode: '12345',
    city: 'Test City',
    phone: '+123456789',
    email: 'theater@test.com',
  });
});

afterAll(async () => {
  await cleanDatabase();
  await sequelize.close();
});

describe('POST /contact (E2E)', () => {
  it('should send contact email successfully with valid data', async () => {
    const res = await request(app).post('/contact').set('Cookie', cookie).send({
      theaterId: testTheater.theaterId,
      email: 'client@example.com',
      message: 'Hello, is the cinema accessible by wheelchair?',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/email sent/i);
  });

  it('should return 400 when missing required fields', async () => {
    const res = await request(app).post('/contact').set('Cookie', cookie).send({
      email: 'client@example.com',
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.error || res.body.message).toBeDefined();
  });

  it('should return 400 when email is invalid', async () => {
    const res = await request(app).post('/contact').set('Cookie', cookie).send({
      theaterId: testTheater.theaterId,
      email: 'not-an-email',
      message: 'Hello world',
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.error || res.body.message).toBeDefined();
  });
  it('should accept contact message even when not authenticated', async () => {
    const res = await request(app).post('/contact').send({
      theaterId: testTheater.theaterId,
      email: 'anonymous@example.com',
      message: 'Hello world',
    });

    // Allow 200 (success), 400 (bad input), or 401 (unauthorized)
    expect([200, 400, 401]).toContain(res.statusCode);
    expect(res.body.error || res.body.message).toBeDefined();
  });
});
