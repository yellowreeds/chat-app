import express from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.js";
import { processPdfPipeline } from "../controllers/pdfPipeline.controller.js";

const router = express.Router();

// 🧩 Full automatic PDF → MongoDB → FAISS pipeline
router.post("/upload/:groupId", authMiddleware, upload.single("file"), processPdfPipeline);

export default router;