/**
 * Ollama Embedding Service
 * ------------------------
 * Provides low-level access to Ollama’s embedding API for:
 *   - Generating single or batch embeddings (RAG & FAISS)
 *   - Building PDF section embeddings
 *   - Saving embeddings to local JSON index files
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { extractPdfStructurePyMuPDF } from "../parsers/pdfParser.js";

/* -------------------------------------------------------------------------- */
/* ⚙️ Configuration                                                          */
/* -------------------------------------------------------------------------- */
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const OLLAMA_URL = process.env.OLLAMA_HOST
  ? `${process.env.OLLAMA_HOST}/api/embeddings`
  : "http://127.0.0.1:11434/api/embeddings";

const MODEL = process.env.EMBED_MODEL || "nomic-embed-text:latest";

/* -------------------------------------------------------------------------- */
/* 🧠 1️⃣ Generate Embeddings for an Array of Texts                           */
/* -------------------------------------------------------------------------- */
/**
 * Generate embeddings for an array of text chunks using Ollama.
 * Each chunk is processed sequentially to avoid overloading local inference.
 */
export async function embedTexts(texts) {
  const vectors = [];

  for (const chunk of texts) {
    const res = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, prompt: chunk }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`💥 Ollama embedding failed: ${res.status} ${errText}`);
    }

    const data = await res.json();
    vectors.push(data.embedding);
  }

  return vectors;
}

/* -------------------------------------------------------------------------- */
/* 🧩 2️⃣ Generate a Single Embedding (RAG / Search Queries)                  */
/* -------------------------------------------------------------------------- */
/**
 * Wrapper around embedTexts() to handle a single text input.
 * Used by the RAG, retrieval, and reasoning pipelines.
 */
export async function getEmbedding(text) {
  const [vector] = await embedTexts([text]);
  return vector;
}

/* -------------------------------------------------------------------------- */
/* 📄 3️⃣ Build and Save Embeddings for a Parsed PDF                          */
/* -------------------------------------------------------------------------- */
/**
 * Parse a PDF file, generate embeddings for each section,
 * and persist them as a structured JSON file in `/indexes/<groupId>/`.
 */
export async function buildPdfEmbeddings(groupId, filename) {
  const absPath = `./uploads/${groupId}/${filename}`;
  const parsed = await extractPdfStructurePyMuPDF(absPath);

  const texts = parsed.sections
    .map((s) => (s.text?.trim().length ? s.text : s.header || ""))
    .map((t) => t.slice(0, 1500)); // Safety trim to avoid truncation

  const vectors = await embedTexts(texts);

  const records = parsed.sections.map((s, i) => ({
    id: `${groupId}:${filename}:${i}`,
    sectionIndex: i,
    header: s.header,
    text: s.text,
    vector: vectors[i],
  }));

  const outDir = path.join(process.cwd(), "indexes", groupId);
  fs.mkdirSync(outDir, { recursive: true });

  const outPath = path.join(outDir, `${filename}.embeddings.json`);
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        meta: {
          groupId,
          filename,
          pages: parsed.pages,
          model: MODEL,
          createdAt: new Date().toISOString(),
          dim: vectors[0]?.length || null,
        },
        records,
      },
      null,
      2
    )
  );

  console.log(`✅ Embeddings built & saved: ${outPath}`);
  return { outPath, count: records.length, dim: vectors[0]?.length || null };
}

/* -------------------------------------------------------------------------- */
/* 🧾 Exports                                                                */
/* -------------------------------------------------------------------------- */
export default {
  embedTexts,
  getEmbedding,
  buildPdfEmbeddings,
};