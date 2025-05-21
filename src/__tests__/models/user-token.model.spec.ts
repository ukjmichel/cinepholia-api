import { Sequelize } from 'sequelize-typescript';
import { UniqueConstraintError, ForeignKeyConstraintError } from 'sequelize';
import { UserModel } from '../../models/user.model';
import { UserTokenModel } from '../../models/user-token.model';

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

  it('creates a token for a user', async () => {
    const tokenValue = 'sometokenvalue';
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
    // Clean up for test
    await UserTokenModel.destroy({ where: { userId: user.userId } });

    // Create first token
    await UserTokenModel.create({
      userId: user.userId,
      type: 'reset_password',
      token: 'first-token',
      expiresAt: new Date(Date.now() + 1000 * 60 * 15),
    });

    // Try to create another token for the same user
    await expect(
      UserTokenModel.create({
        userId: user.userId,
        type: '2fa', // different type, same user
        token: 'second-token',
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
      token: 'second-user-token',
      expiresAt: new Date(Date.now() + 1000 * 60 * 10),
    });

    expect(token.userId).toBe(user2.userId);
    expect(token.token).toBe('second-user-token');
  });

  it('associates with the user (BelongsTo)', async () => {
    await UserTokenModel.destroy({ where: { userId: user.userId } }); // <-- ADD THIS LINE

    const token = await UserTokenModel.create({
      userId: user.userId,
      type: '2fa',
      token: '2fa-token',
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
        token: 'ghost-token',
        expiresAt: new Date(Date.now() + 1000 * 60 * 5),
      })
    ).rejects.toThrow(ForeignKeyConstraintError);
  });

  it('stores and returns correct timestamps', async () => {
    await UserTokenModel.destroy({ where: { userId: user.userId } });

    const token = await UserTokenModel.create({
      userId: user.userId,
      type: 'verify_email',
      token: 'timestamp-token',
      expiresAt: new Date(Date.now() + 1000 * 60 * 10),
    });

    expect(token.createdAt).toBeInstanceOf(Date);
    expect(token.updatedAt).toBeInstanceOf(Date);
    expect(token.createdAt.getTime()).toBeLessThanOrEqual(
      token.updatedAt.getTime()
    );
  });

  it('removes token successfully', async () => {
    await UserTokenModel.destroy({ where: { userId: user.userId } });

    const token = await UserTokenModel.create({
      userId: user.userId,
      type: 'reset_password',
      token: 'remove-me',
      expiresAt: new Date(Date.now() + 1000 * 60 * 10),
    });

    await expect(token.destroy()).resolves.not.toThrow();
    const found = await UserTokenModel.findOne({
      where: { userId: user.userId },
    });
    expect(found).toBeNull();
  });
});
