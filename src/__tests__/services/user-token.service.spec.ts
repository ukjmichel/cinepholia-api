/**
 * @module services/user-token.service.spec.ts
 * @description Unit tests for UserTokenService
 *
 * Tests all CRUD operations, validation logic, expiration handling,
 * and error scenarios for user token management.
 */

import { Op } from 'sequelize';
import { UserTokenService } from '../../services/user-token.service';
import { UserTokenModel, UserTokenType } from '../../models/user-token.model';
import { UserModel } from '../../models/user.model';
import { NotFoundError } from '../../errors/not-found-error';
import { UnauthorizedError } from '../../errors/unauthorized-error';
import { BadRequestError } from '../../errors/bad-request-error';

// Mock the models
jest.mock('../../models/user-token.model');
jest.mock('../../models/user.model');

describe('UserTokenService', () => {
  let service: UserTokenService;
  let mockUserTokenModel: jest.Mocked<typeof UserTokenModel>;
  let mockUserModel: jest.Mocked<typeof UserModel>;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Create mocked instances
    mockUserTokenModel = UserTokenModel as jest.Mocked<typeof UserTokenModel>;
    mockUserModel = UserModel as jest.Mocked<typeof UserModel>;

    // Initialize service with mocked dependencies
    service = new UserTokenService(mockUserTokenModel, mockUserModel);
  });

  describe('createOrReplaceToken', () => {
    const mockUserId = 'user-123';
    const mockTokenData = {
      userId: mockUserId,
      type: 'verify_email' as UserTokenType,
      token: 'hashed-token-123',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      attempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create a new token when user exists', async () => {
      const mockUser = { userId: mockUserId } as any;
      const mockCreatedToken = { ...mockTokenData } as any;

      mockUserModel.findByPk = jest.fn().mockResolvedValue(mockUser);
      mockUserTokenModel.destroy = jest.fn().mockResolvedValue(0);
      mockUserTokenModel.create = jest.fn().mockResolvedValue(mockCreatedToken);

      const result = await service.createOrReplaceToken(mockTokenData);

      expect(mockUserModel.findByPk).toHaveBeenCalledWith(mockUserId);
      expect(mockUserTokenModel.destroy).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });
      expect(mockUserTokenModel.create).toHaveBeenCalledWith(mockTokenData);
      expect(result).toEqual(mockCreatedToken);
    });

    it('should replace existing token with new one', async () => {
      const mockUser = { userId: mockUserId } as any;
      const mockCreatedToken = { ...mockTokenData } as any;

      mockUserModel.findByPk = jest.fn().mockResolvedValue(mockUser);
      mockUserTokenModel.destroy = jest.fn().mockResolvedValue(1); // 1 token deleted
      mockUserTokenModel.create = jest.fn().mockResolvedValue(mockCreatedToken);

      const result = await service.createOrReplaceToken(mockTokenData);

      expect(mockUserTokenModel.destroy).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });
      expect(mockUserTokenModel.create).toHaveBeenCalledWith(mockTokenData);
      expect(result).toEqual(mockCreatedToken);
    });

    it('should throw NotFoundError when user does not exist', async () => {
      mockUserModel.findByPk = jest.fn().mockResolvedValue(null);

      await expect(service.createOrReplaceToken(mockTokenData)).rejects.toThrow(
        NotFoundError
      );
      await expect(service.createOrReplaceToken(mockTokenData)).rejects.toThrow(
        'User not found'
      );

      expect(mockUserTokenModel.destroy).not.toHaveBeenCalled();
      expect(mockUserTokenModel.create).not.toHaveBeenCalled();
    });

    it('should throw error when token creation fails', async () => {
      const mockUser = { userId: mockUserId } as any;

      mockUserModel.findByPk = jest.fn().mockResolvedValue(mockUser);
      mockUserTokenModel.destroy = jest.fn().mockResolvedValue(0);
      mockUserTokenModel.create = jest.fn().mockResolvedValue(null);

      await expect(service.createOrReplaceToken(mockTokenData)).rejects.toThrow(
        'Failed to create new user token'
      );
    });
  });

  describe('findToken', () => {
    const mockToken = 'hashed-token-123';

    it('should return token when found', async () => {
      const mockTokenInstance = {
        userId: 'user-123',
        token: mockToken,
        type: 'verify_email',
      } as any;

      mockUserTokenModel.findOne = jest
        .fn()
        .mockResolvedValue(mockTokenInstance);

      const result = await service.findToken(mockToken);

      expect(mockUserTokenModel.findOne).toHaveBeenCalledWith({
        where: { token: mockToken },
      });
      expect(result).toEqual(mockTokenInstance);
    });

    it('should throw NotFoundError when token not found', async () => {
      mockUserTokenModel.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.findToken(mockToken)).rejects.toThrow(NotFoundError);
      await expect(service.findToken(mockToken)).rejects.toThrow(
        'Token not found'
      );
    });
  });

  describe('findByUserId', () => {
    const mockUserId = 'user-123';

    it('should return token when found for user', async () => {
      const mockTokenInstance = {
        userId: mockUserId,
        token: 'hashed-token',
        type: 'verify_email',
      } as any;

      mockUserTokenModel.findOne = jest
        .fn()
        .mockResolvedValue(mockTokenInstance);

      const result = await service.findByUserId(mockUserId);

      expect(mockUserTokenModel.findOne).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });
      expect(result).toEqual(mockTokenInstance);
    });

    it('should throw NotFoundError when token not found for user', async () => {
      mockUserTokenModel.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.findByUserId(mockUserId)).rejects.toThrow(
        NotFoundError
      );
      await expect(service.findByUserId(mockUserId)).rejects.toThrow(
        'Token for this user not found'
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated results with default pagination', async () => {
      const mockTokens = [
        { userId: 'user-1', type: 'verify_email' },
        { userId: 'user-2', type: 'reset_password' },
      ] as any[];

      mockUserTokenModel.findAndCountAll = jest.fn().mockResolvedValue({
        count: 2,
        rows: mockTokens,
      });

      const result = await service.findAll();

      expect(mockUserTokenModel.findAndCountAll).toHaveBeenCalledWith({
        where: {},
        limit: 10,
        offset: 0,
        order: [['createdAt', 'DESC']],
      });
      expect(result.data).toEqual(mockTokens);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      });
    });

    it('should filter by type', async () => {
      const mockTokens = [{ userId: 'user-1', type: 'verify_email' }] as any[];

      mockUserTokenModel.findAndCountAll = jest.fn().mockResolvedValue({
        count: 1,
        rows: mockTokens,
      });

      const result = await service.findAll({ type: 'verify_email' });

      expect(mockUserTokenModel.findAndCountAll).toHaveBeenCalledWith({
        where: { type: 'verify_email' },
        limit: 10,
        offset: 0,
        order: [['createdAt', 'DESC']],
      });
      expect(result.data).toEqual(mockTokens);
    });

    it('should filter by userId', async () => {
      const mockTokens = [
        { userId: 'user-123', type: 'verify_email' },
      ] as any[];

      mockUserTokenModel.findAndCountAll = jest.fn().mockResolvedValue({
        count: 1,
        rows: mockTokens,
      });

      const result = await service.findAll({ userId: 'user-123' });

      expect(mockUserTokenModel.findAndCountAll).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        limit: 10,
        offset: 0,
        order: [['createdAt', 'DESC']],
      });
      expect(result.data).toEqual(mockTokens);
    });

    it('should handle custom pagination', async () => {
      const mockTokens = [] as any[];

      mockUserTokenModel.findAndCountAll = jest.fn().mockResolvedValue({
        count: 50,
        rows: mockTokens,
      });

      const result = await service.findAll({ page: 3, limit: 20 });

      expect(mockUserTokenModel.findAndCountAll).toHaveBeenCalledWith({
        where: {},
        limit: 20,
        offset: 40, // (3-1) * 20
        order: [['createdAt', 'DESC']],
      });
      expect(result.pagination).toEqual({
        page: 3,
        limit: 20,
        total: 50,
        totalPages: 3,
      });
    });

    it('should handle multiple filters', async () => {
      mockUserTokenModel.findAndCountAll = jest.fn().mockResolvedValue({
        count: 0,
        rows: [],
      });

      await service.findAll({
        type: 'reset_password',
        userId: 'user-123',
        page: 2,
        limit: 5,
      });

      expect(mockUserTokenModel.findAndCountAll).toHaveBeenCalledWith({
        where: { type: 'reset_password', userId: 'user-123' },
        limit: 5,
        offset: 5,
        order: [['createdAt', 'DESC']],
      });
    });
  });

  describe('findExpired', () => {
    it('should return paginated expired tokens', async () => {
      const now = new Date();
      const mockExpiredTokens = [
        { userId: 'user-1', expiresAt: new Date(now.getTime() - 1000) },
        { userId: 'user-2', expiresAt: new Date(now.getTime() - 2000) },
      ] as any[];

      mockUserTokenModel.findAndCountAll = jest.fn().mockResolvedValue({
        count: 2,
        rows: mockExpiredTokens,
      });

      const result = await service.findExpired();

      expect(mockUserTokenModel.findAndCountAll).toHaveBeenCalledWith({
        where: {
          expiresAt: {
            [Op.lt]: expect.any(Date),
          },
        },
        limit: 10,
        offset: 0,
        order: [['expiresAt', 'ASC']],
      });
      expect(result.data).toEqual(mockExpiredTokens);
      expect(result.pagination.total).toBe(2);
    });

    it('should handle custom pagination for expired tokens', async () => {
      mockUserTokenModel.findAndCountAll = jest.fn().mockResolvedValue({
        count: 100,
        rows: [],
      });

      const result = await service.findExpired({ page: 5, limit: 25 });

      expect(mockUserTokenModel.findAndCountAll).toHaveBeenCalledWith({
        where: {
          expiresAt: {
            [Op.lt]: expect.any(Date),
          },
        },
        limit: 25,
        offset: 100, // (5-1) * 25
        order: [['expiresAt', 'ASC']],
      });
      expect(result.pagination.totalPages).toBe(4);
    });
  });

  describe('deleteTokenForUser', () => {
    const mockUserId = 'user-123';

    it('should delete token successfully', async () => {
      mockUserTokenModel.destroy = jest.fn().mockResolvedValue(1);

      await service.deleteTokenForUser(mockUserId);

      expect(mockUserTokenModel.destroy).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });
    });

    it('should throw NotFoundError when no token found to delete', async () => {
      mockUserTokenModel.destroy = jest.fn().mockResolvedValue(0);

      await expect(service.deleteTokenForUser(mockUserId)).rejects.toThrow(
        NotFoundError
      );
      await expect(service.deleteTokenForUser(mockUserId)).rejects.toThrow(
        'No token found to delete for this user'
      );
    });
  });

  describe('deleteExpiredTokens', () => {
    it('should delete all expired tokens and return count', async () => {
      mockUserTokenModel.destroy = jest.fn().mockResolvedValue(5);

      const result = await service.deleteExpiredTokens();

      expect(mockUserTokenModel.destroy).toHaveBeenCalledWith({
        where: {
          expiresAt: {
            [Op.lt]: expect.any(Date),
          },
        },
      });
      expect(result).toBe(5);
    });

    it('should return 0 when no expired tokens exist', async () => {
      mockUserTokenModel.destroy = jest.fn().mockResolvedValue(0);

      const result = await service.deleteExpiredTokens();

      expect(result).toBe(0);
    });
  });

  describe('updateTokenForUser', () => {
    const mockUserId = 'user-123';

    it('should update token successfully', async () => {
      const updatedToken = {
        userId: mockUserId,
        attempts: 5,
        updatedAt: new Date(),
      } as any;

      mockUserTokenModel.update = jest
        .fn()
        .mockResolvedValue([1, [updatedToken]]);

      const result = await service.updateTokenForUser(mockUserId, {
        attempts: 5,
      });

      expect(mockUserTokenModel.update).toHaveBeenCalledWith(
        { attempts: 5 },
        {
          where: { userId: mockUserId },
          returning: true,
        }
      );
      expect(result).toEqual(updatedToken);
    });

    it('should throw NotFoundError when token not found', async () => {
      mockUserTokenModel.update = jest.fn().mockResolvedValue([0, []]);

      await expect(
        service.updateTokenForUser(mockUserId, { attempts: 1 })
      ).rejects.toThrow(NotFoundError);
      await expect(
        service.updateTokenForUser(mockUserId, { attempts: 1 })
      ).rejects.toThrow('Token for this user not found');
    });

    it('should update multiple fields', async () => {
      const updatedToken = {
        userId: mockUserId,
        attempts: 0,
        lastRequestAt: new Date(),
      } as any;

      mockUserTokenModel.update = jest
        .fn()
        .mockResolvedValue([1, [updatedToken]]);

      await service.updateTokenForUser(mockUserId, {
        attempts: 0,
        lastRequestAt: new Date(),
      });

      expect(mockUserTokenModel.update).toHaveBeenCalledWith(
        expect.objectContaining({
          attempts: 0,
          lastRequestAt: expect.any(Date),
        }),
        expect.any(Object)
      );
    });
  });

  describe('validateToken', () => {
    const mockToken = 'hashed-token-123';
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const pastDate = new Date(Date.now() - 1000);

    it('should validate token successfully without type check', async () => {
      const mockTokenInstance = {
        userId: 'user-123',
        token: mockToken,
        type: 'verify_email',
        expiresAt: futureDate,
      } as any;

      mockUserTokenModel.findOne = jest
        .fn()
        .mockResolvedValue(mockTokenInstance);

      const result = await service.validateToken(mockToken);

      expect(mockUserTokenModel.findOne).toHaveBeenCalledWith({
        where: { token: mockToken },
      });
      expect(result).toEqual(mockTokenInstance);
    });

    it('should validate token with matching type', async () => {
      const mockTokenInstance = {
        userId: 'user-123',
        token: mockToken,
        type: 'verify_email' as UserTokenType,
        expiresAt: futureDate,
      } as any;

      mockUserTokenModel.findOne = jest
        .fn()
        .mockResolvedValue(mockTokenInstance);

      const result = await service.validateToken(mockToken, 'verify_email');

      expect(result).toEqual(mockTokenInstance);
    });

    it('should validate token with one of multiple allowed types', async () => {
      const mockTokenInstance = {
        userId: 'user-123',
        token: mockToken,
        type: 'reset_password' as UserTokenType,
        expiresAt: futureDate,
      } as any;

      mockUserTokenModel.findOne = jest
        .fn()
        .mockResolvedValue(mockTokenInstance);

      const result = await service.validateToken(mockToken, [
        'verify_email',
        'reset_password',
      ]);

      expect(result).toEqual(mockTokenInstance);
    });

    it('should throw NotFoundError when token not found', async () => {
      mockUserTokenModel.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.validateToken(mockToken)).rejects.toThrow(
        NotFoundError
      );
      await expect(service.validateToken(mockToken)).rejects.toThrow(
        'Token not found'
      );
    });

    it('should throw UnauthorizedError and delete token when expired', async () => {
      const mockTokenInstance = {
        userId: 'user-123',
        token: mockToken,
        type: 'verify_email',
        expiresAt: pastDate,
        destroy: jest.fn().mockResolvedValue(true),
      } as any;

      mockUserTokenModel.findOne = jest
        .fn()
        .mockResolvedValue(mockTokenInstance);

      await expect(service.validateToken(mockToken)).rejects.toThrow(
        UnauthorizedError
      );
      await expect(service.validateToken(mockToken)).rejects.toThrow(
        'Token expired'
      );

      expect(mockTokenInstance.destroy).toHaveBeenCalled();
    });

    it('should throw BadRequestError when type does not match (single type)', async () => {
      const mockTokenInstance = {
        userId: 'user-123',
        token: mockToken,
        type: 'verify_email' as UserTokenType,
        expiresAt: futureDate,
      } as any;

      mockUserTokenModel.findOne = jest
        .fn()
        .mockResolvedValue(mockTokenInstance);

      await expect(
        service.validateToken(mockToken, 'reset_password')
      ).rejects.toThrow(BadRequestError);
      await expect(
        service.validateToken(mockToken, 'reset_password')
      ).rejects.toThrow(
        'Invalid token type. Expected reset_password, got "verify_email".'
      );
    });

    it('should throw BadRequestError when type not in allowed types (array)', async () => {
      const mockTokenInstance = {
        userId: 'user-123',
        token: mockToken,
        type: '2fa' as UserTokenType,
        expiresAt: futureDate,
      } as any;

      mockUserTokenModel.findOne = jest
        .fn()
        .mockResolvedValue(mockTokenInstance);

      await expect(
        service.validateToken(mockToken, ['verify_email', 'reset_password'])
      ).rejects.toThrow(BadRequestError);
      await expect(
        service.validateToken(mockToken, ['verify_email', 'reset_password'])
      ).rejects.toThrow(
        'Invalid token type. Expected verify_email or reset_password, got "2fa".'
      );
    });
  });
});
