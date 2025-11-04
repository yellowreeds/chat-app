import express from "express";

// 🧠 Import real logic (adjust paths if needed)
import { runCompressionIfNeeded } from "../services/ai/ragCompress.js";
import { runReasoning } from "../services/ai/ragReason.js";
import { retrieveTopK } from "../services/ai/ragRetrieve.js";

// 🧩 Map citation IDs back to document metadata
function mapCitations(citationIds, retrieved) {
  const dict = new Map(retrieved.map(r => [r.chunk_id, r]));
  return citationIds
    .map(id => {
      const m = dict.get(id);
      return m ? { chunk_id: id, doc_id: m.doc_id, page: m.page, section: m.section } : null;
    })
    .filter(Boolean);
}

// ------------------------------------------------------------
//  POST /api/rag/document
// ------------------------------------------------------------
const router = express.Router();

router.post("/document", async (req, res) => {
  try {
    const { groupId, query, k = 12, token_budget = 6000 } = req.body;

    if (!groupId || !query) {
      return res.status(400).json({ error: "Missing groupId or query" });
    }

    // --------------------------------------------------------
    // 1️⃣ Retrieve relevant document chunks
    // --------------------------------------------------------
    const t0 = Date.now();
    const retrieved = await retrieveTopK({ groupId, query, k });
    const t1 = Date.now();

    // --------------------------------------------------------
    // 2️⃣ Compress if needed (llama3.1:8b-instruct-q3_K_M)
    // --------------------------------------------------------
    const { context, compressor_used, compressed_tokens } = await runCompressionIfNeeded({
      query,
      chunks: retrieved,
      tokenBudget: token_budget,
    });
    const t2 = Date.now();

    // --------------------------------------------------------
    // 3️⃣ Reasoning step (llama3.1:8b-instruct-q4_K_M)
    // --------------------------------------------------------
    const { text: answer, citations: citationIds } = await runReasoning({ query, context });
    const t3 = Date.now();

    // --------------------------------------------------------
    // 4️⃣ Map citations to source metadata
    // --------------------------------------------------------
    const citations = mapCitations(citationIds, retrieved);

    // --------------------------------------------------------
    // 5️⃣ Respond with final JSON
    // --------------------------------------------------------
    res.json({
      answer,
      citations,
      debug: {
        retrieved_k: retrieved.length,
        used_model: "llama3.1:8b-instruct-q4_K_M",
        compressor_used,
        compressed_tokens,
        latency_ms: {
          retrieve: t1 - t0,
          compress: t2 - t1,
          reason: t3 - t2,
        },
      },
    });
  } catch (err) {
    console.error("RAG /document error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;