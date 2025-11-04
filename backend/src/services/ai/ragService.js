/**
 * RAG Service
 * -----------
 * Handles:
 *   1. "@aria-chat/" → Retrieval-Augmented Q&A using FAISS context.
 *   2. "@aria-saved" → Embeds group chat messages into FAISS DB.
 */

import { searchFaissIndex, buildFaissIndexFromMessages, searchFaissIndexFromMessages } from "../embedding/embedService.js";
import { rerankChunks } from "../retrieval/rerankerHelper.js";
import { multiHopRagQuery } from "./multiHopRagService.js";
import { getEmbedding } from "../embedding/ollamaEmbeddings.js";
import { getTopChunks } from "../retrieval/retrieverService.js";
import GroupMessage from "../../models/groupMessage.model.js";
import ollama from "ollama";

/* -------------------------------------------------------------------------- */
/* 🧠 Step 1: Save Group Messages to FAISS (for @aria-saved) — SMART VERSION  */
/* -------------------------------------------------------------------------- */
export async function saveGroupMessagesToVectorDB(groupId) {
  console.log(`💾 [RAG] Smart embedding for group ${groupId}`);

  const allMessages = await GroupMessage.find({ groupId })
    .sort({ createdAt: 1 })
    .populate("senderId", "fullName");

  if (!allMessages.length) throw new Error("No messages found to save.");

  /* ---------------------------------------------------------------------- */
  /* 🔹 Step 1: Merge small messages into semantic blocks                   */
  /* ---------------------------------------------------------------------- */
  const MAX_GAP_MINUTES = 3;
  const mergedBlocks = [];
  let block = [];

  for (let i = 0; i < allMessages.length; i++) {
    const msg = allMessages[i];
    const prev = allMessages[i - 1];
    const timeGap = prev ? (msg.createdAt - prev.createdAt) / 60000 : Infinity;

    if (
      prev &&
      msg.senderId?._id?.equals(prev.senderId?._id) &&
      timeGap < MAX_GAP_MINUTES
    ) {
      block.push(msg);
    } else {
      if (block.length) mergedBlocks.push(block);
      block = [msg];
    }
  }
  if (block.length) mergedBlocks.push(block);

  console.log(`🧩 [Context Merge] ${mergedBlocks.length} logical message segments created`);

  /* ---------------------------------------------------------------------- */
  /* 🔹 Step 2: Prepare text preprocessor                                   */
  /* ---------------------------------------------------------------------- */
  function preprocessText(text) {
    return text
      .replace(/@[\w]+/g, "") // remove mentions
      .replace(/https?:\/\/\S+/g, "[link]") // replace URLs
      .replace(/\s+/g, " ") // normalize whitespace
      .trim();
  }

  /* ---------------------------------------------------------------------- */
  /* 🔹 Step 3: Batch embedding with throttling                             */
  /* ---------------------------------------------------------------------- */
  const vectors = [];
  const metadata = [];
  const BATCH_SIZE = 5;

  for (let i = 0; i < mergedBlocks.length; i += BATCH_SIZE) {
    const batch = mergedBlocks.slice(i, i + BATCH_SIZE);

    const embedPromises = batch.map(async (segment) => {
      const sender = segment[0].senderId?.fullName || "Unknown";
      const blockStart = segment[0].createdAt;
      const combined = segment
        .map((m) => `${m.senderId.fullName}: ${m.text}`)
        .join("\n");

      const cleanText = preprocessText(combined);
      const embedding = await getEmbedding(cleanText);

      return {
        embedding,
        meta: {
          sender,
          text: cleanText,
          timestamp: blockStart,
          messageCount: segment.length,
          summary: cleanText.slice(0, 160),
        },
      };
    });

    const results = await Promise.allSettled(embedPromises);

    results.forEach((res) => {
      if (res.status === "fulfilled") {
        vectors.push(res.value.embedding);
        metadata.push(res.value.meta);
      }
    });

    // Small pause to avoid flooding the embedding model
    await new Promise((r) => setTimeout(r, 100));
  }

  console.log(`🧠 [Embedding] Generated ${vectors.length} context embeddings`);

  /* ---------------------------------------------------------------------- */
  /* 🔹 Step 4: Upload to FAISS backend                                    */
  /* ---------------------------------------------------------------------- */
  const result = await buildFaissIndexFromMessages(groupId, vectors, metadata);
  console.log(`✅ [RAG] FAISS index updated for ${groupId} (${vectors.length} entries)`);

  return vectors.length;
}

