import { envToBool, envToInt, requireEnv } from '../utils/envUtils.js';

const isTest = process.env.NODE_ENV === 'test';

export const config = {
  // ─── Application ─────────────────────────────
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || (isTest ? 3001 : 3000),
  hostAppPort: Number(process.env.HOST_APP_PORT) || 3000,
  baseUrl: Number(process.env.BASE_URL) || 'http://localhost:3000',

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
  mongoInitDbDatabase: isTest
    ? requireEnv('TEST_MONGO_INITDB_DATABASE')
    : requireEnv('MONGO_INITDB_DATABASE'),
  mongoPort:
    Number(isTest ? process.env.TEST_MONGO_PORT : process.env.MONGO_PORT) ||
    27017,
  hostMongoPort:
    Number(
      isTest ? process.env.TEST_HOST_MONGO_PORT : process.env.HOST_MONGO_PORT
    ) || 27017,
  mongoInitDbRootUsername: isTest
    ? requireEnv('TEST_MONGO_INITDB_ROOT_USERNAME')
    : requireEnv('MONGO_INITDB_ROOT_USERNAME'),
  mongoInitDbRootPassword: isTest
    ? requireEnv('TEST_MONGO_INITDB_ROOT_PASSWORD')
    : requireEnv('MONGO_INITDB_ROOT_PASSWORD'),
  mongodbUri: isTest
    ? requireEnv('TEST_MONGODB_URI')
    : requireEnv('MONGODB_URI'),

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
  resendApiKey: isTest
    ? requireEnv('TEST_RESEND_API_KEY')
    : requireEnv('RESEND_API_KEY'),
  resendFrom: isTest
    ? process.env.TEST_RESEND_FROM || 'no-reply@yourdomain.com'
    : process.env.RESEND_FROM || 'no-reply@yourdomain.com',
  sendWelcomeEmail: envToBool(
    isTest
      ? process.env.TEST_SEND_WELCOME_EMAIL
      : process.env.SEND_WELCOME_EMAIL,
    false
  ),
  testEmail: process.env.TEST_EMAIL,

  // ─── JWT Auth Configuration ──────────────────
  jwtSecret: isTest ? requireEnv('TEST_JWT_SECRET') : requireEnv('JWT_SECRET'),
  jwtRefreshSecret: isTest
    ? requireEnv('TEST_JWT_REFRESH_SECRET')
    : requireEnv('JWT_REFRESH_SECRET'),
  jwtExpiresIn: isTest
    ? requireEnv('TEST_JWT_EXPIRES_IN')
    : requireEnv('JWT_EXPIRES_IN'),
  jwtRefreshExpiresIn: isTest
    ? requireEnv('TEST_JWT_REFRESH_EXPIRES_IN')
    : requireEnv('JWT_REFRESH_EXPIRES_IN'),

  // ─── Multer Upload Configuration ─────────────
  multerMaxFileSize: envToInt(
    process.env.MULTER_MAX_FILE_SIZE,
    2 * 1024 * 1024
  ),
};
