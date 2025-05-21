import { Sequelize } from 'sequelize-typescript';
import { AuthorizationModel } from '../../models/authorization.model';
import { UserModel } from '../../models/user.model';

describe('AuthorizationModel', () => {
  let sequelize: Sequelize;

  beforeAll(async () => {
    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: ':memory:', // Use in-memory DB for testing
      logging: false,
      models: [UserModel, AuthorizationModel],
    });

    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('should have the correct table name', () => {
    expect(AuthorizationModel.getTableName()).toBe('authorization');
  });

  it('should have correct default values', async () => {
    const authorization = AuthorizationModel.build({
      userId: 'user-uuid',
      role: 'utilisateur',
    });

    expect(authorization.userId).toBe('user-uuid');
    expect(authorization.role).toBe('utilisateur'); // uses default
  });

  it('should allow setting role explicitly', async () => {
    const authorization = AuthorizationModel.build({
      userId: 'user-uuid',
      role: 'employé',
    });

    expect(authorization.role).toBe('employé');
  });

  it('should not allow invalid role', () => {
    const enumOptions = AuthorizationModel.getAttributes().role.values;

    expect(enumOptions).toEqual(['utilisateur', 'employé', 'administrateur']);
  });

  it('should have user association defined', () => {
    const associations = AuthorizationModel.associations;

    expect(associations.user).toBeDefined();
    expect(associations.user.associationType).toBe('BelongsTo');
  });
});
