import { Sequelize } from 'sequelize-typescript';
import { UserModel } from '../models/user.model.js';
import { AuthorizationModel } from '../models/authorization.model.js';
import { UserTokenModel } from '../models/user-token.model.js';
import { config } from './env.js'; 

export const sequelize = new Sequelize({
  dialect: 'mysql',
  host: config.mysqlHost,
  port: config.mysqlPort,
  username: config.mysqlUser,
  password: config.mysqlPassword,
  database: config.mysqlDatabase,
  models: [UserModel, AuthorizationModel, UserTokenModel],
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
      await sequelize.sync({ force: true });
      console.log('Test DB synced with force:true');
    } else {
      await sequelize.sync({ alter: true });
      console.log('Database synced with alter:true');
    }
  } catch (err) {
    console.error('Error syncing database:', err);
    throw err;
  }
}
