import { Request, Response, NextFunction } from 'express';
import { UserTokenController } from '../../controllers/user-token.controller';
import { userTokenService } from '../../services/user-token.service';
import userService from '../../services/user.service';
import { EmailService } from '../../services/email.service';
import { UserModel } from '../../models/user.model';
import { BadRequestError } from '../../errors/bad-request-error';

// Mock dependencies
jest.mock('../../services/user-token.service');
jest.mock('../../services/user.service');
jest.mock('../../services/email.service');
jest.mock('../../models/user.model');

describe('UserTokenController', () => {
  let controller: UserTokenController;
  let mockRequest: any;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  const mockUser = {
    userId: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
  };

  const mockToken = {
    userId: 'user-123',
    token: '123456',
    type: 'reset_password',
    expiresAt: new Date(Date.now() + 3600000),
    attempts: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    controller = new UserTokenController();

    mockRequest = {
      params: {},
      query: {},
      body: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  describe('sendResetPasswordToken', () => {
    it('should send reset code to registered email', async () => {
      mockRequest.body = { email: 'test@example.com' };

      (UserModel.findOne as jest.Mock).mockResolvedValue(mockUser);
      (userTokenService.createOrReplaceToken as jest.Mock).mockResolvedValue(
        mockToken
      );
      (
        EmailService.prototype.sendResetPasswordEmail as jest.Mock
      ).mockResolvedValue(true);

      await controller.sendResetPasswordToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(UserModel.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(userTokenService.createOrReplaceToken).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          token: expect.stringMatching(/^\d{6}$/),
          type: 'reset_password',
          expiresAt: expect.any(Date),
        })
      );
      expect(
        EmailService.prototype.sendResetPasswordEmail
      ).toHaveBeenCalledWith(
        'test@example.com',
        'testuser',
        expect.stringMatching(/^\d{6}$/)
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'If this email is registered, you will receive a code.',
        data: null,
      });
    });

    it('should return generic message for non-existent email', async () => {
      mockRequest.body = { email: 'nonexistent@example.com' };

      (UserModel.findOne as jest.Mock).mockResolvedValue(null);

      await controller.sendResetPasswordToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(UserModel.findOne).toHaveBeenCalled();
      expect(userTokenService.createOrReplaceToken).not.toHaveBeenCalled();
      expect(
        EmailService.prototype.sendResetPasswordEmail
      ).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'If this email is registered, you will receive a code.',
        data: null,
      });
    });

    it('should handle email with different casing', async () => {
      mockRequest.body = { email: 'Test@Example.COM' };

      (UserModel.findOne as jest.Mock).mockResolvedValue(mockUser);
      (userTokenService.createOrReplaceToken as jest.Mock).mockResolvedValue(
        mockToken
      );
      (
        EmailService.prototype.sendResetPasswordEmail as jest.Mock
      ).mockResolvedValue(true);

      await controller.sendResetPasswordToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(UserModel.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should trim email whitespace', async () => {
      mockRequest.body = { email: '  test@example.com  ' };

      (UserModel.findOne as jest.Mock).mockResolvedValue(mockUser);
      (userTokenService.createOrReplaceToken as jest.Mock).mockResolvedValue(
        mockToken
      );
      (
        EmailService.prototype.sendResetPasswordEmail as jest.Mock
      ).mockResolvedValue(true);

      await controller.sendResetPasswordToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(UserModel.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should throw BadRequestError if email is missing', async () => {
      mockRequest.body = {};

      await controller.sendResetPasswordToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Email is required.',
        })
      );
    });

    it('should generate 6-digit code', async () => {
      mockRequest.body = { email: 'test@example.com' };

      (UserModel.findOne as jest.Mock).mockResolvedValue(mockUser);
      (userTokenService.createOrReplaceToken as jest.Mock).mockResolvedValue(
        mockToken
      );
      (
        EmailService.prototype.sendResetPasswordEmail as jest.Mock
      ).mockResolvedValue(true);

      await controller.sendResetPasswordToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const createCall = (userTokenService.createOrReplaceToken as jest.Mock)
        .mock.calls[0][0];
      expect(createCall.token).toMatch(/^\d{6}$/);
      expect(parseInt(createCall.token)).toBeGreaterThanOrEqual(100000);
      expect(parseInt(createCall.token)).toBeLessThan(1000000);
    });

    it('should set token expiration to 1 hour', async () => {
      mockRequest.body = { email: 'test@example.com' };

      (UserModel.findOne as jest.Mock).mockResolvedValue(mockUser);
      (userTokenService.createOrReplaceToken as jest.Mock).mockResolvedValue(
        mockToken
      );
      (
        EmailService.prototype.sendResetPasswordEmail as jest.Mock
      ).mockResolvedValue(true);

      const beforeCall = Date.now();
      await controller.sendResetPasswordToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      const afterCall = Date.now();

      const createCall = (userTokenService.createOrReplaceToken as jest.Mock)
        .mock.calls[0][0];
      const expiresAt = createCall.expiresAt.getTime();

      expect(expiresAt).toBeGreaterThan(beforeCall + 3599000); // ~1 hour
      expect(expiresAt).toBeLessThan(afterCall + 3601000);
    });
  });

  describe('validateTokenValidity', () => {
    it('should validate a valid token', async () => {
      mockRequest.body = { token: '123456' };

      (userTokenService.validateToken as jest.Mock).mockResolvedValue(
        mockToken
      );

      const middleware = controller.validateTokenValidity('reset_password');
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(userTokenService.validateToken).toHaveBeenCalledWith(
        '123456',
        'reset_password'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Token is valid.',
        data: null,
      });
    });

    it('should throw BadRequestError if token is missing', async () => {
      mockRequest.body = {};

      const middleware = controller.validateTokenValidity('reset_password');
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Token is required.',
        })
      );
    });

    it('should call next with error for invalid token', async () => {
      mockRequest.body = { token: 'invalid' };

      const error = new Error('Invalid token');
      (userTokenService.validateToken as jest.Mock).mockRejectedValue(error);

      const middleware = controller.validateTokenValidity('reset_password');
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      mockRequest.body = { token: '123456', password: 'newPassword123!' };

      (userTokenService.validateToken as jest.Mock).mockResolvedValue(
        mockToken
      );
      (userService.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        password: 'hashed',
      });
      (userTokenService.deleteTokenForUser as jest.Mock).mockResolvedValue(
        true
      );

      await controller.resetPassword(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(userTokenService.validateToken).toHaveBeenCalledWith(
        '123456',
        'reset_password'
      );
      expect(userService.update).toHaveBeenCalledWith('user-123', {
        password: 'newPassword123!',
      });
      expect(userTokenService.deleteTokenForUser).toHaveBeenCalledWith(
        'user-123'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Password has been reset.',
        data: null,
      });
    });

    it('should throw BadRequestError if token is missing', async () => {
      mockRequest.body = { password: 'newPassword123!' };

      await controller.resetPassword(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Token and new password are required.',
        })
      );
    });

    it('should throw BadRequestError if password is missing', async () => {
      mockRequest.body = { token: '123456' };

      await controller.resetPassword(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Token and new password are required.',
        })
      );
    });

    it('should throw BadRequestError if password update fails', async () => {
      mockRequest.body = { token: '123456', password: 'newPassword123!' };

      (userTokenService.validateToken as jest.Mock).mockResolvedValue(
        mockToken
      );
      (userService.update as jest.Mock).mockResolvedValue(null);

      await controller.resetPassword(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Failed to update password.',
        })
      );
      expect(userTokenService.deleteTokenForUser).not.toHaveBeenCalled();
    });

    it('should call next with error for invalid token', async () => {
      mockRequest.body = { token: 'invalid', password: 'newPassword123!' };

      const error = new Error('Token expired');
      (userTokenService.validateToken as jest.Mock).mockRejectedValue(error);

      await controller.resetPassword(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(userService.update).not.toHaveBeenCalled();
    });
  });

  describe('listTokens', () => {
    it('should list tokens with pagination', async () => {
      mockRequest.query = { page: '2', limit: '20' };

      const mockResult = {
        items: [mockToken],
        total: 50,
        page: 2,
        limit: 20,
      };

      (userTokenService.findAll as jest.Mock).mockResolvedValue(mockResult);

      await controller.listTokens(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(userTokenService.findAll).toHaveBeenCalledWith({
        page: 2,
        limit: 20,
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Tokens retrieved successfully',
        data: mockResult,
      });
    });

    it('should list tokens with filters', async () => {
      mockRequest.query = {
        page: '1',
        limit: '10',
        type: 'reset_password',
        userId: 'user-123',
      };

      const mockResult = { items: [mockToken], total: 1, page: 1, limit: 10 };
      (userTokenService.findAll as jest.Mock).mockResolvedValue(mockResult);

      await controller.listTokens(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(userTokenService.findAll).toHaveBeenCalledWith({
        type: 'reset_password',
        userId: 'user-123',
        page: 1,
        limit: 10,
      });
    });

    it('should use default pagination values', async () => {
      mockRequest.query = {};

      const mockResult = { items: [], total: 0, page: 1, limit: 10 };
      (userTokenService.findAll as jest.Mock).mockResolvedValue(mockResult);

      await controller.listTokens(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(userTokenService.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
      });
    });
  });

  describe('createToken', () => {
    it('should create token with all fields', async () => {
      mockRequest.body = {
        userId: 'user-123',
        token: '123456',
        type: 'reset_password',
        expiresAt: '2025-12-31T23:59:59Z',
      };

      (userTokenService.createOrReplaceToken as jest.Mock).mockResolvedValue(
        mockToken
      );

      await controller.createToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(userTokenService.createOrReplaceToken).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          token: '123456',
          type: 'reset_password',
          expiresAt: expect.any(Date),
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('should use default expiration if not provided', async () => {
      mockRequest.body = {
        userId: 'user-123',
        token: '123456',
        type: 'reset_password',
      };

      (userTokenService.createOrReplaceToken as jest.Mock).mockResolvedValue(
        mockToken
      );

      await controller.createToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const call = (userTokenService.createOrReplaceToken as jest.Mock).mock
        .calls[0][0];
      expect(call.expiresAt).toBeInstanceOf(Date);
    });

    it('should throw BadRequestError if required fields are missing', async () => {
      mockRequest.body = { userId: 'user-123' };

      await controller.createToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'userId, token, and type are required.',
        })
      );
    });
  });

  describe('getExpiredTokens', () => {
    it('should return expired tokens with pagination', async () => {
      mockRequest.query = { page: '1', limit: '20' };

      const mockResult = {
        items: [mockToken],
        total: 5,
        page: 1,
        limit: 20,
      };

      (userTokenService.findExpired as jest.Mock).mockResolvedValue(mockResult);

      await controller.getExpiredTokens(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(userTokenService.findExpired).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Expired tokens retrieved successfully',
        data: mockResult,
      });
    });
  });

  describe('getTokensByType', () => {
    it('should return tokens filtered by type', async () => {
      mockRequest.params = { type: 'reset_password' };
      mockRequest.query = { page: '1', limit: '10' };

      const mockResult = { items: [mockToken], total: 1, page: 1, limit: 10 };
      (userTokenService.findAll as jest.Mock).mockResolvedValue(mockResult);

      await controller.getTokensByType(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(userTokenService.findAll).toHaveBeenCalledWith({
        type: 'reset_password',
        page: 1,
        limit: 10,
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Tokens of type 'reset_password' retrieved successfully",
        data: mockResult,
      });
    });
  });

  describe('getTokenByUserId', () => {
    it('should return token for specific user', async () => {
      mockRequest.params = { userId: 'user-123' };

      (userTokenService.findByUserId as jest.Mock).mockResolvedValue(mockToken);

      await controller.getTokenByUserId(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(userTokenService.findByUserId).toHaveBeenCalledWith('user-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Token retrieved successfully',
        data: expect.objectContaining({
          userId: 'user-123',
          type: 'reset_password',
        }),
      });
    });
  });

  describe('deleteToken', () => {
    it('should delete token for user', async () => {
      mockRequest.params = { userId: 'user-123' };

      (userTokenService.deleteTokenForUser as jest.Mock).mockResolvedValue(
        true
      );

      await controller.deleteToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(userTokenService.deleteTokenForUser).toHaveBeenCalledWith(
        'user-123'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Token deleted successfully',
        data: null,
      });
    });
  });

  describe('deleteExpiredTokens', () => {
    it('should delete all expired tokens and return count', async () => {
      (userTokenService.deleteExpiredTokens as jest.Mock).mockResolvedValue(15);

      await controller.deleteExpiredTokens(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(userTokenService.deleteExpiredTokens).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Deleted 15 expired token(s)',
        data: { deletedCount: 15 },
      });
    });

    it('should handle zero deletions', async () => {
      (userTokenService.deleteExpiredTokens as jest.Mock).mockResolvedValue(0);

      await controller.deleteExpiredTokens(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Deleted 0 expired token(s)',
        data: { deletedCount: 0 },
      });
    });
  });

  describe('updateToken', () => {
    it('should update token for user', async () => {
      mockRequest.params = { userId: 'user-123' };
      mockRequest.body = { attempts: 1, lastRequestAt: new Date() };

      const updatedToken = { ...mockToken, attempts: 1 };
      (userTokenService.updateTokenForUser as jest.Mock).mockResolvedValue(
        updatedToken
      );

      await controller.updateToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(userTokenService.updateTokenForUser).toHaveBeenCalledWith(
        'user-123',
        mockRequest.body
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Token updated successfully',
        data: expect.objectContaining({
          userId: 'user-123',
          attempts: 1,
        }),
      });
    });
  });

  describe('Error handling', () => {
    it('should call next with error on service failure', async () => {
      mockRequest.body = { email: 'test@example.com' };

      const error = new Error('Database error');
      (UserModel.findOne as jest.Mock).mockRejectedValue(error);

      await controller.sendResetPasswordToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
