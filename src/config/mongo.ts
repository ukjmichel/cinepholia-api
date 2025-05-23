import mongoose from 'mongoose';
import { config } from './env.js'; // adjust path as needed

const connectMongoDB = async () => {
  try {
    const uri = config.mongodbUri;

    if (!uri) {
      throw new Error('MongoDB URI not defined in config');
    }

    // Remove deprecated options - they're no longer needed in mongoose 6+
    await mongoose.connect(uri);

    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

export default connectMongoDB;
