import express, { ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import { setupSwagger } from './config/swagger.js';
import { errorHandler } from './middlewares/errorHandler.js';

// ─────── Routers ──────────────────────────────
import rootRouter from './routes/root.route.js';
import testRouter from './routes/test.route.js';
import userRouter from './routes/user.route.js';
import authRouter from './routes/auth.route.js';
import userTokenRouter from './routes/user-token.route.js'; // ✅ renamed for clarity
import movieTheaterRouter from './routes/movie-theater.route.js';
import movieHallRouter from './routes/movie-hall.route.js';
import movieRouter from './routes/movie.route.js';
import screeningRouter from './routes/screening.route.js';
import bookingRouter from './routes/booking.route.js';
import bookingCommentRouter from './routes/booking-comment.route.js';
import contactRouter from './routes/contact.route.js';
import initDbRouter from './routes/init-db.route.js';

const app = express();

// ─────── Middleware ──────────────────────────────
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
    crossOriginEmbedderPolicy: false,
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

// Serve uploaded files with correct CORS headers
app.use('/uploads', (req, res, next) => {
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Access-Control-Allow-Origin', 'http://localhost:4200');
  next();
});
app.use('/uploads', express.static('uploads'));

// ─────── Swagger Setup ──────────────────────────────
setupSwagger(app);

// ─────── API Routes ──────────────────────────────
app.use('/contact', contactRouter);
app.use('/', rootRouter);
app.use('/tests', testRouter);
app.use('/users', userRouter);
app.use('/auth', authRouter);
app.use('/auth', userTokenRouter); 
app.use('/movie-theaters', movieTheaterRouter);
app.use('/movie-halls', movieHallRouter);
app.use('/movies', movieRouter);
app.use('/screenings', screeningRouter);
app.use('/bookings', bookingRouter);
app.use('', bookingCommentRouter);
app.use('/init', initDbRouter);

// ─────── Error Handling ──────────────────────────────
app.use(errorHandler as ErrorRequestHandler);

export default app;
