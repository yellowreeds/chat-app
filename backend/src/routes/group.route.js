import express from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import {
  createGroup,
  getGroups,
  getGroupDetails,
} from "../controllers/group.controller.js";
import {
  sendGroupMessage,
  getGroupMessages,
} from "../controllers/groupMessage.controller.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

// ✅ Group creation & listing
router.post("/create", authMiddleware, createGroup);
router.get("/", authMiddleware, getGroups);
router.get("/:groupId", authMiddleware, getGroupDetails);

// ✅ Group messaging routes
router.get("/:groupId/messages", authMiddleware, getGroupMessages);
router.post("/:groupId/send", authMiddleware, upload.single("file"), sendGroupMessage); // 👈 ADD THIS LINE

export default router;