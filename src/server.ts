import app from './app.js';
import { sequelize, syncDB } from './config/db.js';
import { config } from './config/env.js';
import connectMongoDB from './config/mongo.js';



const port = Number(config.port) || 3000;

async function waitForMySQL(retries = 5, delayMs = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      await sequelize.authenticate();
      return;
    } catch {
      console.log(`Waiting for MySQL... (${i + 1}/${retries})`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error('MySQL connection failed after retries');
}

async function startServer() {
  try {
    await waitForMySQL();
    console.log('✅ MySQL connection successful');

    await syncDB();
    console.log('✅ Database synced');

    await connectMongoDB();
    console.log('✅ MongoDB connection successful');
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
