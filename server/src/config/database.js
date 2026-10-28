import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const configDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(configDir, '..', '.env') });

let isConnected = false;

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dermx-ai';
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const conn = await mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 10000 });
      isConnected = true;
      console.log(`MongoDB Connected: ${conn.connection.host}`);

      mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err.message);
        isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('MongoDB disconnected');
        isConnected = false;
      });

      mongoose.connection.on('connected', () => {
        console.log('MongoDB connected');
        isConnected = true;
      });

      process.once('SIGINT', async () => {
        await mongoose.connection.close();
        console.log('MongoDB connection closed through app termination');
        process.exit(0);
      });

      return;
    } catch (error) {
      isConnected = false;
      console.error(`MongoDB connection attempt ${attempt}/${maxAttempts} failed:`, error.message);

      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
      } else {
        console.warn('Server will continue without MongoDB. Check DNS/network access and the Atlas cluster status.');
      }
    }
  }
};

export const isMongoDBAvailable = () => isConnected && mongoose.connection.readyState === 1;

export { connectDB };
export default connectDB;
