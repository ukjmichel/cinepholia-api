import { Resend } from 'resend';
import { config } from './env.js';

const resend = new Resend(config.resendApiKey);

resend.apiKeys.create({ name: 'cinepholia' });

export default resend;
