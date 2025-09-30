import { Sequelize } from 'sequelize-typescript';
import { UserModel } from '../../models/user.model.js';
import { AuthorizationModel } from '../../models/authorization.model.js';
import { sequelize, loadModels } from '../../config/db.js';
import { registerAssociations } from '../../models/association.js';

describe('UserModel', () => {
  beforeAll(async () => {
    // Load all models into Sequelize
    loadModels();

    // Register associations INSIDE beforeAll, after models are loaded
    registerAssociations();

    // Sync database with force:true for clean test environment
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('should have a user-ish table name', () => {
    const tableName = String(UserModel.getTableName());
    // Supports "user" or "users"
    expect(tableName.toLowerCase()).toMatch(/^users?$/);
  });

  it('should expose required attributes', () => {
    const attrs = UserModel.getAttributes();

    expect(attrs).toHaveProperty('userId');
    expect(attrs).toHaveProperty('username');
    expect(attrs).toHaveProperty('email');
    expect(attrs).toHaveProperty('firstName');
    expect(attrs).toHaveProperty('lastName');
    expect(attrs).toHaveProperty('verified');
    expect(attrs).toHaveProperty('createdAt');
    expect(attrs).toHaveProperty('updatedAt');
  });

  it('verified should default to false', () => {
    const attrs = UserModel.getAttributes();
    // default can be defined as boolean false or a function returning false
    const def = (attrs as any).verified?.defaultValue;
    if (typeof def === 'function') {
      expect(def()).toBe(false);
    } else {
      expect(def).toBe(false);
    }
  });

  it('email should be marked unique', () => {
    const attrs = UserModel.getAttributes();
    const unique = (attrs as any).email?.unique;
    expect(Boolean(unique)).toBe(true);
  });

  it('can build a user and get defaults without persisting', () => {
    const u = UserModel.build({
      username: 'johnny',
      email: 'johnny@example.com',
      // no password on purpose; we only test defaults & build-time behavior
    } as any);

    expect(u.username).toBe('johnny');
    expect(u.email).toBe('johnny@example.com');
    expect(u.verified).toBe(false);
  });
});
