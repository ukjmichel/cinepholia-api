import { Router, Request, Response, NextFunction } from 'express';
import { NotFoundError } from '../errors/not-found-error';
import { BadRequestError } from '../errors/bad-request-error';
import { ConflictError } from '../errors/conflict-error';
import { NotAuthorizedError } from '../errors/not-authorized-error';

const router = Router();

/**
 * @openapi
 * /tests/error/not-found:
 *   get:
 *     summary: Test NotFoundError
 *     description: Throws a NotFoundError for testing.
 *     tags: [TestError]
 *     responses:
 *       404:
 *         description: Not Found
 */
router.get(
  '/error/not-found',
  (req: Request, res: Response, next: NextFunction) => {
    next(new NotFoundError('This is a simulated NotFoundError!'));
  }
);

/**
 * @openapi
 * /tests/error/bad-request:
 *   get:
 *     summary: Test BadRequestError
 *     description: Throws a BadRequestError for testing.
 *     tags: [TestError]
 *     responses:
 *       400:
 *         description: Bad Request
 */
router.get(
  '/error/bad-request',
  (req: Request, res: Response, next: NextFunction) => {
    next(new BadRequestError('This is a simulated BadRequestError!'));
  }
);

/**
 * @openapi
 * /tests/error/conflict:
 *   get:
 *     summary: Test ConflictError
 *     description: Throws a ConflictError for testing.
 *     tags: [TestError]
 *     responses:
 *       409:
 *         description: Conflict
 */
router.get(
  '/error/conflict',
  (req: Request, res: Response, next: NextFunction) => {
    next(new ConflictError('This is a simulated ConflictError!'));
  }
);

/**
 * @openapi
 * /tests/error/not-authorized:
 *   get:
 *     summary: Test NotAuthorizedError
 *     description: Throws a NotAuthorizedError for testing.
 *     tags: [TestError]
 *     responses:
 *       403:
 *         description: Not Authorized
 */
router.get(
  '/error/not-authorized',
  (req: Request, res: Response, next: NextFunction) => {
    next(new NotAuthorizedError('This is a simulated NotAuthorizedError!'));
  }
);

export default router;
