// ✅ Mock EmailService before importing app
jest.mock('../../services/email.service.js', () => ({
  emailService: {
    sendTheaterContactMessage: jest.fn().mockResolvedValue(undefined),
  },
}));

import request from 'supertest';
import app from '../../app.js';
import { sequelize, syncDB } from '../../config/db.js';
import { MovieTheaterModel } from '../../models/movie-theater.model.js';
import { emailService } from '../../services/email.service.js';

const testTheater = {
  theaterId: 'cinema-contact-01',
  address: '123 Rue du Cinéma',
  postalCode: '75000',
  city: 'Paris',
  phone: '+33123456789',
  email: 'contact@cinema.com',
};

describe('POST /api/contact', () => {
  beforeAll(async () => {
    await syncDB();
  });

  beforeEach(async () => {
    await MovieTheaterModel.destroy({ where: {}, force: true });
    await MovieTheaterModel.create(testTheater);
    jest.clearAllMocks(); // reset mock call history
  });

  afterAll(async () => {
    await MovieTheaterModel.destroy({
      where: {},
      truncate: true,
      cascade: true,
    });
    await sequelize.close();
  });

  it('should send contact email successfully with valid data', async () => {
    const res = await request(app).post('/api/contact').send({
      theaterId: testTheater.theaterId,
      email: 'client@example.com',
      message: 'Hello, is the cinema accessible by wheelchair?',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Email sent successfully');
    expect(emailService.sendTheaterContactMessage).toHaveBeenCalledWith(
      testTheater.theaterId,
      'client@example.com',
      'Hello, is the cinema accessible by wheelchair?'
    );
  });

  it('should return 400 when missing required fields', async () => {
    const res = await request(app).post('/api/contact').send({
      email: 'client@example.com',
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.message).toMatch(/Missing required fields/i);
  });

  it('should return 400 when email is invalid', async () => {
    const res = await request(app).post('/api/contact').send({
      theaterId: testTheater.theaterId,
      email: 'invalid-email',
      message: 'Hello world',
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should return 400 when email service fails', async () => {
    (emailService.sendTheaterContactMessage as jest.Mock).mockRejectedValueOnce(
      new Error('Simulated service failure')
    );

    const res = await request(app).post('/api/contact').send({
      theaterId: testTheater.theaterId,
      email: 'client@example.com',
      message: 'Will this fail?',
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.message).toBe('Failed to send email');
  });
});
