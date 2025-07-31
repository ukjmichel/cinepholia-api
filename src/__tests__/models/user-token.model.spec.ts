import { Sequelize } from 'sequelize-typescript';
import { UniqueConstraintError, ForeignKeyConstraintError } from 'sequelize';
import crypto from 'crypto';
import { UserModel } from '../../models/user.model.js';
import { UserTokenModel } from '../../models/user-token.model.js';

const hashToken = (token: string) =>
  crypto.createHash('sha256').update(token).digest('hex');

describe('UserTokenModel (single token per user)', () => {
  let sequelize: Sequelize;
  let user: UserModel;

  beforeAll(async () => {
    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: ':memory:',
      logging: false,
      models: [UserModel, UserTokenModel],
    });
    await sequelize.sync({ force: true });

    user = await UserModel.create({
      username: 'onetokenuser',
      firstName: 'Token',
      lastName: 'User',
      email: 'onetoken.user@example.com',
      password: 'testpass',
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    await UserTokenModel.destroy({ where: {} });
  });

  it('creates a token for a user', async () => {
    const tokenValue = hashToken('sometokenvalue');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 10);

    const token = await UserTokenModel.create({
      userId: user.userId,
      type: 'verify_email',
      token: tokenValue,
      expiresAt,
    });

    expect(token.userId).toBe(user.userId);
    expect(token.type).toBe('verify_email');
    expect(token.token).toBe(tokenValue);
    expect(token.expiresAt.getTime()).toBe(expiresAt.getTime());
  });

  it('does not allow a second token for the same user', async () => {
    await UserTokenModel.create({
      userId: user.userId,
      type: 'reset_password',
      token: hashToken('first-token'),
      expiresAt: new Date(Date.now() + 1000 * 60 * 15),
    });

    await expect(
      UserTokenModel.create({
        userId: user.userId,
        type: '2fa',
        token: hashToken('second-token'),
        expiresAt: new Date(Date.now() + 1000 * 60 * 15),
      })
    ).rejects.toThrow(UniqueConstraintError);
  });

  it('allows creating tokens for different users', async () => {
    const user2 = await UserModel.create({
      username: 'seconduser',
      firstName: 'Second',
      lastName: 'User',
      email: 'second.user@example.com',
      password: 'testpass2',
    });

    const token = await UserTokenModel.create({
      userId: user2.userId,
      type: '2fa',
      token: hashToken('second-user-token'),
      expiresAt: new Date(Date.now() + 1000 * 60 * 10),
    });

    expect(token.userId).toBe(user2.userId);
    expect(token.token).toBe(hashToken('second-user-token'));
  });

  it('associates with the user (BelongsTo)', async () => {
    const token = await UserTokenModel.create({
      userId: user.userId,
      type: '2fa',
      token: hashToken('2fa-token'),
      expiresAt: new Date(Date.now() + 1000 * 60 * 5),
    });

    const associatedUser = await token.$get('user');
    expect(associatedUser).toBeTruthy();
    expect(associatedUser!.username).toBe('onetokenuser');
  });

  it('fails if token created for non-existent user', async () => {
    await expect(
      UserTokenModel.create({
        userId: '00000000-0000-0000-0000-000000000000',
        type: 'verify_email',
        token: hashToken('ghost-token'),
        expiresAt: new Date(Date.now() + 1000 * 60 * 5),
      })
    ).rejects.toThrow(ForeignKeyConstraintError);
  });

  it('stores and returns correct timestamps', async () => {
    const token = await UserTokenModel.create({
      userId: user.userId,
      type: 'verify_email',
      token: hashToken('timestamp-token'),
      expiresAt: new Date(Date.now() + 1000 * 60 * 10),
    });

    expect(token.createdAt).toBeInstanceOf(Date);
    expect(token.updatedAt).toBeInstanceOf(Date);
    expect(token.createdAt.getTime()).toBeLessThanOrEqual(
      token.updatedAt.getTime()
    );
  });

  it('removes token successfully', async () => {
    const token = await UserTokenModel.create({
      userId: user.userId,
      type: 'reset_password',
      token: hashToken('remove-me'),
      expiresAt: new Date(Date.now() + 1000 * 60 * 10),
    });

    await expect(token.destroy()).resolves.not.toThrow();
    const found = await UserTokenModel.findOne({
      where: { userId: user.userId },
    });
    expect(found).toBeNull();
  });

  // ✅ Additional Tests for Coverage

  it('defaults attempts to 0', async () => {
    const token = await UserTokenModel.create({
      userId: user.userId,
      type: '2fa',
      token: hashToken('default-attempt'),
      expiresAt: new Date(Date.now() + 600_000),
    });

    expect(token.attempts).toBe(0);
  });

  it('increments attempts and persists', async () => {
    const token = await UserTokenModel.create({
      userId: user.userId,
      type: '2fa',
      token: hashToken('increment-attempt'),
      expiresAt: new Date(Date.now() + 600_000),
    });

    token.attempts += 1;
    await token.save();

    const reloaded = await UserTokenModel.findByPk(user.userId);
    expect(reloaded!.attempts).toBe(1);
  });

  it('fails if token hash is reused across users', async () => {
    const hash = hashToken('duplicate-hash');

    await UserTokenModel.create({
      userId: user.userId,
      type: 'verify_email',
      token: hash,
      expiresAt: new Date(Date.now() + 600_000),
    });

    const user2 = await UserModel.create({
      username: 'dupuser',
      firstName: 'Dup',
      lastName: 'User',
      email: 'dup@example.com',
      password: 'pass',
    });

    await expect(
      UserTokenModel.create({
        userId: user2.userId,
        type: 'reset_password',
        token: hash, // same token hash
        expiresAt: new Date(Date.now() + 600_000),
      })
    ).rejects.toThrow(UniqueConstraintError);
  });

  it('allows setting lastRequestAt explicitly', async () => {
    const now = new Date();
    const token = await UserTokenModel.create({
      userId: user.userId,
      type: 'verify_email',
      token: hashToken('with-last-request'),
      expiresAt: new Date(Date.now() + 600_000),
      lastRequestAt: now,
    });

    expect(token.lastRequestAt?.getTime()).toBeCloseTo(now.getTime(), -2);
  });

  it('creates token with past expiresAt (expired)', async () => {
    const expiredAt = new Date(Date.now() - 60 * 1000);

    const token = await UserTokenModel.create({
      userId: user.userId,
      type: 'verify_email',
      token: hashToken('expired-token'),
      expiresAt: expiredAt,
    });

    expect(token.expiresAt.getTime()).toBeLessThan(Date.now());
  });

  it('creates token with custom attempts and lastRequestAt', async () => {
    const now = new Date();
    const token = await UserTokenModel.create({
      userId: user.userId,
      type: 'reset_password',
      token: hashToken('custom-token'),
      expiresAt: new Date(Date.now() + 600_000),
      attempts: 3,
      lastRequestAt: now,
    });

    expect(token.attempts).toBe(3);
    expect(token.lastRequestAt?.getTime()).toBeCloseTo(now.getTime(), -2);
  });

  it('updates updatedAt on save', async () => {
    const token = await UserTokenModel.create({
      userId: user.userId,
      type: '2fa',
      token: hashToken('update-time'),
      expiresAt: new Date(Date.now() + 600_000),
    });

    const beforeUpdate = token.updatedAt;

    await new Promise((r) => setTimeout(r, 10));
    token.attempts = 2;
    await token.save();

    expect(token.updatedAt.getTime()).toBeGreaterThan(beforeUpdate.getTime());
  });

  it('deletes token on bulk user deletion', async () => {
    const user3 = await UserModel.create({
      username: 'bulkuser',
      firstName: 'Bulk',
      lastName: 'Delete',
      email: 'bulk@delete.com',
      password: 'bulkpass',
    });

    await UserTokenModel.create({
      userId: user3.userId,
      type: 'verify_email',
      token: hashToken('bulk-token'),
      expiresAt: new Date(Date.now() + 600_000),
    });

    await UserModel.destroy({ where: { userId: user3.userId } });

    const token = await UserTokenModel.findOne({
      where: { userId: user3.userId },
    });
    expect(token).toBeNull();
  });
});
