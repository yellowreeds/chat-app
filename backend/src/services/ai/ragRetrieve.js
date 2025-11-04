/**
 * RAG Retrieval Service (FAISS API Version)
 * -----------------------------------------
 * Replaces local faiss-node binding with remote FAISS microservice call.
 * Uses Ollama for embedding and FAISS backend (port 8000) for similarity search.
 */

import fs from "fs";
import path from "path";
import axios from "axios";
import ollama from "ollama";
import dotenv from "dotenv";
dotenv.config();

const FAISS_API = process.env.FAISS_API || "http://127.0.0.1:8000";
const EMBED_MODEL = process.env.EMBED_MODEL || "nomic-embed-text:latest";

export async function retrieveTopK({ groupId, query, k = 12 }) {
  try {
    // 🔹 Step 1: Build paths (for logging / fallback if needed)
    const basePath = path.resolve("src/faiss_store/faiss_store");
    const indexPath = path.join(basePath, `${groupId}.index`);
    const metaPath = path.join(basePath, `${groupId}_meta.json`);
    console.log("[Retrieve] Looking for index at:", indexPath);
    console.log("[Retrieve] Looking for meta  at:", metaPath);

    // 🔹 Step 2: Embed query using Ollama
    const embedResp = await ollama.embeddings({
      model: EMBED_MODEL,
      prompt: query,
    });
    const queryVector = embedResp.embedding;
    if (!queryVector || !Array.isArray(queryVector)) {
      throw new Error("Failed to generate query embedding");
    }

    // 🔹 Step 3: Call FAISS microservice
    const payload = {
      group_id: groupId,
      vector: queryVector,
      k,
    };

    console.log(`[Retrieve] Querying FAISS backend at ${FAISS_API}/search ...`);
    const faissResp = await axios.post(`${FAISS_API}/search`, payload, {
      timeout: 10000,
    });

    const results = Array.isArray(faissResp.data)
      ? faissResp.data
      : faissResp.data.results || [];

    if (!results.length) {
      console.warn(`[Retrieve] No results from FAISS for group ${groupId}`);
      return [];
    }

    // 🔹 Step 4: Load metadata to map chunk info (optional if FAISS API already returns it)
    let metadata = [];
    if (fs.existsSync(metaPath)) {
      metadata = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
    }

    // 🔹 Step 5: Normalize results
    const chunks = results.map((r, i) => {
      const meta =
        metadata.find((m) => m.chunkId === r.metadata?.chunkId) ||
        r.metadata ||
        {};
      return {
        chunk_id: meta.chunkId || `c${i}`,
        doc_id: meta.fileId || meta.doc_id || "unknown_doc",
        section: meta.header || meta.section || null,
        page: meta.page || null,
        text: meta.text || r.text || "",
        score: r.score || r.distance || 0,
      };
    });

    console.log(`[Retrieve] Found ${chunks.length} relevant chunks.`);
    return chunks;
  } catch (err) {
    console.error("[Retrieve] Error:", err.message);
    return [];
  }
}