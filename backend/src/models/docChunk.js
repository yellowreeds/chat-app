/**
 * Document Chunk Model
 * ---------------------
 * Stores parsed PDF/document sections for vector indexing.
 */

import mongoose from "mongoose";

const docChunkSchema = new mongoose.Schema(
  {
    groupId: { type: String, required: true, index: true },
    fileId: { type: String, required: true },
    header: { type: String, trim: true },
    text: { type: String, required: true },
    pageCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "docchunks",
  }
);

export const DocChunk = mongoose.model("DocChunk", docChunkSchema);
export default DocChunk;