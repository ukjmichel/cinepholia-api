describe('connectMongoDB', () => {
  const OLD_ENV = process.env;
  let connectMongoDB: () => Promise<void>;
  const mockConnect = jest.fn();

  beforeEach(() => {
    jest.resetModules(); // Clear module cache
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
    // Mock mongoose
    jest.doMock('mongoose', () => ({
      connect: mockConnect.mockResolvedValue({}),
    }));

    // Mock config module
    jest.doMock('../../config/env.js', () => ({
      config: {
        mongodbUri: 'mongodb://testhost:27017/testdb',
      },
    }));

    // Import module AFTER mocks applied
    connectMongoDB = (await import('../../config/mongo.js')).default;

    await connectMongoDB();

    expect(mockConnect).toHaveBeenCalledWith('mongodb://testhost:27017/testdb');
    expect(console.log).toHaveBeenCalledWith('✅ Connected to MongoDB');
    expect(console.error).not.toHaveBeenCalled();
    expect(process.exit).not.toHaveBeenCalled();
  });

  it('logs error and exits if connect throws', async () => {
    const error = new Error('fail');
    // Mock mongoose connect to reject
    jest.doMock('mongoose', () => ({
      connect: mockConnect.mockRejectedValue(error),
    }));

    jest.doMock('../../config/env.js', () => ({
      config: {
        mongodbUri: 'mongodb://failhost:27017/faildb',
      },
    }));

    connectMongoDB = (await import('../../config/mongo.js')).default;

    await connectMongoDB();

    expect(mockConnect).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      '❌ MongoDB connection error:',
      error
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('logs error and exits if MONGODB_URI is missing', async () => {
    jest.doMock('../../config/env', () => ({
      config: {
        mongodbUri: undefined,
      },
    }));

    connectMongoDB = (await import('../../config/mongo.js')).default;

    await connectMongoDB();

    expect(console.error).toHaveBeenCalledWith(
      '❌ MongoDB connection error:',
      expect.any(Error)
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
