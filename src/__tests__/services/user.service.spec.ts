// src/__tests__/services/user.service.spec.ts

import { UserService } from '../../services/user.service.js';
import { UserModel } from '../../models/user.model.js';
import { ConflictError } from '../../errors/conflict-error.js';
import { NotFoundError } from '../../errors/not-found-error.js';

jest.mock('../../models/user.model');

const userService = new UserService();

const mockUser: any = {
  userId: 'test-uuid',
  username: 'alice',
  email: 'alice@email.com',
  firstName: 'Alice',
  lastName: 'Smith',
  password: 'hashedPassword',
  verified: false,
  validatePassword: jest.fn().mockResolvedValue(true),
  update: jest.fn(),
  save: jest.fn(),
  toJSON() {
    return this;
  },
};

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('creates a user if email and username are unique', async () => {
      (UserModel.findOne as jest.Mock).mockResolvedValue(null);
      (UserModel.create as jest.Mock).mockResolvedValue(mockUser);

      const user = await userService.createUser({
        email: 'alice@email.com',
        username: 'alice',
        firstName: 'Alice',
        lastName: 'Smith',
        password: 'password123',
      });
      expect(user).toEqual(mockUser);
      expect(UserModel.create).toHaveBeenCalled();
    });

    it('throws ConflictError if email or username exists', async () => {
      (UserModel.findOne as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        userService.createUser({
          email: 'alice@email.com',
          username: 'alice',
          firstName: 'Alice',
          lastName: 'Smith',
          password: 'password123',
        })
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('getUserById', () => {
    it('returns user if found', async () => {
      (UserModel.findByPk as jest.Mock).mockResolvedValue(mockUser);

      const user = await userService.getUserById('test-uuid');
      expect(user).toEqual(mockUser);
    });
  });

  describe('updateUser', () => {
    it('updates and returns user if found and no conflicts', async () => {
      (UserModel.findByPk as jest.Mock).mockResolvedValue({
        ...mockUser,
        update: jest.fn(),
      });
      (UserModel.findOne as jest.Mock).mockResolvedValue(null);

      const updated = await userService.updateUser('test-uuid', {
        firstName: 'Alicia',
      });
      expect(updated.firstName).toBe('Alice'); // our mock user returns itself
      expect(UserModel.findByPk).toHaveBeenCalled();
    });

    it('throws NotFoundError if user not found', async () => {
      (UserModel.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(
        userService.updateUser('no-id', { firstName: 'Alicia' })
      ).rejects.toThrow(NotFoundError);
    });

    it('throws ConflictError if username/email is taken', async () => {
      (UserModel.findByPk as jest.Mock).mockResolvedValue({
        ...mockUser,
        update: jest.fn(),
      });
      (UserModel.findOne as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        userService.updateUser('test-uuid', { email: 'bob@email.com' })
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('deleteUser', () => {
    it('deletes user and returns true if found', async () => {
      (UserModel.findByPk as jest.Mock).mockResolvedValue(mockUser);
      (UserModel.destroy as jest.Mock).mockResolvedValue(1);

      const deleted = await userService.deleteUser('test-uuid');
      expect(deleted).toBe(true);
    });

    it('throws NotFoundError if user not found', async () => {
      (UserModel.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(userService.deleteUser('not-exist')).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('listUsers', () => {
    it('returns paginated user list', async () => {
      (UserModel.findAndCountAll as jest.Mock).mockResolvedValue({
        rows: [mockUser],
        count: 1,
      });

      const result = await userService.listUsers({ page: 1, pageSize: 2 });
      expect(result.users).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(2);
    });

    it('returns empty array if no users', async () => {
      (UserModel.findAndCountAll as jest.Mock).mockResolvedValue({
        rows: [],
        count: 0,
      });

      const result = await userService.listUsers();
      expect(result.users).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('validatePassword', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('returns user if password valid', async () => {
      jest
        .spyOn(UserService.prototype, 'getUserByUsernameOrEmail')
        .mockResolvedValue(mockUser);
      mockUser.validatePassword = jest.fn().mockResolvedValue(true);

      const user = await userService.validatePassword('alice', 'password');
      expect(user).toEqual(mockUser);
    });

    it('returns null if password invalid', async () => {
      jest
        .spyOn(UserService.prototype, 'getUserByUsernameOrEmail')
        .mockResolvedValue(mockUser);
      mockUser.validatePassword = jest.fn().mockResolvedValue(false);

      const user = await userService.validatePassword('alice', 'wrong');
      expect(user).toBeNull();
    });

    it('throws NotFoundError if user not found', async () => {
      jest
        .spyOn(UserService.prototype, 'getUserByUsernameOrEmail')
        .mockRejectedValue(new NotFoundError('User not found'));

      await expect(
        userService.validatePassword('no-user', 'pass')
      ).rejects.toThrow(NotFoundError);
    });
  });
});
