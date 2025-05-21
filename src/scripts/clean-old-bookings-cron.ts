import mongoose from 'mongoose';
import cron from 'node-cron';
import MovieStats from '../models/movie-stats.schema';
import dotenv from 'dotenv';

dotenv.config();

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

// Only run cron if script is executed directly
if (require.main === module) {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI is not set in environment variables!');
    process.exit(1);
  }

  mongoose
    .connect(mongoUri)
    .then(() => {
      // Schedule at 00:10 every day
      cron.schedule('10 0 * * *', async () => {
        try {
          const res = await cleanMoviesStats();
          console.log(
            `[${new Date().toISOString()}] Bookings cleaned:`,
            res.modifiedCount ?? res
          );
        } catch (err) {
          console.error('Error during scheduled cleanup:', err);
        }
      });
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
