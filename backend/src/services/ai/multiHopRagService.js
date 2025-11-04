/**
 * Multi-Hop & Query Decomposition RAG
 * -----------------------------------
 * Enhances standard RAG with multi-step reasoning.
 * Handles:
 *   - Complex question decomposition
 *   - Multi-hop retrieval across chat or doc contexts
 */

import ollama from "ollama";
import { searchFaissIndex, searchFaissIndexFromMessages } from "../embedding/embedService.js";
import { rerankChunks } from "../retrieval/rerankerHelper.js";

/* -------------------------------------------------------------------------- */
/* 🧠 1️⃣ Decompose Query into Sub-questions                                  */
/* -------------------------------------------------------------------------- */
export async function decomposeQuery(question, model = process.env.ARIA_CHAT_MODEL) {
  const prompt = `
You are an expert assistant that breaks complex multi-part questions
into simpler, smaller sub-questions that can be answered individually.

Question: "${question}"

Respond with one sub-question per line, numbered like:
1. ...
2. ...
3. ...
`;

  const res = await ollama.chat({
    model,
    messages: [{ role: "user", content: prompt }],
  });

  const text = res?.message?.content?.trim() || "";
  const subQs = text
    .split("\n")
    .map((l) => l.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);

  console.log(`🧩 [Decompose] ${subQs.length} sub-questions:`, subQs);
  return subQs;
}

/* -------------------------------------------------------------------------- */
/* 🔁 2️⃣ Perform Multi-hop RAG                                               */
/* -------------------------------------------------------------------------- */
export async function multiHopRagQuery(groupId, question, mode = "chat", { topK = 5 } = {}) {
  console.log(`🧠 [Multi-Hop RAG] Starting for ${mode} (${groupId})`);
  console.log(`❓ Main question: ${question}`);

  // Step 1: Decompose
  const subQuestions = await decomposeQuery(question);

  const allContexts = [];
  const answers = [];

  for (const subQ of subQuestions) {
    console.log(`\n🔍 [SubQ] ${subQ}`);

    // Choose correct FAISS index
    const searchFn = mode === "chat" ? searchFaissIndexFromMessages : searchFaissIndex;
    const searchResults = await searchFn(groupId, subQ, topK);
    const retrieved = searchResults?.results || [];

    if (!retrieved?.length) {
      console.warn(`⚠️ [RAG] No retrieved chunks for sub-question: "${subQ}"`);
      answers.push({ subQ, hopAnswer: "No relevant content found." });
      continue;
    }

    console.log(
      `🧾 [SubQ Debug] Retrieved ${retrieved.length} chunks`,
      retrieved.slice(0, 2).map((r) => ({
        header: r.metadata?.header,
        snippet: r.metadata?.text?.slice(0, 120) || "[empty]",
      }))
    );

    // Rerank safely
    const flatChunks = retrieved.map((r) => ({
      text: r.metadata?.text || "",
      header: r.metadata?.header || r.metadata?.sender || "Message",
    }));

    const reranked = await rerankChunks(subQ, flatChunks);

    // Safely slice and join context
    const context = (reranked || [])
      .slice(0, topK)
      .map(
        (r, i) =>
          `(${i + 1}) [${r.header || "Unknown"}]\n${r.text?.slice(0, 800) || "[empty text]"}`
      )
      .join("\n\n");

    allContexts.push(context);

    // Ask LLM per hop
    const hopPrompt = `
You are Aria, an assistant answering based on the given context.

Context:
${context}

Sub-question: ${subQ}
Answer:
`;

    try {
      const hopRes = await ollama.chat({
        model: process.env.ARIA_RAG_MODEL || "llama3.1:8b-instruct-q4_K_M",
        messages: [{ role: "user", content: hopPrompt }],
      });

      const hopAnswer = hopRes?.message?.content?.trim() || "⚠️ No answer.";
      console.log(`💬 [Hop Answer] ${hopAnswer}`);
      answers.push({ subQ, hopAnswer });
    } catch (err) {
      console.error(`❌ [Hop Error] Failed to process subQ "${subQ}":`, err.message);
      answers.push({ subQ, hopAnswer: "⚠️ Error generating answer." });
    }
  }

  // Step 3: Fuse all sub-answers into one
  const fusionPrompt = `
You are Aria, a reasoning assistant.
You will now combine several sub-question answers into a single, coherent final answer.

Sub-questions and their answers:
${answers
  .map((a, i) => `${i + 1}. Q: ${a.subQ}\nA: ${a.hopAnswer}`)
  .join("\n\n")}

Now write a unified answer that addresses the user's original query:
"${question}"
`;

  const finalRes = await ollama.chat({
    model: process.env.ARIA_RAG_MODEL || "llama3.1:8b-instruct-q4_K_M",
    messages: [{ role: "user", content: fusionPrompt }],
  });

  const finalAnswer = finalRes?.message?.content?.trim() || "⚠️ No final answer generated.";
  console.log(`✅ [Multi-Hop RAG] Final Answer:\n${finalAnswer}`);

  return { finalAnswer, subQuestions, answers };
}