import request from 'supertest';
import app from '../../app.js';
import { sequelize, syncDB } from '../../config/db.js';
import { MovieModel } from '../../models/movie.model.js';
import { UserModel } from '../../models/user.model.js';
import { AuthorizationModel } from '../../models/authorization.model.js';
import { AuthService } from '../../services/auth.service.js';

const staffUserData = {
  username: 'staffuser',
  firstName: 'Staff',
  lastName: 'User',
  email: 'staff@movie.com',
  password: 'StaffPass123!',
};

const testMovie = {
  title: 'Inception',
  description: 'Dreams within dreams',
  ageRating: 'PG-13',
  genre: 'Sci-Fi',
  releaseDate: new Date('2010-07-16'), // <-- Date object
  director: 'Christopher Nolan',
  durationMinutes: 148,
  posterUrl: 'https://example.com/inception.jpg',
  recommended: true,
};

const altMovie = {
  ...testMovie,
  title: 'Interstellar',
  genre: 'Adventure',
  director: 'Christopher Nolan',
};

const cleanDatabase = async () => {
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
  await AuthorizationModel.destroy({
    where: {},
    truncate: true,
    cascade: true,
  });
  await UserModel.destroy({ where: {}, truncate: true, cascade: true });
  await MovieModel.destroy({ where: {}, truncate: true, cascade: true });
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
};

describe('Movie E2E Routes', () => {
  let staffToken: string;
  let staffUserId: string;

  beforeAll(async () => {
    await syncDB();
  });

  beforeEach(async () => {
    await cleanDatabase();

    // Create staff user and get userId
    const staffUser = await UserModel.create(staffUserData);
    staffUserId = (staffUser as any).userId;

    await AuthorizationModel.create({
      userId: staffUserId,
      role: 'employé',
    });

    const authService = new AuthService();
    const tokenData = authService.generateTokens({
      userId: staffUserId,
      username: staffUserData.username,
      email: staffUserData.email,
      verified: true,
    } as any);

    staffToken = tokenData.accessToken;
  });

  afterAll(async () => {
    await cleanDatabase();
    await sequelize.close();
  });

  describe('POST /movies', () => {
    it('should create a movie when authorized as staff', async () => {
      const res = await request(app)
        .post('/movies')
        .set('Authorization', `Bearer ${staffToken}`)
        .send(testMovie);

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe(testMovie.title);

      // Check in DB
      const createdMovie = await MovieModel.findOne({
        where: { title: testMovie.title },
      });
      expect(createdMovie).not.toBeNull();
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app).post('/movies').send(testMovie);
      expect(res.status).toBe(401);
    });

    it('should return 400 for invalid input', async () => {
      const res = await request(app)
        .post('/movies')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({}); // Missing fields
      expect(res.status).toBe(400);
    });
  });

  describe('GET /movies/:movieId', () => {
    it('should get movie by ID', async () => {
      // Create movie in DB first
      const movie = await MovieModel.create(testMovie);

      const res = await request(app).get(`/movies/${movie.movieId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.movieId).toBe(movie.movieId);
    });

    it('should return 404 for non-existent ID', async () => {
      const res = await request(app).get('/movies/non-existent-id');
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /movies/:movieId', () => {
    it('should update movie when staff', async () => {
      const movie = await MovieModel.create(testMovie);

      const res = await request(app)
        .put(`/movies/${movie.movieId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Updated Title');

      // Check in DB
      const updatedMovie = await MovieModel.findByPk(movie.movieId);
      expect(updatedMovie?.title).toBe('Updated Title');
    });

    it('should return 404 for non-existent movie', async () => {
      const res = await request(app)
        .put('/movies/non-existent-id')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(404);
    });

    it('should return 401 if not authenticated', async () => {
      const movie = await MovieModel.create(testMovie);

      const res = await request(app)
        .put(`/movies/${movie.movieId}`)
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /movies/:movieId', () => {
    it('should delete movie when staff', async () => {
      const movie = await MovieModel.create(testMovie);

      const res = await request(app)
        .delete(`/movies/${movie.movieId}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(204);

      const deleted = await MovieModel.findByPk(movie.movieId);
      expect(deleted).toBeNull();
    });

    it('should return 404 for non-existent movie', async () => {
      const res = await request(app)
        .delete('/movies/non-existent-id')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 401 if not authenticated', async () => {
      const movie = await MovieModel.create(testMovie);

      const res = await request(app).delete(`/movies/${movie.movieId}`);

      expect(res.status).toBe(401);
    });
  });

  describe('GET /movies', () => {
    it('should list all movies', async () => {
      await MovieModel.bulkCreate([testMovie, altMovie]);

      const res = await request(app).get('/movies');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);
    });

    it('should return empty array when no movies exist', async () => {
      const res = await request(app).get('/movies');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(0);
    });
  });

  describe('GET /movies/search', () => {
    beforeEach(async () => {
      await MovieModel.bulkCreate([testMovie, altMovie]);
    });

    it('should search by title', async () => {
      const res = await request(app).get('/movies/search?q=Inception');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].title).toBe('Inception');
    });

    it('should search by director', async () => {
      const res = await request(app).get('/movies/search?q=Nolan');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(1);
    });

    it('should return empty array for no matches', async () => {
      const res = await request(app).get('/movies/search?q=NotExist');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(0);
    });

    it('should return 200 for missing query param', async () => {
      const res = await request(app).get('/movies/search');
      expect(res.status).toBe(200);
    });
  });
});
