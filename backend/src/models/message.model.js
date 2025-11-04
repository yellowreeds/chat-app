/**
 * Direct Message Model
 * ---------------------
 * Represents 1:1 user messages (text, image, file).
 */

import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, trim: true, default: "" },
    image: { type: String, default: null },
    file: { type: String, default: null },
    fileName: { type: String, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "messages",
  }
);

export const Message = mongoose.model("Message", messageSchema);
export default Message;