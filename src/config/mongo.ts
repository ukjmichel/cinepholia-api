import mongoose from 'mongoose';
import { config } from './env.js'; // Adjust path as needed

/**
 * Connects to MongoDB using Mongoose.
 * Exits the process if connection fails.
 * @returns {Promise<void>}
 */
export const connectMongoDB = async (): Promise<void> => {
  try {
    const uri = config.mongodbUri;

    if (!uri) {
      throw new Error('MongoDB URI not defined in config');
    }

    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB:', mongoose.connection.name);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

export default connectMongoDB;
