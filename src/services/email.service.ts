import { Resend } from 'resend';
import { config } from '../config/env.js';
import { welcomeEmailTemplate } from '../templates/emails/welcome-email.js';
import { resetPasswordEmailTemplate } from '../templates/emails/reset-password-email.js';
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
    const recipient = this.testReceiver || to;
    try {
      const { data, error } = await this.resend.emails.send({
        from: this.from,
        to: recipient,
        subject: 'Bienvenue sur notre plateforme Cinepholia !',
        html: welcomeEmailTemplate(username),
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

  async sendResetPasswordEmail(
    to: string,
    username: string,
    code: string
  ): Promise<void> {
    const recipient = this.testReceiver || to;
    try {
      const { data, error } = await this.resend.emails.send({
        from: this.from,
        to: recipient,
        subject: 'Code de réinitialisation de votre mot de passe Cinepholia',
        html: resetPasswordEmailTemplate(username, code),
      });

      if (error) {
        console.error('Error sending reset password email:', error);
        throw new Error('Failed to send reset password email');
      }

      console.log('Reset password email sent successfully:', data?.id);
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error sending reset password email:', error.message);
      } else {
        console.error('Unknown error sending reset password email:', error);
      }
      throw new Error('Failed to send reset password email');
    }
  }
}

export const emailService = new EmailService();
