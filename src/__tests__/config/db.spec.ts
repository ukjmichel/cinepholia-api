// src/__tests__/config/db.spec.ts

// Mock env module
jest.mock('../../config/env.js', () => ({
  config: {
    mysqlHost: 'localhost',
    mysqlPort: 3306,
    mysqlUser: 'root',
    mysqlPassword: 'pw',
    mysqlDatabase: 'testdb',
    get nodeEnv() {
      return process.env.NODE_ENV || 'development';
    },
  },
}));

// Partial mock sequelize-typescript
const actualSequelizeTs = jest.requireActual('sequelize-typescript');
const mockSync = jest.fn();

jest.mock('sequelize-typescript', () => ({
  ...actualSequelizeTs,
  Sequelize: jest.fn().mockImplementation(() => ({
    sync: mockSync,
  })),
}));

describe('Sequelize DB config', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...OLD_ENV,
      MYSQL_HOST: 'localhost',
      MYSQL_PORT: '3306',
      MYSQL_USER: 'root',
      MYSQL_PASSWORD: 'pw',
      MYSQL_DATABASE: 'testdb',
      NODE_ENV: 'development',
    };
    mockSync.mockClear();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = OLD_ENV;
    jest.restoreAllMocks();
  });

  it('should create Sequelize instance with correct config and call sync (alter:true) in development', async () => {
    mockSync.mockResolvedValueOnce(undefined);

    const dbModule = await import('../../config/db.js');
    await dbModule.syncDB();

    const { Sequelize } = require('sequelize-typescript');
    expect(Sequelize).toHaveBeenCalledWith({
      dialect: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'pw',
      database: 'testdb',
      models: expect.any(Array),
      logging: false,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    });

    expect(mockSync).toHaveBeenCalledWith({ alter: true });
    expect(console.log).toHaveBeenCalledWith('Database synced with alter:true');
  });

  it('should call sync with force:true if NODE_ENV=test', async () => {
    process.env.NODE_ENV = 'test';
    mockSync.mockResolvedValueOnce(undefined);

    const dbModule = await import('../../config/db.js');

    await dbModule.syncDB();

    expect(mockSync).toHaveBeenCalledWith({ force: true });
    expect(console.log).toHaveBeenCalledWith('Test DB synced with force:true');
  });

  it('should log error if sync fails', async () => {
    const err = new Error('sync fail');
    mockSync.mockRejectedValueOnce(err);

    const dbModule = await import('../../config/db.js');

    await expect(dbModule.syncDB()).rejects.toThrow('sync fail');
    expect(console.error).toHaveBeenCalledWith('Error syncing database:', err);
  });
});
