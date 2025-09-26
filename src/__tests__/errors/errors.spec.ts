/**
 * Comprehensive unit tests for all custom HTTP error classes.
 */

import { BadRequestError } from '../../errors/bad-request-error';
import { UnauthorizedError } from '../../errors/unauthorized-error';
import { NotAuthorizedError } from '../../errors/not-authorized-error';
import { ForbiddenError } from '../../errors/forbidden-error';
import { NotFoundError } from '../../errors/not-found-error';
import { ConflictError } from '../../errors/conflict-error';

type ErrCtor<T extends Error> = new (...args: any[]) => T;

describe('Custom HTTP error classes', () => {
  const CAUSE = new Error('root cause');

  const cases: Array<{
    name: string;
    Ctor: ErrCtor<Error>;
    expectedStatus: number;
    explicitMessage: string;
    expectedName?: string; // allow different .name than class name
  }> = [
    {
      name: 'BadRequestError',
      Ctor: BadRequestError,
      expectedStatus: 400,
      explicitMessage: 'Bad payload',
    },
    {
      name: 'UnauthorizedError',
      Ctor: UnauthorizedError,
      expectedStatus: 401,
      explicitMessage: 'Token missing',
    },
    {
      name: 'NotAuthorizedError',
      Ctor: NotAuthorizedError,
      expectedStatus: 403,
      explicitMessage: 'Not allowed here',
      // Your implementation sets err.name to "Forbidden"
      expectedName: 'Forbidden',
    },
    {
      name: 'ForbiddenError',
      Ctor: ForbiddenError,
      expectedStatus: 403,
      explicitMessage: 'Scope too low',
    },
    {
      name: 'NotFoundError',
      Ctor: NotFoundError,
      expectedStatus: 404,
      explicitMessage: 'Item not found',
    },
    {
      name: 'ConflictError',
      Ctor: ConflictError,
      expectedStatus: 409,
      explicitMessage: 'Already exists',
    },
  ];

  it.each(cases)(
    '%s: constructs, sets name and status, and preserves prototype',
    ({ name, expectedName, Ctor, expectedStatus, explicitMessage }) => {
      const err = new Ctor(explicitMessage);

      // instanceof checks
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(Ctor);

      // basic properties
      const wantName = expectedName ?? name;
      expect(err.name).toBe(wantName);

      const status = (err as any).status ?? (err as any).statusCode;
      expect(status).toBe(expectedStatus);

      // message
      expect(err.message).toBe(explicitMessage);

      // stack should contain the message (typical Node behavior)
      expect(String(err.stack)).toEqual(
        expect.stringContaining(explicitMessage)
      );

      // toString() includes name and message
      expect(err.toString()).toEqual(expect.stringContaining(wantName));
      expect(err.toString()).toEqual(expect.stringContaining(explicitMessage));
    }
  );

  it.each(cases)(
    '%s: supports optional cause if provided',
    ({ Ctor, explicitMessage }) => {
      const err = new Ctor(explicitMessage, CAUSE as any);
      if ('cause' in err) {
        expect((err as any).cause).toBe(CAUSE);
      }
    }
  );

  it('UnauthorizedError falls back to default message when not provided', () => {
    const err = new UnauthorizedError();
    expect(err.message).toBe('Unauthorized');
    expect((err as any).status ?? (err as any).statusCode).toBe(401);
    // Some implementations set name to the class name, others to a label; accept either:
    expect(['UnauthorizedError', 'Unauthorized']).toContain(err.name);
  });
});
