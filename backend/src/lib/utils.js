/**
 * Utility Helpers
 * ----------------
 * Contains reusable helpers for:
 *  - JWT token generation
 *  - VectorDB communication
 *  - Ollama embedding
 */

import jwt from "jsonwebtoken";

const VECTOR_DB_BASE_URL = process.env.VECTOR_DB_URL || "http://127.0.0.1:8000";

/* -------------------------------------------------------------------------- */
/* 🧩 VectorDB Communication Helpers                                          */
/* -------------------------------------------------------------------------- */

async function postJSON(path, body, { timeoutMs } = {}) {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const id = timeoutMs && controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const res = await fetch(`${VECTOR_DB_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller?.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Vector DB request failed: ${res.status} ${errText}`);
    }
    return res.json();
  } finally {
    if (id) clearTimeout(id);
  }
}

export async function saveToVectorDB(groupId, vectors, metadata) {
  if (!groupId) throw new Error("groupId is required");
  if (!Array.isArray(vectors) || !vectors.length) throw new Error("vectors must be a non-empty array");
  if (metadata && (!Array.isArray(metadata) || metadata.length !== vectors.length)) {
    throw new Error("metadata must match vectors length");
  }
  return postJSON("/add", { group_id: groupId, vectors, metadata });
}

export async function searchVectorDB(groupId, vector, k = 5) {
  if (!groupId) throw new Error("groupId is required");
  if (!Array.isArray(vector) || !vector.length) throw new Error("vector must be a non-empty array");
  const topK = Number.isInteger(k) && k > 0 ? k : 5;
  return postJSON("/search", { group_id: groupId, vector, k: topK });
}

/* -------------------------------------------------------------------------- */
/* 🔐 JWT Helpers                                                             */
/* -------------------------------------------------------------------------- */

export const generateToken = (userId, res) => {
  if (!process.env.JWT_SECRET) throw new Error("❌ JWT_SECRET missing in environment variables.");

  const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });

  res.cookie("jwt", token, {
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });

  return token;
};

/* -------------------------------------------------------------------------- */
/* 🧠 Ollama Embedding Helper                                                */
/* -------------------------------------------------------------------------- */

export async function getEmbedding(text) {
  const response = await fetch("http://127.0.0.1:11434/api/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "nomic-embed-text:latest",
      prompt: text,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Ollama embedding failed: ${response.status} ${errText}`);
  }

  const data = await response.json();
  return data.embedding;
}