import { Sequelize } from 'sequelize-typescript';
import { UserModel } from '../models/user.model.js';
import { AuthorizationModel } from '../models/authorization.model.js';
import { UserTokenModel } from '../models/user-token.model.js';
import { config } from './env.js';
import { MovieTheaterModel } from '../models/movie-theater.model.js';
import { MovieHallModel } from '../models/movie-hall.model.js';
import { ScreeningModel } from '../models/screening.model.js';
import { MovieModel } from '../models/movie.model.js';
import { BookingModel } from '../models/booking.model.js';

export const sequelize = new Sequelize({
  dialect: 'mysql',
  host: config.mysqlHost,
  port: config.mysqlPort,
  username: config.mysqlUser,
  password: config.mysqlPassword,
  database: config.mysqlDatabase,
  models: [
    UserModel,
    AuthorizationModel,
    UserTokenModel,
    MovieTheaterModel,
    MovieHallModel,
    ScreeningModel,
    MovieModel,
    BookingModel,
  ],
  logging: false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

export async function syncDB() {
  try {
    if (config.nodeEnv === 'test') {
      // Désactive les contraintes FK
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
      await sequelize.sync({ force: true });
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
      console.log('Test DB synced with force:true + disabled FKs');
    } else {
      await sequelize.sync({ alter: true });
      console.log('Database synced with alter:true');
    }
  } catch (err) {
    console.error('Error syncing database:', err);
    throw err;
  }
}
