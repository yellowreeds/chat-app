/**
 * FAISS Summarization Service
 * ---------------------------
 * Handles hybrid summarization (FAISS + LLM) and PDF generation.
 */

import { searchFaissIndexFromMessages } from "../embedding/embedService.js";
import { buildSummaryPrompt } from "./summarizationService.js";
import ollama from "ollama";
import fs from "fs/promises";
import path from "path";
import handlebars from "handlebars";
import puppeteer from "puppeteer";

/* -------------------------------------------------------------------------- */
/* 🔹 Markdown → HTML Formatter (shared utility)                              */
/* -------------------------------------------------------------------------- */
export function formatSummary(summaryText) {
  const lines = summaryText.split("\n");
  let html = "";
  let inMainList = false;
  let inSubList = false;

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    if (/^\*\*(.*?)\*\*$/.test(line)) {
      if (inSubList) { html += "</ul>"; inSubList = false; }
      if (inMainList) { html += "</ul>"; inMainList = false; }
      html += `<p><strong>${line.replace(/\*\*/g, "")}</strong></p>`;
    } else if (line.startsWith("*")) {
      if (!inMainList) { html += "<ul class='main-list'>"; inMainList = true; }
      if (inSubList) { html += "</ul>"; inSubList = false; }
      html += `<li>➤ ${line.replace(/^\*\s*/, "")}</li>`;
    } else if (line.startsWith("+")) {
      if (!inSubList) { html += "<ul class='sub-list'>"; inSubList = true; }
      html += `<li>• ${line.replace(/^\+\s*/, "")}</li>`;
    } else {
      if (inSubList) { html += "</ul>"; inSubList = false; }
      if (inMainList) { html += "</ul>"; inMainList = false; }
      html += `<p>${line}</p>`;
    }
  }

  if (inSubList) html += "</ul>";
  if (inMainList) html += "</ul>";
  return html;
}

/* -------------------------------------------------------------------------- */
/* 🧠 Hybrid FAISS + Ollama Summarization Pipeline                            */
/* -------------------------------------------------------------------------- */
// export async function runHybridSummarizationPipeline(
//   groupId,
//   level = "basic",
//   modelName = "qwen3:8b",
//   { topK = 30, saveReport = false } = {}
// ) {
//   console.log(`🔍 [Hybrid Summarization] group=${groupId} | level=${level} | model=${modelName}`);

//   // 1️⃣ Retrieve top chat chunks from FAISS
//   const searchResults = await searchFaissIndexFromMessages(groupId, "conversation summary", topK);
//   const results = searchResults?.results || [];
//   if (!results.length) throw new Error("No FAISS chunks found for this group.");

//   // 2️⃣ Merge retrieved text
//   const formattedChat = results
//     .map((r, i) => `${i + 1}. ${r.metadata?.sender || "User"}: ${r.metadata?.text || ""}`)
//     .join("\n");

//   // 3️⃣ Build summarization prompt
//   const summaryPrompt = buildSummaryPrompt(level, formattedChat);
//   const hybridPrompt = `
// You are given ${results.length} representative excerpts from a longer group conversation.
// Use them as context to summarize the *entire* discussion at a "${level}" detail level.

// ${summaryPrompt}
// `;

//   // 4️⃣ Generate summary via Ollama
//   const start = performance.now();
//   const aiSummary = await ollama.chat({
//     model: modelName,
//     messages: [{ role: "user", content: hybridPrompt }],
//   });
//   const duration = performance.now() - start;
//   const summaryText = aiSummary?.message?.content?.trim() || "⚠️ Failed summary.";

//   console.log(`✅ [Hybrid Summarization] ${level} done in ${(duration / 1000).toFixed(2)} s`);

//   // 5️⃣ Generate PDF report (optional)
//   if (saveReport) {
//     const formattedSummaryHtml = formatSummary(summaryText);
//     const templatePath = path.resolve("src/templates", "summaryTemplate.hbs");
//     const htmlTemplate = await fs.readFile(templatePath, "utf8");
//     const compiled = handlebars.compile(htmlTemplate);
//     const htmlContent = compiled({ summary: formattedSummaryHtml });

//     const outputDir = path.resolve("src/outputs");
//     await fs.mkdir(outputDir, { recursive: true });
//     const fileName = `summary-hybrid-${level}-${groupId}-${Date.now()}.pdf`;
//     const pdfPath = path.join(outputDir, fileName);

//     const browser = await puppeteer.launch({ headless: true });
//     const page = await browser.newPage();
//     await page.setContent(htmlContent, { waitUntil: "networkidle0" });
//     await page.pdf({ path: pdfPath, format: "A4", printBackground: true });
//     await browser.close();

//     console.log(`📄 [Hybrid Summarization] PDF saved → ${pdfPath}`);
//   }

//   return { summary: summaryText, duration };
// }

// export async function runHybridSummarizationPipeline(
//   groupId,
//   level = "intermediate",
//   modelName = "llama3.1:8b-instruct-q3_K_M",
//   { topK = 30, saveReport = false, messages = null } = {} // 👈 add messages param
// ) {
//   console.log(`🔍 [Hybrid Summarization] group=${groupId} | level=${level} | model=${modelName}`);

//   let formattedChat = "";

//   // 1️⃣ If raw messages are provided, use them directly
//   if (messages && Array.isArray(messages) && messages.length > 0) {
//     console.log(`🗂️ Using ${messages.length} direct messages for summarization.`);
//     formattedChat = messages
//       .map((m, i) => `${i + 1}. ${m.sender || "User"}: ${m.text}`)
//       .join("\n");
//   } else {
//     // 2️⃣ Otherwise, fallback to FAISS retrieval
//     const searchResults = await searchFaissIndexFromMessages(groupId, "conversation summary", topK);
//     const results = searchResults?.results || [];
//     if (!results.length) throw new Error("No FAISS chunks found for this group.");

