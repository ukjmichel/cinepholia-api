import express, { ErrorRequestHandler, Request, Response } from 'express';
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
import cookieParser from 'cookie-parser';
const app = express();

// ─────── Middleware ─────────────────────────────────────────
app.use(express.json());
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: [
          "'self'",
          'http://localhost:3000',
          'http://localhost:4200',
          'data:',
          'blob:',
        ],
      },
    },
    crossOriginEmbedderPolicy: false, // This should be at the helmet level only
  })
);
app.use(
  cors({
    origin: 'http://localhost:4200',
    credentials: true,
  })
);
app.use(cookieParser());
app.use(morgan('dev'));
app.use('/uploads', (req, res, next) => {
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Access-Control-Allow-Origin', 'http://localhost:4200');
  next();
});
app.use('/uploads', express.static('uploads'));

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

// ─────── Error Handling ──────────────────────────────────────
app.use(errorHandler as ErrorRequestHandler);

export default app;
