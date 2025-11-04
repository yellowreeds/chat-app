/**
 * Group Message Controller
 * ------------------------
 * Handles core group messaging:
 *   - Sending normal messages (text, image, file)
 *   - Fetching group message history
 *   - Emitting Socket.IO events
 *
 * (AI commands such as @aria/ are handled elsewhere)
 */

import GroupMessage from "../models/groupMessage.model.js";
import { uploadImage, handleFileUpload, asyncHandler } from "./utils.controller.js";
import { emitGroupMessage } from "../services/socket/socketEmitter.js";
import { handleAriaCommand } from "./ariaCommand.controller.js"; // 👈 add this import
import { runPdfPipeline } from "../services/docs/docPipelineService.js";
import mongoose from "mongoose";
import path from "path";

/* -------------------------------------------------------------------------- */
/* 🟢 Send a Message to Group                                                 */
/* -------------------------------------------------------------------------- */
export const sendGroupMessage = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { text, image } = req.body;
  const senderId = req.user._id;

  // 🧠 Intercept @aria commands (redirect to AI handler)
  if (text && (text.startsWith("@aria/") || text.startsWith("@aria-"))) {
    console.log("🤖 Intercepted @aria command in group chat — redirecting to AI handler...");
    return handleAriaCommand(req, res);
  }

  // Handle optional attachments
  let imageUrl = null;
  let fileUrl = null;
  let fileName = null;

  if (image) imageUrl = await uploadImage(image);
  if (req.file) {
    const uploadedFile = handleFileUpload(req.file);
    fileUrl = uploadedFile.fileUrl;
    fileName = uploadedFile.fileName;

    // 🧠 Auto-run document FAISS indexing if PDF or DOCX
    if (fileName.endsWith(".pdf") || fileName.endsWith(".docx")) {
      try {
        const filenameOnly = path.basename(fileUrl);

        console.log(`📖 [AutoIndex] Triggering FAISS indexing for ${filenameOnly}`);
        await runPdfPipeline({ groupId, filename: filenameOnly });
        console.log(`✅ [AutoIndex] Document indexing finished for ${filenameOnly}`);

      } catch (err) {
        console.error("❌ [AutoIndex] Failed to trigger FAISS pipeline:", err.message);
      }
    }
  }

  // Create message document
  const newMessage = new GroupMessage({
    senderId,
    groupId,
    text,
    image: imageUrl,
    file: fileUrl,
    fileName,
  });

  await newMessage.save();
  const populatedMessage = await newMessage.populate("senderId", "fullName profilePic");

  // Broadcast message to all users in group room
  emitGroupMessage(groupId, populatedMessage);

  return res.status(201).json({
    ok: true,
    message: "Message sent successfully",
    result: populatedMessage,
  });
});

/* -------------------------------------------------------------------------- */
/* 🔵 Get All Messages for a Specific Group                                   */
/* -------------------------------------------------------------------------- */
export const getGroupMessages = asyncHandler(async (req, res) => {
  const { groupId } = req.params;

  // ✅ Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(groupId)) {
    return res.status(400).json({ ok: false, message: "Invalid group ID format" });
  }

  // ✅ Convert string to ObjectId before querying
  const groupObjectId = new mongoose.Types.ObjectId(groupId);

  // ✅ Fetch messages
  const messages = await GroupMessage.find({ groupId: groupObjectId })
    .sort({ createdAt: 1 })
    .populate("senderId", "fullName profilePic");

  console.log(`💬 [getGroupMessages] Found ${messages.length} messages for group ${groupId}`);

  return res.status(200).json({
    ok: true,
    count: messages.length,
    messages,
  });
});