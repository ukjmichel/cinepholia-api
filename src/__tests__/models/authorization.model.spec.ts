import { Sequelize } from 'sequelize-typescript';
import { AuthorizationModel, Role } from '../../models/authorization.model.js';
import { UserModel } from '../../models/user.model.js';

describe('AuthorizationModel', () => {
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

  it('should have a proper table name', () => {
    const tn = String(AuthorizationModel.getTableName()).toLowerCase();
    // Support "authorization" or "authorizations"
    expect(tn).toMatch(/^authorizations?$/);
  });

  it('should have correct default values on build', () => {
    const a = AuthorizationModel.build({
      userId: 'user-uuid',
    } as any);

    expect(a.userId).toBe('user-uuid');
    // If your model sets a default, verify it loosely:
    // Depending on your enum set (fr/en), role will be one of these
    const allowed = [
      'utilisateur',
      'employé',
      'administrateur',
      'user',
      'staff',
      'admin',
    ];
    expect(allowed).toContain(a.role as unknown as string);
  });

  it('should allow setting role explicitly', () => {
    const a = AuthorizationModel.build({
      userId: 'user-uuid',
      role: 'admin' as Role, // or 'administrateur' if you use FR labels
    });

    expect(a.role).toBe('admin' as Role);
  });

  it('should expose enum options for role', () => {
    // ENUM values live on model attributes
    const roleAttr = AuthorizationModel.getAttributes().role as any;
    // SQLite in-memory emulates enums as CHECK constraints; sequelize keeps "values" on the attribute
    expect(Array.isArray(roleAttr?.values)).toBe(true);
    expect(roleAttr.values.length).toBeGreaterThan(0);

    // Accept either EN or FR role sets
    const fr = ['utilisateur', 'employé', 'administrateur'];
    const en = ['user', 'staff', 'admin'];

    const values: string[] = roleAttr.values;
    const matchesFR = fr.every((v) => values.includes(v));
    const matchesEN = en.every((v) => values.includes(v));

    expect(matchesFR || matchesEN).toBe(true);
  });

  it('should define the user association (belongsTo User)', () => {
    const assoc = AuthorizationModel.associations;
    expect(assoc.user).toBeDefined();
    expect(assoc.user.associationType).toBe('BelongsTo');
  });
});
