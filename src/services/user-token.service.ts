import crypto from 'crypto';
import { Op } from 'sequelize';
import { UserTokenModel } from '../models/user-token.model.js';
import { config } from '../config/env.js';

export class UserTokenService {
  // use environment-configured values
  private static MAX_ATTEMPTS = config.resetMaxAttempts;
  private static REQUEST_INTERVAL_MS = config.resetRequestIntervalMs;

  /**
   * Generate a 6-digit numeric code.
   */
  private static generateNumericCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Hash a token using SHA-256.
   */
  private static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Create or update a password reset token for a user with rate limiting.
   * Stores the hashed token in the DB.
   * @returns The raw 6-digit code (to send via email).
   * @throws Error if the user requests a token too soon.
   */
  static async createPasswordResetToken(
    userId: string,
    expiresInMinutes = 30
  ): Promise<string> {
    const existing = await UserTokenModel.findByPk(userId);

    // ✅ Enforce rate limit (minimum interval between requests)
    if (existing?.lastRequestAt) {
      const elapsed = Date.now() - existing.lastRequestAt.getTime();
      if (elapsed < this.REQUEST_INTERVAL_MS) {
        throw new Error('You must wait before requesting another reset code.');
      }
    }

    // ✅ Generate and hash token
    const rawCode = this.generateNumericCode();
    const hashedCode = this.hashToken(rawCode);
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    // ✅ Save or replace existing token
    await UserTokenModel.upsert({
      userId,
      type: 'reset_password',
      token: hashedCode,
      expiresAt,
      attempts: 0, // reset attempts on new code
      lastRequestAt: new Date(), // track request time
    });

    return rawCode; // return the raw code so controller can send it by email
  }

  /**
   * Validate a provided raw token against the stored hashed token.
   * Increments attempts on failure and blocks after MAX_ATTEMPTS.
   * @returns The token record if valid, otherwise null.
   * @throws Error if max attempts exceeded.
   */
  static async validatePasswordResetToken(rawToken: string) {
    const hashedToken = this.hashToken(rawToken);

    // ✅ Find active (not expired) token
    const record = await UserTokenModel.findOne({
      where: {
        type: 'reset_password',
        expiresAt: { [Op.gt]: new Date() },
      },
    });

    if (!record) return null;

    // ✅ Check max attempts
    if (record.attempts >= this.MAX_ATTEMPTS) {
      throw new Error('Too many invalid attempts. Request a new reset code.');
    }

    // ✅ Compare hashes
    if (record.token !== hashedToken) {
      record.attempts += 1;
      await record.save();
      return null;
    }

    return record;
  }

  /**
   * Delete a user's token after successful password reset.
   */
  static async consumePasswordResetToken(userId: string) {
    await UserTokenModel.destroy({ where: { userId, type: 'reset_password' } });
  }

  /**
   * Delete all expired tokens (can be used in a scheduled cleanup job).
   */
  static async deleteExpiredTokens() {
    await UserTokenModel.destroy({
      where: { expiresAt: { [Op.lt]: new Date() } },
    });
  }
}
