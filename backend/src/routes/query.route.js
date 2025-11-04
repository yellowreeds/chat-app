import express from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { queryDocument } from "../controllers/query.controller.js";

const router = express.Router();

// 🔍 Query processed documents (Hybrid + Rerank)
router.post("/:groupId", authMiddleware, queryDocument);

export default router;