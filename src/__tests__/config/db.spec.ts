jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

const mockSync = jest.fn();
const mockThen = jest.fn(() => ({ catch: mockCatch }));
const mockCatch = jest.fn();

jest.mock('sequelize-typescript', () => {
  return {
    Sequelize: jest.fn().mockImplementation((options) => {
      return {
        sync: mockSync,
      };
    }),
  };
});

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
    };

    // Reset all mocks
    (require('dotenv').config as jest.Mock).mockClear();
    mockSync.mockClear();
    mockThen.mockClear();
    mockCatch.mockClear();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = OLD_ENV;
    jest.restoreAllMocks();
    jest.resetModules();
  });

  it('should create Sequelize instance with correct config and call sync (success)', async () => {
    mockSync.mockReturnValueOnce(Promise.resolve()); // simulate sync success

    await import('../../config/db');

    expect(require('dotenv').config).toHaveBeenCalled();

    const { Sequelize } = require('sequelize-typescript');
    expect(Sequelize).toHaveBeenCalledWith({
      dialect: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'pw',
      database: 'testdb',
      models: [],
      logging: false,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    });

    expect(mockSync).toHaveBeenCalledWith({ alter: true });
    // Give time for promise
    await Promise.resolve();
    expect(console.log).toHaveBeenCalledWith('Database synced!');
  });

  it('should log error if sync fails', async () => {
    const err = new Error('sync fail');
    mockSync.mockReturnValueOnce(Promise.reject(err));

    await import('../../config/db');

    // Give time for promise
    await Promise.resolve();
    expect(console.error).toHaveBeenCalledWith('Error syncing database:', err);
  });
});
