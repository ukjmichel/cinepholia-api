import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { setupSwagger } from '../config/swagger.js';
import { errorHandler } from '../middlewares/errorHandler.js';

import rootRouter from '../routes/root.route.js';
import testRouter from '../routes/test.route.js';
import userRouter from '../routes/user.route.js';

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
app.use('/tests', testRouter);
app.use('/users', userRouter);
// ─────── Error Handling ──────────────────────────────────────
app.use(errorHandler);

export default app;
