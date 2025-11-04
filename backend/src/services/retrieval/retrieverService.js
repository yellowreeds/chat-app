/**
 * Retriever Service
 * -----------------
 * Combines FAISS semantic search with BM25 lexical relevance.
 * Performs weighted fusion + optional reranking.
 *
 * Used in Phase 2 (Retrieval Layer) and Phase 3 (RAG reasoning).
 */

import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

import { searchFaissIndex } from "../embedding/embedService.js";
import { bm25Search } from "./bm25Helper.js";
import { fuseScores } from "./fusionHelper.js";
import { rerankChunks } from "./rerankerHelper.js";

const MONGO_URI = process.env.MONGODB_URI;
const DB_NAME = "chat_db";

/* -------------------------------------------------------------------------- */
/* 🧠 Hybrid Retriever                                                        */
/* -------------------------------------------------------------------------- */
export async function getTopChunks(groupId, query, { topK = 5, alpha = 0.7 } = {}) {
  console.log(`🧩 [Retriever] Starting hybrid retrieval for group ${groupId}`);
  console.log(`🔍 Query: "${query}" | topK=${topK} | alpha=${alpha}`);

  const client = new MongoClient(MONGO_URI);

  try {
    /* ---------------------------------------------------------------------- */
    /* 1️⃣ Semantic Retrieval (FAISS)                                          */
    /* ---------------------------------------------------------------------- */
    const faissRes = await searchFaissIndex(groupId, query, Math.max(topK * 4, 10));
    const semantic = Array.isArray(faissRes.results) ? faissRes.results : [];
    console.log(`🧠 [FAISS] Retrieved ${semantic.length} semantic hits`);

    /* ---------------------------------------------------------------------- */
    /* 2️⃣ Lexical Retrieval (BM25)                                            */
    /* ---------------------------------------------------------------------- */
    const lexical = await bm25Search(groupId, query, Math.max(topK * 4, 10));
    console.log(`🔤 [BM25] Retrieved ${lexical.length} lexical hits`);

    if (!semantic.length && !lexical.length) {
      console.warn("⚠️ [Retriever] No results found from either FAISS or BM25.");
      return [];
    }

    /* ---------------------------------------------------------------------- */
    /* 3️⃣ Score Fusion                                                       */
    /* ---------------------------------------------------------------------- */
    const fused = fuseScores({ semantic, lexical, alpha, topK });
    console.log(`⚙️  [Fusion] Combined results: ${fused.length} candidates`);

    /* ---------------------------------------------------------------------- */
    /* 4️⃣ Hydrate from MongoDB                                               */
    /* ---------------------------------------------------------------------- */
    await client.connect();
    const db = client.db(DB_NAME);
    const ids = fused.map((x) => new ObjectId(x.chunkId));
    const docs = await db.collection("docchunks").find({ _id: { $in: ids } }).toArray();
    const map = new Map(docs.map((d) => [d._id.toString(), d]));
    await client.close();

    const hydrated = fused.map((x) => {
      const d = map.get(x.chunkId);
      return {
        chunkId: x.chunkId,
        header: d?.header || x.header,
        fileId: d?.fileId || x.fileId,
        text: d?.text || "",
        score: Number(x.fusedScore?.toFixed(6) || 0),
        scores: {
          semantic: x.semanticScore ?? null,
          lexical: x.lexicalScore ?? null,
        },
      };
    });

    console.log(`💧 [Hydration] Enriched ${hydrated.length} chunks with metadata`);

    /* ---------------------------------------------------------------------- */
    /* 5️⃣ Reranking (Optional)                                               */
    /* ---------------------------------------------------------------------- */
    const reranked = await rerankChunks(query, hydrated);
    console.log(`🎯 [Reranker] Final reranked set: ${reranked.length} chunks`);

    /* ---------------------------------------------------------------------- */
    /* 6️⃣ Return Top-K                                                       */
    /* ---------------------------------------------------------------------- */
    const topChunks = reranked.slice(0, topK);
    console.log(`✅ [Retriever] Returning ${topChunks.length} top chunks`);

    return topChunks;
  } catch (err) {
    console.error("❌ [Retriever] Error during retrieval:", err.message);
    return [];
  } finally {
    await client.close().catch(() => {});
  }
}