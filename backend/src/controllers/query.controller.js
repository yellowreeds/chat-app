/**
 * Query Controller
 * ----------------
 * Handles document-based queries using the hybrid retrieval layer:
 *   1️⃣ Semantic retrieval (FAISS)
 *   2️⃣ Lexical retrieval (BM25)
 *   3️⃣ Weighted fusion
 *   4️⃣ Optional reranking
 *
 * Endpoint: POST /api/query/:groupId
 * Body: { query: string, topK?: number, alpha?: number }
 */

import dotenv from "dotenv";
dotenv.config();

import { getTopChunks } from "../services/retrieval/retrieverService.js";

/* -------------------------------------------------------------------------- */
/* 🧠 Main Query Handler                                                      */
/* -------------------------------------------------------------------------- */
export const queryDocument = async (req, res) => {
  const groupId = req.params.groupId;
  const { query, topK = 5, alpha = 0.7 } = req.body || {};

  console.log("🔍 [QueryController] Incoming query:", { groupId, query, topK, alpha });

  try {
    /* ---------------------------------------------------------------------- */
    /* 1️⃣ Validate Request                                                   */
    /* ---------------------------------------------------------------------- */
    if (!query || typeof query !== "string" || !query.trim()) {
      console.warn("⚠️ [QueryController] Missing or invalid 'query' field.");
      return res.status(400).json({
        ok: false,
        message: "A valid 'query' string is required.",
      });
    }

    if (!groupId) {
      console.warn("⚠️ [QueryController] Missing 'groupId' parameter.");
      return res.status(400).json({
        ok: false,
        message: "Missing groupId in route parameter.",
      });
    }

    /* ---------------------------------------------------------------------- */
    /* 2️⃣ Perform Hybrid Retrieval                                           */
    /* ---------------------------------------------------------------------- */
    console.log("⚙️  [QueryController] Retrieving top chunks...");
    const results = await getTopChunks(groupId, query, { topK, alpha });

    /* ---------------------------------------------------------------------- */
    /* 3️⃣ Detect if Reranking Was Applied                                    */
    /* ---------------------------------------------------------------------- */
    const hasRerank = results.some((r) => r.rerankScore !== undefined);
    const source = hasRerank ? "hybrid+rerank" : "hybrid";

    console.log(`✅ [QueryController] Retrieved ${results.length} chunks (source: ${source})`);

    /* ---------------------------------------------------------------------- */
    /* 4️⃣ Return Structured Response                                         */
    /* ---------------------------------------------------------------------- */
    return res.status(200).json({
      ok: true,
      source,
      query,
      topK,
      alpha,
      count: results.length,
      results,
    });
  } catch (err) {
    console.error("❌ [QueryController] Query failed:", err);
    return res.status(500).json({
      ok: false,
      message: err.message || "Internal server error during retrieval.",
    });
  }
};