import { Sequelize } from 'sequelize-typescript';
import { AuthorizationModel, Role } from '../../models/authorization.model.js';
import { UserModel } from '../../models/user.model.js';
import { authorizationService } from '../../services/authorization.service.js';
import { NotFoundError } from '../../errors/not-found-error.js';
import { ConflictError } from '../../errors/conflict-error.js';

// Setup a new in-memory DB for each test file
let sequelize: Sequelize;

beforeAll(async () => {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false,
    models: [UserModel, AuthorizationModel],
  });
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

describe('AuthorizationService', () => {
  let user: UserModel;

  beforeEach(async () => {
    await AuthorizationModel.destroy({ where: {} });
    await UserModel.destroy({ where: {} });

    user = await UserModel.create({
      userId: 'test-user-id',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      email: 'testuser@email.com',
      password: 'password',
      verified: true,
    });
  });

  it('creates authorization for a user', async () => {
    const auth = await authorizationService.createAuthorization({
      userId: user.userId,
      role: 'employé',
    });
    expect(auth.userId).toBe(user.userId);
    expect(auth.role).toBe('employé');
  });

  it('throws ConflictError if authorization already exists', async () => {
    await authorizationService.createAuthorization({
      userId: user.userId,
      role: 'administrateur',
    });
    await expect(
      authorizationService.createAuthorization({
        userId: user.userId,
        role: 'utilisateur',
      })
    ).rejects.toThrow(ConflictError);
  });

  it('throws NotFoundError if user does not exist', async () => {
    await expect(
      authorizationService.createAuthorization({
        userId: 'does-not-exist',
        role: 'utilisateur',
      })
    ).rejects.toThrow(NotFoundError);
  });

  it('gets authorization by userId', async () => {
    await authorizationService.createAuthorization({
      userId: user.userId,
      role: 'employé',
    });
    const auth = await authorizationService.getAuthorizationByUserId(
      user.userId
    );
    expect(auth.userId).toBe(user.userId);
    expect(auth.role).toBe('employé');
    expect(auth.user.email).toBe(user.email);
  });

  it('throws NotFoundError if get by userId does not exist', async () => {
    await expect(
      authorizationService.getAuthorizationByUserId('bad-id')
    ).rejects.toThrow(NotFoundError);
  });

  it('updates authorization role', async () => {
    await authorizationService.createAuthorization({
      userId: user.userId,
      role: 'utilisateur',
    });
    const updated = await authorizationService.updateAuthorizationRole(
      user.userId,
      'administrateur'
    );
    expect(updated.role).toBe('administrateur');
  });

  it('throws NotFoundError when updating non-existing authorization', async () => {
    await expect(
      authorizationService.updateAuthorizationRole('missing', 'employé')
    ).rejects.toThrow(NotFoundError);
  });

  it('deletes authorization', async () => {
    await authorizationService.createAuthorization({
      userId: user.userId,
      role: 'utilisateur',
    });
    await expect(
      authorizationService.deleteAuthorization(user.userId)
    ).resolves.toBeUndefined();
    await expect(
      authorizationService.getAuthorizationByUserId(user.userId)
    ).rejects.toThrow(NotFoundError);
  });

  it('throws NotFoundError when deleting non-existing authorization', async () => {
    await expect(
      authorizationService.deleteAuthorization('missing')
    ).rejects.toThrow(NotFoundError);
  });

  it('lists authorizations (all, and by role)', async () => {
    const user2 = await UserModel.create({
      userId: 'test2',
      username: 'user2',
      firstName: 'User',
      lastName: 'Two',
      email: 'user2@email.com',
      password: 'password',
      verified: true,
    });
    await authorizationService.createAuthorization({
      userId: user.userId,
      role: 'employé',
    });
    await authorizationService.createAuthorization({
      userId: user2.userId,
      role: 'administrateur',
    });

    const all = await authorizationService.listAuthorizations();
    expect(all.length).toBe(2);

    const admins =
      await authorizationService.listAuthorizations('administrateur');
    expect(admins.length).toBe(1);
    expect(admins[0].userId).toBe('test2');
  });
});