//     formattedChat = results
//       .map((r, i) => `${i + 1}. ${r.metadata?.sender || "User"}: ${r.metadata?.text || ""}`)
//       .join("\n");
//   }

//   // 3️⃣ Build summarization prompt
//   const summaryPrompt = buildSummaryPrompt(level, formattedChat);
//   const hybridPrompt = `
// You are given ${messages ? messages.length : topK} messages from a group conversation.
// Use them as context to summarize the *entire* discussion at a "${level}" detail level.

// ${summaryPrompt}
// `;

//   // 4️⃣ Generate summary via Ollama
//   const start = performance.now();
//   const aiSummary = await ollama.chat({
//     model: modelName,
//     messages: [{ role: "user", content: hybridPrompt }],
//   });
//   const duration = performance.now() - start;
//   const summaryText = aiSummary?.message?.content?.trim() || "⚠️ Failed summary.";

//   console.log(`✅ [Hybrid Summarization] ${level} done in ${(duration / 1000).toFixed(2)} s`);

//   // 5️⃣ (optional) Generate PDF report
//   if (saveReport) {
//     const formattedSummaryHtml = formatSummary(summaryText);
//     const templatePath = path.resolve("src/templates", "summaryTemplate.hbs");
//     const htmlTemplate = await fs.readFile(templatePath, "utf8");
//     const compiled = handlebars.compile(htmlTemplate);
//     const htmlContent = compiled({ summary: formattedSummaryHtml });

//     const outputDir = path.resolve("src/outputs");
//     await fs.mkdir(outputDir, { recursive: true });
//     const fileName = `summary-hybrid-${level}-${groupId}-${Date.now()}.pdf`;
//     const pdfPath = path.join(outputDir, fileName);

//     const browser = await puppeteer.launch({ headless: true });
//     const page = await browser.newPage();
//     await page.setContent(htmlContent, { waitUntil: "networkidle0" });
//     await page.pdf({ path: pdfPath, format: "A4", printBackground: true });
//     await browser.close();

//     console.log(`📄 [Hybrid Summarization] PDF saved → ${pdfPath}`);
//   }

//   return { summary: summaryText, duration };
// }

import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function runHybridSummarizationPipeline(
  groupId,
  level = "intermediate",
  modelName = "llama3.1:8b-instruct-q3_K_M",
  { topK = 30, saveReport = false, messages = null } = {}
) {
  console.log(`🔍 [Hybrid Summarization] group=${groupId} | level=${level} | model=${modelName}`);

  let formattedChat = "";

  // 1️⃣ Use direct messages or fallback to FAISS
  if (messages && Array.isArray(messages) && messages.length > 0) {
    console.log(`🗂️ Using ${messages.length} direct messages for summarization.`);
    formattedChat = messages
      .map((m, i) => `${i + 1}. ${m.sender || "User"}: ${m.text}`)
      .join("\n");
  } else {
    const searchResults = await searchFaissIndexFromMessages(groupId, "conversation summary", topK);
    const results = searchResults?.results || [];
    if (!results.length) throw new Error("No FAISS chunks found for this group.");

    formattedChat = results
      .map((r, i) => `${i + 1}. ${r.metadata?.sender || "User"}: ${r.metadata?.text || ""}`)
      .join("\n");
  }

  // 2️⃣ Build summarization prompt
  const summaryPrompt = buildSummaryPrompt(level, formattedChat);
  const hybridPrompt = `
You are given ${messages ? messages.length : topK} messages from a group conversation.
Use them as context to summarize the *entire* discussion at a "${level}" detail level.

${summaryPrompt}
`;

  // 3️⃣ Choose model type
  let summaryText = "⚠️ No summary.";
  const start = performance.now();

  try {
    if (modelName.startsWith("gemini-")) {
      console.log("🤖 Using Gemini for summarization...");
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(hybridPrompt);
      summaryText = result.response?.text() || "⚠️ No output from Gemini.";
    } else {
      console.log("🧠 Using Ollama for summarization...");
      const aiSummary = await ollama.chat({
        model: modelName,
        messages: [{ role: "user", content: hybridPrompt }],
      });
      summaryText = aiSummary?.message?.content?.trim() || "⚠️ Failed summary.";
    }
  } catch (err) {
    console.error(`❌ Summarization failed: ${err.message}`);
  }

  const duration = performance.now() - start;
  console.log(`✅ [Hybrid Summarization] ${level} done in ${(duration / 1000).toFixed(2)} s`);

  // 4️⃣ (optional) PDF generation
  if (saveReport) {
    const formattedSummaryHtml = formatSummary(summaryText);
    const templatePath = path.resolve("src/templates", "summaryTemplate.hbs");
    const htmlTemplate = await fs.readFile(templatePath, "utf8");
    const compiled = handlebars.compile(htmlTemplate);
    const htmlContent = compiled({ summary: formattedSummaryHtml });

    const outputDir = path.resolve("src/outputs");
    await fs.mkdir(outputDir, { recursive: true });
    const fileName = `summary-hybrid-${level}-${groupId}-${Date.now()}.pdf`;
    const pdfPath = path.join(outputDir, fileName);

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });
    await page.pdf({ path: pdfPath, format: "A4", printBackground: true });
    await browser.close();

    console.log(`📄 [Hybrid Summarization] PDF saved → ${pdfPath}`);
  }

  return { summary: summaryText, duration };
}