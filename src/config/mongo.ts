// config/mongo.ts
import mongoose from 'mongoose';

const connectMongoDB = async () => {
  try {
    const uri = process.env.MONGODB_URI as string;

    if (!uri) {
      throw new Error('MONGODB_URI not defined in environment variables');
    }

    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    } as mongoose.ConnectOptions);

    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

export default connectMongoDB;
