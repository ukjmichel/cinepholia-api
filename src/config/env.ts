import { envToBool, requireEnv } from '../utils/envUtils.js';

const isTest = process.env.NODE_ENV === 'test';

export const config = {
  // ─── Application ─────────────────────────────
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || (isTest ? 3001 : 3000),
  hostAppPort: Number(process.env.HOST_APP_PORT) || 3000,

  // ─── MySQL Database Configuration ────────────
  mysqlHost: isTest ? requireEnv('TEST_MYSQL_HOST') : requireEnv('MYSQL_HOST'),
  mysqlPort:
    Number(isTest ? process.env.TEST_MYSQL_PORT : process.env.MYSQL_PORT) ||
    3306,
  hostMysqlPort:
    Number(
      isTest ? process.env.TEST_HOST_MYSQL_PORT : process.env.HOST_MYSQL_PORT
    ) || 3312,
  mysqlDatabase: isTest
    ? requireEnv('TEST_MYSQL_DATABASE')
    : requireEnv('MYSQL_DATABASE'),
  mysqlRootPassword: isTest
    ? requireEnv('TEST_MYSQL_ROOT_PASSWORD')
    : requireEnv('MYSQL_ROOT_PASSWORD'),
  mysqlUser: isTest ? requireEnv('TEST_MYSQL_USER') : requireEnv('MYSQL_USER'),
  mysqlPassword: isTest
    ? requireEnv('TEST_MYSQL_PASSWORD')
    : requireEnv('MYSQL_PASSWORD'),

  // ─── MongoDB Configuration ───────────────────
  mongoInitDbDatabase: requireEnv('MONGO_INITDB_DATABASE'),
  mongoPort: Number(process.env.MONGO_PORT) || 27017,
  hostMongoPort: Number(process.env.HOST_MONGO_PORT) || 27017,
  mongoInitDbRootUsername: requireEnv('MONGO_INITDB_ROOT_USERNAME'),
  mongoInitDbRootPassword: requireEnv('MONGO_INITDB_ROOT_PASSWORD'),
  mongodbUri: requireEnv('MONGODB_URI'),

  // ─── Mongo Express Configuration ─────────────
  mongoExpressPort:
    Number(
      isTest
        ? process.env.TEST_MONGO_EXPRESS_PORT
        : process.env.MONGO_EXPRESS_PORT
    ) || 8081,
  hostMongoExpressPort:
    Number(
      isTest
        ? process.env.TEST_HOST_MONGO_EXPRESS_PORT
        : process.env.HOST_MONGO_EXPRESS_PORT
    ) || 8081,

  // ─── Resend email configuration ──────────────
  resendApiKey: requireEnv('RESEND_API_KEY'),
  resendFrom: process.env.RESEND_FROM || 'no-reply@yourdomain.com',
  sendWelcomeEmail: envToBool(process.env.SEND_WELCOME_EMAIL, false),
  testEmail: process.env.TEST_EMAIL,
};
