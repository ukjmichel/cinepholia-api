// src/__tests__/services/email.service.spec.ts

// 💡 Toujours mettre les chemins relatifs tout en haut !
const configPath = '../../config/env.js';
const servicePath = '../../services/email.service.js';

import { jest } from '@jest/globals';

describe('EmailService', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('should send welcome email successfully', async () => {
    jest.resetModules();

    // Mock Resend
    jest.doMock('resend', () => ({
      Resend: jest.fn().mockImplementation(() => ({
        emails: {
          send: jest.fn().mockResolvedValue({
            data: { id: 'mock-id' },
            error: null,
          } as never),
        },
      })),
    }));

    // Mock config
    jest.doMock(
      configPath,
      () => ({
        config: {
          resendApiKey: 'dummy_key',
          resendFrom: 'test@example.com',
          testEmail: 'test.receiver@example.com',
        },
      }),
      { virtual: true }
    );

    // Import dynamique
    const { EmailService } = await import(servicePath);
    const service = new EmailService();

    await expect(
      service.sendWelcomeEmail('any@email.com', 'Jean Michel')
    ).resolves.not.toThrow();
  });

  it('should throw error if resendApiKey is missing', async () => {
    jest.resetModules();

    jest.doMock('resend', () => ({
      Resend: jest.fn(),
    }));

    jest.doMock(
      configPath,
      () => ({
        config: {
          resendApiKey: '', // missing
          resendFrom: 'test@example.com',
          testEmail: 'test.receiver@example.com',
        },
      }),
      { virtual: true }
    );

    // Only import after mocks and NO top-level instance!
    const { EmailService } = await import(servicePath);
    expect(() => new EmailService()).toThrow(
      'Missing RESEND_API_KEY in environment variables.'
    );
  });

  it('should throw if sending email fails', async () => {
    jest.resetModules();

    // Mock Resend pour renvoyer une erreur
    jest.doMock('resend', () => ({
      Resend: jest.fn().mockImplementation(() => ({
        emails: {
          send: jest.fn().mockResolvedValue({
            data: null,
            error: new Error('fail'),
          } as never),
        },
      })),
    }));

    jest.doMock(
      configPath,
      () => ({
        config: {
          resendApiKey: 'dummy_key',
          resendFrom: 'test@example.com',
          testEmail: 'test.receiver@example.com',
        },
      }),
      { virtual: true }
    );

    const { EmailService } = await import(servicePath);
    const service = new EmailService();

    await expect(
      service.sendWelcomeEmail('fail@email.com', 'ErrorUser')
    ).rejects.toThrow('Failed to send welcome email');
  });
});
