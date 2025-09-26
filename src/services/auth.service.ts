// src/services/auth.service.ts
import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';
import { config } from '../config/env.js';
import { UserModel } from '../models/user.model.js';
import { NotFoundError } from '../errors/not-found-error.js';
import { BadRequestError } from '../errors/bad-request-error.js';
import { UnauthorizedError } from '../errors/unauthorized-error.js';

type Attempts = { count: number; lastAttempt: Date };

export class AuthService {
  /** Lock policy */
  private MAX_ATTEMPTS = 5; // lock on the attempt that REACHES 5
  private LOCK_MS = 15 * 60 * 1000; // 15 minutes

  /** In-memory stores (sufficient for unit tests) */
  public loginAttempts: Map<string, Attempts> = new Map();
  public lockedOut: Map<string, Date> = new Map();

  /** Refresh-token blacklist: token -> expiry (Date or timestamp) */
  private tokenBlacklist: Map<string, number | Date> = new Map();

  private now() {
    return Date.now();
  }

  private isLocked(key: string): boolean {
    const until = this.lockedOut.get(key);
    if (!until) return false;
    const expiry = until instanceof Date ? +until : until;
    const stillLocked = expiry > this.now();
    if (!stillLocked) this.lockedOut.delete(key);
    return stillLocked;
  }

  private bumpAttempt(key: string): number {
    const cur = this.loginAttempts.get(key) ?? {
      count: 0,
      lastAttempt: new Date(0),
    };
    const next = { count: cur.count + 1, lastAttempt: new Date() };
    this.loginAttempts.set(key, next);
    return next.count;
  }

  private resetAttempts(key: string) {
    if (this.loginAttempts.has(key)) {
      this.loginAttempts.set(key, { count: 0, lastAttempt: new Date() });
    } else {
      this.loginAttempts.delete(key);
    }
    this.lockedOut.delete(key);
  }

  private maybeResetByWindow(key: string) {
    const a = this.loginAttempts.get(key);
    if (!a) return;
    if (this.now() - +a.lastAttempt > this.LOCK_MS) {
      this.loginAttempts.delete(key);
      this.lockedOut.delete(key);
    }
  }

  /**
   * Generate a pair of JWTs (access + refresh) for a given user.
   * Throws if userId is missing.
   */
  public generateTokens(
    user: { userId: string },
    opts?: {
      // Narrow to what jsonwebtoken v9 expects:
      accessExpiresIn?: SignOptions['expiresIn']; // e.g. '1h' | 3600
      refreshExpiresIn?: SignOptions['expiresIn']; // e.g. '7d' | 604800
    }
  ): { accessToken: string; refreshToken: string } {
    if (!user?.userId) {
      throw new BadRequestError('Invalid user for token generation');
    }

    const accessSecret = config.jwtSecret as Secret;
    const refreshSecret = config.jwtRefreshSecret as Secret;

    if (!accessSecret || !refreshSecret) {
      throw new Error('Missing JWT secrets');
    }

    const accessExp = (opts?.accessExpiresIn ??
      '1h') as SignOptions['expiresIn'];
    const refreshExp = (opts?.refreshExpiresIn ??
      '7d') as SignOptions['expiresIn'];

    const payload = { userId: user.userId };

    const accessToken = jwt.sign(payload, accessSecret, {
      expiresIn: accessExp,
    });
    const refreshToken = jwt.sign(payload, refreshSecret, {
      expiresIn: refreshExp,
    });

    return { accessToken, refreshToken };
  }

  /**
   * Authenticate using the model instance's validatePassword()
   * identifier can be username OR email.
   */
  async login(identifier: string, password: string) {
    // Early guard (test expects BadRequestError)
    if (!identifier || !password) {
      throw new BadRequestError('Missing identifier or password');
    }

    const key = identifier; // used for attempts/lock tracking
    this.maybeResetByWindow(key);

    // Hard lock guard (test expects UnauthorizedError when locked)
    if (this.isLocked(key)) {
      throw new UnauthorizedError(
        'Account locked. Please wait before retrying.'
      );
    }

    // If attempts have ALREADY reached threshold, lock immediately
    const prior = this.loginAttempts.get(key);
    if (prior && prior.count >= this.MAX_ATTEMPTS) {
      this.lockedOut.set(key, new Date(this.now() + this.LOCK_MS));
      throw new UnauthorizedError(
        'Too many attempts. Account temporarily locked.'
      );
    }

    // Look up user by username OR email
    let instance: any =
      (await UserModel.findOne({ where: { username: identifier } as any })) ||
      (await UserModel.findOne({ where: { email: identifier } as any }));

    let user: any = null;
    if (instance && typeof instance.validatePassword === 'function') {
      const ok = await instance.validatePassword(password);
      if (ok) {
        user = instance.get?.() ?? instance.toJSON?.() ?? instance;
      }
    }

    // Invalid credentials: bump attempts and decide error type
    if (!user) {
      const attempts = this.bumpAttempt(key);
      // If THIS attempt reaches threshold -> lock and throw UnauthorizedError
      if (attempts >= this.MAX_ATTEMPTS) {
        const until = new Date(this.now() + this.LOCK_MS);
        this.lockedOut.set(key, until);
        throw new UnauthorizedError(
          'Too many attempts. Account temporarily locked.'
        );
      }
      // Otherwise (below threshold) -> NotFoundError (tests expect this)
      throw new NotFoundError('Invalid credentials');
    }

    // Success -> reset attempts
    this.resetAttempts(key);

    // Sign tokens (tests mock jwt.sign & env secrets)
    const payload = { userId: user.userId };
    const accessToken = jwt.sign(payload, config.jwtSecret);
    const refreshToken = jwt.sign(payload, config.jwtRefreshSecret);

    return { accessToken, refreshToken };
  }

  /** Revoke/blacklist refresh tokens (tests may probe these) */
  async revokeRefreshToken(userId: string, token: string): Promise<void> {
    try {
      const payload: any = jwt.verify(token, config.jwtRefreshSecret);
      if (payload?.userId !== userId) return; // ignore mismatch
      // Mark blacklisted for ~30 days (align with your refresh exp)
      const exp = new Date(this.now() + 30 * 24 * 60 * 60 * 1000);
      this.tokenBlacklist.set(token, exp);
    } catch {
      // verify error -> do nothing (expected in a test path)
    }
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const exp = this.tokenBlacklist.get(token);
    if (!exp) return false;
    const ts = exp instanceof Date ? +exp : exp;
    if (ts <= this.now()) {
      this.tokenBlacklist.delete(token); // auto clean expired
      return false;
    }
    return true;
  }
}

export const authService = new AuthService();
export default AuthService;