/* -------------------------------------------------------------------------- */
/* 🧩 Step 2: Perform Retrieval-Augmented Query (for @aria-chat/)             */
/* -------------------------------------------------------------------------- */
export async function runRagQuery(groupId, question, topK = 5, mode = "chat") {
  console.log(`🧠 [RAG] Running ${mode}-RAG for group ${groupId}`);
  console.log(`❓ Query: ${question}`);

  /* ---------------------------------------------------------------------- */
  /* 🔁 Multi-hop detection (applies to both modes)                         */
  /* ---------------------------------------------------------------------- */
  const multiHopTrigger =
    question.split(" and ").length > 1 ||
    (question.match(/\?/g) || []).length > 1 ||
    /compare|relationship|difference|both|between/i.test(question);

  if (multiHopTrigger) {
    console.log("🔁 Detected potential multi-hop query — using multiHopRagQuery()");
    const { finalAnswer } = await multiHopRagQuery(groupId, question, mode, { topK });
    return finalAnswer;
  }

  /* ---------------------------------------------------------------------- */
  /* 🧩 Mode: DOCUMENT RAG (existing behavior)                              */
  /* ---------------------------------------------------------------------- */
  if (mode === "doc") {
    let expandedQuery = question;
    const expansionTerms =
      "predictive maintenance, process optimization, industrial automation, factory AI, smart manufacturing";

    if (/manufacturing|factory|industrial/i.test(question)) {
      expandedQuery += `. Related to: ${expansionTerms}`;
    }

    console.log(`🧩 [Query Expansion] Expanded query: ${expandedQuery}`);

    const hybridResults = await getTopChunks(groupId, expandedQuery, { topK: 8 });
    if (!hybridResults?.length) return "I don’t know based on the provided content.";

    console.log("🧾 [RAG Debug] Retrieved (doc, sample 2):",
      hybridResults.slice(0, 2).map(r => ({
        header: r.header,
        snippet: r.text.slice(0, 120)
      }))
    );

    const flatChunks = hybridResults.map(r => ({
      text: r.text,
      header: r.header || "Document",
    }));
    const reranked = await rerankChunks(question, flatChunks);

    const normalized = reranked.map((r, i) => ({
      text: r.text,
      header: r.header,
      hybridScore: (1 / (i + 1)) * 0.4 + (r.rerankScore ?? 0) * 0.6,
    }));
    normalized.sort((a, b) => b.hybridScore - a.hybridScore);

    const context = normalized
      .slice(0, topK)
      .map((r, i) => `(${i + 1}) [${r.header}]\n${r.text.slice(0, 800)}`)
      .join("\n\n");

    const ragPrompt = `
You are Aria, an AI assistant that answers based on retrieved document context.
If the information is unclear or incomplete, infer responsibly but never invent facts.

---
[CONTEXT START]
${context}
[CONTEXT END]
---

User Question: ${question}
Answer:
`;

    const response = await ollama.chat({
      model: process.env.ARIA_RAG_MODEL || "llama3.1:8b-instruct-q4_K_M",
      messages: [{ role: "user", content: ragPrompt }],
    });

    return {
      answer: response?.message?.content?.trim() || "⚠️ No valid answer returned.",
      retrievedChunks: normalized.slice(0, topK).map(r => `${r.header}: ${r.text.slice(0, 500)}`),
    };
  }

  /* ---------------------------------------------------------------------- */
  /* 🧩 Mode: CHAT RAG (new logic)                                          */
  /* ---------------------------------------------------------------------- */
  if (mode === "chat") {
    console.log("💬 [Chat-RAG] Retrieving from FAISS chat index…");

    const searchResults = await searchFaissIndexFromMessages(groupId, question, topK * 2);
    const retrieved = searchResults?.results || [];

    if (!retrieved.length) {
      console.warn("⚠️ [Chat-RAG] No context found in chat FAISS index.");
      return "I don’t know based on the recent chat history.";
    }

    console.log("🧾 [Chat-RAG Debug] Retrieved (sample 2):",
      retrieved.slice(0, 2).map(r => ({
        sender: r.metadata?.sender,
        snippet: r.metadata?.text?.slice(0, 120)
      }))
    );

    // 🔄 Rerank by relevance
    const flatChunks = retrieved.map(r => ({
      text: r.metadata?.text || "",
      header: r.metadata?.sender || "User",
    }));
    const reranked = await rerankChunks(question, flatChunks);

    // 🧩 Weighted score: Rerank + recency
    const normalized = reranked.map((r, i) => ({
      text: r.text,
      header: r.header,
      hybridScore:
        (1 / (i + 1)) * 0.3 +
        (r.rerankScore ?? 0) * 0.6 +
        Math.random() * 0.1, // small jitter to mix close scores
    }));
    normalized.sort((a, b) => b.hybridScore - a.hybridScore);

    console.log("🧾 [Chat-RAG Debug – Top Retrieved]");
    normalized.slice(0, topK).forEach((r, i) =>
      console.log(`#${i + 1} | ${r.header}: ${r.text.slice(0, 100)}`)
    );

    const context = normalized
      .slice(0, topK)
      .map(
        (r, i) =>
          `(${i + 1}) [${r.header}]\n${r.text.slice(0, 600)}`
      )
      .join("\n\n");

    const enrichedContext = context.replace(
      /(['"“”‘’][^'"“”‘’]{3,80}['"“”‘’])|(approved|final|confirmed|locked)/gi,
      (match) => `**${match}**`
    );

    const chatPrompt = `
You are Aria, the chat assistant. Your task is to infer accurate answers based on the conversation context.

Below is a segment of group chat messages. They may include questions, confirmations, or approvals.

---
[CHAT CONTEXT]
${enrichedContext}
[END CONTEXT]
---

When answering, follow these rules:
1. Identify if the question was answered or confirmed later in the chat.
2. If someone approved or finalized something (e.g. a tagline, date, or decision), return **that specific item**.
3. If the answer isn’t explicitly stated but is clearly implied (e.g., “Yep—‘Smart Chat, Local Mind’. Approved yesterday”), treat it as confirmed.
4. Only say “I don’t know” if **no related discussion exists at all**.

User asked: ${question}

Now answer naturally, as if you’re summarizing the team’s latest consensus:
`;

    const response = await ollama.chat({
      model: process.env.ARIA_RAG_MODEL || "llama3.1:8b-instruct-q4_K_M",
      messages: [{ role: "user", content: chatPrompt }],
    });

    const answer = response?.message?.content?.trim() || "⚠️ No valid answer returned.";
    console.log("✅ [Chat-RAG] Answer generated successfully.");
    // 🧾 Return both answer and retrieved context
    return {
      answer,
      retrievedChunks: normalized.slice(0, topK).map((r) => {
        const snippet = r.text.replace(/\s+/g, " ").trim();
        return `${r.header}: ${snippet}`;
      }),
    };
  }
}