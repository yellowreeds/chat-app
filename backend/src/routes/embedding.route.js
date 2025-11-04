import express from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { embedPdf } from "../controllers/embedding.controller.js";

const router = express.Router();

// Build FAISS index for a group
router.post("/:groupId", authMiddleware, embedPdf);

export default router;