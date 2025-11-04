import express from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { processPdfPipeline } from "../controllers/doc.controller.js";

const router = express.Router();

router.post("/upload/:groupId", authMiddleware, processPdfPipeline);

export default router;