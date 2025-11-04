import express from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import {
  getUsersForSidebar,
  getMessages,
  sendMessage,
} from "../controllers/message.controller.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

// Direct messaging routes
router.get("/users", authMiddleware, getUsersForSidebar);
router.get("/:id", authMiddleware, getMessages);
router.post("/send/:id", authMiddleware, upload.single("file"), sendMessage);

export default router;