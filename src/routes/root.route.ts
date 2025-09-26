import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { sequelize } from '../config/db.js';

const router = Router();

/**
 * @openapi
 * /:
 *   get:
 *     summary: API Root
 *     description: Returns basic information about the API and links to documentation and health check.
 *     tags:
 *       - Root
 *     responses:
 *       200:
 *         description: API information and status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                 version:
 *                   type: string
 *                 description:
 *                   type: string
 *                 status:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 links:
 *                   type: object
 *                   properties:
 *                     docs:
 *                       type: string
 *                     health:
 *                       type: string
 */
router.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'Express API Starter',
    version: process.env.npm_package_version || '1.0.0',
    description: 'Welcome to the Express API! Check /api-docs for Swagger UI.',
    status: 'ok',
    timestamp: new Date().toISOString(),
    links: {
      docs: '/api-docs',
      health: '/health/db',
    },
  });
});

/**
 * @openapi
 * /health/db:
 *   get:
 *     summary: Database Health Check
 *     description: Checks the status of MySQL and MongoDB connections.
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: All database connections are healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 services:
 *                   type: object
 *                   properties:
 *                     mysql:
 *                       type: string
 *                       example: ok
 *                     mongodb:
 *                       type: string
 *                       example: ok
 *                 message:
 *                   type: string
 *                   example: Database connections are healthy
 *       500:
 *         description: One or more database connections failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 services:
 *                   type: object
 *                   properties:
 *                     mysql:
 *                       type: string
 *                       example: error
 *                     mongodb:
 *                       type: string
 *                       example: ok
 *                 message:
 *                   type: string
 *                   example: One or more database connections failed
 */
router.get('/health/db', async (req: Request, res: Response): Promise<void> => {
  // MySQL (Sequelize) check
  const mysqlOk = await sequelize
    .authenticate()
    .then(() => true)
    .catch(() => false);

  // MongoDB (Mongoose) check
  let mongoOk = false;
  if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
    try {
      await mongoose.connection.db.admin().ping();
      mongoOk = true;
    } catch {
      mongoOk = false;
    }
  }

  const overallStatus = mysqlOk && mongoOk ? 'ok' : 'error';

  res.status(overallStatus === 'ok' ? 200 : 500).json({
    status: overallStatus,
    services: {
      mysql: mysqlOk ? 'ok' : 'error',
      mongodb: mongoOk ? 'ok' : 'error',
    },
    message:
      overallStatus === 'ok'
        ? 'Database connections are healthy'
        : 'One or more database connections failed',
  });
});

export default router;
