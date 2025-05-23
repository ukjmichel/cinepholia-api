import mongoose from 'mongoose';
import cron from 'node-cron';
import MovieStats from '../models/movie-stats.schema.js';
import { config } from '../config/env.js';

export async function cleanMoviesStats() {
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - 7);

  const result = await MovieStats.updateMany(
    {},
    { $pull: { bookings: { bookedAt: { $lt: cutoff } } } }
  );
  return result;
}

// Only run if script is run directly
if (require.main === module) {
  const mongoUri = config.mongodbUri;
  if (!mongoUri) {
    console.error('MONGODB_URI is not set in environment variables!');
    process.exit(1);
  }

  mongoose
    .connect(mongoUri)
    .then(() => {
      cron.schedule(
        '10 0 * * *',
        async () => {
          try {
            const res = await cleanMoviesStats();
            console.log(
              `[${new Date().toISOString()}] Bookings cleaned:`,
              res.modifiedCount ?? res
            );
          } catch (err) {
            console.error('Error during scheduled cleanup:', err);
          }
        },
        { timezone: 'Europe/Paris' } // ou 'UTC' selon tes besoins
      );
      console.log(
        'Auto-scheduled booking cleanup started! (Runs daily at 00:10)'
      );
    })
    .catch((err) => {
      console.error('MongoDB connection error:', err);
      process.exit(1);
    });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    await mongoose.disconnect();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await mongoose.disconnect();
    process.exit(0);
  });
}
