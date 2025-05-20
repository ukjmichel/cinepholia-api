// src/server.ts
import dotenv from 'dotenv';
import app from './app';
import { sequelize } from './config/db';
import connectMongoDB from './config/mongo';

dotenv.config();

const port = Number(process.env.PORT) || 3000;

async function startServer() {
  try {
    await Promise.all([
      sequelize.authenticate().then(() => {
        console.log('✅ MySQL connection successful');
      }),
      connectMongoDB().then(() => {
        console.log('✅ MongoDB connection successful');
      }),
    ]);
  } catch (err) {
    console.error('❌ Error during DB connections:', err);
    process.exit(1);
    return;
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server running at http://0.0.0.0:${port}/`);
  });
}

startServer();

export default app;
