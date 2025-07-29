import { Sequelize, ModelCtor } from 'sequelize-typescript';
import { config } from './env.js';

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
 * ✅ Dynamically load and register all models
 */
export async function loadModels() {
  const { UserModel } = await import('../models/user.model.js');
  const { AuthorizationModel } = await import(
    '../models/authorization.model.js'
  );
  const { UserTokenModel } = await import('../models/user-token.model.js');
  const { MovieTheaterModel } = await import(
    '../models/movie-theater.model.js'
  );
  const { MovieHallModel } = await import('../models/movie-hall.model.js');
  const { ScreeningModel } = await import('../models/screening.model.js');
  const { MovieModel } = await import('../models/movie.model.js');
  const { BookingModel } = await import('../models/booking.model.js');
  const { BookedSeatModel } = await import('../models/booked-seat.model.js');

  models = [
    UserModel,
    AuthorizationModel,
    UserTokenModel,
    MovieTheaterModel,
    MovieHallModel,
    ScreeningModel,
    MovieModel,
    BookingModel,
    BookedSeatModel,
  ];

  sequelize.addModels(models);
}

/**
 * ✅ Synchronize DB schema
 * - In test: `force:true` drops and recreates tables for isolation
 * - In dev/prod: `alter:true` applies changes without data loss
 */
export async function syncDB() {
  try {
    await loadModels();

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
