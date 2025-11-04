/**
 * Socket.IO Configuration
 * ------------------------
 * Handles real-time events and authenticates users via JWT.
 */

import { Server } from "socket.io";
import http from "http";
import express from "express";
import jwt from "jsonwebtoken";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// In-memory map: userId → socketId
const userSocketMap = new Map();
export const getReceiverSocketId = (userId) => userSocketMap.get(userId?.toString());

io.on("connection", (socket) => {
  try {
    // 🧠 Extract token from handshake
    const token = socket.handshake.auth?.token;
    if (!token) throw new Error("Missing token");

    // ✅ Verify JWT using your backend secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    // ✅ Register socket
    userSocketMap.set(userId.toString(), socket.id);
    console.log(`🔌 [Socket] Connected: ${socket.id} (User: ${userId})`);

    // Notify all clients about online users
    io.emit("getOnlineUsers", Array.from(userSocketMap.keys()));

    // === Group management ===
    socket.on("groupCreated", (group) => {
      if (group.members.some((m) => m._id === userId)) {
        socket.join(group._id);
        console.log(`👥 [Socket] User ${userId} auto-joined group ${group._id}`);
      }
    });

    socket.on("joinGroup", (groupId) => {
      socket.join(groupId);
      console.log(`📌 [Socket] User ${userId} joined group ${groupId}`);
    });

    socket.on("leaveGroup", (groupId) => {
      socket.leave(groupId);
      console.log(`📤 [Socket] User ${userId} left group ${groupId}`);
    });

    socket.on("disconnect", () => {
      console.log(`❌ [Socket] Disconnected: ${socket.id}`);
      userSocketMap.delete(userId);
      io.emit("getOnlineUsers", Array.from(userSocketMap.keys()));
    });

  } catch (err) {
    console.error(`🚫 [Socket Auth Failed]: ${err.message}`);
    socket.disconnect(true); // 🔒 reject unauthorized socket
  }
});

export { io, app, server };