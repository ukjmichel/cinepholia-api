// src/__tests__/routes/user.route.spec.ts

import request from 'supertest';
import app from '../../app.js';
import { sequelize, syncDB } from '../../config/db.js';
import { UserModel } from '../../models/user.model.js';
import { AuthorizationModel } from '../../models/authorization.model.js';
import { UserTokenModel } from '../../models/user-token.model.js';

const userData = {
  username: 'johndoe',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@doe.com',
  password: 'Password123!',
};

describe('User E2E Routes with MySQL', () => {
  beforeAll(async () => {
    await syncDB();
  });

  afterEach(async () => {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await UserTokenModel.destroy({ where: {}, truncate: true, cascade: true });
    await AuthorizationModel.destroy({
      where: {},
      truncate: true,
      cascade: true,
    });
    await UserModel.destroy({ where: {}, truncate: true, cascade: true });
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('POST /users/register - should create a user', async () => {
    const res = await request(app)
      .post('/users/register')
      .send(userData)
      .expect(201);
    expect(res.body).toHaveProperty('message', 'User created successfully');
    expect(res.body.data).toHaveProperty('userId');
    expect(res.body.data.email).toBe(userData.email);
    expect(res.body.data.password).toBeUndefined();
  });

  it('POST /users/register - should fail if email already exists', async () => {
    await request(app).post('/users/register').send(userData).expect(201);
    const res = await request(app)
      .post('/users/register')
      .send(userData)
      .expect(409);
    expect(res.body.message).toMatch(/email.*already/i);
  });

  it('POST /users/register - should fail if required fields are missing', async () => {
    const res = await request(app).post('/users/register').send({}).expect(400);
    expect(res.body.message).toMatch(/validation/i);
  });

  it('GET /users - should list users', async () => {
    await UserModel.create(userData);
    const res = await request(app).get('/users').expect(200);
    expect(Array.isArray(res.body.data.users)).toBe(true);
    expect(res.body.data.users.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /users?email=doesnotexist@nope.com - should return empty users list', async () => {
    const res = await request(app)
      .get('/users?email=doesnotexist@nope.com')
      .expect(200);
    expect(Array.isArray(res.body.data.users)).toBe(true);
    expect(res.body.data.users.length).toBe(0);
  });

  it('GET /users/:userId - should get a user by ID', async () => {
    const user = await UserModel.create(userData);
    const res = await request(app).get(`/users/${user.userId}`).expect(200);
    expect(res.body.data.email).toBe(user.email);
  });

  it('GET /users/:userId - should return 404 if not found', async () => {
    // Génère un UUID inexistant (tu peux adapter si tu as un middleware qui vérifie le format)
    const fakeId = '49a51316-8b9a-4da2-bddb-3c7fda49a888';
    const res = await request(app).get(`/users/${fakeId}`).expect(404);
    expect(res.body.message).toMatch(/not found/i);
  });

  it('PUT /users/:userId - should update a user', async () => {
    const user = await UserModel.create(userData);
    const res = await request(app)
      .put(`/users/${user.userId}`)
      .send({ firstName: 'Jane' })
      .expect(200);
    expect(res.body.data.firstName).toBe('Jane');
  });

  it('PUT /users/:userId - should return 404 if not found', async () => {
    const fakeId = '27380a2d-b7e6-4da3-9e3b-cad2947e123a';
    const res = await request(app)
      .put(`/users/${fakeId}`)
      .send({ firstName: 'Jane' })
      .expect(404);
    expect(res.body.message).toMatch(/not found/i);
  });

  it('PATCH /users/:userId/password - should change password', async () => {
    const user = await UserModel.create(userData);
    const res = await request(app)
      .patch(`/users/${user.userId}/password`)
      .send({ newPassword: 'NewPass!2023' })
      .expect(200);
    expect(res.body.message).toMatch(/changed/i);
  });

  it('PATCH /users/:userId/password - should fail if password missing', async () => {
    const user = await UserModel.create(userData);
    const res = await request(app)
      .patch(`/users/${user.userId}/password`)
      .send({})
      .expect(400);
    expect(res.body.message).toMatch(/required|validation/i);
  });

  it('DELETE /users/:userId - should delete a user', async () => {
    const user = await UserModel.create(userData);
    const res = await request(app).delete(`/users/${user.userId}`).expect(200);
    expect(res.body.message).toMatch(/deleted/i);
  });

  it('DELETE /users/:userId - should return 404 if not found', async () => {
    const fakeId = '50949f93-7e33-49c3-97da-109054fa4a0b';
    const res = await request(app).delete(`/users/${fakeId}`).expect(404);
    expect(res.body.message).toMatch(/not found/i);
  });

  it('POST /users/validate-password - valid login', async () => {
    await request(app).post('/users/register').send(userData);
    const res = await request(app)
      .post('/users/validate-password')
      .send({ emailOrUsername: userData.email, password: userData.password })
      .expect(200);
    expect(res.body.message).toMatch(/validated/i);
  });

  it('POST /users/validate-password - invalid login', async () => {
    await request(app).post('/users/register').send(userData);
    const res = await request(app)
      .post('/users/validate-password')
      .send({ emailOrUsername: userData.email, password: 'WrongPassword' })
      .expect(401);
    expect(res.body.message).toMatch(/invalid|not found/i);
  });

  it('POST /users/validate-password - should fail if params missing', async () => {
    const res = await request(app)
      .post('/users/validate-password')
      .send({})
      .expect(400);
    expect(res.body.message).toMatch(/required|validation/i);
  });

  it('PATCH /users/:userId/verify - should verify user', async () => {
    const user = await UserModel.create(userData);
    const res = await request(app)
      .patch(`/users/${user.userId}/verify`)
      .expect(200);
    expect(res.body.data.verified).toBe(true);
  });

  it('PATCH /users/:userId/verify - should return 404 if user not found', async () => {
    const fakeId = 'b3aaf4c5-46c5-4899-8b44-bef408be253f';
    const res = await request(app).patch(`/users/${fakeId}/verify`).expect(404);
    expect(res.body.message).toMatch(/not found/i);
  });
});
