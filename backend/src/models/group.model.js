/**
 * Group Model
 * ------------
 * Defines group chat metadata and membership.
 */

import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "groups",
  }
);

export const Group = mongoose.model("Group", groupSchema);
export default Group;