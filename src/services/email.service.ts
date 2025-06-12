/**
 * Transactional email sending service via the Resend API.
 *
 * This service allows sending emails to users, such as:
 * - Welcome email upon account creation
 * - Email containing a password reset code
 *
 * The service handles errors and uses a test address if configured for the development or test environment.
 *
 * Main features:
 * - Preliminary verification of the Resend API configuration
 * - Centralized management of the email sender
 * - Sending HTML-formatted emails using reusable templates
 * - Explicit error handling with detailed logging
 */

import { Resend } from 'resend';
import { config } from '../config/env.js';
import { welcomeEmailTemplate } from '../templates/emails/welcome-email.js';
import { resetPasswordEmailTemplate } from '../templates/emails/reset-password-email.js';

/**
 * EmailService class to manage sending emails via Resend.
 */
export class EmailService {
  /** Instance of the Resend client */
  private resend: Resend;
  /** Sender email address used for sending */
  private from: string;
  /** Test email address for test or development environment */
  private testReceiver = config.testEmail;

  /**
   * Constructor checking the configuration and initializing Resend.
   *
   * @throws {Error} If the Resend API key is missing in the environment variables.
   */
  constructor() {
    if (!config.resendApiKey) {
      throw new Error('Missing RESEND_API_KEY in environment variables.');
    }

    this.resend = new Resend(config.resendApiKey);
    this.from = config.resendFrom || 'onboarding@resend.dev';
  }

  /**
   * Sends a welcome email to a user.
   *
   * @param {string} to - Recipient's email address.
   * @param {string} username - User's name to display in the email.
   * @returns {Promise<void>}
   * @throws {Error} If sending the email fails.
   */
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

  /**
   * Sends a password reset email with a secure code.
   *
   * @param {string} to - Recipient's email address.
   * @param {string} username - User's name to display in the email.
   * @param {string} code - Reset code to send to the user.
   * @returns {Promise<void>}
   * @throws {Error} If sending the email fails.
   */
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

/**
 * Singleton instance of the email sending service, usable throughout the application.
 */
export const emailService = new EmailService();
