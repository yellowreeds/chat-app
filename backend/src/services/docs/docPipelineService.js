/**
 * Document Pipeline Service
 * -------------------------
 * Orchestrates full pipeline:
 *  1) Validate + read file
 *  2) Parse sections
 *  3) Save to MongoDB
 *  4) Generate embeddings & FAISS index
 */

import fs from "fs";
import path from "path";
import * as parseService from "./parseService.js";
import * as storageService from "./storageService.js";
import * as embeddingService from "./embeddingService.js";

export async function runPdfPipeline({ groupId, filename }) {
  const absPath = path.resolve(`./uploads/${groupId}/${filename}`);

  if (!fs.existsSync(absPath)) {
    throw new Error(`File not found: ${absPath}`);
  }

  console.log(`🚀 [Pipeline Start] Group: ${groupId} | File: ${filename}`);

  // 1️⃣ Parse
  console.log("📖 Extracting text and section headers...");
  const parsed = await parseService.parsePdf(absPath);
  console.log(`✅ Parsed ${parsed.sections.length} sections from ${parsed.pages} pages`);

  // 2️⃣ Save
  console.log("💾 Saving parsed chunks to MongoDB...");
  const saved = await storageService.saveSections({
    groupId,
    fileId: filename,
    pageCount: parsed.pages,
    sections: parsed.sections,
  });
  console.log(`✅ Saved ${saved.count} chunks`);

  // 3️⃣ Embed
  console.log("🧠 Generating embeddings and indexing with FAISS...");
  const embedded = await embeddingService.indexGroup(groupId);
  console.log(`✅ FAISS index built for ${groupId}`);

  // 4️⃣ Return summary
  return {
    steps: {
      parsed: parsed.sections.length,
      saved: saved.count,
      embedded: embedded.count || "✓",
    },
    preview: {
      pages: parsed.pages,
      headers: parsed.sections.map((s) => s.header),
    },
  };
}