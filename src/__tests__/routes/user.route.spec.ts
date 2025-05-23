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
    // Recrée proprement toutes les tables avant la suite
    await syncDB();
  });

  afterEach(async () => {
    // Désactive les contraintes FK, vide toutes les tables liées et réactive FK
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
    // Ferme la connexion DB après tous les tests
    await sequelize.close();
  });

  it('POST /users - should create a user', async () => {
    const res = await request(app).post('/users').send(userData).expect(201);
    expect(res.body).toHaveProperty('message', 'User created successfully');
    expect(res.body.data).toHaveProperty('userId');
    expect(res.body.data.email).toBe(userData.email);
    expect(res.body.data.password).toBeUndefined();
  });

  it('GET /users - should list users', async () => {
    await UserModel.create(userData);
    const res = await request(app).get('/users').expect(200);
    expect(Array.isArray(res.body.data.users)).toBe(true);
    expect(res.body.data.users.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /users/:userId - should get a user by ID', async () => {
    const user = await UserModel.create(userData);
    const res = await request(app).get(`/users/${user.userId}`).expect(200);
    expect(res.body.data.email).toBe(user.email);
  });

  it('PUT /users/:userId - should update a user', async () => {
    const user = await UserModel.create(userData);
    const res = await request(app)
      .put(`/users/${user.userId}`)
      .send({ firstName: 'Jane' })
      .expect(200);
    expect(res.body.data.firstName).toBe('Jane');
  });

  it('PATCH /users/:userId/password - should change password', async () => {
    const user = await UserModel.create(userData);
    const res = await request(app)
      .patch(`/users/${user.userId}/password`)
      .send({ newPassword: 'NewPass!2023' })
      .expect(200);
    expect(res.body.message).toMatch(/changed/i);
  });

  it('DELETE /users/:userId - should delete a user', async () => {
    const user = await UserModel.create(userData);
    const res = await request(app).delete(`/users/${user.userId}`).expect(200);
    expect(res.body.message).toMatch(/deleted/i);
  });

  it('POST /users/validate-password - valid login', async () => {
    await request(app).post('/users').send(userData);
    const res = await request(app)
      .post('/users/validate-password')
      .send({ emailOrUsername: userData.email, password: userData.password })
      .expect(200);
    expect(res.body.message).toMatch(/validated/i);
  });

  it('POST /users/validate-password - invalid login', async () => {
    await request(app).post('/users').send(userData);
    const res = await request(app)
      .post('/users/validate-password')
      .send({ emailOrUsername: userData.email, password: 'WrongPassword' })
      .expect(401);
    expect(res.body.message).toMatch(/invalid/i);
  });
});
