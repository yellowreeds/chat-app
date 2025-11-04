/**
 * Embedding Service
 * -----------------
 * Handles embedding generation using Ollama and vector indexing via FAISS backend.
 * Responsibilities:
 *   1. Generate embeddings for document chunks stored in MongoDB.
 *   2. Upload embeddings + metadata to FAISS.
 *   3. Support vector-based semantic search.
 */

import axios from "axios";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

/* ------------------------------------------------------------------------- */
/* 🔧 CONFIGURATION                                                          */
/* ------------------------------------------------------------------------- */
const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
const EMBED_MODEL = process.env.EMBED_MODEL || "nomic-embed-text:latest";
const MONGO_URI = process.env.MONGODB_URI;
const FAISS_API = process.env.FAISS_API || "http://127.0.0.1:8000";

if (!MONGO_URI) {
  throw new Error("❌ Missing MONGODB_URI in .env file");
}

/* ------------------------------------------------------------------------- */
/* 🔹 Utility: Split long text into smaller safe sub-chunks (<2048 tokens)   */
/* ------------------------------------------------------------------------- */
function chunkText(text, maxChars = 1800) {
  const chunks = [];
  for (let i = 0; i < text.length; i += maxChars) {
    chunks.push(text.slice(i, i + maxChars));
  }
  return chunks;
}

/* ------------------------------------------------------------------------- */
/* 🔹 Generate a single embedding from Ollama                                 */
/* ------------------------------------------------------------------------- */
async function getEmbedding(text) {
  try {
    const payload = { model: EMBED_MODEL, prompt: text };
    const response = await axios.post(`${OLLAMA_HOST}/api/embeddings`, payload);
    return response.data.embedding;
  } catch (err) {
    console.error("💥 [Ollama] Embedding error:", err.response?.data || err.message);
    throw new Error("Failed to generate embedding");
  }
}

/* ------------------------------------------------------------------------- */
/* 🔹 Build and Upload FAISS Index                                           */
/* ------------------------------------------------------------------------- */
export async function buildFaissIndex(groupId) {
  console.log(`🧠 [Embedding] Building FAISS index for group ${groupId}`);

  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db("chat_db");

  const chunks = await db.collection("docchunks").find({ groupId: groupId.toString() }).toArray();
  if (!chunks.length) {
    await client.close();
    throw new Error(`No document chunks found for group ${groupId}`);
  }

  console.log(`🔍 Found ${chunks.length} chunks for group ${groupId}`);

  const vectors = [];
  const metadata = [];

  for (const chunk of chunks) {
    const parts = chunkText(chunk.text);
    let partIndex = 0;

    for (const part of parts) {
      try {
        const embedding = await getEmbedding(part);
        vectors.push(embedding);
        metadata.push({
          header: chunk.header,
          groupId: chunk.groupId,
          fileId: chunk.fileId,
          chunkId: chunk._id.toString(),
          text: part,
          partIndex,
        });
        partIndex++;
        await new Promise((resolve) => setTimeout(resolve, 120)); // ⏳ Throttle slightly
      } catch (err) {
        console.warn(`⚠️ Skipped part ${partIndex} of "${chunk.header}" due to embedding error`);
      }
    }
  }

  console.log(`📤 Uploading ${vectors.length} embeddings to FAISS backend...`);
  const response = await axios.post(`${FAISS_API}/add`, {
    group_id: groupId,
    vectors,
    metadata,
  });

  await client.close();

  console.log(`✅ [Embedding] FAISS index completed for group ${groupId}`);
  return {
    ok: true,
    message: "FAISS index successfully built",
    groupId,
    vectors: vectors.length,
    metadata: metadata.length,
    response: response.data,
  };
}

/* ------------------------------------------------------------------------- */
/* 💬 Build & Upload FAISS Index from Group Messages                         */
/* ------------------------------------------------------------------------- */
export async function buildFaissIndexFromMessages(groupId, vectors, metadata) {
  console.log(`🧠 [Embedding] Building FAISS index from chat messages for group ${groupId}`);

  if (!vectors?.length) throw new Error(`No chat message embeddings found for group ${groupId}`);

  // Distinguish chat vs document indexes
  const groupKey = `chat_${groupId}`;

  const response = await axios.post(`${FAISS_API}/add`, {
    group_id: groupKey,
    vectors,
    metadata,
  });

  console.log(`✅ [Embedding] Chat FAISS index built for ${groupKey} (${vectors.length} vectors)`);
  return response.data;
}

/* ------------------------------------------------------------------------- */
/* 💬 Semantic Search for Chat Messages                                      */
/* ------------------------------------------------------------------------- */
export async function searchFaissIndexFromMessages(groupId, queryText, k = 5) {
  const groupKey = `chat_${groupId}`;
  try {
    const embedding = await getEmbedding(queryText);
    const payload = { group_id: groupKey, vector: embedding, k };

    const response = await axios.post(`${FAISS_API}/search`, payload);
    const data = Array.isArray(response.data)
      ? { results: response.data }
      : response.data;

    return {
      ok: true,
      source: "faiss-chat",
      groupId,
      query: queryText,
      topK: k,
      count: data.results?.length || 0,
      results: data.results || [],
    };
  } catch (err) {
    console.error("💥 [FAISS Chat Search] Error:", err.message);
    throw new Error("FAISS chat search failed");
  }
}

/* ------------------------------------------------------------------------- */
/* 🔹 Semantic Search via FAISS                                              */
/* ------------------------------------------------------------------------- */
export async function searchFaissIndex(groupId, queryText, k = 5) {
  try {
    const embedding = await getEmbedding(queryText);
    const payload = { group_id: groupId, vector: embedding, k };

    const response = await axios.post(`${FAISS_API}/search`, payload);

    const data = Array.isArray(response.data)
      ? { results: response.data }
      : response.data;

    return {
      ok: true,
      source: "faiss",
      groupId,
      query: queryText,
      topK: k,
      count: data.results?.length || 0,
      results: data.results || [],
    };
  } catch (err) {
    console.error("💥 [FAISS Search] Error:", err.message);
    throw new Error("FAISS search failed");
  }
}