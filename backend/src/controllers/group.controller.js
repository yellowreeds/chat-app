/**
 * Group Controller
 * ----------------
 * Handles core group operations:
 *   - Create new group
 *   - Get list of user’s groups
 *   - Get group details
 *   - (No messaging or AI logic here)
 */

import Group from "../models/group.model.js";
import { asyncHandler } from "./utils.controller.js";
import { emitNewGroupCreated } from "../services/socket/socketEmitter.js";

/* -------------------------------------------------------------------------- */
/* 🟢 Create a New Group                                                      */
/* -------------------------------------------------------------------------- */
export const createGroup = asyncHandler(async (req, res) => {
  const { name, members } = req.body;
  const admin = req.user._id;

  if (!name || !members?.length) {
    return res.status(400).json({ message: "Group name and members are required." });
  }

  // Ensure the creator (admin) is always part of the group
  const uniqueMembers = [...new Set([...members, admin.toString()])];

  const group = new Group({
    name,
    members: uniqueMembers,
    admin,
  });

  await group.save();

  const populatedGroup = await Group.findById(group._id)
    .populate("members", "fullName profilePic");

  // 🔔 Notify all members about new group creation
  emitNewGroupCreated(populatedGroup);

  return res.status(201).json({
    ok: true,
    message: "Group created successfully",
    group: populatedGroup,
  });
});

/* -------------------------------------------------------------------------- */
/* 🔵 Get All Groups for Logged-in User                                       */
/* -------------------------------------------------------------------------- */
export const getGroups = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const groups = await Group.find({
    $or: [
      { members: userId },
      { members: userId.toString() }
    ]
  })
    .populate("admin", "fullName")
    .populate("members", "fullName profilePic");

  return res.status(200).json({
    ok: true,
    count: groups.length,
    groups,
  });
});

/* -------------------------------------------------------------------------- */
/* 🟣 Get Detailed Information for a Specific Group                            */
/* -------------------------------------------------------------------------- */
export const getGroupDetails = asyncHandler(async (req, res) => {
  const { groupId } = req.params;

  const group = await Group.findById(groupId)
    .populate("admin", "fullName")
    .populate("members", "fullName profilePic");

  if (!group) {
    return res.status(404).json({
      ok: false,
      message: "Group not found",
    });
  }

  return res.status(200).json({
    ok: true,
    group,
  });
});