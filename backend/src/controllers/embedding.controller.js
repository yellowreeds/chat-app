/**
 * Embedding Controller
 * --------------------
 * Handles embedding and FAISS indexing requests.
 */

import * as embedPipelineService from "../services/embedding/embedPipelineService.js";

export async function embedPdf(req, res) {
  try {
    const groupId = req.params.groupId;
    const { filename } = req.body || {};

    if (!groupId) {
      return res.status(400).json({ ok: false, message: "Missing groupId parameter." });
    }

    if (!filename) {
      return res.status(400).json({ ok: false, message: "Filename is required." });
    }

    const result = await embedPipelineService.runEmbedding({ groupId, filename });

    res.status(200).json({
      ok: true,
      message: "Embeddings generated and FAISS index updated.",
      data: result,
    });
  } catch (err) {
    console.error("❌ [Embedding] Error:", err);
    res.status(500).json({ ok: false, message: err.message });
  }
}