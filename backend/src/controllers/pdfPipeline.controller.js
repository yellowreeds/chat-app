/**
 * PDF Pipeline Controller
 * -----------------------
 * Full automatic pipeline:
 *   1️⃣ Parse uploaded PDF via PyMuPDF
 *   2️⃣ Save structured chunks to MongoDB
 *   3️⃣ Generate embeddings
 *   4️⃣ Push vectors to FAISS backend
 *
 * Endpoint: POST /api/docs/upload/:groupId
 * Body: multipart/form-data with "file"
 */

import path from "path";
import fs from "fs/promises";
import { extractPdfStructurePyMuPDF } from "../services/parsers/pdfParser.js";
import { saveParsedSections } from "../services/storage/docStorageService.js";
import { buildFaissIndex } from "../services/embedding/embedService.js";

/* -------------------------------------------------------------------------- */
/* 🧩 Main Controller                                                         */
/* -------------------------------------------------------------------------- */
export const processPdfPipeline = async (req, res) => {
  const groupId = req.params.groupId;
  const file = req.file;

  console.log("🚀 [PDF Pipeline] Starting full document ingestion pipeline...");

  try {
    /* ---------------------------------------------------------------------- */
    /* 1️⃣ Validate Upload                                                    */
    /* ---------------------------------------------------------------------- */
    if (!file) {
      console.warn("⚠️ [PDF Pipeline] No PDF file uploaded.");
      return res.status(400).json({ ok: false, message: "No PDF file uploaded" });
    }

    const absPath = path.resolve(file.path);
    const filename = path.basename(file.filename);
    console.log(`📄 Uploaded File: ${filename}`);
    console.log(`📁 Absolute Path: ${absPath}`);

    /* ---------------------------------------------------------------------- */
    /* 2️⃣ Parse PDF via PyMuPDF                                              */
    /* ---------------------------------------------------------------------- */
    console.log("🔍 [Step 1] Extracting structure using PyMuPDF...");
    const parsed = await extractPdfStructurePyMuPDF(absPath);
    console.log(`✅ Extracted ${parsed.sections.length} sections from ${parsed.pages} pages.`);

    /* ---------------------------------------------------------------------- */
    /* 3️⃣ Save Parsed Data to MongoDB                                        */
    /* ---------------------------------------------------------------------- */
    console.log("💾 [Step 2] Saving structured text chunks to MongoDB...");
    const saveResult = await saveParsedSections({
      groupId,
      fileId: filename,
      pageCount: parsed.pages,
      sections: parsed.sections,
    });
    console.log(`✅ Saved ${saveResult.saved} chunks to MongoDB.`);

    /* ---------------------------------------------------------------------- */
    /* 4️⃣ Generate Embeddings & Build FAISS Index                            */
    /* ---------------------------------------------------------------------- */
    console.log("🧠 [Step 3] Generating embeddings & building FAISS index...");
    const faissResult = await buildFaissIndex(groupId);
    console.log(`✅ FAISS index built for group ${groupId}.`);

    /* ---------------------------------------------------------------------- */
    /* 5️⃣ Cleanup Temporary File                                             */
    /* ---------------------------------------------------------------------- */
    try {
      await fs.unlink(absPath);
      console.log(`🧹 [Cleanup] Removed temporary file: ${filename}`);
    } catch (cleanupErr) {
      console.warn("⚠️ [Cleanup] Failed to delete temp file:", cleanupErr.message);
    }

    /* ---------------------------------------------------------------------- */
    /* 6️⃣ Return Response                                                    */
    /* ---------------------------------------------------------------------- */
    console.log("🎉 [PDF Pipeline] Successfully processed and indexed PDF.\n");
    return res.status(200).json({
      ok: true,
      message: "PDF processed successfully",
      file: filename,
      summary: {
        totalPages: parsed.pages,
        totalSections: parsed.sections.length,
        savedChunks: saveResult.saved,
        faissVectors: faissResult?.vectors?.length || "✓",
      },
    });
  } catch (err) {
    console.error("❌ [PDF Pipeline] Pipeline failed:", err);
    return res.status(500).json({
      ok: false,
      message: err.message || "Internal server error during PDF processing",
    });
  }
};