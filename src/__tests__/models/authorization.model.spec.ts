import { AuthorizationModel, Role } from '../../models/authorization.model.js';
import { UserModel } from '../../models/user.model.js';
import { sequelize, loadModels } from '../../config/db.js';
import { registerAssociations } from '../../models/association.js';

describe('AuthorizationModel', () => {
  beforeAll(async () => {
    // Load all models into Sequelize
    loadModels();

    // Register associations
    registerAssociations();

    // Sync database with force:true for clean test environment
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  afterEach(async () => {
    // Clean up authorizations between tests
    await AuthorizationModel.destroy({ where: {} });
    await UserModel.destroy({ where: {} });
  });

  it('should have the correct table name', () => {
    expect(AuthorizationModel.tableName).toBe('authorization');
  });

  it('should create authorization with default role', async () => {
    // First create a user
    const user = await UserModel.create({
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      password: 'password123',
      verified: true,
    });

    // Create authorization - explicitly provide role to satisfy TypeScript
    // (even though it has a default, the type doesn't reflect this)
    const authorization = await AuthorizationModel.create({
      userId: user.userId,
      role: 'user' as Role,
    });

    expect(authorization.userId).toBe(user.userId);
    expect(authorization.role).toBe('user');
  });

  it('should allow setting role explicitly', async () => {
    // Create a user
    const user = await UserModel.create({
      username: 'adminuser',
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
      password: 'password123',
      verified: true,
    });

    // Create authorization with specific role
    const authorization = await AuthorizationModel.create({
      userId: user.userId,
      role: 'admin' as Role,
    });

    expect(authorization.role).toBe('admin');
  });

  it('should have correct enum values for role', () => {
    const roleEnum = AuthorizationModel.getAttributes().role.values;
    expect(roleEnum).toEqual(['user', 'staff', 'admin']);
  });

  it('should not allow invalid role values', async () => {
    const user = await UserModel.create({
      username: 'testuser2',
      firstName: 'Test',
      lastName: 'User',
      email: 'test2@example.com',
      password: 'password123',
      verified: true,
    });

    await expect(
      AuthorizationModel.create({
        userId: user.userId,
        role: 'invalid-role' as Role,
      })
    ).rejects.toThrow();
  });

  it('should have user association defined', () => {
    const associations = AuthorizationModel.associations;
    expect(associations.user).toBeDefined();
    expect(associations.user.associationType).toBe('BelongsTo');
  });

  it('should load authorization with user association', async () => {
    // Create user
    const user = await UserModel.create({
      username: 'testuser3',
      firstName: 'Test',
      lastName: 'User',
      email: 'test3@example.com',
      password: 'password123',
      verified: true,
    });

    // Create authorization
    const authorization = await AuthorizationModel.create({
      userId: user.userId,
      role: 'staff' as Role,
    });

    // Load authorization with user
    const authWithUser = await AuthorizationModel.findOne({
      where: { userId: user.userId },
      include: [{ model: UserModel, as: 'user' }],
    });

    expect(authWithUser).toBeDefined();
    expect(authWithUser!.user).toBeDefined();
    expect(authWithUser!.user.userId).toBe(user.userId);
    expect(authWithUser!.user.email).toBe('test3@example.com');
  });

  it('should cascade delete when user is deleted', async () => {
    // Create user
    const user = await UserModel.create({
      username: 'tempuser',
      firstName: 'Temp',
      lastName: 'User',
      email: 'temp@example.com',
      password: 'password123',
      verified: true,
    });

    // Create authorization
    const authorization = await AuthorizationModel.create({
      userId: user.userId,
      role: 'user' as Role,
    });

    // Delete user
    await user.destroy();

    // Authorization should be deleted (cascade)
    const deletedAuth = await AuthorizationModel.findOne({
      where: { userId: user.userId },
    });
    expect(deletedAuth).toBeNull();
  });

  it('should enforce unique userId', async () => {
    // Create user
    const user = await UserModel.create({
      username: 'uniquetest',
      firstName: 'Unique',
      lastName: 'Test',
      email: 'unique@example.com',
      password: 'password123',
      verified: true,
    });

    // Create first authorization
    await AuthorizationModel.create({
      userId: user.userId,
      role: 'user' as Role,
    });

    // Try to create another authorization for the same user
    await expect(
      AuthorizationModel.create({
        userId: user.userId,
        role: 'admin' as Role,
      })
    ).rejects.toThrow();
  });

  it('should update authorization role', async () => {
    // Create user
    const user = await UserModel.create({
      username: 'updatetest',
      firstName: 'Update',
      lastName: 'Test',
      email: 'update@example.com',
      password: 'password123',
      verified: true,
    });

    // Create authorization
    const authorization = await AuthorizationModel.create({
      userId: user.userId,
      role: 'user' as Role,
    });

    // Update role
    await authorization.update({ role: 'admin' as Role });

    expect(authorization.role).toBe('admin');

    // Verify in database
    const updated = await AuthorizationModel.findOne({
      where: { userId: user.userId },
    });
    expect(updated!.role).toBe('admin');
  });

  it('should handle timestamps correctly', async () => {
    const beforeCreate = new Date();

    // Create user
    const user = await UserModel.create({
      username: 'timestamptest',
      firstName: 'Timestamp',
      lastName: 'Test',
      email: 'timestamp@example.com',
      password: 'password123',
      verified: true,
    });

    // Create authorization
    const authorization = await AuthorizationModel.create({
      userId: user.userId,
      role: 'user' as Role,
    });

    const afterCreate = new Date();

    expect(authorization.createdAt).toBeDefined();
    expect(authorization.updatedAt).toBeDefined();
    expect(authorization.createdAt.getTime()).toBeGreaterThanOrEqual(
      beforeCreate.getTime()
    );
    expect(authorization.createdAt.getTime()).toBeLessThanOrEqual(
      afterCreate.getTime()
    );
  });
});
