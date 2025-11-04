/**
 * Embedding Pipeline Service
 * --------------------------
 * Handles embedding generation and FAISS index build/update.
 * Serves as a thin orchestrator on top of embedService.
 */

import { buildFaissIndex } from "./embedService.js";

export async function runEmbedding({ groupId, filename }) {
  console.log(`🧠 [Embedding Pipeline] Starting FAISS index for group ${groupId}`);

  const result = await buildFaissIndex(groupId);

  console.log(`✅ [Embedding Pipeline] FAISS index built for group ${groupId}`);

  return {
    groupId,
    filename,
    vectors: result?.vectors?.length || "N/A",
    status: "completed",
  };
}