/**
 * Message Controller
 * ------------------
 * Handles direct (1:1) messaging operations:
 *  - Fetch users for sidebar
 *  - Retrieve conversation history
 *  - Send new message (with optional image/file)
 */

import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import { uploadImage, handleFileUpload, asyncHandler } from "./utils.controller.js";
import { emitPrivateMessage } from "../services/socket/socketEmitter.js";
import { handleAriaCommand } from "./ariaCommand.controller.js"; // 👈 add this import
/* -------------------------------------------------------------------------- */
/* 🧑‍🤝‍🧑 1️⃣ Get Users for Sidebar                                           */
/* -------------------------------------------------------------------------- */
export const getUsersForSidebar = asyncHandler(async (req, res) => {
  const loggedInUserId = req.user._id;

  const users = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");
  res.status(200).json(users);
});

/* -------------------------------------------------------------------------- */
/* 💬 2️⃣ Get Messages Between Two Users                                      */
/* -------------------------------------------------------------------------- */
export const getMessages = asyncHandler(async (req, res) => {
  const { id: userToChatId } = req.params;
  const myId = req.user._id;

  const messages = await Message.find({
    $or: [
      { senderId: myId, receiverId: userToChatId },
      { senderId: userToChatId, receiverId: myId },
    ],
  })
    .sort({ createdAt: 1 })
    .populate("senderId", "fullName profilePic"); // 👈 add this

  res.status(200).json(messages);
});

/* -------------------------------------------------------------------------- */
/* 📨 3️⃣ Send Message                                                        */
/* -------------------------------------------------------------------------- */
export const sendMessage = asyncHandler(async (req, res) => {
  const { text, image } = req.body;
  const { id: receiverId } = req.params;
  const senderId = req.user._id;

  // 🧠 Intercept @aria commands (redirect to AI handler)
  if (text && (text.startsWith("@aria/") || text.startsWith("@aria-"))) {
    console.log("🤖 Intercepted @aria command — redirecting to AI handler...");
    req.params.groupId = receiverId; // 👈 match expected param name in handleAriaCommand
    return handleAriaCommand(req, res);
  }

  // Attach receiverId for multer’s upload destination
  req.body.receiverId = receiverId;

  // Handle uploads
  const imageUrl = await uploadImage(image);
  const { fileUrl, fileName } = handleFileUpload(req.file);

  // Create message document
  const newMessage = new Message({
    senderId,
    receiverId,
    text,
    image: imageUrl,
    file: fileUrl,
    fileName,
  });

  await newMessage.save();

  // populate sender info before emitting
  const populatedMessage = await newMessage.populate("senderId", "fullName profilePic");

  // Send via socket
  emitPrivateMessage(receiverId, populatedMessage);

  console.log(
    `💌 [MessageController] Message sent → from ${senderId} to ${receiverId} | ${text?.slice(0, 50) || "(attachment)"}`
  );

  res.status(201).json(populatedMessage);
});