import { DocChunk } from "../../models/docChunk.js";

/**
 * ---------------------------------------------------------------------------
 * 💾 Save parsed PDF sections into MongoDB
 * ---------------------------------------------------------------------------
 * Each section = one “chunk” with metadata
 * {
 *   groupId, fileId, header, text, pageCount, chunkIndex
 * }
 */
export async function saveParsedSections({ groupId, fileId, pageCount = 0, sections = [] }) {
  if (!Array.isArray(sections) || sections.length === 0) {
    throw new Error("Invalid or empty sections array");
  }

  console.log(`💾 [MongoDB] Preparing ${sections.length} chunks for ${fileId}`);

  // 🧹 Remove old chunks for same group/file to prevent duplicates
  await DocChunk.deleteMany({ groupId, fileId });

  const docs = sections.map((section, index) => ({
    groupId,
    fileId,
    header: section.header?.trim() || "Untitled",
    text: section.text?.trim() || "",
    pageCount,
    chunkIndex: index,
    createdAt: new Date(),
  }));

  try {
    const result = await DocChunk.insertMany(docs, { ordered: false });
    console.log(`✅ Inserted ${result.length} chunks into docchunks collection`);

    return {
      ok: true,
      saved: result.length,
      fileId,
      groupId,
    };
  } catch (err) {
    console.error("❌ Failed to insert document chunks:", err.message);
    throw new Error("MongoDB chunk insertion failed");
  }
}