/**
 * Multer Upload Middleware
 * -------------------------
 * Handles dynamic destination folders for group or user uploads.
 */

import multer from "multer";
import path from "path";
import fs from "fs";

const UPLOADS_DIR = path.resolve("uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  console.log(`📂 [Upload] Created root uploads folder: ${UPLOADS_DIR}`);
}

/* -------------------------------------------------------------------------- */
/* 🧩 Storage Configuration                                                   */
/* -------------------------------------------------------------------------- */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const groupId = req.params.groupId || req.body.groupId;
      const receiverId = req.params.id || req.body.receiverId;
      const targetFolder = groupId || receiverId || "general";

      const targetPath = path.join(UPLOADS_DIR, targetFolder);
      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
        console.log(`📁 [Upload] Created folder: ${targetPath}`);
      }

      cb(null, targetPath);
    } catch (err) {
      console.error("❌ [Upload] Folder creation failed:", err);
      cb(err);
    }
  },

  filename: (req, file, cb) => {
    try {
      const originalName = Buffer.from(file.originalname, "latin1").toString("utf8");
      const ext = path.extname(originalName);
      const base = path.basename(originalName, ext).replace(/\s+/g, "_");
      const uniqueName = `${Date.now()}-${base}${ext}`;

      file._decodedOriginalName = originalName;
      cb(null, uniqueName);
    } catch (err) {
      cb(err);
    }
  },
});

/* -------------------------------------------------------------------------- */
/* 🔒 File Type Validation                                                    */
/* -------------------------------------------------------------------------- */
const allowedTypes = new Set([
  "application/pdf",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const fileFilter = (req, file, cb) => {
  if (allowedTypes.has(file.mimetype)) {
    cb(null, true);
  } else {
    console.warn(`⚠️ [Upload] Blocked type: ${file.mimetype}`);
    cb(new Error("Invalid file type"), false);
  }
};

export const upload = multer({ storage, fileFilter });