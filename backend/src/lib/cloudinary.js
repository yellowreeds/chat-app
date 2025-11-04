/**
 * Cloudinary Configuration
 * -------------------------
 * Handles image upload via Cloudinary.
 * Loaded once at startup for global use.
 */

import { v2 as cloudinary } from "cloudinary";

if (!process.env.CLOUDINARY_CLOUD_NAME) {
  console.warn("⚠️  CLOUDINARY_* environment variables missing.");
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "",
  api_key: process.env.CLOUDINARY_API_KEY || "",
  api_secret: process.env.CLOUDINARY_API_SECRET || "",
});

export default cloudinary;