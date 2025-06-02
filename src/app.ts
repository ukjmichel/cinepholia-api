import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { setupSwagger } from './config/swagger.js';
import { errorHandler } from './middlewares/errorHandler.js';

import rootRouter from './routes/root.route.js';
import testRouter from './routes/test.route.js';
import userRouter from './routes/user.route.js';
import authRouter from './routes/auth.route.js';
import userToken from './routes/user-token.route.js';
import movieTheaterRouter from './routes/movie-theater.route.js';
import movieHallRouter from './routes/movie-hall.route.js';
import movieRouter from './routes/movie.route.js';
import screeningRouter from './routes/screening.route.js';
import bookingRouter from './routes/booking.route.js';
import bookingCommentRouter from './routes/booking-comment.route.js';
import incidentReportRouter from './routes/incident-report.route.js';

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
app.use('/auth', authRouter);
app.use('/auth', userToken);
app.use('/movie-theaters', movieTheaterRouter);
app.use('/movie-halls', movieHallRouter);
app.use('/movies', movieRouter);
app.use('/screenings', screeningRouter);
app.use('/bookings', bookingRouter);
app.use('/', bookingCommentRouter);
app.use('/incident-reports', incidentReportRouter);

// ─────── Error Handling ──────────────────────────────────────
app.use(errorHandler);

export default app;
