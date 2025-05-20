import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { sequelize } from './config/db';
import { setupSwagger } from './config/swagger';
import { errorHandler } from './middlewares/errorHandler';

import rootRouter from './routes/root.route';
import testRouter from './routes/test.route';

const app = express();

// ─────── Middleware ─────────────────────────────────────────
app.use(express.json());
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));

// ─────── Swagger Setup ──────────────────────────────────────
setupSwagger(app);

// ─────── Endpoint ──────────────────────────────
app.use('/', rootRouter);
app.use('/tests',testRouter)
// ─────── Error Handling ──────────────────────────────────────
app.use(errorHandler);

export default app;
