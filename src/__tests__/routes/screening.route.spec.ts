import request from 'supertest';
import app from '../../app.js'; 
import { sequelize, syncDB } from '../../config/db.js';
import { v4 as uuidv4 } from 'uuid';
import { BookingModel } from '../../models/booking.model.js';
import { ScreeningModel } from '../../models/screening.model.js';
import { MovieModel } from '../../models/movie.model.js';
import { MovieTheaterModel } from '../../models/movie-theater.model.js';
import { MovieHallModel } from '../../models/movie-hall.model.js';
import { UserModel } from '../../models/user.model.js';
import { AuthorizationModel } from '../../models/authorization.model.js';
import { AuthService } from '../../services/auth.service.js';

const testMovie = {
  movieId: uuidv4(),
  title: 'Inception',
  genre: 'Sci-Fi',
  releaseDate: new Date('2010-07-16'),
  durationMinutes: 148,
  description: 'A mind-bending thriller.',
  ageRating: 'PG-13',
  director: 'Christopher Nolan',
};

const testTheater = {
  theaterId: 'theater-1',
  address: '123 Main St',
  postalCode: '10001',
  city: 'Metropolis',
  phone: '+11234567890',
  email: 'info@theater.com',
};

const testHall = {
  theaterId: testTheater.theaterId,
  hallId: 'grande-salle',
  seatsLayout: [
    ['A1', 'A2'],
    ['B1', 'B2'],
  ],
  quality: '2D' as '2D', // type-safe
};

const screening = {
  screeningId: uuidv4(),
  movieId: testMovie.movieId,
  theaterId: testTheater.theaterId,
  hallId: testHall.hallId,
  startTime: new Date('2025-07-01T18:00:00.000Z'),
  price: 12.5,
  quality: '2D',
};

const regularUserData = {
  username: 'regularuser',
  firstName: 'Regular',
  lastName: 'User',
  email: 'regular@theater.com',
  password: 'RegularPass123!',
};

const staffUserData = {
  username: 'staffuser',
  firstName: 'Staff',
  lastName: 'User',
  email: 'staff@theater.com',
  password: 'StaffPass123!',
};

const cleanDatabase = async () => {
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
  await AuthorizationModel.destroy({
    where: {},
    truncate: true,
    cascade: true,
  });
  await BookingModel.destroy({ where: {}, truncate: true, cascade: true });
  await UserModel.destroy({ where: {}, truncate: true, cascade: true });
  await ScreeningModel.destroy({ where: {}, truncate: true, cascade: true });
  await MovieModel.destroy({ where: {}, truncate: true, cascade: true });
  await MovieHallModel.destroy({ where: {}, truncate: true, cascade: true });
  await MovieTheaterModel.destroy({ where: {}, truncate: true, cascade: true });
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
};

