import { Sequelize, ModelCtor } from 'sequelize-typescript';
import { config } from './env.js';
import { UserModel } from '../models/user.model.js';
import { AuthorizationModel } from '../models/authorization.model.js';
import { MovieModel } from '../models/movie.model.js';
import { MovieTheaterModel } from '../models/movie-theater.model.js';
import { MovieHallModel } from '../models/movie-hall.model.js';
import { ScreeningModel } from '../models/screening.model.js';
import { BookingModel } from '../models/booking.model.js';
import { BookedSeatModel } from '../models/booked-seat.model.js';
import { UserTokenModel } from '../models/user-token.model.js';
import { IncidentReportModel } from '../models/incident-report.model.js';
import { registerAssociations } from '../models/association.js';

let models: ModelCtor<any>[] = [];

/**
 * ✅ Sequelize instance configured for MySQL
 * - Always uses MySQL (also in tests)
 * - Reads configuration from environment variables
 */
export const sequelize = new Sequelize({
  dialect: 'mysql',
  host: config.mysqlHost,
  port: config.mysqlPort,
  username: config.mysqlUser,
  password: config.mysqlPassword,
  database: config.mysqlDatabase,
  logging: false,
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
});

/**
 * Load and register all models into Sequelize
 */
export function loadModels() {
  models = [
    UserModel,
    AuthorizationModel,
    MovieModel,
    MovieTheaterModel,
    MovieHallModel,
    ScreeningModel,
    BookingModel,
    BookedSeatModel,
    UserTokenModel,
    IncidentReportModel,
  ];

  sequelize.addModels(models);
  console.log(`✅ Loaded ${models.length} models into Sequelize`);
}

/**
 * ✅ Initialize database: Load models, register associations, and sync schema
 * - In test: `force:true` drops and recreates tables for isolation
 * - In dev/prod: `alter:true` applies changes without data loss
 */
export async function syncDB() {
  try {
    // Step 1: Load all models
    loadModels();

    // Step 2: Register associations
    registerAssociations();

    // Step 3: Sync database schema
    if (config.nodeEnv === 'test') {
      await sequelize.sync({ force: true });
      console.log('✅ Test DB synced with MySQL (force:true)');
    } else {
      await sequelize.sync({ alter: true });
      console.log('✅ Database synced with MySQL (alter:true)');
    }
  } catch (err) {
    console.error('❌ Error syncing database:', err);
    throw err;
  }
}

/**
 * Close database connection
 * Useful for graceful shutdown
 */
export async function closeDB() {
  try {
    await sequelize.close();
    console.log('✅ Database connection closed');
  } catch (err) {
    console.error('❌ Error closing database:', err);
    throw err;
  }
}

/**
 * Test database connection
 */
export async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully');
    return true;
  } catch (err) {
    console.error('❌ Unable to connect to database:', err);
    return false;
  }
}
