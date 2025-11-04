/**
 * Socket Emitter
 * ---------------
 * Centralized module for all socket.io event emissions.
 * Keeps socket events consistent across controllers and services.
 */

import { io, getReceiverSocketId } from "../../lib/socket.js";

/* -------------------------------------------------------------------------- */
/* 🧩 General Emitters                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Broadcast a message to all users in a specific group room.
 */
export function emitGroupMessage(groupId, message) {
  if (!io) return console.warn("⚠️ [SocketEmitter] IO not initialized");
  io.to(groupId).emit("newGroupMessage", message);
  console.log(`📢 [SocketEmitter] Group message emitted → groupId=${groupId}`);
}

/**
 * Send a private message (used for @aria/, @aria-chat/, @aria-compile, etc.)
 */
export function emitPrivateMessage(userId, message) {
  const socketId = getReceiverSocketId(userId?.toString());
  if (!socketId) {
    console.warn(`⚠️ [SocketEmitter] No active socket for user ${userId}`);
    return;
  }
  io.to(socketId).emit("newAIResponse", message);
  console.log(`🤖 [SocketEmitter] Private AI response sent → userId=${userId}`);
}

/**
 * Notify members of a new group creation.
 */
export function emitNewGroupCreated(group) {
  if (!group?.members) return;

  group.members.forEach((member) => {
    const socketId = getReceiverSocketId(member._id);
    if (socketId) {
      io.to(socketId).emit("newGroupCreated", group);
    }
  });

  console.log(`👥 [SocketEmitter] Notified ${group.members.length} members of new group.`);
}

/**
 * Emit a system-level notification to a specific user.
 * Example: progress updates, benchmark summaries, system alerts.
 */
export function emitSystemNotification(userId, payload) {
  const socketId = getReceiverSocketId(userId?.toString());
  if (!socketId) {
    console.warn(`⚠️ [SocketEmitter] Cannot notify — user ${userId} not connected`);
    return;
  }
  io.to(socketId).emit("systemNotification", payload);
  console.log(`🛰️ [SocketEmitter] System notification sent → userId=${userId}`);
}

/**
 * Emit broadcast message to all connected users.
 */
export function emitGlobalBroadcast(event, data) {
  if (!io) return;
  io.emit(event, data);
  console.log(`🌐 [SocketEmitter] Global event broadcasted → ${event}`);
}