describe('Booking E2E Routes', () => {
  let staffToken: string;
  let regularToken: string;
  let staffUserId: string;
  let regularUserId: string;
  let screeningId: string;
  let bookingId: string;

  beforeAll(async () => {
    await syncDB();
  });

  beforeEach(async () => {
    await cleanDatabase();
    // Seed dependencies
    await MovieTheaterModel.create(testTheater);
    await MovieHallModel.create(testHall);
    await MovieModel.create(testMovie);

    // Create screening
    await ScreeningModel.create(screening);
    screeningId = screening.screeningId;

    // Create users
    const regularUser = await UserModel.create(regularUserData);
    regularUserId = (regularUser as any).userId;
    const staffUser = await UserModel.create(staffUserData);
    staffUserId = (staffUser as any).userId;

    await AuthorizationModel.create({
      userId: regularUserId,
      role: 'utilisateur',
    });
    await AuthorizationModel.create({ userId: staffUserId, role: 'employé' });

    // Generate JWTs
    regularToken = new AuthService().generateTokens({
      userId: regularUserId,
      username: regularUserData.username,
      email: regularUserData.email,
      verified: true,
    } as any).accessToken;
    staffToken = new AuthService().generateTokens({
      userId: staffUserId,
      username: staffUserData.username,
      email: staffUserData.email,
      verified: true,
    } as any).accessToken;
  });

  afterAll(async () => {
    await cleanDatabase();
    await sequelize.close();
  });

  describe('POST /bookings', () => {
    it('should create a booking with regular user JWT', async () => {
      const body = {
        screeningId,
        userId: regularUserId,
        seatsNumber: 2,
        totalPrice: 25,
        seatIds: ['A1', 'A2'],
      };
      const res = await request(app)
        .post('/bookings')
        .set('Authorization', `Bearer ${regularToken}`)
        .send(body)
        .expect(201);

      bookingId = res.body.data.bookingId || res.body.data.booking?.bookingId;
      expect(res.body.data.screeningId).toBe(screeningId);
      expect(res.body.data.userId).toBe(regularUserId);
      expect(res.body.data.status).toBe('pending');
    });

    it('should 401 if unauthenticated', async () => {
      const body = {
        screeningId,
        userId: regularUserId,
        seatsNumber: 1,
        totalPrice: 12.5,
      };
      await request(app).post('/bookings').send(body).expect(401);
    });

    it('should 400 for invalid input', async () => {
      await request(app)
        .post('/bookings')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({})
        .expect(400);
    });

    it('should 403 if user tries to book for another user', async () => {
      const body = {
        screeningId,
        userId: staffUserId, // not regularUserId!
        seatsNumber: 1,
        totalPrice: 12.5,
      };
      await request(app)
        .post('/bookings')
        .set('Authorization', `Bearer ${regularToken}`)
        .send(body)
        .expect(403);
    });
  });

  describe('GET /bookings', () => {
    it('should return all bookings', async () => {
      await BookingModel.create({
        bookingId: uuidv4(),
        screeningId,
        userId: regularUserId,
        seatsNumber: 1,
        totalPrice: 12.5,
        status: 'pending',
        bookingDate: new Date(),
      });
      const res = await request(app).get('/bookings').expect(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /bookings/:bookingId', () => {
    beforeEach(async () => {
      const booking = await BookingModel.create({
        bookingId: uuidv4(),
        screeningId,
        userId: regularUserId,
        seatsNumber: 1,
        totalPrice: 12.5,
        status: 'pending',
        bookingDate: new Date(),
      });
      bookingId = (booking as any).bookingId;
    });

    it('should get booking by ID', async () => {
      const res = await request(app).get(`/bookings/${bookingId}`).expect(200);
      expect(res.body.data.bookingId).toBe(bookingId);
    });

    it('should 404 if not found', async () => {
      await request(app)
        .get('/bookings/aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa')
        .expect(404);
    });

    it('should 400 for invalid booking ID format', async () => {
      await request(app).get('/bookings/not-a-uuid').expect(400);
    });
  });

  describe('PATCH /bookings/:bookingId', () => {
    beforeEach(async () => {
      const booking = await BookingModel.create({
        bookingId: uuidv4(),
        screeningId,
        userId: regularUserId,
        seatsNumber: 1,
        totalPrice: 12.5,
        status: 'pending',
        bookingDate: new Date(),
      });
      bookingId = (booking as any).bookingId;
    });

    it('should update booking when user is staff', async () => {
      const res = await request(app)
        .patch(`/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'used' })
        .expect(200);

      expect(res.body.data.bookingId).toBe(bookingId);
      expect(res.body.data.status).toBe('used');
    });

    it("should 403 when user tries to update another user's booking", async () => {
      await request(app)
        .patch(`/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ status: 'used' })
        .expect(403);
    });

    it('should 401 if unauthenticated', async () => {
      await request(app)
        .patch(`/bookings/${bookingId}`)
        .send({ status: 'used' })
        .expect(401);
    });

    it('should 404 if not found', async () => {
      await request(app)
        .patch('/bookings/aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'used' })
        .expect(404);
    });
  });

  describe('DELETE /bookings/:bookingId', () => {
    beforeEach(async () => {
      const booking = await BookingModel.create({
        bookingId: uuidv4(),
        screeningId,
        userId: regularUserId,
        seatsNumber: 1,
        totalPrice: 12.5,
        status: 'pending',
        bookingDate: new Date(),
      });
      bookingId = (booking as any).bookingId;
    });

    it('should delete booking when user is staff', async () => {
      await request(app)
        .delete(`/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(204);

      const booking = await BookingModel.findByPk(bookingId);
      expect(booking).toBeNull();
    });

    it('should delete booking when user owns it', async () => {
      await request(app)
        .delete(`/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(204);
    });

    it("should 403 when user tries to delete another user's booking", async () => {
      // Make a booking by staff
      const staffBooking = await BookingModel.create({
        bookingId: uuidv4(),
        screeningId,
        userId: staffUserId,
        seatsNumber: 1,
        totalPrice: 12.5,
        status: 'pending',
        bookingDate: new Date(),
      });
      await request(app)
        .delete(`/bookings/${(staffBooking as any).bookingId}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);
    });

    it('should 401 if unauthenticated', async () => {
      await request(app).delete(`/bookings/${bookingId}`).expect(401);
    });

    it('should 404 for not found', async () => {
      await request(app)
        .delete('/bookings/aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(404);
    });
  });

  describe('GET /bookings/user/:userId', () => {
    it('should get bookings by user ID', async () => {
      await BookingModel.create({
        bookingId: uuidv4(),
        screeningId,
        userId: regularUserId,
        seatsNumber: 1,
        totalPrice: 12.5,
        status: 'pending',
        bookingDate: new Date(),
      });
      const res = await request(app)
        .get(`/bookings/user/${regularUserId}`)
        .expect(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return empty array for user with no bookings', async () => {
      const res = await request(app)
        .get(`/bookings/user/${uuidv4()}`)
        .expect(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should 400 for invalid user ID format', async () => {
      await request(app).get('/bookings/user/not-a-uuid').expect(400);
    });
  });

  describe('GET /bookings/screening/:screeningId', () => {
    it('should get bookings by screening ID', async () => {
      await BookingModel.create({
        bookingId: uuidv4(),
        screeningId,
        userId: regularUserId,
        seatsNumber: 1,
        totalPrice: 12.5,
        status: 'pending',
        bookingDate: new Date(),
      });
      const res = await request(app)
        .get(`/bookings/screening/${screeningId}`)
        .expect(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return empty array for screening with no bookings', async () => {
      const res = await request(app)
        .get(`/bookings/screening/${uuidv4()}`)
        .expect(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should 400 for invalid screening ID format', async () => {
      await request(app).get('/bookings/screening/not-a-uuid').expect(400);
    });
  });

  describe('GET /bookings/status/:status', () => {
    it('should get bookings by status - used', async () => {
      await BookingModel.create({
        bookingId: uuidv4(),
        screeningId,
        userId: regularUserId,
        seatsNumber: 1,
        totalPrice: 12.5,
        status: 'used',
        bookingDate: new Date(),
      });
      const res = await request(app).get('/bookings/status/used').expect(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should get bookings by status - pending', async () => {
      await BookingModel.create({
        bookingId: uuidv4(),
        screeningId,
        userId: regularUserId,
        seatsNumber: 1,
        totalPrice: 12.5,
        status: 'pending',
        bookingDate: new Date(),
      });
      const res = await request(app)
        .get('/bookings/status/pending')
        .expect(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should get bookings by status - canceled', async () => {
      await BookingModel.create({
        bookingId: uuidv4(),
        screeningId,
        userId: regularUserId,
        seatsNumber: 1,
        totalPrice: 12.5,
        status: 'canceled',
        bookingDate: new Date(),
      });
      const res = await request(app)
        .get('/bookings/status/canceled')
        .expect(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return empty array for status with no bookings', async () => {
      const res = await request(app)
        .get('/bookings/status/this-status-does-not-exist')
        .expect(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /bookings/:bookingId/ticket', () => {
    beforeEach(async () => {
      const booking = await BookingModel.create({
        bookingId: uuidv4(),
        screeningId,
        userId: regularUserId,
        seatsNumber: 1,
        totalPrice: 12.5,
        status: 'pending',
        bookingDate: new Date(),
      });
      bookingId = (booking as any).bookingId;
    });

    it('should return HTML ticket for the booking when user is owner', async () => {
      const res = await request(app)
        .get(`/bookings/${bookingId}/ticket`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(200);
      expect(res.text).toMatch(/<html/i);
    });

    it('should return HTML ticket for the booking when user is staff', async () => {
      const res = await request(app)
        .get(`/bookings/${bookingId}/ticket`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);
      expect(res.text).toMatch(/<html/i);
    });

    it('should 401 if not authenticated', async () => {
      await request(app).get(`/bookings/${bookingId}/ticket`).expect(401);
    });

    it("should 403 if user tries to get another user's ticket", async () => {
      // Booking owned by staff
      const staffBooking = await BookingModel.create({
        bookingId: uuidv4(),
        screeningId,
        userId: staffUserId,
        seatsNumber: 1,
        totalPrice: 12.5,
        status: 'pending',
        bookingDate: new Date(),
      });
      await request(app)
        .get(`/bookings/${(staffBooking as any).bookingId}/ticket`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);
    });

    it('should 404 if booking not found', async () => {
      await request(app)
        .get('/bookings/aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa/ticket')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(404);
    });
  });

  describe('PATCH /bookings/:bookingId/used', () => {
    beforeEach(async () => {
      const booking = await BookingModel.create({
        bookingId: uuidv4(),
        screeningId,
        userId: regularUserId,
        seatsNumber: 1,
        totalPrice: 12.5,
        status: 'pending',
        bookingDate: new Date(),
      });
      bookingId = (booking as any).bookingId;
    });

    it('should mark booking as used when staff', async () => {
      const res = await request(app)
        .patch(`/bookings/${bookingId}/used`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);
      expect(res.body.data.status).toBe('used');
    });

    it('should 403 if regular user tries', async () => {
      await request(app)
        .patch(`/bookings/${bookingId}/used`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);
    });

    it('should 401 if not authenticated', async () => {
      await request(app).patch(`/bookings/${bookingId}/used`).expect(401);
    });
  });

  describe('PATCH /bookings/:bookingId/cancel', () => {
    beforeEach(async () => {
      const booking = await BookingModel.create({
        bookingId: uuidv4(),
        screeningId,
        userId: regularUserId,
        seatsNumber: 1,
        totalPrice: 12.5,
        status: 'pending',
        bookingDate: new Date(),
      });
      bookingId = (booking as any).bookingId;
    });

    it('should cancel booking when owner', async () => {
      const res = await request(app)
        .patch(`/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(200);
      expect(res.body.data.status).toBe('canceled');
    });

    it('should cancel booking when staff', async () => {
      const res = await request(app)
        .patch(`/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);
      expect(res.body.data.status).toBe('canceled');
    });

    it('should 401 if unauthenticated', async () => {
      await request(app).patch(`/bookings/${bookingId}/cancel`).expect(401);
    });

    it('should 403 if another user', async () => {
      // Booking owned by staff
      const staffBooking = await BookingModel.create({
        bookingId: uuidv4(),
        screeningId,
        userId: staffUserId,
        seatsNumber: 1,
        totalPrice: 12.5,
        status: 'pending',
        bookingDate: new Date(),
      });
      await request(app)
        .patch(`/bookings/${(staffBooking as any).bookingId}/cancel`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);
    });
  });

  describe('GET /bookings/search', () => {
    beforeEach(async () => {
      await BookingModel.create({
        bookingId: uuidv4(),
        screeningId,
        userId: regularUserId,
        seatsNumber: 1,
        totalPrice: 12.5,
        status: 'pending',
        bookingDate: new Date(),
      });
    });

    it('should search bookings by status', async () => {
      const res = await request(app)
        .get('/bookings/search?q=pending')
        .expect(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should search bookings by userId', async () => {
      const res = await request(app)
        .get(`/bookings/search?q=${regularUserId}`)
        .expect(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should 400 for missing query', async () => {
      await request(app).get('/bookings/search').expect(400);
    });
  });
});
