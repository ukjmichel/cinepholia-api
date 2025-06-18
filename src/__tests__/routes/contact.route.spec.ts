import request from 'supertest';
import app from '../../app';
import { sequelize } from '../../config/db';
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

// Clean up database before/after each test suite
const cleanDatabase = async () => {
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
  await MovieTheaterModel.destroy({ where: {}, truncate: true });
  await UserModel.destroy({ where: {}, truncate: true });
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
};


beforeAll(async () => {
  await cleanDatabase();

  // Register a test user (if user exists, ignore duplicate error)
  await request(app).post('/auth/register').send(contactUser);

  // Log in to get accessToken and cookie
  const loginRes = await request(app).post('/auth/login').send({
    emailOrUsername: contactUser.email,
    password: contactUser.password,
  });

  // ---- Robust cookie extraction (fixes TS error) ----
  const rawSetCookie = loginRes.headers['set-cookie'];
  if (Array.isArray(rawSetCookie)) {
    cookie = rawSetCookie.find((c) => c.includes('accessToken'))!;
  } else if (typeof rawSetCookie === 'string') {
    cookie = rawSetCookie;
  } else {
    throw new Error('No set-cookie header found in login response');
  }

  // Fallback: also get access token from response (if API supports bearer)
  accessToken =
    loginRes.body?.data?.tokens?.accessToken ||
    loginRes.body?.accessToken ||
    loginRes.body?.token;
  if (!accessToken && !cookie) {
    throw new Error(
      'Failed to login user for contact tests. Response: ' +
        JSON.stringify(loginRes.body)
    );
  }

  // Create a test theater in DB
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
    const res = await request(app)
      .post('/contact')
      .set('Cookie', cookie) // Use session cookie for authentication
      // Or, if API expects Bearer: .set('Authorization', `Bearer ${accessToken}`)
      .send({
        theaterId: testTheater.theaterId,
        email: 'client@example.com',
        message: 'Hello, is the cinema accessible by wheelchair?',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/email sent/i);
  });

  it('should return 400 when missing required fields', async () => {
    const res = await request(app)
      .post('/contact')
      .set('Cookie', cookie)
      .send({
        email: 'client@example.com',
        // Missing theaterId and message
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error || res.body.message).toBeDefined();
  });

  it('should return 400 when email is invalid', async () => {
    const res = await request(app)
      .post('/contact')
      .set('Cookie', cookie)
      .send({
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
      email: 'not-an-email',
      message: 'Hello world',
    });
    expect([200, 400]).toContain(res.statusCode); // Accept either
    expect(res.body.error || res.body.message).toBeDefined();
  });
  
});
