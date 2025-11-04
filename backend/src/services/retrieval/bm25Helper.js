import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;
const DB_NAME = "chat_db";

const STOPWORDS = new Set([
  "the","is","are","a","an","of","and","or","to","in","on","for","by","with",
  "be","as","at","that","this","it","from","was","were","will","shall","would",
]);

// --- Simple tokenizer ---
function tokenize(text = "") {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s가-힣]/gi, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((t) => !STOPWORDS.has(t));
}

// --- Cache for group indexes ---
const cache = new Map();

// --- Build BM25 index for a group ---
export async function buildBm25Index(groupId) {
  if (cache.has(groupId)) return cache.get(groupId);

  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(DB_NAME);

  const docs = await db
    .collection("docchunks")
    .find({ groupId: groupId.toString() })
    .project({ _id: 1, header: 1, text: 1, fileId: 1 })
    .toArray();

  await client.close();

  const df = new Map();
  const indexDocs = [];
  let totalLen = 0;

  for (const d of docs) {
    const tokens = tokenize(`${d.header} ${d.text}`);
    totalLen += tokens.length;
    const tf = new Map();
    for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
    const seen = new Set(tokens);
    for (const t of seen) df.set(t, (df.get(t) || 0) + 1);
    indexDocs.push({ id: d._id.toString(), header: d.header, fileId: d.fileId, tf, len: tokens.length });
  }

  const N = indexDocs.length;
  const avgdl = totalLen / N;
  const index = { docs: indexDocs, df, N, avgdl, k1: 1.5, b: 0.75 };

  cache.set(groupId, index);
  return index;
}

// --- BM25 Scoring ---
function scoreBM25(queryTokens, doc, index) {
  const { df, N, avgdl, k1, b } = index;
  let score = 0;
  for (const q of queryTokens) {
    const n_q = df.get(q) || 0;
    if (!n_q) continue;
    const idf = Math.log(1 + (N - n_q + 0.5) / (n_q + 0.5));
    const f = doc.tf.get(q) || 0;
    const denom = f + k1 * (1 - b + b * (doc.len / avgdl));
    score += idf * ((f * (k1 + 1)) / denom);
  }
  return score;
}

// --- Main search ---
export async function bm25Search(groupId, query, k = 10) {
  const index = await buildBm25Index(groupId);
  const qTokens = tokenize(query);
  const scores = index.docs.map((d) => ({
    chunkId: d.id,
    header: d.header,
    fileId: d.fileId,
    score: scoreBM25(qTokens, d, index),
  }));
  scores.sort((a, b) => b.score - a.score);
  return scores.slice(0, k);
}