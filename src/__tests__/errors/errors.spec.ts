import { Request, Response, NextFunction } from 'express';
import { NotFoundError } from '../../errors/not-found-error';
import { BadRequestError } from '../../errors/bad-request-error';
import { ConflictError } from '../../errors/conflict-error';
import { NotAuthorizedError } from '../../errors/not-authorized-error';
import { errorHandler } from '../../middlewares/errorHandler';

describe('Custom Error Classes', () => {
  describe('NotFoundError', () => {
    it('should set name and statusCode', () => {
      const err = new NotFoundError('Not found');
      expect(err.name).toBe('NotFoundError');
      expect(err.status).toBe(404);
      expect(err.message).toBe('Not found');
      expect(err.cause).toBeUndefined();
    });

    it('should support a cause', () => {
      const cause = new Error('Original');
      const err = new NotFoundError('Not found', cause);
      expect(err.cause).toBe(cause);
    });
  });

  describe('BadRequestError', () => {
    it('should set name and statusCode', () => {
      const err = new BadRequestError('Bad request');
      expect(err.name).toBe('BadRequestError');
      expect(err.status).toBe(400);
      expect(err.message).toBe('Bad request');
      expect(err.cause).toBeUndefined();
    });

    it('should support a cause', () => {
      const cause = new Error('Original');
      const err = new BadRequestError('Bad request', cause);
      expect(err.cause).toBe(cause);
    });
  });

  describe('ConflictError', () => {
    it('should set name and statusCode', () => {
      const err = new ConflictError('Conflict!');
      expect(err.name).toBe('ConflictError');
      expect(err.status).toBe(409);
      expect(err.message).toBe('Conflict!');
      expect(err.cause).toBeUndefined();
    });

    it('should support a cause', () => {
      const cause = new Error('Original');
      const err = new ConflictError('Conflict!', cause);
      expect(err.cause).toBe(cause);
    });
  });

  describe('NotAuthorizedError', () => {
    it('should set name and statusCode', () => {
      const err = new NotAuthorizedError('Forbidden');
      expect(err.name).toBe('NotAuthorizedError');
      expect(err.status).toBe(403);
      expect(err.message).toBe('Forbidden');
      expect(err.cause).toBeUndefined();
    });

    it('should support a cause', () => {
      const cause = new Error('Original');
      const err = new NotAuthorizedError('Forbidden', cause);
      expect(err.cause).toBe(cause);
    });
  });
});

describe('errorHandler middleware', () => {
  it('should fallback to 500 and default message if statusCode and message are missing', () => {
    const err = { name: 'Error' }; // No statusCode or message
    const req = {} as Partial<Request>;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
    const next = jest.fn();

    errorHandler(err, req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Error',
      message: 'Internal Server Error',
      status: 500,
    });
  });
});
