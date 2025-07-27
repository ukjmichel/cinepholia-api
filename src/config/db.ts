import { Sequelize, ModelCtor } from 'sequelize-typescript';
import { config } from './env.js';

let models: ModelCtor<any>[] = [];

/**
 * ✅ Always return a working Sequelize instance
 * - In test: use SQLite in-memory (no external DB needed)
 * - In dev/prod: use MySQL with env configs
 */
export const sequelize =
  config.nodeEnv === 'test'
    ? new Sequelize({
        dialect: 'sqlite',
        storage: ':memory:',
        logging: false,
      })
    : new Sequelize({
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
 * ✅ Load all models dynamically and register them
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
 * ✅ Synchronize DB safely
 */
export async function syncDB() {
  try {
    await loadModels();

    if (config.nodeEnv === 'test') {
      // ✅ SQLite doesn't support FK checks, but sync works fine
      await sequelize.sync({ force: true });
      console.log('✅ Test DB synced with SQLite in-memory');
    } else {
      await sequelize.sync({ alter: true });
      console.log('✅ Database synced (alter:true)');
    }
  } catch (err) {
    console.error('❌ Error syncing database:', err);
    throw err;
  }
}
