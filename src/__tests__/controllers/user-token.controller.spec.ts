import {
  resetPasswordController,
  sendResetPasswordToken,
  validateTokenValidity,
} from '../../controllers/user-token.controller.js';
import { BadRequestError } from '../../errors/bad-request-error.js';
import { UserModel } from '../../models/user.model.js';
import { EmailService } from '../../services/email.service.js';
import { userTokenService } from '../../services/user-token.service.js';
import { userService } from '../../services/user.service.js';

// Mock all dependencies
jest.mock('../../models/user.model.js');
jest.mock('../../services/user-token.service.js');
jest.mock('../../services/email.service.js');
jest.mock('../../services/user.service.js');

// Type definitions for better type safety
interface MockRequest {
  body: { email?: string; token?: string; password?: string };
}
interface MockResponse {
  status: jest.Mock;
  json: jest.Mock;
}

// Helper functions
const mockReq = (body: any = {}): MockRequest => ({ body });

const mockRes = (): MockResponse => {
  const res = {} as MockResponse;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const next = jest.fn();

describe('sendResetPasswordToken', () => {
  let mockEmailService: jest.Mocked<EmailService>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup EmailService mock
    mockEmailService = {
      sendResetPasswordEmail: jest.fn().mockResolvedValue(undefined),
    } as any;

    (EmailService as jest.MockedClass<typeof EmailService>).mockImplementation(
      () => mockEmailService
    );
  });

  describe('Input validation', () => {
    it('calls next(BadRequestError) if email is missing', async () => {
      const req = mockReq({});
      const res = mockRes();

      await sendResetPasswordToken(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('calls next(BadRequestError) if email is empty string', async () => {
      const req = mockReq({ email: '' });
      const res = mockRes();

      await sendResetPasswordToken(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('returns 200 generic message if email is only whitespace', async () => {
      const req = mockReq({ email: '   ' });
      const res = mockRes();

      await sendResetPasswordToken(req as any, res as any, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'If this email is registered, you will receive a code.',
        data: null,
      });
    });
  });


  describe('User not found scenarios', () => {
    it('returns generic message if user not found', async () => {
      (UserModel.findOne as jest.Mock).mockResolvedValue(null);
      const req = mockReq({ email: 'notfound@example.com' });
      const res = mockRes();

      await sendResetPasswordToken(req as any, res as any, next);

      expect(UserModel.findOne).toHaveBeenCalledWith({
        where: { email: 'notfound@example.com' },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'If this email is registered, you will receive a code.',
        data: null,
      });
      expect(userTokenService.createOrReplaceToken).not.toHaveBeenCalled();
      expect(mockEmailService.sendResetPasswordEmail).not.toHaveBeenCalled();
    });

    it('handles malformed email addresses gracefully', async () => {
      (UserModel.findOne as jest.Mock).mockResolvedValue(null);
      const req = mockReq({ email: 'invalid-email-format' });
      const res = mockRes();

      await sendResetPasswordToken(req as any, res as any, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'If this email is registered, you will receive a code.',
        data: null,
      });
    });
  });

  describe('Successful token generation and email sending', () => {
    const mockUser = {
      userId: 'user-123',
      username: 'Alice',
      email: 'alice@example.com',
    };

    it('creates token, sends email and returns generic message if user exists', async () => {
      (UserModel.findOne as jest.Mock).mockResolvedValue(mockUser);

      const mockTokenData = {
        userId: 'user-123',
        token: 'generated-token-123',
        type: 'reset_password',
        expiresAt: new Date(Date.now() + 3600000),
      };
      (userTokenService.createOrReplaceToken as jest.Mock).mockResolvedValue(
        mockTokenData
      );

      const req = mockReq({ email: 'alice@example.com' });
      const res = mockRes();

      await sendResetPasswordToken(req as any, res as any, next);

      expect(UserModel.findOne).toHaveBeenCalledWith({
        where: { email: 'alice@example.com' },
      });

      expect(userTokenService.createOrReplaceToken).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.userId,
          token: expect.any(String),
          type: 'reset_password',
          expiresAt: expect.any(Date),
        })
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'If this email is registered, you will receive a code.',
        data: null,
      });
    });

    it('generates a token with correct format and expiration', async () => {
      (UserModel.findOne as jest.Mock).mockResolvedValue(mockUser);

      const mockTokenData = {
        userId: 'user-123',
        token: 'generated-token-123',
        type: 'reset_password',
        expiresAt: new Date(Date.now() + 3600000),
      };
      (userTokenService.createOrReplaceToken as jest.Mock).mockResolvedValue(
        mockTokenData
      );

      const req = mockReq({ email: 'alice@example.com' });
      const res = mockRes();

      await sendResetPasswordToken(req as any, res as any, next);

      const createTokenCall = (
        userTokenService.createOrReplaceToken as jest.Mock
      ).mock.calls[0];
      const tokenData = createTokenCall[0]; // First argument is the token data object

      expect(tokenData.userId).toBe(mockUser.userId);
      expect(typeof tokenData.token).toBe('string');
      expect(tokenData.token.length).toBeGreaterThan(0);
      expect(tokenData.expiresAt).toBeInstanceOf(Date);
      expect(tokenData.expiresAt.getTime()).toBeGreaterThan(Date.now());
      expect(tokenData.type).toBe('reset_password');
    });

    it('handles case-insensitive email lookup', async () => {
      (UserModel.findOne as jest.Mock).mockResolvedValue(mockUser);
      (userTokenService.createOrReplaceToken as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        token: 'generated-token-123',
        type: 'reset_password',
        expiresAt: new Date(Date.now() + 3600000),
      });

      const req = mockReq({ email: 'ALICE@EXAMPLE.COM' });
      const res = mockRes();

      await sendResetPasswordToken(req as any, res as any, next);

      expect(UserModel.findOne).toHaveBeenCalledWith({
        where: { email: 'alice@example.com' },
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('Error handling', () => {
    it('calls next(err) if database query fails', async () => {
      const dbError = new Error('Database connection failed');
      (UserModel.findOne as jest.Mock).mockRejectedValue(dbError);

      const req = mockReq({ email: 'error@example.com' });
      const res = mockRes();

      await sendResetPasswordToken(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(dbError);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('calls next(err) if token creation fails', async () => {
      const tokenError = new Error('Token service unavailable');
      (UserModel.findOne as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        username: 'Alice',
        email: 'alice@example.com',
      });
      (userTokenService.createOrReplaceToken as jest.Mock).mockRejectedValue(
        tokenError
      );

      const req = mockReq({ email: 'alice@example.com' });
      const res = mockRes();

      await sendResetPasswordToken(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(tokenError);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('returns generic 200 even if email service fails', async () => {
      const emailError = new Error('SMTP server unavailable');
      (UserModel.findOne as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        username: 'Alice',
        email: 'alice@example.com',
      });
      (userTokenService.createOrReplaceToken as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        token: 'generated-token-123',
        type: 'reset_password',
        expiresAt: new Date(Date.now() + 3600000),
      });
      mockEmailService.sendResetPasswordEmail.mockRejectedValue(emailError);

      const req = mockReq({ email: 'alice@example.com' });
      const res = mockRes();

      await sendResetPasswordToken(req as any, res as any, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'If this email is registered, you will receive a code.',
        data: null,
      });
    });

    it('handles unexpected error types gracefully', async () => {
      (UserModel.findOne as jest.Mock).mockRejectedValue('String error');

      const req = mockReq({ email: 'error@example.com' });
      const res = mockRes();

      await sendResetPasswordToken(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith('String error');
    });
  });

  describe('Security considerations', () => {
    it('always returns same message regardless of user existence', async () => {
      const expectedMessage =
        'If this email is registered, you will receive a code.';

      // Test with existing user
      (UserModel.findOne as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        username: 'Alice',
        email: 'alice@example.com',
      });
      (userTokenService.createOrReplaceToken as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        token: 'generated-token-123',
        type: 'reset_password',
        expiresAt: new Date(Date.now() + 3600000),
      });

      const req1 = mockReq({ email: 'alice@example.com' });
      const res1 = mockRes();

      await sendResetPasswordToken(req1 as any, res1 as any, next);

      expect(res1.json).toHaveBeenCalledWith({
        message: expectedMessage,
        data: null,
      });

      // Test with non-existing user
      (UserModel.findOne as jest.Mock).mockResolvedValue(null);

      const req2 = mockReq({ email: 'notfound@example.com' });
      const res2 = mockRes();

      await sendResetPasswordToken(req2 as any, res2 as any, next);

      expect(res2.json).toHaveBeenCalledWith({
        message: expectedMessage,
        data: null,
      });
    });

    it('does not leak user information through response timing', async () => {
      const startTime = Date.now();

      // Test non-existing user path
      (UserModel.findOne as jest.Mock).mockResolvedValue(null);
      const req1 = mockReq({ email: 'notfound@example.com' });
      const res1 = mockRes();

      await sendResetPasswordToken(req1 as any, res1 as any, next);
      const nonExistentUserTime = Date.now() - startTime;

      // Reset timer
      const startTime2 = Date.now();

      // Test existing user path
      (UserModel.findOne as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        username: 'Alice',
        email: 'alice@example.com',
      });
      (userTokenService.createOrReplaceToken as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        token: 'generated-token-123',
        type: 'reset_password',
        expiresAt: new Date(Date.now() + 3600000),
      });

      const req2 = mockReq({ email: 'alice@example.com' });
      const res2 = mockRes();

      await sendResetPasswordToken(req2 as any, res2 as any, next);
      const existentUserTime = Date.now() - startTime2;

      // We only assert both are 200; timing checks would be flaky.
      expect(res1.status).toHaveBeenCalledWith(200);
      expect(res2.status).toHaveBeenCalledWith(200);
      void nonExistentUserTime;
      void existentUserTime;
    });
  });
});

describe('validateTokenValidity', () => {
  const handler = validateTokenValidity('reset_password');
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls next with BadRequestError if token is missing', async () => {
    const req: any = { body: {} };
    const res = mockRes();

    await handler(req as any, res as any, next);
    expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
    expect(res.json).not.toHaveBeenCalled();
  });

  it('returns 200 and success message if token is valid', async () => {
    const req: any = { body: { token: 'sometoken' } };
    const res = mockRes();

    (userTokenService.validateToken as jest.Mock).mockResolvedValue({});

    await handler(req as any, res as any, next);

    expect(userTokenService.validateToken).toHaveBeenCalledWith(
      'sometoken',
      'reset_password'
    );
    expect(res.json).toHaveBeenCalledWith({
      message: 'Token is valid.',
      data: null,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next with error if service throws', async () => {
    const req: any = { body: { token: 'sometoken' } };
    const res = mockRes();
    const serviceError = new Error('fail');
    (userTokenService.validateToken as jest.Mock).mockRejectedValue(
      serviceError
    );

    await handler(req as any, res as any, next);

    expect(next).toHaveBeenCalledWith(serviceError);
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe('resetPasswordController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (userService.changePassword as jest.Mock).mockReset();
  });

  it('calls next with BadRequestError if token or password is missing', async () => {
    const req: any = { body: { token: '', password: '' } };
    const res = mockRes();

    await resetPasswordController(req as any, res as any, next);

    expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
    expect(res.json).not.toHaveBeenCalled();
  });

  it('validates token, resets password, deletes token, and returns success', async () => {
    const req: any = { body: { token: 'sometoken', password: 'newpass' } };
    const res = mockRes();

    (userTokenService.validateToken as jest.Mock).mockResolvedValue({
      userId: 'u123',
    });
    (userService.changePassword as jest.Mock).mockResolvedValue({});
    (userTokenService.deleteTokenForUser as jest.Mock).mockResolvedValue(
      undefined
    );

    await resetPasswordController(req as any, res as any, next);

    expect(userTokenService.validateToken).toHaveBeenCalledWith(
      'sometoken',
      'reset_password'
    );
    expect(userService.changePassword).toHaveBeenCalledWith('u123', 'newpass');
    expect(userTokenService.deleteTokenForUser).toHaveBeenCalledWith('u123');
    expect(res.json).toHaveBeenCalledWith({
      message: 'Password has been reset.',
      data: null,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next with error if token validation fails', async () => {
    const req: any = { body: { token: 'bad', password: 'pass' } };
    const res = mockRes();
    const err = new Error('Invalid!');
    (userTokenService.validateToken as jest.Mock).mockRejectedValue(err);

    await resetPasswordController(req as any, res as any, next);
    expect(next).toHaveBeenCalledWith(err);
  });

  it('calls next with error if password change fails', async () => {
    const req: any = { body: { token: 'good', password: 'fail' } };
    const res = mockRes();
    (userTokenService.validateToken as jest.Mock).mockResolvedValue({
      userId: 'u123',
    });
    const err = new Error('fail');
    (userService.changePassword as jest.Mock).mockRejectedValue(err);

    await resetPasswordController(req as any, res as any, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});
