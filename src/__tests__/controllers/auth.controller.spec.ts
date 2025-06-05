import { login } from '../../controllers/auth.controller.js';
import { authService } from '../../services/auth.service.js';
import { userService } from '../../services/user.service.js';
import { authorizationService } from '../../services/authorization.service.js'; // Correct import
import { BadRequestError } from '../../errors/bad-request-error.js';

// Correctly mock all dependencies!
jest.mock('../../services/auth.service.js');
jest.mock('../../services/user.service.js');
jest.mock('../../services/authorization.service.js');

const mockRequest = (body = {}) => ({ body });
const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res); // <<-- THE FIX!
  return res;
};
const mockNext = jest.fn();

describe('authController.login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should login user and return tokens and user data (with default role)', async () => {
    const tokens = {
      accessToken: 'access_token',
      refreshToken: 'refresh_token',
    };
    const user = {
      userId: '1',
      username: 'user',
      email: 'u@ex.com',
      firstName: 'Test',
      lastName: 'User',
      get: function () {
        return this;
      }, // mock sequelize get
    };

    (authService.login as jest.Mock).mockResolvedValue(tokens);
    (userService.getUserByUsernameOrEmail as jest.Mock).mockResolvedValue(user);
    (
      authorizationService.getAuthorizationByUserId as jest.Mock
    ).mockResolvedValue(null);

    const req = mockRequest({ emailOrUsername: 'user', password: 'pass' });
    const res = mockResponse();

    await login(req as any, res as any, mockNext);

    expect(authService.login).toHaveBeenCalledWith('user', 'pass');
    expect(userService.getUserByUsernameOrEmail).toHaveBeenCalledWith('user');
    expect(res.cookie).toHaveBeenCalled(); // (optional) check cookie was set
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Login successful',
      data: {
        user: {
          userId: '1',
          username: 'user',
          firstName: 'Test',
          lastName: 'User',
          email: 'u@ex.com',
          role: 'utilisateur',
        },
      },
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should login user and return tokens and user data (with employee role)', async () => {
    const tokens = {
      accessToken: 'access_token',
      refreshToken: 'refresh_token',
    };
    const user = {
      userId: '2',
      username: 'employee',
      email: 'e@ex.com',
      firstName: 'Emp',
      lastName: 'Loyee',
      get: function () {
        return this;
      },
    };

    (authService.login as jest.Mock).mockResolvedValue(tokens);
    (userService.getUserByUsernameOrEmail as jest.Mock).mockResolvedValue(user);
    (
      authorizationService.getAuthorizationByUserId as jest.Mock
    ).mockResolvedValue({
      role: 'employé',
    });

    const req = mockRequest({ emailOrUsername: 'employee', password: 'pass' });
    const res = mockResponse();

    await login(req as any, res as any, mockNext);

    expect(res.cookie).toHaveBeenCalled(); // (optional)
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Login successful',
      data: {
        user: {
          userId: '2',
          username: 'employee',
          firstName: 'Emp',
          lastName: 'Loyee',
          email: 'e@ex.com',
          role: 'employé',
        },
      },
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should call next with BadRequestError if missing credentials', async () => {
    const req = mockRequest({});
    const res = mockResponse();

    await login(req as any, res as any, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it('should call next with BadRequestError if user not found', async () => {
    (authService.login as jest.Mock).mockResolvedValue({
      accessToken: 'access_token',
      refreshToken: 'refresh_token',
    });
    (userService.getUserByUsernameOrEmail as jest.Mock).mockResolvedValue(null);

    const req = mockRequest({ emailOrUsername: 'ghost', password: 'pass' });
    const res = mockResponse();

    await login(req as any, res as any, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it('should call next with error on failure', async () => {
    (authService.login as jest.Mock).mockRejectedValue(new Error('fail'));
    const req = mockRequest({ emailOrUsername: 'user', password: 'pass' });
    const res = mockResponse();

    await login(req as any, res as any, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
  });
});
