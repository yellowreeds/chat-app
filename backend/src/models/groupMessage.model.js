/**
 * Group Message Model
 * --------------------
 * Stores messages sent in group chats.
 */

import mongoose from "mongoose";

const groupMessageSchema = new mongoose.Schema(
  {
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, trim: true, default: "" },
    image: { type: String, default: null },
    file: { type: String, default: null },
    fileName: { type: String, default: null },
    privateTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "groupmessages", // ✅ match your actual Mongo collection
  }
);

export const GroupMessage = mongoose.model("GroupMessage", groupMessageSchema);
export default GroupMessage;