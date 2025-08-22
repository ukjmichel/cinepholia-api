// src/app.ts
import express, { ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import { setupSwagger } from './config/swagger.js';
import { errorHandler } from './middlewares/errorHandler.js';

// ── Routers ─────────────────────────────────────────────
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
import contactRouter from './routes/contact.route.js';
import initDbRouter from './routes/init-db.route.js';
import incidentReportRouter from './routes/incident-report.route.js';

const app = express();

/* ───────────────────────────────────────────────────────────
   1) Base app & trust proxy
   - Useful if you are behind a proxy (Docker/nginx) so that
     req.ip / secure cookies work correctly.
─────────────────────────────────────────────────────────── */
app.set('trust proxy', 1);

/* ───────────────────────────────────────────────────────────
   2) Body parsers & cookies
   - Must be before any logic that reads req.body / cookies.
─────────────────────────────────────────────────────────── */
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

/* ───────────────────────────────────────────────────────────
   3) CORS (Cross-Origin Resource Sharing)
   - Dynamic whitelist: web (localhost), Capacitor/Ionic,
     and Android emulator access to your host via 10.0.2.2
   - credentials: true if using cookies.
   - Also allow OPTIONS globally (preflight).
─────────────────────────────────────────────────────────── */
const WHITELIST = [
  // Web dev (Angular/Ionic/Next)
  'http://localhost:4200',
  'http://localhost:8100',
  'http://localhost:3000',

  // Capacitor / Ionic (native apps)
  'capacitor://localhost',
  'ionic://localhost',

  // Android emulator -> host machine
  'http://10.0.2.2:4200',
  'http://10.0.2.2:8100',
  'http://10.0.2.2:3000',
];

const corsOptions: cors.CorsOptions = {
  origin(origin, cb) {
    // Allow requests without an origin (native apps, curl, etc.)
    if (!origin) return cb(null, true);
    if (WHITELIST.includes(origin)) return cb(null, true);
    return cb(new Error(`Origin not allowed: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
  ],
  exposedHeaders: ['Content-Disposition'],
};

app.use(cors(corsOptions));

/* ───────────────────────────────────────────────────────────
   4) Helmet (CSP adapted for web + mobile)
   - Allow data:/blob: for local images/media,
     Capacitor/Ionic origins, and 10.0.2.2 (emulator).
   - COEP disabled to avoid issues in dev (embeds).
─────────────────────────────────────────────────────────── */
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: [
          "'self'",
          'data:',
          'blob:',
          'capacitor://localhost',
          'ionic://localhost',
          'http://localhost:3000',
          'http://localhost:4200',
          'http://localhost:8100',
          'http://10.0.2.2:3000',
          'http://10.0.2.2:4200',
          'http://10.0.2.2:8100',
        ],
        mediaSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: [
          "'self'",
          'capacitor://localhost',
          'ionic://localhost',
          'http://localhost:*',
          'http://10.0.2.2:*',
        ],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

/* ───────────────────────────────────────────────────────────
   5) HTTP logging (morgan)
─────────────────────────────────────────────────────────── */
app.use(morgan('dev'));

/* ───────────────────────────────────────────────────────────
   6) Static files (uploads) with same CORS config
   - No hardcoded headers: reuse corsOptions.
   - Place before routes if you want static priority.
─────────────────────────────────────────────────────────── */
app.use('/uploads', cors(corsOptions), express.static('uploads'));

/* ───────────────────────────────────────────────────────────
   7) Swagger (API docs)
   - Must be mounted before routes if docs serve static assets.
─────────────────────────────────────────────────────────── */
setupSwagger(app);

/* ───────────────────────────────────────────────────────────
   8) Application routes
   - Recommended: auth before protected resources.
   - Keeping your existing mounts.
─────────────────────────────────────────────────────────── */
app.use('/', rootRouter);
app.use('/tests', testRouter);

app.use('/auth', authRouter);
app.use('/auth', userToken);

app.use('/users', userRouter);
app.use('/movie-theaters', movieTheaterRouter);
app.use('/movie-halls', movieHallRouter);
app.use('/movies', movieRouter);
app.use('/screenings', screeningRouter);
app.use('/bookings', bookingRouter);
app.use('', bookingCommentRouter);
app.use('/contact', contactRouter);
app.use('/incident-reports', incidentReportRouter);
app.use('/init', initDbRouter);

/* ───────────────────────────────────────────────────────────
   9) 404 Not Found (catch-all)
   - After all routes.
─────────────────────────────────────────────────────────── */
app.use((req, res) => {
  res.status(404).json({
    status: 404,
    error: 'Not Found',
    path: req.originalUrl,
  });
});

/* ───────────────────────────────────────────────────────────
   10) Error Handling (always last)
─────────────────────────────────────────────────────────── */
app.use(errorHandler as ErrorRequestHandler);

export default app;

/* ───────────────────────────────────────────────────────────
   Practical notes:
   - Cross-site cookies (native apps) require SameSite=None; Secure.
   - From Android emulator, use http://10.0.2.2:<port> to reach
     your backend running on your host machine.
   - If using Bearer tokens for mobile, credentials: true is only
     needed if you also have a cookie-based auth flow.
─────────────────────────────────────────────────────────── */
