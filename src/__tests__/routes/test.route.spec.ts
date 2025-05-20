import request from 'supertest';
import express, { NextFunction, Request, Response } from 'express';
import testErrorRouter from '../../routes/test.route';
import { errorHandler } from '../../middlewares/errorHandler';

const app = express();
app.use('/', testErrorRouter);
app.use(errorHandler); // Attach your error handler after routes

describe('TestError Router', () => {
  it('should return 404 for NotFoundError', async () => {
    const res = await request(app).get('/error/not-found');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: 'NotFoundError',
      message: 'This is a simulated NotFoundError!',
      status: 404,
    });
  });

  it('should return 400 for BadRequestError', async () => {
    const res = await request(app).get('/error/bad-request');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: 'BadRequestError',
      message: 'This is a simulated BadRequestError!',
      status: 400,
    });
  });

  it('should return 409 for ConflictError', async () => {
    const res = await request(app).get('/error/conflict');
    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      error: 'ConflictError',
      message: 'This is a simulated ConflictError!',
      status: 409,
    });
  });

  it('should return 403 for NotAuthorizedError', async () => {
    const res = await request(app).get('/error/not-authorized');
    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: 'NotAuthorizedError',
      message: 'This is a simulated NotAuthorizedError!',
      status: 403,
    });
  });
});
