import express from "express";
import { signup, login, logout, updateProfile, checkAuth } from "../controllers/auth.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

// Auth routes
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", authMiddleware, logout);
router.put("/update-profile", authMiddleware, updateProfile);
router.get("/check-auth", authMiddleware, checkAuth);

export default router;