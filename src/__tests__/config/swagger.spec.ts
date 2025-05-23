import { setupSwagger } from '../../config/swagger.js';

jest.mock('swagger-jsdoc', () => jest.fn(() => 'mockSwaggerSpec'));
jest.mock('swagger-ui-express', () => ({
  serve: 'mockServeMiddleware',
  setup: jest.fn().mockReturnValue('mockSetupMiddleware'),
}));

describe('setupSwagger', () => {
  let app: any;

  beforeEach(() => {
    app = {
      use: jest.fn(),
      get: jest.fn(),
    };
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('registers /api-docs and /swagger.json endpoints', () => {
    setupSwagger(app);

    expect(app.use).toHaveBeenCalledWith(
      '/api-docs',
      'mockServeMiddleware',
      'mockSetupMiddleware'
    );

    expect(app.get).toHaveBeenCalledWith('/swagger.json', expect.any(Function));
  });

  it('sends swaggerSpec as JSON from /swagger.json handler', () => {
    setupSwagger(app);

    // Find handler from app.get
    const call = app.get.mock.calls.find(
      ([route]: [string]) => route === '/swagger.json'
    );
    expect(call).toBeDefined();
    const handler = call[1];

    // Mocks for req/res
    const req = {};
    const res = { setHeader: jest.fn(), send: jest.fn() };

    handler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/json'
    );
    expect(res.send).toHaveBeenCalledWith('mockSwaggerSpec');
  });

  it('logs the setup steps', () => {
    setupSwagger(app);
    expect(console.log).toHaveBeenCalledWith(
      '📣 setupSwagger() has been called'
    );
    expect(console.log).toHaveBeenCalledWith(
      '✅ Swagger UI available at /api-docs'
    );
    expect(console.log).toHaveBeenCalledWith(
      '✅ Swagger JSON available at /swagger.json'
    );
  });
});
