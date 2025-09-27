// src/app.ts

/**
 * app.ts — Express application bootstrap
 *
 * Responsibilities
 * - Initialize and configure the Express instance
 * - Register global middlewares (JSON parsing, cookies, etc.)
 * - Mount feature routers (root, auth, users)
 * - Attach the centralized error handler (must be last)
 * - Setup OpenAPI/Swagger UI for interactive API docs
 *
 * Notes on middleware order
 * 1) `app.set('trust proxy', 1)` enables correct client IP/secure cookies when behind a reverse proxy (e.g. Nginx, Heroku).
 * 2) Parsers (json, cookies) must run before routers so handlers can read `req.body` and `req.cookies`.
 * 3) Routers are mounted before the error handler so thrown errors bubble into it.
 *
 * Export
 * - Exports the configured `app` (server startup occurs elsewhere, e.g. `server.ts`)
 */

import express, { ErrorRequestHandler } from 'express';
import cookieParser from 'cookie-parser';
import { setupSwagger } from './config/swagger.js';
import { errorHandler } from './middlewares/errorHandler.js';

// ── Routers ─────────────────────────────────────────────
import rootRouter from './routes/root.route.js';
import userRouter from './routes/user.route.js';
import authRouter from './routes/auth.route.js';
import movieRouter from './routes/movie.route.js';
import movieTheaterRouter from './routes/movie-theater.route.js';

const app = express();

// Enable trust proxy so secure cookies and req.ip work correctly behind a proxy/load balancer.
app.set('trust proxy', 1);

// Parse JSON request bodies. Adjust limit if you expect large payloads (e.g., file metadata).
app.use(express.json());

// Parse signed/unsigned cookies into req.cookies / req.signedCookies.
app.use(cookieParser());

// Register Swagger/OpenAPI docs and UI (usually served at /docs).
setupSwagger(app);

// Mount application routers.
app.use('/', rootRouter); // Health checks, root info, etc.
app.use('/api/auth', authRouter); // Authentication/login/logout/refresh.
app.use('/api/users', userRouter); // User CRUD, profile, search, etc.
app.use('/api/movies', movieRouter);
app.use('/api/movie-theaters', movieTheaterRouter);

// Centralized error handler (keep this LAST).
app.use(errorHandler as ErrorRequestHandler);

export default app;
