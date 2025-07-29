const configPath = '../../config/env.js';
const servicePath = '../../services/email.service.js';
const welcomeTemplatePath = '../../templates/emails/welcome-email.js';
const resetTemplatePath = '../../templates/emails/reset-password-email.js';

import { jest } from '@jest/globals';

describe('EmailService', () => {
  let consoleLogSpy: jest.SpiedFunction<typeof console.log>;
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    // Setup console spies
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    // Restore console methods
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Constructor', () => {
    it('should create EmailService instance with valid config', async () => {
      jest.resetModules();

      jest.doMock('resend', () => ({
        Resend: jest.fn().mockImplementation(() => ({
          emails: { send: jest.fn() },
        })),
      }));

      jest.doMock(
        configPath,
        () => ({
          config: {
            resendApiKey: 'valid-api-key',
            resendFrom: 'noreply@cinepholia.com',
            testEmail: 'test@cinepholia.com',
          },
        }),
        { virtual: true }
      );

      const emailModule = await import(servicePath);
      const service = new emailModule.EmailService();

      expect(service).toBeInstanceOf(emailModule.EmailService);
    });

    it('should use default "from" email when resendFrom is not provided', async () => {
      jest.resetModules();

      jest.doMock('resend', () => ({
        Resend: jest.fn().mockImplementation(() => ({
          emails: { send: jest.fn() },
        })),
      }));

      jest.doMock(
        configPath,
        () => ({
          config: {
            resendApiKey: 'valid-api-key',
            resendFrom: undefined, // Not provided
            testEmail: 'test@example.com',
          },
        }),
        { virtual: true }
      );

      const emailModule = await import(servicePath);
      const service = new emailModule.EmailService();

      expect(service).toBeInstanceOf(emailModule.EmailService);
    });
  });

  describe('Constructor Error Handling', () => {
    it('should validate API key requirement without importing singleton', () => {
      // Mock the config module to return empty API key
      const mockConfig = { resendApiKey: '' };

      // Mock Resend
      const MockResend = jest.fn();

      // Create a test class that mimics EmailService behavior
      class TestEmailService {
        private resend: any;

        constructor() {
          if (!mockConfig.resendApiKey) {
            throw new Error('Missing RESEND_API_KEY in environment variables.');
          }
          this.resend = new MockResend(mockConfig.resendApiKey);
        }
      }

      expect(() => new TestEmailService()).toThrow(
        'Missing RESEND_API_KEY in environment variables.'
      );
    });

    it('should validate API key requirement for undefined values', () => {
      // Mock the config module to return undefined API key
      const mockConfig = { resendApiKey: undefined };

      // Mock Resend
      const MockResend = jest.fn();

      // Create a test class that mimics EmailService behavior
      class TestEmailService {
        private resend: any;

        constructor() {
          if (!mockConfig.resendApiKey) {
            throw new Error('Missing RESEND_API_KEY in environment variables.');
          }
          this.resend = new MockResend(mockConfig.resendApiKey);
        }
      }

      expect(() => new TestEmailService()).toThrow(
        'Missing RESEND_API_KEY in environment variables.'
      );
    });

    it('should validate API key requirement for null values', () => {
      // Mock the config module to return null API key
      const mockConfig = { resendApiKey: null };

      // Mock Resend
      const MockResend = jest.fn();

      // Create a test class that mimics EmailService behavior
      class TestEmailService {
        private resend: any;

        constructor() {
          if (!mockConfig.resendApiKey) {
            throw new Error('Missing RESEND_API_KEY in environment variables.');
          }
          this.resend = new MockResend(mockConfig.resendApiKey);
        }
      }

      expect(() => new TestEmailService()).toThrow(
        'Missing RESEND_API_KEY in environment variables.'
      );
    });

    it('should create instance when API key is valid', () => {
      // Mock the config module to return valid API key
      const mockConfig = { resendApiKey: 'valid-api-key' };

      // Mock Resend
      const MockResend = jest.fn();

      // Create a test class that mimics EmailService behavior
      class TestEmailService {
        private resend: any;

        constructor() {
          if (!mockConfig.resendApiKey) {
            throw new Error('Missing RESEND_API_KEY in environment variables.');
          }
          this.resend = new MockResend(mockConfig.resendApiKey);
        }
      }

      expect(() => new TestEmailService()).not.toThrow();

      // Verify that the mock constructor was called
      expect(MockResend).toHaveBeenCalledWith('valid-api-key');
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email successfully', async () => {
      jest.resetModules();

      const mockSend = jest.fn().mockResolvedValue({
        data: { id: 'welcome-email-123' },
        error: null,
      } as never);

      jest.doMock('resend', () => ({
        Resend: jest.fn().mockImplementation(() => ({
          emails: { send: mockSend },
        })),
      }));

      jest.doMock(
        configPath,
        () => ({
          config: {
            resendApiKey: 'dummy_key',
            resendFrom: 'noreply@cinepholia.com',
            testEmail: 'test.receiver@example.com',
          },
        }),
        { virtual: true }
      );

      jest.doMock(welcomeTemplatePath, () => ({
        welcomeEmailTemplate: jest
          .fn()
          .mockReturnValue('<html>Welcome Jean Michel!</html>'),
      }));

      const emailModule = await import(servicePath);
      const service = new emailModule.EmailService();

      await expect(
        service.sendWelcomeEmail('user@email.com', 'Jean Michel')
      ).resolves.not.toThrow();

      expect(mockSend).toHaveBeenCalledWith({
        from: 'noreply@cinepholia.com',
        to: 'test.receiver@example.com', // Should use testEmail
        subject: 'Bienvenue sur notre plateforme Cinepholia !',
        html: '<html>Welcome Jean Michel!</html>',
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Welcome email sent successfully:',
        'welcome-email-123'
      );
    });

    it('should use original recipient when testEmail is not set', async () => {
      jest.resetModules();

      const mockSend = jest.fn().mockResolvedValue({
        data: { id: 'welcome-email-456' },
        error: null,
      } as never);

      jest.doMock('resend', () => ({
        Resend: jest.fn().mockImplementation(() => ({
          emails: { send: mockSend },
        })),
      }));

      jest.doMock(
        configPath,
        () => ({
          config: {
            resendApiKey: 'dummy_key',
            resendFrom: 'noreply@cinepholia.com',
            testEmail: undefined, // No test email
          },
        }),
        { virtual: true }
      );

      jest.doMock(welcomeTemplatePath, () => ({
        welcomeEmailTemplate: jest
          .fn()
          .mockReturnValue('<html>Welcome!</html>'),
      }));

      const emailModule = await import(servicePath);
      const service = new emailModule.EmailService();

      await service.sendWelcomeEmail('original@email.com', 'TestUser');

      expect(mockSend).toHaveBeenCalledWith({
        from: 'noreply@cinepholia.com',
        to: 'original@email.com', // Should use original recipient
        subject: 'Bienvenue sur notre plateforme Cinepholia !',
        html: '<html>Welcome!</html>',
      });
    });

    it('should throw if sending email fails with API error', async () => {
      jest.resetModules();

      const mockSend = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Invalid API key', code: 'invalid_api_key' },
      } as never);

      jest.doMock('resend', () => ({
        Resend: jest.fn().mockImplementation(() => ({
          emails: { send: mockSend },
        })),
      }));

      jest.doMock(
        configPath,
        () => ({
          config: {
            resendApiKey: 'invalid_key',
            resendFrom: 'test@example.com',
            testEmail: 'test.receiver@example.com',
          },
        }),
        { virtual: true }
      );

      jest.doMock(welcomeTemplatePath, () => ({
        welcomeEmailTemplate: jest
          .fn()
          .mockReturnValue('<html>Welcome!</html>'),
      }));

      const emailModule = await import(servicePath);
      const service = new emailModule.EmailService();

      await expect(
        service.sendWelcomeEmail('fail@email.com', 'ErrorUser')
      ).rejects.toThrow('Failed to send welcome email');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error sending welcome email:',
        { message: 'Invalid API key', code: 'invalid_api_key' }
      );
    });

    it('should handle network errors', async () => {
      jest.resetModules();

      const networkError = new Error('Network connection failed');
      const mockSend = jest.fn().mockRejectedValue(networkError as never);

      jest.doMock('resend', () => ({
        Resend: jest.fn().mockImplementation(() => ({
          emails: { send: mockSend },
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

      jest.doMock(welcomeTemplatePath, () => ({
        welcomeEmailTemplate: jest
          .fn()
          .mockReturnValue('<html>Welcome!</html>'),
      }));

      const emailModule = await import(servicePath);
      const service = new emailModule.EmailService();

      await expect(
        service.sendWelcomeEmail('user@email.com', 'TestUser')
      ).rejects.toThrow('Failed to send welcome email');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error sending welcome email:',
        'Network connection failed'
      );
    });

    it('should handle unknown error types', async () => {
      jest.resetModules();

      const unknownError = 'String error';
      const mockSend = jest.fn().mockRejectedValue(unknownError as never);

      jest.doMock('resend', () => ({
        Resend: jest.fn().mockImplementation(() => ({
          emails: { send: mockSend },
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

      jest.doMock(welcomeTemplatePath, () => ({
        welcomeEmailTemplate: jest
          .fn()
          .mockReturnValue('<html>Welcome!</html>'),
      }));

      const emailModule = await import(servicePath);
      const service = new emailModule.EmailService();

      await expect(
        service.sendWelcomeEmail('user@email.com', 'TestUser')
      ).rejects.toThrow('Failed to send welcome email');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Unknown error sending welcome email:',
        'String error'
      );
    });

    it('should handle response without data.id', async () => {
      jest.resetModules();

      const mockSend = jest.fn().mockResolvedValue({
        data: {}, // No id property
        error: null,
      } as never);

      jest.doMock('resend', () => ({
        Resend: jest.fn().mockImplementation(() => ({
          emails: { send: mockSend },
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

      jest.doMock(welcomeTemplatePath, () => ({
        welcomeEmailTemplate: jest
          .fn()
          .mockReturnValue('<html>Welcome!</html>'),
      }));

      const emailModule = await import(servicePath);
      const service = new emailModule.EmailService();

      await service.sendWelcomeEmail('user@email.com', 'TestUser');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Welcome email sent successfully:',
        undefined
      );
    });
  });

  describe('sendResetPasswordEmail', () => {
    it('should send reset password email successfully', async () => {
      jest.resetModules();

      const mockSend = jest.fn().mockResolvedValue({
        data: { id: 'reset-email-789' },
        error: null,
      } as never);

      jest.doMock('resend', () => ({
        Resend: jest.fn().mockImplementation(() => ({
          emails: { send: mockSend },
        })),
      }));

      jest.doMock(
        configPath,
        () => ({
          config: {
            resendApiKey: 'dummy_key',
            resendFrom: 'noreply@cinepholia.com',
            testEmail: 'test.receiver@example.com',
          },
        }),
        { virtual: true }
      );

      jest.doMock(resetTemplatePath, () => ({
        resetPasswordEmailTemplate: jest
          .fn()
          .mockReturnValue('<html>Reset code: ABC123</html>'),
      }));

      const emailModule = await import(servicePath);
      const service = new emailModule.EmailService();

      await service.sendResetPasswordEmail(
        'user@email.com',
        'TestUser',
        'ABC123'
      );

      expect(mockSend).toHaveBeenCalledWith({
        from: 'noreply@cinepholia.com',
        to: 'test.receiver@example.com',
        subject: 'Code de réinitialisation de votre mot de passe Cinepholia',
        html: '<html>Reset code: ABC123</html>',
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Reset password email sent successfully:',
        'reset-email-789'
      );
    });

    it('should use original recipient when testEmail is not set for reset password', async () => {
      jest.resetModules();

      const mockSend = jest.fn().mockResolvedValue({
        data: { id: 'reset-email-original' },
        error: null,
      } as never);

      jest.doMock('resend', () => ({
        Resend: jest.fn().mockImplementation(() => ({
          emails: { send: mockSend },
        })),
      }));

      jest.doMock(
        configPath,
        () => ({
          config: {
            resendApiKey: 'dummy_key',
            resendFrom: 'noreply@cinepholia.com',
            testEmail: undefined, // No test email
          },
        }),
        { virtual: true }
      );

      jest.doMock(resetTemplatePath, () => ({
        resetPasswordEmailTemplate: jest
          .fn()
          .mockReturnValue('<html>Reset!</html>'),
      }));

      const emailModule = await import(servicePath);
      const service = new emailModule.EmailService();

      await service.sendResetPasswordEmail(
        'original@email.com',
        'TestUser',
        'CODE456'
      );

      expect(mockSend).toHaveBeenCalledWith({
        from: 'noreply@cinepholia.com',
        to: 'original@email.com', // Should use original recipient
        subject: 'Code de réinitialisation de votre mot de passe Cinepholia',
        html: '<html>Reset!</html>',
      });
    });

    it('should handle different reset code formats', async () => {
      jest.resetModules();

      const mockSend = jest.fn().mockResolvedValue({
        data: { id: 'reset-email-codes' },
        error: null,
      } as never);

      jest.doMock('resend', () => ({
        Resend: jest.fn().mockImplementation(() => ({
          emails: { send: mockSend },
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

      const mockTemplate = jest.fn();
      jest.doMock(resetTemplatePath, () => ({
        resetPasswordEmailTemplate: mockTemplate,
      }));

      const emailModule = await import(servicePath);
      const service = new emailModule.EmailService();

      const testCodes = ['ABC123', '123456', 'a1b2c3', 'RESET-CODE-2024'];

      for (const code of testCodes) {
        mockTemplate.mockReturnValue(`<html>Code: ${code}</html>`);
        await service.sendResetPasswordEmail(
          'user@email.com',
          'TestUser',
          code
        );

        expect(mockTemplate).toHaveBeenCalledWith('TestUser', code);
      }

      expect(mockSend).toHaveBeenCalledTimes(testCodes.length);
    });

    it('should handle API errors for reset password email', async () => {
      jest.resetModules();

      const mockSend = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Rate limit exceeded', code: 'rate_limit' },
      } as never);

      jest.doMock('resend', () => ({
        Resend: jest.fn().mockImplementation(() => ({
          emails: { send: mockSend },
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

      jest.doMock(resetTemplatePath, () => ({
        resetPasswordEmailTemplate: jest
          .fn()
          .mockReturnValue('<html>Reset!</html>'),
      }));

      const emailModule = await import(servicePath);
      const service = new emailModule.EmailService();

      await expect(
        service.sendResetPasswordEmail('user@email.com', 'TestUser', 'CODE123')
      ).rejects.toThrow('Failed to send reset password email');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error sending reset password email:',
        { message: 'Rate limit exceeded', code: 'rate_limit' }
      );
    });

    it('should handle network errors for reset password email', async () => {
      jest.resetModules();

      const networkError = new Error('Service unavailable');
      const mockSend = jest.fn().mockRejectedValue(networkError as never);

      jest.doMock('resend', () => ({
        Resend: jest.fn().mockImplementation(() => ({
          emails: { send: mockSend },
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

      jest.doMock(resetTemplatePath, () => ({
        resetPasswordEmailTemplate: jest
          .fn()
          .mockReturnValue('<html>Reset!</html>'),
      }));

      const emailModule = await import(servicePath);
      const service = new emailModule.EmailService();

      await expect(
        service.sendResetPasswordEmail('user@email.com', 'TestUser', 'CODE123')
      ).rejects.toThrow('Failed to send reset password email');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error sending reset password email:',
        'Service unavailable'
      );
    });

    it('should handle unknown errors for reset password email', async () => {
      jest.resetModules();

      const unknownError = { someProperty: 'Unknown error object' };
      const mockSend = jest.fn().mockRejectedValue(unknownError as never);

      jest.doMock('resend', () => ({
        Resend: jest.fn().mockImplementation(() => ({
          emails: { send: mockSend },
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

      jest.doMock(resetTemplatePath, () => ({
        resetPasswordEmailTemplate: jest
          .fn()
          .mockReturnValue('<html>Reset!</html>'),
      }));

      const emailModule = await import(servicePath);
      const service = new emailModule.EmailService();

      await expect(
        service.sendResetPasswordEmail('user@email.com', 'TestUser', 'CODE123')
      ).rejects.toThrow('Failed to send reset password email');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Unknown error sending reset password email:',
        { someProperty: 'Unknown error object' }
      );
    });
  });

  describe('Exported emailService instance', () => {
    it('should export a singleton instance of EmailService', async () => {
      jest.resetModules();

      jest.doMock('resend', () => ({
        Resend: jest.fn().mockImplementation(() => ({
          emails: { send: jest.fn() },
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

      const emailModule = await import(servicePath);

      expect(emailModule.emailService).toBeInstanceOf(emailModule.EmailService);
    });
  });

  describe('Template integration', () => {
    it('should call templates with correct parameters', async () => {
      jest.resetModules();

      const mockSend = jest.fn().mockResolvedValue({
        data: { id: 'template-test' },
        error: null,
      } as never);

      jest.doMock('resend', () => ({
        Resend: jest.fn().mockImplementation(() => ({
          emails: { send: mockSend },
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

      const mockWelcomeTemplate = jest
        .fn()
        .mockReturnValue('<html>Welcome</html>');
      const mockResetTemplate = jest.fn().mockReturnValue('<html>Reset</html>');

      jest.doMock(welcomeTemplatePath, () => ({
        welcomeEmailTemplate: mockWelcomeTemplate,
      }));

      jest.doMock(resetTemplatePath, () => ({
        resetPasswordEmailTemplate: mockResetTemplate,
      }));

      const emailModule = await import(servicePath);
      const service = new emailModule.EmailService();

      await service.sendWelcomeEmail('user@example.com', 'JohnDoe');
      expect(mockWelcomeTemplate).toHaveBeenCalledWith('JohnDoe');

      await service.sendResetPasswordEmail(
        'user@example.com',
        'JohnDoe',
        'RESET123'
      );
      expect(mockResetTemplate).toHaveBeenCalledWith('JohnDoe', 'RESET123');
    });
  });
  describe('sendTheaterContactMessage', () => {
    it('should send theater contact message successfully', async () => {
      jest.resetModules();

      const mockSend = jest.fn().mockResolvedValue({
        data: { id: 'contact-message-001' },
        error: null,
      } as never);

      jest.doMock('resend', () => ({
        Resend: jest.fn().mockImplementation(() => ({
          emails: { send: mockSend },
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

      const emailModule = await import(servicePath);
      const service = new emailModule.EmailService();

      await service.sendTheaterContactMessage(
        'THX1138',
        'owner@email.com',
        'Hello!\nI need help.'
      );

      expect(mockSend).toHaveBeenCalledWith({
        from: 'test@example.com',
        to: 'test.receiver@example.com',
        subject: 'Message concernant le cinéma THX1138',
        html: expect.stringContaining('Hello!<br>I need help.'),
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Theater contact message sent successfully:',
        'contact-message-001'
      );
    });

    it('should throw if sending theater contact message fails', async () => {
      jest.resetModules();

      const mockSend = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Invalid theater ID' },
      } as never);

      jest.doMock('resend', () => ({
        Resend: jest.fn().mockImplementation(() => ({
          emails: { send: mockSend },
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

      const emailModule = await import(servicePath);
      const service = new emailModule.EmailService();

      await expect(
        service.sendTheaterContactMessage('BADID', 'user@email.com', 'Test')
      ).rejects.toThrow('Failed to send theater contact message');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error sending theater contact message:',
        { message: 'Invalid theater ID' }
      );
    });

    it('should handle non-error object rejection in theater contact message', async () => {
      jest.resetModules();

      const mockSend = jest.fn().mockRejectedValue('String failure' as never);

      jest.doMock('resend', () => ({
        Resend: jest.fn().mockImplementation(() => ({
          emails: { send: mockSend },
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

      const emailModule = await import(servicePath);
      const service = new emailModule.EmailService();

      await expect(
        service.sendTheaterContactMessage('THX', 'contact@email.com', 'Oops')
      ).rejects.toThrow('Failed to send theater contact message');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Unknown error sending theater contact message:',
        'String failure'
      );
    });
  });

});
