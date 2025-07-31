import {
  sendResetPasswordToken,
  validateTokenValidity,
  resetPasswordController,
} from '../../controllers/user-token.controller.js';
import { UserTokenService } from '../../services/user-token.service.js';
import { EmailService } from '../../services/email.service.js';
import { UserModel } from '../../models/user.model.js';
import { UserService } from '../../services/user.service.js';
import { BadRequestError } from '../../errors/bad-request-error.js';

// ✅ Mock external services
jest.mock('../../services/user-token.service.js');
jest.mock('../../services/email.service.js');
jest.mock('../../models/user.model.js');
jest.mock('../../services/user.service.js');

const mockRequest = (body = {}, params = {}, query = {}) => ({
  body,
  params,
  query,
});
const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
const mockNext = jest.fn();

const mockUser = {
  userId: 'user-123',
  email: 'user@example.com',
  username: 'user',
};

describe('user-token.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  //
  // === sendResetPasswordToken ===
  //
  describe('sendResetPasswordToken', () => {
    it('responds with generic message if email missing', async () => {
      const res = mockResponse();
      const req = mockRequest({});
      await sendResetPasswordToken(req as any, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('responds with generic message if user not found', async () => {
      (UserModel.findOne as jest.Mock).mockResolvedValue(null);
      const res = mockResponse();
      const req = mockRequest({ email: 'notfound@example.com' });

      await sendResetPasswordToken(req as any, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'If this email is registered, you will receive a reset code.',
      });
    });

    it('sends email when user exists', async () => {
      (UserModel.findOne as jest.Mock).mockResolvedValue(mockUser);
      (
        UserTokenService.createPasswordResetToken as jest.Mock
      ).mockResolvedValue('123456');
      (
        EmailService.prototype.sendResetPasswordEmail as jest.Mock
      ).mockResolvedValue(undefined);

      const res = mockResponse();
      const req = mockRequest({ email: mockUser.email });

      await sendResetPasswordToken(req as any, res, mockNext);
      expect(UserTokenService.createPasswordResetToken).toHaveBeenCalledWith(
        mockUser.userId,
        60
      );
      expect(
        EmailService.prototype.sendResetPasswordEmail
      ).toHaveBeenCalledWith(mockUser.email, mockUser.username, '123456');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('returns 429 if rate limit error is thrown', async () => {
      (UserModel.findOne as jest.Mock).mockResolvedValue(mockUser);
      (
        UserTokenService.createPasswordResetToken as jest.Mock
      ).mockRejectedValue(new Error('wait'));

      const res = mockResponse();
      const req = mockRequest({ email: mockUser.email });

      await sendResetPasswordToken(req as any, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(429);
    });

    it('calls next on unexpected error', async () => {
      (UserModel.findOne as jest.Mock).mockRejectedValue(new Error('db fail'));
      await sendResetPasswordToken(
        mockRequest({ email: 'test@test.com' }) as any,
        mockResponse(),
        mockNext
      );
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  //
  // === validateTokenValidity ===
  //
  describe('validateTokenValidity', () => {
    const handler = validateTokenValidity();

    it('calls next with BadRequestError if no token', async () => {
      const req = mockRequest({});
      await handler(req as any, mockResponse(), mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
    });

    it('responds 200 if token is valid', async () => {
      (
        UserTokenService.validatePasswordResetToken as jest.Mock
      ).mockResolvedValue({ userId: 'u1' });

      const res = mockResponse();
      await handler(mockRequest({ token: '123' }) as any, res, mockNext);
      expect(res.json).toHaveBeenCalledWith({ message: 'Token is valid.' });
    });

    it('calls next with BadRequestError if token invalid', async () => {
      (
        UserTokenService.validatePasswordResetToken as jest.Mock
      ).mockResolvedValue(null);

      await handler(
        mockRequest({ token: 'bad' }) as any,
        mockResponse(),
        mockNext
      );
      expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
    });

    it('returns 429 if max attempts exceeded', async () => {
      (
        UserTokenService.validatePasswordResetToken as jest.Mock
      ).mockRejectedValue(new Error('Too many invalid attempts'));

      const res = mockResponse();
      await handler(mockRequest({ token: 'bad' }) as any, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(429);
    });
  });

  //
  // === resetPasswordController ===
  //
  describe('resetPasswordController', () => {
    it('calls next with BadRequestError if missing token or password', async () => {
      const req = mockRequest({});
      await resetPasswordController(req as any, mockResponse(), mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
    });

    it('resets password when token is valid', async () => {
      (
        UserTokenService.validatePasswordResetToken as jest.Mock
      ).mockResolvedValue({ userId: 'u1' });
      (UserService.prototype.changePassword as jest.Mock).mockResolvedValue(
        true
      );
      (
        UserTokenService.consumePasswordResetToken as jest.Mock
      ).mockResolvedValue(true);

      const res = mockResponse();
      const req = mockRequest({ token: '123', password: 'newPass' });

      await resetPasswordController(req as any, res, mockNext);
      expect(UserService.prototype.changePassword).toHaveBeenCalledWith(
        'u1',
        'newPass'
      );
      expect(UserTokenService.consumePasswordResetToken).toHaveBeenCalledWith(
        'u1'
      );
      expect(res.json).toHaveBeenCalledWith({
        message: 'Password has been reset.',
      });
    });

    it('calls next with BadRequestError if token invalid', async () => {
      (
        UserTokenService.validatePasswordResetToken as jest.Mock
      ).mockResolvedValue(null);

      const req = mockRequest({ token: 'bad', password: 'x' });
      await resetPasswordController(req as any, mockResponse(), mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
    });

    it('returns 429 if max attempts exceeded', async () => {
      (
        UserTokenService.validatePasswordResetToken as jest.Mock
      ).mockRejectedValue(new Error('Too many invalid attempts'));

      const res = mockResponse();
      const req = mockRequest({ token: '123', password: 'x' });

      await resetPasswordController(req as any, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(429);
    });

    it('calls next on unexpected error', async () => {
      (
        UserTokenService.validatePasswordResetToken as jest.Mock
      ).mockRejectedValue(new Error('unexpected'));

      const req = mockRequest({ token: '123', password: 'x' });
      await resetPasswordController(req as any, mockResponse(), mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
