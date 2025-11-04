/**
 * MongoDB Connection
 * ------------------
 * Centralized database connector using Mongoose.
 */

import mongoose from "mongoose";
import { config } from "../config/env.js";

export const connectDB = async () => {
  const MONGO_URI = config.MONGO_URI;

  if (!MONGO_URI) {
    console.error("❌ db.js - MONGODB_URI missing in .env");
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`❌ MongoDB Connection Failed: ${err.message}`);
    process.exit(1);
  }
};