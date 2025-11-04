/**
 * Utils Controller
 * ----------------
 * Common reusable controller-level helpers:
 *   1️⃣ asyncHandler() — wraps async functions for error safety
 *   2️⃣ uploadImage() — uploads base64 images to Cloudinary
 *   3️⃣ handleFileUpload() — formats uploaded file metadata
 */

import path from "path";
import cloudinary from "../lib/cloudinary.js";

/* -------------------------------------------------------------------------- */
/* 🧠 1️⃣ Async Handler Wrapper                                              */
/* -------------------------------------------------------------------------- */
/**
 * Wraps an async route/controller so unhandled errors
 * automatically propagate to Express error middleware.
 *
 * Example:
 *   router.get("/users", asyncHandler(async (req, res) => { ... }))
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/* -------------------------------------------------------------------------- */
/* ☁️ 2️⃣ Upload Base64 Image to Cloudinary                                  */
/* -------------------------------------------------------------------------- */
/**
 * Uploads an image (base64 or URL) to Cloudinary.
 * Returns the hosted URL or null if no image provided.
 */
export const uploadImage = async (image) => {
  if (!image) return null;

  try {
    const result = await cloudinary.uploader.upload(image);
    console.log(`📤 [UtilsController] Uploaded image to Cloudinary: ${result.secure_url}`);
    return result.secure_url;
  } catch (err) {
    console.error("❌ [UtilsController] Cloudinary upload failed:", err.message);
    throw new Error("Image upload failed. Please try again.");
  }
};

/* -------------------------------------------------------------------------- */
/* 📁 3️⃣ Handle File Upload Metadata                                         */
/* -------------------------------------------------------------------------- */
/**
 * Processes multer-uploaded file and returns a formatted object
 * containing accessible URL and original file name.
 *
 * Example Output:
 *   {
 *     fileUrl: "http://localhost:5001/uploads/group123/file.pdf",
 *     fileName: "Project Plan.pdf"
 *   }
 */
export const handleFileUpload = (file) => {
  if (!file) {
    console.warn("⚠️ [UtilsController] No file provided to handleFileUpload().");
    return { fileUrl: null, fileName: null };
  }

  // Decode UTF-8 filename from multer (avoids mojibake for Korean filenames)
  const decodedOriginal =
    file._decodedOriginalName ||
    Buffer.from(file.originalname, "latin1").toString("utf8");

  // Extract folder name from destination path (e.g. groupId or receiverId)
  const segments = file.destination.split(path.sep);
  const folder = segments[segments.length - 1];

  // Construct public access URL (customize for your domain if deployed)
  const fileUrl = `http://localhost:5001/uploads/${folder}/${encodeURIComponent(file.filename)}`;

  console.log(`📂 [UtilsController] Processed file upload: ${decodedOriginal} → ${fileUrl}`);

  return { fileUrl, fileName: decodedOriginal };
};