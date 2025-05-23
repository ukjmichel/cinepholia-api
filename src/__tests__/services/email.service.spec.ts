import 'dotenv/config';

import resend from '../../config/emailClient.js';
import { emailService } from '../../services/email.service.js';
import { config } from '../../config/env.js';

jest.mock('../../config/emailClient', () => ({
  emails: {
    send: jest.fn(),
  },
}));

jest.mock('../../config/env', () => ({
  config: {
    resendFrom: 'test@resend.dev',
  },
}));

describe('EmailService', () => {
  const mockEmail = 'alice@email.com';
  const mockUsername = 'Alice';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call resend.emails.send with correct parameters', async () => {
    await emailService.sendWelcomeEmail(mockEmail, mockUsername);

    expect(resend.emails.send).toHaveBeenCalledTimes(1);
    expect(resend.emails.send).toHaveBeenCalledWith({
      from: config.resendFrom,
      to: mockEmail,
      subject: 'Bienvenue sur notre plateforme Cinepholia !',
      html: expect.stringContaining(`Bienvenue ${mockUsername}`),
    });
  });
});
