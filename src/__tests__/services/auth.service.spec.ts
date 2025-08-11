import jwt from 'jsonwebtoken';
import { AuthService } from '../../services/auth.service.js';
import { UnauthorizedError } from '../../errors/unauthorized-error.js';
import { NotFoundError } from '../../errors/not-found-error.js';

// --- Mocks ---

// Mock the config used by the service so tokens can be signed/verified
jest.mock('../../config/env.js', () => ({
  config: {
    jwtSecret: 'test-access-secret',
    jwtRefreshSecret: 'test-refresh-secret',
    jwtExpiresIn: '1h',
    jwtRefreshExpiresIn: '7d',
  },
}));

// Mock userService so we control DB lookups/password validation
const getUserByUsernameOrEmail = jest.fn();
const getUserById = jest.fn();

jest.mock('../../services/user.service.js', () => ({
  userService: {
    getUserByUsernameOrEmail: (...args: any[]) =>
      getUserByUsernameOrEmail(...args),
    getUserById: (...args: any[]) => getUserById(...args),
  },
}));

// --- Helpers ---

const baseUser = {
  userId: 'u-123',
  username: 'alice',
  email: 'alice@example.com',
  verified: true,
};

function makeUser(
  overrides?: Partial<typeof baseUser> & { validatePassword?: any }
) {
  return {
    ...baseUser,
    ...overrides,
    validatePassword:
      overrides?.validatePassword ??
      (jest.fn().mockResolvedValue(true) as unknown as (
        pwd: string
      ) => Promise<boolean>),
  } as any; // compatible with UserModel shape used by the service
}

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService();
    service.clearBlacklistedTokens();
    service.clearLoginAttempts(baseUser.username);
  });

  // --- login ---

  it('logs in with valid credentials and returns tokens', async () => {
    const user = makeUser();
    getUserByUsernameOrEmail.mockResolvedValue(user);

    const tokens = await service.login('alice', 'password');

    expect(tokens.accessToken).toEqual(expect.any(String));
    expect(tokens.refreshToken).toEqual(expect.any(String));

    // Verify payload of access token
    const decoded: any = jwt.verify(tokens.accessToken, 'test-access-secret');
    expect(decoded.userId).toBe(baseUser.userId);
    expect(decoded.username).toBe(baseUser.username);
    expect(decoded.email).toBe(baseUser.email);
    expect(decoded.verified).toBe(true);
  });

  it('increments attempts and throws UnauthorizedError on invalid credentials', async () => {
    const user = makeUser({
      validatePassword: jest.fn().mockResolvedValue(false),
    });
    getUserByUsernameOrEmail.mockResolvedValue(user);

    await expect(service.login('alice', 'wrong')).rejects.toThrow(
      UnauthorizedError
    );

    const attempts = service.getLoginAttempts('alice');
    expect(attempts).toBeDefined();
    expect(attempts?.count).toBe(1);
  });

  it('locks out after too many failed attempts', async () => {
    const user = makeUser({
      validatePassword: jest.fn().mockResolvedValue(false),
    });
    getUserByUsernameOrEmail.mockResolvedValue(user);

    // 5 invalid attempts -> 6th triggers lockout at start of login()
    for (let i = 0; i < 5; i++) {
      await expect(service.login('alice', 'wrong')).rejects.toThrow(
        UnauthorizedError
      );
    }
    await expect(service.login('alice', 'wrong-again')).rejects.toThrow(
      /Too many login attempts/i
    );
  });

  it('throws NotFoundError when user not found on login', async () => {
    getUserByUsernameOrEmail.mockResolvedValue(null);

    await expect(service.login('ghost', 'pass')).rejects.toThrow(NotFoundError);
  });

  // --- token generation & verification ---

  it('verifies a valid access token', async () => {
    const user = makeUser();
    const token = service.generateAccessToken(user);

    const payload = await service.verifyAccessToken(token);
    expect(payload.userId).toBe(baseUser.userId);
    expect(payload.username).toBe(baseUser.username);
  });

  it('rejects a blacklisted access token', async () => {
    const user = makeUser();
    const token = service.generateAccessToken(user);
    await service.logout(token);

    await expect(service.verifyAccessToken(token)).rejects.toThrow(
      UnauthorizedError
    );
  });

  it('rejects an invalid access token', async () => {
    await expect(service.verifyAccessToken('not-a-jwt')).rejects.toThrow(
      UnauthorizedError
    );
  });

  // --- refresh tokens ---

  it('refreshes tokens with a valid refresh token', async () => {
    const user = makeUser();
    // refreshTokens() re-fetches the user by ID from the decoded refresh token
    getUserById.mockResolvedValue(user);

    const refreshToken = service.generateRefreshToken(user);
    const newPair = await service.refreshTokens(refreshToken);

    expect(newPair.accessToken).toEqual(expect.any(String));
    expect(newPair.refreshToken).toEqual(expect.any(String));
  });

  it('throws UnauthorizedError for an invalid refresh token', async () => {
    await expect(service.refreshTokens('bogus')).rejects.toThrow(
      UnauthorizedError
    );
  });

  it('throws NotFoundError if user missing during refresh', async () => {
    getUserById.mockResolvedValue(null);

    const tokenForMissingUser = jwt.sign(
      { userId: 'missing' },
      'test-refresh-secret',
      {
        expiresIn: '7d',
      }
    );

    await expect(service.refreshTokens(tokenForMissingUser)).rejects.toThrow(
      NotFoundError
    );
  });

  // --- blacklist utilities ---

  it('blacklists and checks tokens', async () => {
    const user = makeUser();
    const token = service.generateAccessToken(user);

    expect(await service.isTokenBlacklisted(token)).toBe(false);
    await service.logout(token);
    expect(await service.isTokenBlacklisted(token)).toBe(true);

    service.clearBlacklistedTokens();
    expect(await service.isTokenBlacklisted(token)).toBe(false);
  });

  it('clears login attempts', async () => {
    const user = makeUser({
      validatePassword: jest.fn().mockResolvedValue(false),
    });
    getUserByUsernameOrEmail.mockResolvedValue(user);

    await expect(service.login('alice', 'wrong')).rejects.toThrow(
      UnauthorizedError
    );
    expect(service.getLoginAttempts('alice')?.count).toBe(1);

    service.clearLoginAttempts('alice');
    expect(service.getLoginAttempts('alice')).toBeUndefined();
  });
});
