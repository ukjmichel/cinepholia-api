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
    // Mock mongoose with connection object
    jest.doMock('mongoose', () => ({
      connect: mockConnect.mockResolvedValue({}),
      connection: {
        name: 'testdb',
      },
    }));

    // Mock config module
    jest.doMock('../../config/env.js', () => ({
      config: {
        mongodbUri: 'mongodb://testhost:27017/testdb',
      },
    }));

    // Import the NAMED export (not default)
    const { connectMongoDB: importedFunction } = await import(
      '../../config/mongo.js'
    );
    connectMongoDB = importedFunction;

    await connectMongoDB();

    expect(mockConnect).toHaveBeenCalledWith('mongodb://testhost:27017/testdb');
    expect(console.log).toHaveBeenCalledWith(
      '✅ Connected to MongoDB:',
      'testdb'
    );
    expect(console.error).not.toHaveBeenCalled();
    expect(process.exit).not.toHaveBeenCalled();
  });

  it('logs error and exits if connect throws', async () => {
    const error = new Error('fail');
    // Mock mongoose connect to reject
    jest.doMock('mongoose', () => ({
      connect: mockConnect.mockRejectedValue(error),
      connection: {
        name: 'testdb',
      },
    }));

    jest.doMock('../../config/env.js', () => ({
      config: {
        mongodbUri: 'mongodb://failhost:27017/faildb',
      },
    }));

    const { connectMongoDB: importedFunction } = await import(
      '../../config/mongo.js'
    );
    connectMongoDB = importedFunction;

    await connectMongoDB();

    expect(mockConnect).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      '❌ MongoDB connection error:',
      error
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('logs error and exits if MONGODB_URI is missing', async () => {
    jest.doMock('mongoose', () => ({
      connect: mockConnect,
      connection: {
        name: 'testdb',
      },
    }));

    jest.doMock('../../config/env.js', () => ({
      config: {
        mongodbUri: undefined,
      },
    }));

    const { connectMongoDB: importedFunction } = await import(
      '../../config/mongo.js'
    );
    connectMongoDB = importedFunction;

    await connectMongoDB();

    expect(console.error).toHaveBeenCalledWith(
      '❌ MongoDB connection error:',
      expect.any(Error)
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
