/**
 * Document Controller
 * -------------------
 * Handles document ingestion requests.
 * Delegates parsing, storage, and embedding to the docPipelineService.
 */

import * as docPipelineService from "../services/docs/docPipelineService.js";

export async function processPdfPipeline(req, res) {
  try {
    const groupId = req.params.groupId;
    const { filename } = req.body || {};

    if (!groupId || !filename) {
      return res.status(400).json({ ok: false, message: "Missing groupId or filename." });
    }

    const result = await docPipelineService.runPdfPipeline({ groupId, filename });

    res.status(200).json({
      ok: true,
      message: "PDF successfully processed and indexed",
      ...result, // includes steps, preview, etc.
    });
  } catch (err) {
    console.error("❌ [DocPipeline] Error:", err);
    res.status(500).json({ ok: false, message: err.message });
  }
}