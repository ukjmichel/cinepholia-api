import { Resend } from 'resend';
import { config } from '../config/env.js';

export class EmailService {
  private resend: Resend;
  private from: string;
  private testReceiver = config.testEmail;

  constructor() {
    if (!config.resendApiKey) {
      throw new Error('Missing RESEND_API_KEY in environment variables.');
    }

    this.resend = new Resend(config.resendApiKey);
    this.from = config.resendFrom || 'onboarding@resend.dev';
  }

  async sendWelcomeEmail(to: string, username: string): Promise<void> {
    const recipient = this.testReceiver;
    try {
      const { data, error } = await this.resend.emails.send({
        from: this.from,
        to: recipient || ' ',
        subject: 'Bienvenue sur notre plateforme Cinepholia !',
        html: `
          <h1>Bienvenue ${username} !</h1>
          <p>Merci de nous avoir rejoints. Nous sommes heureux de vous compter parmi nous !</p>
        `,
      });

      if (error) {
        console.error('Error sending welcome email:', error);
        throw new Error('Failed to send welcome email');
      }

      console.log('Welcome email sent successfully:', data?.id);
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error sending welcome email:', error.message);
      } else {
        console.error('Unknown error sending welcome email:', error);
      }
      throw new Error('Failed to send welcome email');
    }
  }
}

export const emailService = new EmailService();
