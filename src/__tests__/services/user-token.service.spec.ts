// __tests__/services/user-token.service.spec.ts

import { UserTokenService } from '../../services/user-token.service.js';
import { UserTokenModel } from '../../models/user-token.model.js';
import { config } from '../../config/env.js';
import { Op } from 'sequelize';

jest.mock('../../models/user-token.model.js');

describe('UserTokenService', () => {
  const userId = 'user-123';

  const mockToken = {
    userId,
    token: UserTokenService['hashToken']('123456'),
    type: 'reset_password',
    attempts: 0,
    expiresAt: new Date(Date.now() + 1000 * 60 * 10), // 10 min
    lastRequestAt: new Date(Date.now() - config.resetRequestIntervalMs - 1000),
    save: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createPasswordResetToken', () => {
    it('creates a new token if none exists', async () => {
      (UserTokenModel.findByPk as jest.Mock).mockResolvedValue(null);
      (UserTokenModel.upsert as jest.Mock).mockResolvedValue([mockToken]);

      const code = await UserTokenService.createPasswordResetToken(userId);
      expect(code).toMatch(/^\d{6}$/);
      expect(UserTokenModel.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          type: 'reset_password',
          token: expect.any(String),
          expiresAt: expect.any(Date),
          attempts: 0,
          lastRequestAt: expect.any(Date),
        })
      );
    });

    it('throws error if requested too soon', async () => {
      const recentRequest = {
        ...mockToken,
        lastRequestAt: new Date(),
      };
      (UserTokenModel.findByPk as jest.Mock).mockResolvedValue(recentRequest);

      await expect(
        UserTokenService.createPasswordResetToken(userId)
      ).rejects.toThrow('You must wait before requesting another reset code.');
    });

    it('replaces existing token after delay', async () => {
      (UserTokenModel.findByPk as jest.Mock).mockResolvedValue(mockToken);
      (UserTokenModel.upsert as jest.Mock).mockResolvedValue([mockToken]);

      const code = await UserTokenService.createPasswordResetToken(userId);
      expect(code).toMatch(/^\d{6}$/);
      expect(UserTokenModel.upsert).toHaveBeenCalled();
    });
  });

  describe('validatePasswordResetToken', () => {
    const validToken = '123456';
    const hashed = UserTokenService['hashToken'](validToken);

    it('returns the token if valid', async () => {
      (UserTokenModel.findOne as jest.Mock).mockResolvedValue({
        ...mockToken,
        token: hashed,
      });

      const result =
        await UserTokenService.validatePasswordResetToken(validToken);
      expect(result).toHaveProperty('userId', userId);
    });

    it('returns null and increments attempts if token is wrong', async () => {
      const mockWrong = {
        ...mockToken,
        token: 'wronghash',
        save: jest.fn(),
      };
      (UserTokenModel.findOne as jest.Mock).mockResolvedValue(mockWrong);

      const result =
        await UserTokenService.validatePasswordResetToken('wrong-token');
      expect(result).toBeNull();
      expect(mockWrong.save).toHaveBeenCalled();
    });

    it('throws if max attempts exceeded', async () => {
      const locked = {
        ...mockToken,
        attempts: config.resetMaxAttempts,
      };
      (UserTokenModel.findOne as jest.Mock).mockResolvedValue(locked);

      await expect(
        UserTokenService.validatePasswordResetToken(validToken)
      ).rejects.toThrow('Too many invalid attempts. Request a new reset code.');
    });

    it('returns null if no token is found', async () => {
      (UserTokenModel.findOne as jest.Mock).mockResolvedValue(null);
      const result =
        await UserTokenService.validatePasswordResetToken(validToken);
      expect(result).toBeNull();
    });

    it('ignores expired tokens (via expiresAt < now)', async () => {
      // Simulate Sequelize returning nothing for expired tokens
      (UserTokenModel.findOne as jest.Mock).mockResolvedValue(null);

      const result =
        await UserTokenService.validatePasswordResetToken('123456');
      expect(result).toBeNull();
    });

  });

  describe('consumePasswordResetToken', () => {
    it('deletes token for given userId', async () => {
      (UserTokenModel.destroy as jest.Mock).mockResolvedValue(1);
      await UserTokenService.consumePasswordResetToken(userId);
      expect(UserTokenModel.destroy).toHaveBeenCalledWith({
        where: { userId, type: 'reset_password' },
      });
    });
  });

  describe('deleteExpiredTokens', () => {
    it('removes all expired tokens', async () => {
      (UserTokenModel.destroy as jest.Mock).mockResolvedValue(3);
      await UserTokenService.deleteExpiredTokens();
      expect(UserTokenModel.destroy).toHaveBeenCalledWith({
        where: {
          expiresAt: {
            [Op.lt]: expect.any(Date),
          },
        },
      });
    });
  });
});
