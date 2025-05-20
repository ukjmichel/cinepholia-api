// config/__tests__/mongo.spec.ts

jest.mock('mongoose', () => ({
  connect: jest.fn(),
}));

describe('connectMongoDB', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest
      .spyOn(process, 'exit')
      .mockImplementation(((code?: number) => {}) as never);
  });

  afterEach(() => {
    process.env = OLD_ENV;
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('connects successfully and logs on success', async () => {
    process.env.MONGODB_URI = 'mongodb://testhost:27017/testdb';
    const { connect } = require('mongoose');
    (connect as jest.Mock).mockResolvedValueOnce({});
    const connectMongoDB = (await import('../../config/mongo')).default;

    await connectMongoDB();

    expect(connect).toHaveBeenCalledWith(
      'mongodb://testhost:27017/testdb',
      expect.objectContaining({
        useNewUrlParser: true,
        useUnifiedTopology: true,
      })
    );
    expect(console.log).toHaveBeenCalledWith('✅ Connected to MongoDB');
    expect(console.error).not.toHaveBeenCalled();
    expect(process.exit).not.toHaveBeenCalled();
  });

  it('logs error and exits if connect throws', async () => {
    process.env.MONGODB_URI = 'mongodb://fail:27017/faildb';
    const { connect } = require('mongoose');
    const err = new Error('nope');
    (connect as jest.Mock).mockRejectedValueOnce(err);
    const connectMongoDB = (await import('../../config/mongo')).default;

    await connectMongoDB();

    expect(connect).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      '❌ MongoDB connection error:',
      err
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('throws and logs if MONGODB_URI is missing', async () => {
    delete process.env.MONGODB_URI;
    const connectMongoDB = (await import('../../config/mongo')).default;

    await connectMongoDB();

    expect(console.error).toHaveBeenCalledWith(
      '❌ MongoDB connection error:',
      expect.any(Error)
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
