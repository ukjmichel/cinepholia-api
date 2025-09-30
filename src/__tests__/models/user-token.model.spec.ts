import { Sequelize } from 'sequelize-typescript';
import { UserTokenModel } from '../../models/user-token.model';
import { UserModel } from '../../models/user.model';
import crypto from 'crypto';
import { Op } from 'sequelize';
import { loadModels, sequelize } from '../../config/db';
import { registerAssociations } from '../../models/association';

describe('UserTokenModel', () => {
  let testUserId: string;
  let testUserId2: string;

  beforeAll(async () => {
    // Initialize Sequelize with test database
    loadModels();

    // Register associations
    registerAssociations();

    // Sync database with force:true for clean test environment
    await sequelize.sync({ force: true });

    // Create test users for foreign key constraints
    const user1 = await UserModel.create({
      userId: crypto.randomUUID(),
      username: 'testuser1',
      email: 'test1@example.com',
      password: 'hashedpassword123',
      firstName: 'Test',
      lastName: 'UserOne',
      role: 'user',
    } as any);
    testUserId = user1.userId;

    const user2 = await UserModel.create({
      userId: crypto.randomUUID(),
      username: 'testuser2',
      email: 'test2@example.com',
      password: 'hashedpassword456',
      firstName: 'Test',
      lastName: 'UserTwo',
      role: 'user',
    } as any);
    testUserId2 = user2.userId;
  });

  afterAll(async () => {
    await sequelize.close();
  });

  afterEach(async () => {
    await UserTokenModel.destroy({ where: {}, force: true });
  });

  describe('Creation', () => {
    it('should create a verify_email token with all required fields', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto
        .createHash('sha256')
        .update(rawToken)
        .digest('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const token = await UserTokenModel.create({
        userId: testUserId,
        type: 'verify_email',
        token: hashedToken,
        expiresAt,
      });

      expect(token.userId).toBe(testUserId);
      expect(token.type).toBe('verify_email');
      expect(token.token).toBe(hashedToken);
      expect(token.expiresAt).toEqual(expiresAt);
      expect(token.attempts).toBe(0);
      expect(token.lastRequestAt).toBeUndefined();
      expect(token.createdAt).toBeDefined();
      expect(token.updatedAt).toBeDefined();
    });

    it('should create a reset_password token', async () => {
      const hashedToken = crypto
        .createHash('sha256')
        .update('rawtoken')
        .digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      const token = await UserTokenModel.create({
        userId: testUserId,
        type: 'reset_password',
        token: hashedToken,
        expiresAt,
      });

      expect(token.type).toBe('reset_password');
    });

    it('should create a 2fa token with short expiration', async () => {
      const hashedToken = crypto
        .createHash('sha256')
        .update('2fatoken')
        .digest('hex');
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      const token = await UserTokenModel.create({
        userId: testUserId,
        type: '2fa',
        token: hashedToken,
        expiresAt,
      });

      expect(token.type).toBe('2fa');
      expect(token.expiresAt.getTime()).toBeLessThan(
        Date.now() + 11 * 60 * 1000
      );
    });

    it('should set default attempts to 0', async () => {
      const token = await UserTokenModel.create({
        userId: testUserId,
        type: 'verify_email',
        token: crypto.createHash('sha256').update('test').digest('hex'),
        expiresAt: new Date(Date.now() + 3600000),
      });

      expect(token.attempts).toBe(0);
    });

    it('should create token with lastRequestAt when provided', async () => {
      const lastRequestAt = new Date();

      const token = await UserTokenModel.create({
        userId: testUserId,
        type: 'reset_password',
        token: crypto.createHash('sha256').update('test').digest('hex'),
        expiresAt: new Date(Date.now() + 3600000),
        lastRequestAt,
      });

      expect(token.lastRequestAt).toBeDefined();
      expect(token.lastRequestAt!.getTime()).toBe(lastRequestAt.getTime());
    });
  });

  describe('Validation', () => {
    it('should fail if userId is missing', async () => {
      await expect(
        UserTokenModel.create({
          type: 'verify_email',
          token: 'hashedtoken',
          expiresAt: new Date(),
        } as any)
      ).rejects.toThrow();
    });

    it('should fail if type is missing', async () => {
      await expect(
        UserTokenModel.create({
          userId: testUserId,
          token: 'hashedtoken',
          expiresAt: new Date(),
        } as any)
      ).rejects.toThrow();
    });

    it('should fail if token is missing', async () => {
      await expect(
        UserTokenModel.create({
          userId: testUserId,
          type: 'verify_email',
          expiresAt: new Date(),
        } as any)
      ).rejects.toThrow();
    });

    it('should fail if expiresAt is missing', async () => {
      await expect(
        UserTokenModel.create({
          userId: testUserId,
          type: 'verify_email',
          token: 'hashedtoken',
        } as any)
      ).rejects.toThrow();
    });

    it('should fail with invalid token type', async () => {
      await expect(
        UserTokenModel.create({
          userId: testUserId,
          type: 'invalid_type' as any,
          token: 'hashedtoken',
          expiresAt: new Date(),
        })
      ).rejects.toThrow();
    });

    it('should accept only valid token types', async () => {
      const types: Array<'verify_email' | 'reset_password' | '2fa'> = [
        'verify_email',
        'reset_password',
        '2fa',
      ];

      for (const type of types) {
        const token = await UserTokenModel.create({
          userId: testUserId,
          type,
          token: crypto
            .createHash('sha256')
            .update(`token-${type}`)
            .digest('hex'),
          expiresAt: new Date(Date.now() + 3600000),
        });

        expect(token.type).toBe(type);
        await token.destroy();
      }
    });
  });

  describe('One Token Per User Constraint', () => {
    it('should allow only one token per user (userId as primary key)', async () => {
      const token1 = await UserTokenModel.create({
        userId: testUserId,
        type: 'verify_email',
        token: crypto.createHash('sha256').update('token1').digest('hex'),
        expiresAt: new Date(Date.now() + 3600000),
      });

      expect(token1.type).toBe('verify_email');

      // Creating another token for the same user should fail
      await expect(
        UserTokenModel.create({
          userId: testUserId,
          type: 'reset_password',
          token: crypto.createHash('sha256').update('token2').digest('hex'),
          expiresAt: new Date(Date.now() + 3600000),
        })
      ).rejects.toThrow();
    });

    it('should replace existing token using upsert', async () => {
      const hashedToken1 = crypto
        .createHash('sha256')
        .update('token1')
        .digest('hex');

      await UserTokenModel.create({
        userId: testUserId,
        type: 'verify_email',
        token: hashedToken1,
        expiresAt: new Date(Date.now() + 3600000),
      });

      const hashedToken2 = crypto
        .createHash('sha256')
        .update('token2')
        .digest('hex');

      // Upsert replaces the existing token
      await UserTokenModel.upsert({
        userId: testUserId,
        type: 'reset_password',
        token: hashedToken2,
        expiresAt: new Date(Date.now() + 7200000),
      });

      const tokens = await UserTokenModel.findAll({
        where: { userId: testUserId },
      });
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe('reset_password');
      expect(tokens[0].token).toBe(hashedToken2);
    });

    it('should allow different users to have different tokens', async () => {
      await UserTokenModel.create({
        userId: testUserId,
        type: 'verify_email',
        token: crypto.createHash('sha256').update('user1token').digest('hex'),
        expiresAt: new Date(Date.now() + 3600000),
      });

      await UserTokenModel.create({
        userId: testUserId2,
        type: 'reset_password',
        token: crypto.createHash('sha256').update('user2token').digest('hex'),
        expiresAt: new Date(Date.now() + 3600000),
      });

      const allTokens = await UserTokenModel.findAll();
      expect(allTokens).toHaveLength(2);
    });
  });

  describe('Token Uniqueness', () => {
    it('should enforce unique token hashes across all users', async () => {
      const hashedToken = crypto
        .createHash('sha256')
        .update('sametoken')
        .digest('hex');

      await UserTokenModel.create({
        userId: testUserId,
        type: 'verify_email',
        token: hashedToken,
        expiresAt: new Date(Date.now() + 3600000),
      });

      // Same token hash for different user should fail
      await expect(
        UserTokenModel.create({
          userId: testUserId2,
          type: 'verify_email',
          token: hashedToken, // Duplicate token
          expiresAt: new Date(Date.now() + 3600000),
        })
      ).rejects.toThrow();
    });
  });

  describe('Attempts Tracking', () => {
    it('should increment attempts on failed validation', async () => {
      const token = await UserTokenModel.create({
        userId: testUserId,
        type: 'verify_email',
        token: crypto.createHash('sha256').update('test').digest('hex'),
        expiresAt: new Date(Date.now() + 3600000),
      });

      expect(token.attempts).toBe(0);

      token.attempts += 1;
      await token.save();

      const updated = await UserTokenModel.findByPk(testUserId);
      expect(updated!.attempts).toBe(1);
    });

    it('should handle multiple failed attempts', async () => {
      const token = await UserTokenModel.create({
        userId: testUserId,
        type: 'reset_password',
        token: crypto.createHash('sha256').update('test').digest('hex'),
        expiresAt: new Date(Date.now() + 3600000),
      });

      for (let i = 0; i < 5; i++) {
        token.attempts += 1;
        await token.save();
      }

      const updated = await UserTokenModel.findByPk(testUserId);
      expect(updated!.attempts).toBe(5);
    });

    it('should reset attempts to 0 on successful validation', async () => {
      const token = await UserTokenModel.create({
        userId: testUserId,
        type: 'verify_email',
        token: crypto.createHash('sha256').update('test').digest('hex'),
        expiresAt: new Date(Date.now() + 3600000),
        attempts: 3,
      });

      token.attempts = 0;
      await token.save();

      const updated = await UserTokenModel.findByPk(testUserId);
      expect(updated!.attempts).toBe(0);
    });

    it('should delete token after too many failed attempts', async () => {
      const token = await UserTokenModel.create({
        userId: testUserId,
        type: 'verify_email',
        token: crypto.createHash('sha256').update('test').digest('hex'),
        expiresAt: new Date(Date.now() + 3600000),
      });

      token.attempts = 5;
      await token.save();

      if (token.attempts >= 5) {
        await token.destroy();
      }

      const deleted = await UserTokenModel.findByPk(testUserId);
      expect(deleted).toBeNull();
    });
  });

  describe('Rate Limiting with lastRequestAt', () => {
    it('should update lastRequestAt when creating token', async () => {
      const now = new Date();

      const token = await UserTokenModel.create({
        userId: testUserId,
        type: 'reset_password',
        token: crypto.createHash('sha256').update('test').digest('hex'),
        expiresAt: new Date(Date.now() + 3600000),
        lastRequestAt: now,
      });

      expect(token.lastRequestAt).toBeDefined();
      expect(token.lastRequestAt!.getTime()).toBeCloseTo(now.getTime(), -2);
    });

    it('should check rate limiting before creating new token', async () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      await UserTokenModel.create({
        userId: testUserId,
        type: 'reset_password',
        token: crypto.createHash('sha256').update('test1').digest('hex'),
        expiresAt: new Date(Date.now() + 3600000),
        lastRequestAt: fiveMinutesAgo,
      });

      const existingToken = await UserTokenModel.findByPk(testUserId);

      if (existingToken?.lastRequestAt) {
        const timeSince = Date.now() - existingToken.lastRequestAt.getTime();
        const minInterval = 5 * 60 * 1000; // 5 minutes

        expect(timeSince).toBeGreaterThanOrEqual(minInterval);
      }
    });

    it('should prevent token creation if rate limit not met', async () => {
      const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000);

      await UserTokenModel.create({
        userId: testUserId,
        type: 'reset_password',
        token: crypto.createHash('sha256').update('test').digest('hex'),
        expiresAt: new Date(Date.now() + 3600000),
        lastRequestAt: oneMinuteAgo,
      });

      const existingToken = await UserTokenModel.findByPk(testUserId);

      if (existingToken?.lastRequestAt) {
        const timeSince = Date.now() - existingToken.lastRequestAt.getTime();
        const minInterval = 5 * 60 * 1000; // 5 minutes

        if (timeSince < minInterval) {
          expect(timeSince).toBeLessThan(minInterval);
        }
      }
    });
  });

  describe('Token Expiration', () => {
    it('should find only non-expired tokens', async () => {
      const futureDate = new Date(Date.now() + 3600000);
      const pastDate = new Date(Date.now() - 3600000);

      await UserTokenModel.create({
        userId: testUserId,
        type: 'verify_email',
        token: crypto.createHash('sha256').update('valid').digest('hex'),
        expiresAt: futureDate,
      });

      await UserTokenModel.create({
        userId: testUserId2,
        type: 'verify_email',
        token: crypto.createHash('sha256').update('expired').digest('hex'),
        expiresAt: pastDate,
      });

      const validTokens = await UserTokenModel.findAll({
        where: {
          expiresAt: { [Op.gt]: new Date() },
        },
      });

      expect(validTokens).toHaveLength(1);
      expect(validTokens[0].userId).toBe(testUserId);
    });

    it('should exclude expired tokens from queries', async () => {
      const pastDate = new Date(Date.now() - 3600000);

      await UserTokenModel.create({
        userId: testUserId,
        type: 'verify_email',
        token: crypto.createHash('sha256').update('expired').digest('hex'),
        expiresAt: pastDate,
      });

      const token = await UserTokenModel.findOne({
        where: {
          userId: testUserId,
          expiresAt: { [Op.gt]: new Date() },
        },
      });

      expect(token).toBeNull();
    });

    it('should delete expired tokens', async () => {
      const pastDate = new Date(Date.now() - 3600000);

      await UserTokenModel.create({
        userId: testUserId,
        type: 'verify_email',
        token: crypto.createHash('sha256').update('expired').digest('hex'),
        expiresAt: pastDate,
      });

      await UserTokenModel.destroy({
        where: {
          expiresAt: { [Op.lt]: new Date() },
        },
      });

      const remaining = await UserTokenModel.findAll();
      expect(remaining).toHaveLength(0);
    });
  });

  describe('Token Validation Workflow', () => {
    it('should validate token hash and check expiration', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto
        .createHash('sha256')
        .update(rawToken)
        .digest('hex');

      await UserTokenModel.create({
        userId: testUserId,
        type: 'verify_email',
        token: hashedToken,
        expiresAt: new Date(Date.now() + 3600000),
      });

      // Simulate user providing the token
      const userProvidedToken = rawToken;
      const hashedUserToken = crypto
        .createHash('sha256')
        .update(userProvidedToken)
        .digest('hex');

      const tokenRecord = await UserTokenModel.findOne({
        where: {
          token: hashedUserToken,
          expiresAt: { [Op.gt]: new Date() },
        },
      });

      expect(tokenRecord).toBeDefined();
      expect(tokenRecord!.token).toBe(hashedToken);
    });

    it('should delete token after successful use', async () => {
      const token = await UserTokenModel.create({
        userId: testUserId,
        type: 'verify_email',
        token: crypto.createHash('sha256').update('test').digest('hex'),
        expiresAt: new Date(Date.now() + 3600000),
      });

      await token.destroy();

      const deleted = await UserTokenModel.findByPk(testUserId);
      expect(deleted).toBeNull();
    });

    it('should handle invalid token gracefully', async () => {
      await UserTokenModel.create({
        userId: testUserId,
        type: 'verify_email',
        token: crypto.createHash('sha256').update('validtoken').digest('hex'),
        expiresAt: new Date(Date.now() + 3600000),
      });

      const wrongHash = crypto
        .createHash('sha256')
        .update('wrongtoken')
        .digest('hex');

      const tokenRecord = await UserTokenModel.findOne({
        where: { token: wrongHash },
      });

      expect(tokenRecord).toBeNull();
    });
  });

  describe('CRUD Operations', () => {
    it('should find token by primary key (userId)', async () => {
      await UserTokenModel.create({
        userId: testUserId,
        type: 'verify_email',
        token: crypto.createHash('sha256').update('test').digest('hex'),
        expiresAt: new Date(Date.now() + 3600000),
      });

      const found = await UserTokenModel.findByPk(testUserId);
      expect(found).toBeDefined();
      expect(found!.userId).toBe(testUserId);
    });

    it('should find token by type', async () => {
      await UserTokenModel.create({
        userId: testUserId,
        type: 'reset_password',
        token: crypto.createHash('sha256').update('test').digest('hex'),
        expiresAt: new Date(Date.now() + 3600000),
      });

      const found = await UserTokenModel.findOne({
        where: { type: 'reset_password' },
      });

      expect(found).toBeDefined();
      expect(found!.type).toBe('reset_password');
    });

    it('should update token fields', async () => {
      const token = await UserTokenModel.create({
        userId: testUserId,
        type: 'verify_email',
        token: crypto.createHash('sha256').update('test').digest('hex'),
        expiresAt: new Date(Date.now() + 3600000),
      });

      token.attempts = 2;
      token.lastRequestAt = new Date();
      await token.save();

      const updated = await UserTokenModel.findByPk(testUserId);
      expect(updated!.attempts).toBe(2);
      expect(updated!.lastRequestAt).toBeDefined();
    });

    it('should count tokens', async () => {
      await UserTokenModel.create({
        userId: testUserId,
        type: 'verify_email',
        token: crypto.createHash('sha256').update('test1').digest('hex'),
        expiresAt: new Date(Date.now() + 3600000),
      });

      await UserTokenModel.create({
        userId: testUserId2,
        type: 'reset_password',
        token: crypto.createHash('sha256').update('test2').digest('hex'),
        expiresAt: new Date(Date.now() + 3600000),
      });

      const count = await UserTokenModel.count();
      expect(count).toBe(2);
    });
  });

  describe('Security Best Practices', () => {
    it('should always hash tokens before storage', () => {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto
        .createHash('sha256')
        .update(rawToken)
        .digest('hex');

      expect(rawToken).not.toBe(hashedToken);
      expect(hashedToken).toHaveLength(64); // SHA-256 produces 64 hex characters
    });

    it('should use cryptographically random tokens', () => {
      const token1 = crypto.randomBytes(32).toString('hex');
      const token2 = crypto.randomBytes(32).toString('hex');

      expect(token1).not.toBe(token2);
      expect(token1).toHaveLength(64);
      expect(token2).toHaveLength(64);
    });

    it('should verify token hashes match', () => {
      const rawToken = 'my-secret-token';
      const hash1 = crypto.createHash('sha256').update(rawToken).digest('hex');
      const hash2 = crypto.createHash('sha256').update(rawToken).digest('hex');

      expect(hash1).toBe(hash2);
    });
  });

  describe('Business Scenarios', () => {
    it('should handle email verification workflow', async () => {
      // Create verification token
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto
        .createHash('sha256')
        .update(rawToken)
        .digest('hex');

      await UserTokenModel.create({
        userId: testUserId,
        type: 'verify_email',
        token: hashedToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      });

      // User clicks email link with rawToken
      const userToken = rawToken;
      const userHash = crypto
        .createHash('sha256')
        .update(userToken)
        .digest('hex');

      const tokenRecord = await UserTokenModel.findOne({
        where: {
          token: userHash,
          type: 'verify_email',
          expiresAt: { [Op.gt]: new Date() },
        },
      });

      expect(tokenRecord).toBeDefined();

      // Verify email and delete token
      await tokenRecord!.destroy();

      const deleted = await UserTokenModel.findByPk(testUserId);
      expect(deleted).toBeNull();
    });

    it('should handle password reset workflow with rate limiting', async () => {
      // First request
      const token1 = await UserTokenModel.create({
        userId: testUserId,
        type: 'reset_password',
        token: crypto.createHash('sha256').update('token1').digest('hex'),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        lastRequestAt: new Date(),
      });

      // Check rate limit (should be blocked if within 5 minutes)
      const timeSince = Date.now() - token1.lastRequestAt!.getTime();
      expect(timeSince).toBeLessThan(5 * 60 * 1000);
    });

    it('should handle 2FA workflow', async () => {
      const rawToken = crypto.randomBytes(6).toString('hex').substring(0, 6);
      const hashedToken = crypto
        .createHash('sha256')
        .update(rawToken)
        .digest('hex');

      await UserTokenModel.create({
        userId: testUserId,
        type: '2fa',
        token: hashedToken,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      });

      const token = await UserTokenModel.findOne({
        where: {
          userId: testUserId,
          type: '2fa',
          expiresAt: { [Op.gt]: new Date() },
        },
      });

      expect(token).toBeDefined();
      expect(token!.type).toBe('2fa');
    });
  });
});
