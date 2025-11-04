/**
 * Authentication Middleware
 * --------------------------
 * Protects routes by validating JWT from cookie or Authorization header.
 * Attaches `req.user` on success.
 */

import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const authMiddleware = async (req, res, next) => {
  try {
    const token =
      req.cookies?.jwt ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : null);

    if (!token)
      return res.status(401).json({ ok: false, message: "Unauthorized – No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded?.userId)
      return res.status(401).json({ ok: false, message: "Unauthorized – Invalid token" });

    const user = await User.findById(decoded.userId).select("-password");
    if (!user)
      return res.status(404).json({ ok: false, message: "User not found" });

    req.user = user;
    next();
  } catch (err) {
    console.error("❌ [AuthMiddleware] Error:", err.message);
    return res.status(401).json({
      ok: false,
      message: "Unauthorized – Token invalid or expired",
    });
  }
};