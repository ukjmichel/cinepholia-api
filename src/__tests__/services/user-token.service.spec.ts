import { UserTokenService } from '../../services/user-token.service.js';
import { NotFoundError } from '../../errors/not-found-error.js';

import { UserTokenAttributes } from '../../models/user-token.model.js';
import { UnauthorizedError } from '../../errors/unauthorized-error.js';

const mockUserModel = {
  findByPk: jest.fn(),
};

const mockUserTokenModel = {
  destroy: jest.fn(),
  create: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  findAll: jest.fn(),
};

const service = new UserTokenService(
  mockUserTokenModel as any,
  mockUserModel as any
);

describe('UserTokenService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrReplaceToken', () => {
    const data: UserTokenAttributes = {
      userId: 'user-123',
      token: 'sometoken',
      type: 'verify_email',
      expiresAt: new Date(Date.now() + 10000),
    };

    it('throws NotFoundError if user does not exist', async () => {
      mockUserModel.findByPk.mockResolvedValue(null);

      await expect(service.createOrReplaceToken(data)).rejects.toThrow(
        NotFoundError
      );
      expect(mockUserModel.findByPk).toHaveBeenCalledWith(data.userId);
      expect(mockUserTokenModel.destroy).not.toHaveBeenCalled();
      expect(mockUserTokenModel.create).not.toHaveBeenCalled();
    });

    it('removes existing tokens and creates a new one', async () => {
      mockUserModel.findByPk.mockResolvedValue({ userId: data.userId });
      mockUserTokenModel.destroy.mockResolvedValue(1);
      mockUserTokenModel.create.mockResolvedValue({ ...data });

      const result = await service.createOrReplaceToken(data);

      expect(mockUserModel.findByPk).toHaveBeenCalledWith(data.userId);
      expect(mockUserTokenModel.destroy).toHaveBeenCalledWith({
        where: { userId: data.userId },
      });
      expect(mockUserTokenModel.create).toHaveBeenCalledWith(data);
      expect(result).toEqual({ ...data });
    });

    it('throws Error if token was not created', async () => {
      mockUserModel.findByPk.mockResolvedValue({ userId: data.userId });
      mockUserTokenModel.destroy.mockResolvedValue(1);
      mockUserTokenModel.create.mockResolvedValue(null);

      await expect(service.createOrReplaceToken(data)).rejects.toThrow(
        'Failed to create new user token'
      );
      expect(mockUserTokenModel.create).toHaveBeenCalledWith(data);
    });
  });

  describe('findToken', () => {
    it('returns user token if found', async () => {
      const token = { token: 'abc', userId: 'user-123' };
      mockUserTokenModel.findOne.mockResolvedValue(token);

      const result = await service.findToken('abc');
      expect(result).toBe(token);
      expect(mockUserTokenModel.findOne).toHaveBeenCalledWith({
        where: { token: 'abc' },
      });
    });

    it('throws NotFoundError if token not found', async () => {
      mockUserTokenModel.findOne.mockResolvedValue(null);

      await expect(service.findToken('abc')).rejects.toThrow(NotFoundError);
    });
  });

  describe('findByUserId', () => {
    it('returns user token if found', async () => {
      const token = { userId: 'user-123', token: 'abc' };
      mockUserTokenModel.findOne.mockResolvedValue(token);

      const result = await service.findByUserId('user-123');
      expect(result).toBe(token);
      expect(mockUserTokenModel.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
    });

    it('throws NotFoundError if token for user not found', async () => {
      mockUserTokenModel.findOne.mockResolvedValue(null);

      await expect(service.findByUserId('user-123')).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('deleteTokenForUser', () => {
    it('deletes token if found', async () => {
      mockUserTokenModel.destroy.mockResolvedValue(1);

      await expect(
        service.deleteTokenForUser('user-123')
      ).resolves.toBeUndefined();
      expect(mockUserTokenModel.destroy).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
    });

    it('throws NotFoundError if no token to delete', async () => {
      mockUserTokenModel.destroy.mockResolvedValue(0);

      await expect(service.deleteTokenForUser('user-123')).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('deleteExpiredTokens', () => {
    it('deletes expired tokens and returns count', async () => {
      mockUserTokenModel.destroy.mockResolvedValue(3);
      const result = await service.deleteExpiredTokens();
      expect(result).toBe(3);
      expect(mockUserTokenModel.destroy).toHaveBeenCalled();
    });
  });

  describe('updateTokenForUser', () => {
    it('updates token and returns updated instance', async () => {
      const updatedToken = { userId: 'user-123', token: 'newtoken' };
      mockUserTokenModel.update.mockResolvedValue([1, [updatedToken]]);

      const result = await service.updateTokenForUser('user-123', {
        token: 'newtoken',
      });
      expect(result).toBe(updatedToken);
      expect(mockUserTokenModel.update).toHaveBeenCalledWith(
        { token: 'newtoken' },
        { where: { userId: 'user-123' }, returning: true }
      );
    });

    it('throws NotFoundError if token not found to update', async () => {
      mockUserTokenModel.update.mockResolvedValue([0, []]);

      await expect(
        service.updateTokenForUser('user-123', { token: 'newtoken' })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('validateToken', () => {
    it('returns token if valid', async () => {
      const userToken = {
        token: 'sometoken',
        expiresAt: new Date(Date.now() + 10000),
        destroy: jest.fn(),
      };
      mockUserTokenModel.findOne.mockResolvedValue(userToken);

      const result = await service.validateToken('sometoken');
      expect(result).toBe(userToken);
      expect(mockUserTokenModel.findOne).toHaveBeenCalledWith({
        where: { token: 'sometoken' },
      });
    });

    it('deletes and throws UnauthorizedError if token is expired', async () => {
      const expiredToken = {
        token: 'expiredtoken',
        expiresAt: new Date(Date.now() - 10000),
        destroy: jest.fn(),
      };
      mockUserTokenModel.findOne.mockResolvedValue(expiredToken);

      await expect(service.validateToken('expiredtoken')).rejects.toThrow(
        UnauthorizedError
      );
      expect(expiredToken.destroy).toHaveBeenCalled();
    });

    it('throws NotFoundError if token not found', async () => {
      mockUserTokenModel.findOne.mockResolvedValue(null);

      await expect(service.validateToken('notoken')).rejects.toThrow(
        NotFoundError
      );
    });
  });
});
