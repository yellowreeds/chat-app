/**
 * Environment Loader
 * ------------------
 * Loads .env before anything else runs.
 * Ensures every service can access environment variables reliably.
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../"); // go up to project root

dotenv.config({ path: path.join(rootDir, ".env") });

// ✅ Sanity check
if (!process.env.MONGODB_URI) {
  console.error("❌ env.js - MONGODB_URI missing in .env");
  process.exit(1);
}

export const config = {
  MONGO_URI: process.env.MONGODB_URI,
  PORT: process.env.PORT || 5001,
  JWT_SECRET: process.env.JWT_SECRET || "defaultsecret",
  CLOUDINARY: {
    NAME: process.env.CLOUDINARY_CLOUD_NAME,
    KEY: process.env.CLOUDINARY_API_KEY,
    SECRET: process.env.CLOUDINARY_API_SECRET,
  },
  MODELS: {
    CHAT: process.env.ARIA_CHAT_MODEL,
    SUMMARY: process.env.ARIA_SUMMARY_MODEL,
    RAG: process.env.ARIA_RAG_MODEL,
  },
  PATHS: {
    SUMMARY_OUT: process.env.SUMMARY_OUTPUT_DIR,
    SUMMARY_TEMPLATE: process.env.SUMMARY_TEMPLATE_PATH,
  },
  PYTHON_BIN: process.env.PYTHON_BIN_PATH,
  BENCHMARK_ITERATIONS: Number(process.env.BENCHMARK_ITERATIONS || 20),
};