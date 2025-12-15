// /**
//  * FAISS Summarization Service
//  * ---------------------------
//  * Handles hybrid summarization (FAISS + LLM) and PDF generation.
//  */

// import { searchFaissIndexFromMessages, searchFaissIndex } from "../embedding/embedService.js";
// import { buildSummaryPrompt } from "./summarizationService.js";
// import ollama from "ollama";
// import fs from "fs/promises";
// import path from "path";
// import handlebars from "handlebars";
// import puppeteer from "puppeteer";

// /* -------------------------------------------------------------------------- */
// /* 🔹 Markdown → HTML Formatter (shared utility)                              */
// /* -------------------------------------------------------------------------- */
// export function formatSummary(summaryText) {
//   const lines = summaryText.split("\n");
//   let html = "";
//   let inMainList = false;
//   let inSubList = false;

//   for (let line of lines) {
//     line = line.trim();
//     if (!line) continue;

//     if (/^\*\*(.*?)\*\*$/.test(line)) {
//       if (inSubList) { html += "</ul>"; inSubList = false; }
//       if (inMainList) { html += "</ul>"; inMainList = false; }
//       html += `<p><strong>${line.replace(/\*\*/g, "")}</strong></p>`;
//     } else if (line.startsWith("*")) {
//       if (!inMainList) { html += "<ul class='main-list'>"; inMainList = true; }
//       if (inSubList) { html += "</ul>"; inSubList = false; }
//       html += `<li>➤ ${line.replace(/^\*\s*/, "")}</li>`;
//     } else if (line.startsWith("+")) {
//       if (!inSubList) { html += "<ul class='sub-list'>"; inSubList = true; }
//       html += `<li>• ${line.replace(/^\+\s*/, "")}</li>`;
//     } else {
//       if (inSubList) { html += "</ul>"; inSubList = false; }
//       if (inMainList) { html += "</ul>"; inMainList = false; }
//       html += `<p>${line}</p>`;
//     }
//   }

//   if (inSubList) html += "</ul>";
//   if (inMainList) html += "</ul>";
//   return html;
// }

// /* -------------------------------------------------------------------------- */
// /* 🧠 Hybrid FAISS + Ollama Summarization Pipeline                            */
// /* -------------------------------------------------------------------------- */
// // export async function runHybridSummarizationPipeline(
// //   groupId,
// //   level = "basic",
// //   modelName = "qwen3:8b",
// //   { topK = 30, saveReport = false } = {}
// // ) {
// //   console.log(`🔍 [Hybrid Summarization] group=${groupId} | level=${level} | model=${modelName}`);

// //   // 1️⃣ Retrieve top chat chunks from FAISS
// //   const searchResults = await searchFaissIndexFromMessages(groupId, "conversation summary", topK);
// //   const results = searchResults?.results || [];
// //   if (!results.length) throw new Error("No FAISS chunks found for this group.");

// //   // 2️⃣ Merge retrieved text
// //   const formattedChat = results
// //     .map((r, i) => `${i + 1}. ${r.metadata?.sender || "User"}: ${r.metadata?.text || ""}`)
// //     .join("\n");

// //   // 3️⃣ Build summarization prompt
// //   const summaryPrompt = buildSummaryPrompt(level, formattedChat);
// //   const hybridPrompt = `
// // You are given ${results.length} representative excerpts from a longer group conversation.
// // Use them as context to summarize the *entire* discussion at a "${level}" detail level.

// // ${summaryPrompt}
// // `;

// //   // 4️⃣ Generate summary via Ollama
// //   const start = performance.now();
// //   const aiSummary = await ollama.chat({
// //     model: modelName,
// //     messages: [{ role: "user", content: hybridPrompt }],
// //   });
// //   const duration = performance.now() - start;
// //   const summaryText = aiSummary?.message?.content?.trim() || "⚠️ Failed summary.";

// //   console.log(`✅ [Hybrid Summarization] ${level} done in ${(duration / 1000).toFixed(2)} s`);

// //   // 5️⃣ Generate PDF report (optional)
// //   if (saveReport) {
// //     const formattedSummaryHtml = formatSummary(summaryText);
// //     const templatePath = path.resolve("src/templates", "summaryTemplate.hbs");
// //     const htmlTemplate = await fs.readFile(templatePath, "utf8");
// //     const compiled = handlebars.compile(htmlTemplate);
// //     const htmlContent = compiled({ summary: formattedSummaryHtml });

// //     const outputDir = path.resolve("src/outputs");
// //     await fs.mkdir(outputDir, { recursive: true });
// //     const fileName = `summary-hybrid-${level}-${groupId}-${Date.now()}.pdf`;
// //     const pdfPath = path.join(outputDir, fileName);

// //     const browser = await puppeteer.launch({ headless: true });
// //     const page = await browser.newPage();
// //     await page.setContent(htmlContent, { waitUntil: "networkidle0" });
// //     await page.pdf({ path: pdfPath, format: "A4", printBackground: true });
// //     await browser.close();

// //     console.log(`📄 [Hybrid Summarization] PDF saved → ${pdfPath}`);
// //   }

// //   return { summary: summaryText, duration };
// // }

// // export async function runHybridSummarizationPipeline(
// //   groupId,
// //   level = "intermediate",
// //   modelName = "llama3.1:8b-instruct-q3_K_M",
// //   { topK = 30, saveReport = false, messages = null } = {} // 👈 add messages param
// // ) {
// //   console.log(`🔍 [Hybrid Summarization] group=${groupId} | level=${level} | model=${modelName}`);

// //   let formattedChat = "";

// //   // 1️⃣ If raw messages are provided, use them directly
// //   if (messages && Array.isArray(messages) && messages.length > 0) {
// //     console.log(`🗂️ Using ${messages.length} direct messages for summarization.`);
// //     formattedChat = messages
// //       .map((m, i) => `${i + 1}. ${m.sender || "User"}: ${m.text}`)
// //       .join("\n");
// //   } else {
// //     // 2️⃣ Otherwise, fallback to FAISS retrieval
// //     const searchResults = await searchFaissIndexFromMessages(groupId, "conversation summary", topK);
// //     const results = searchResults?.results || [];
// //     if (!results.length) throw new Error("No FAISS chunks found for this group.");

// //     formattedChat = results
// //       .map((r, i) => `${i + 1}. ${r.metadata?.sender || "User"}: ${r.metadata?.text || ""}`)
// //       .join("\n");
// //   }

// //   // 3️⃣ Build summarization prompt
// //   const summaryPrompt = buildSummaryPrompt(level, formattedChat);
// //   const hybridPrompt = `
// // You are given ${messages ? messages.length : topK} messages from a group conversation.
// // Use them as context to summarize the *entire* discussion at a "${level}" detail level.

// // ${summaryPrompt}
// // `;

// //   // 4️⃣ Generate summary via Ollama
// //   const start = performance.now();
// //   const aiSummary = await ollama.chat({
// //     model: modelName,
// //     messages: [{ role: "user", content: hybridPrompt }],
// //   });
// //   const duration = performance.now() - start;
// //   const summaryText = aiSummary?.message?.content?.trim() || "⚠️ Failed summary.";

// //   console.log(`✅ [Hybrid Summarization] ${level} done in ${(duration / 1000).toFixed(2)} s`);

// //   // 5️⃣ (optional) Generate PDF report
// //   if (saveReport) {
// //     const formattedSummaryHtml = formatSummary(summaryText);
// //     const templatePath = path.resolve("src/templates", "summaryTemplate.hbs");
// //     const htmlTemplate = await fs.readFile(templatePath, "utf8");
// //     const compiled = handlebars.compile(htmlTemplate);
// //     const htmlContent = compiled({ summary: formattedSummaryHtml });

// //     const outputDir = path.resolve("src/outputs");
// //     await fs.mkdir(outputDir, { recursive: true });
// //     const fileName = `summary-hybrid-${level}-${groupId}-${Date.now()}.pdf`;
// //     const pdfPath = path.join(outputDir, fileName);

// //     const browser = await puppeteer.launch({ headless: true });
// //     const page = await browser.newPage();
// //     await page.setContent(htmlContent, { waitUntil: "networkidle0" });
// //     await page.pdf({ path: pdfPath, format: "A4", printBackground: true });
// //     await browser.close();

// //     console.log(`📄 [Hybrid Summarization] PDF saved → ${pdfPath}`);
// //   }

// //   return { summary: summaryText, duration };
// // }

// export async function runHybridSummarizationPipeline(
//   groupId,
//   level = "intermediate",
//   modelName = "llama3.1:8b-instruct-q3_K_M",
//   { topK = 100, saveReport = false, messages = null } = {}
// ) {
//   console.log(`🔍 [Hybrid Summarization] group=${groupId} | level=${level} | model=${modelName}`);

//   let formattedChat = "";

//   // 1️⃣ Use direct messages or fallback to FAISS
//   if (messages && Array.isArray(messages) && messages.length > 0) {
//     console.log(`🗂️ Using ${messages.length} direct messages for summarization.`);
//     formattedChat = messages
//       .map((m, i) => `${i + 1}. ${m.sender || "User"}: ${m.text}`)
//       .join("\n");
//   } else {
//     const searchResults = await searchFaissIndexFromMessages(groupId, "conversation summary", topK);
//     const results = searchResults?.results || [];
//     if (!results.length) throw new Error("No FAISS chunks found for this group.");

//     formattedChat = results
//       .map((r, i) => `${i + 1}. ${r.metadata?.sender || "User"}: ${r.metadata?.text || ""}`)
//       .join("\n");
//   }

//   // 2️⃣ Build summarization prompt
//   const summaryPrompt = buildSummaryPrompt(level, formattedChat);
//   const hybridPrompt = `
// You are given ${messages ? messages.length : topK} messages from a group conversation.
// Use them as context to summarize the *entire* discussion at a "${level}" detail level.

// ${summaryPrompt}
// `;

//   // 3️⃣ Choose model type
//   let summaryText = "⚠️ No summary.";
//   const start = performance.now();

//   try {
//     if (modelName.startsWith("gemini-")) {
//       console.log("🤖 Using Gemini for summarization...");
//       const model = genAI.getGenerativeModel({ model: modelName });
//       const result = await model.generateContent(hybridPrompt);
//       summaryText = result.response?.text() || "⚠️ No output from Gemini.";
//     } else {
//       console.log("🧠 Using Ollama for summarization...");
//       const aiSummary = await ollama.chat({
//         model: modelName,
//         messages: [{ role: "user", content: hybridPrompt }],
//       });
//       summaryText = aiSummary?.message?.content?.trim() || "⚠️ Failed summary.";
//     }
//   } catch (err) {
//     console.error(`❌ Summarization failed: ${err.message}`);
//   }

//   const duration = performance.now() - start;
//   console.log(`✅ [Hybrid Summarization] ${level} done in ${(duration / 1000).toFixed(2)} s`);

//   // 4️⃣ PDF generation
//   let pdfUrl = null;

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

//     // 🧠 PUBLIC URL (served via Express static route)
//     pdfUrl = `/outputs/${fileName}`;
//   }

//   return {
//     summary: summaryText,
//     duration,
//     pdfUrl  // ⬅️ IMPORTANT
//   };
// }


// export function formatDocumentSummary(text) {
//   if (!text || typeof text !== "string") return "<p>No summary generated.</p>";

//   // Convert markdown headers
//   let html = text
//     .replace(/^### (.*$)/gim, "<h3>$1</h3>")
//     .replace(/^## (.*$)/gim, "<h2>$1</h2>")
//     .replace(/^# (.*$)/gim, "<h1>$1</h1>");

//   // Convert bullet points
//   html = html
//     .replace(/^\- (.*$)/gim, "<li>$1</li>")
//     .replace(/^\* (.*$)/gim, "<li>$1</li>");

//   // Wrap loose <li> in <ul>
//   html = html.replace(/(<li>.*<\/li>)/gim, "<ul>$1</ul>");

//   // Convert newlines to <br>
//   html = html.replace(/\n/g, "<br>");

//   return `<div>${html}</div>`;
// }


export async function runDocumentSummarizationPipeline(
  groupId,
  { topK = 50, saveReport = false } = {}
) {
  console.log(`🔍 [Doc Summarization] group=${groupId}`);

  // 1️⃣ Retrieve document chunks via doc FAISS index
  const searchResults = await searchFaissIndex(groupId, " ", topK);
  const results = searchResults?.results || [];

  if (!results.length) {
    throw new Error("No FAISS document chunks found for this group.");
  }

  const mergedText = results
    .map((r, i) => `${i + 1}. ${r.metadata?.text || ""}`)
    .join("\n");

  // 2️⃣ Build simple summarization prompt (single level)
  const prompt = `
You are given ${results.length} extracted document chunks.
Summarize the **entire document** into a clear, structured technical summary.
Focus on key concepts, definitions, findings, and conclusions.
Avoid conversational tone. Produce a clean academic summary.

Document Chunks:
${mergedText}
  `;

  // 3️⃣ Run model
  const start = performance.now();
  let summary = "⚠️ No summary.";

  try {
    const ai = await ollama.chat({
      model: "llama3.1:8b-instruct-q3_K_M",
      messages: [{ role: "user", content: prompt }],
    });
    summary = ai?.message?.content?.trim() || "⚠️ Failed to summarize.";
  } catch (err) {
    console.error("❌ Document summarization failed:", err.message);
  }
  console.log("🔎 SUMMARY OUTPUT:", summary.substring(0, 200));

  const duration = performance.now() - start;

  // 4️⃣ PDF generation
  let pdfUrl = null;

  if (saveReport) {
    const formattedSummaryHtml = formatDocumentSummary(summary);
    const templatePath = path.resolve("src/templates", "summaryTemplate.hbs");
    const template = await fs.readFile(templatePath, "utf8");
    const compiled = handlebars.compile(template);
    const html = compiled({ summary: formattedSummaryHtml });
    console.log("🔎 HTML LENGTH:", html.length);
    console.log("🔎 HTML PREVIEW:", html.substring(0,300));

    const outputDir = path.resolve("src/outputs");
    await fs.mkdir(outputDir, { recursive: true });

    const fileName = `doc-summary-${groupId}-${Date.now()}.pdf`;
    const pdfPath = path.join(outputDir, fileName);

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.pdf({ path: pdfPath, format: "A4", printBackground: true });
    await browser.close();

    pdfUrl = `${process.env.BACKEND_URL}/download/${fileName}`;
  }

  return {
    summary,
    duration,
    pdfUrl,
  };
}


/**
 * 🧠 Fixed Hybrid Summarization Pipeline (Chat Summary)
 * -----------------------------------------------------
 * - Prevents empty PDFs
 * - Waits for Puppeteer to fully render content
 * - Adds debug logging for HTML size
 * - Matches working behavior of document summarization
 */

import { searchFaissIndexFromMessages } from "../embedding/embedService.js";
import { buildSummaryPrompt } from "./summarizationService.js";
import ollama from "ollama";
import fs from "fs/promises";
import path from "path";
import handlebars from "handlebars";
import puppeteer from "puppeteer";

/* -------------------------------------------------------------------------- */
/* 🔹 Markdown → HTML Formatter (same as before)                              */
/* -------------------------------------------------------------------------- */
export function formatSummary(summaryText) {
  if (!summaryText || typeof summaryText !== "string" || !summaryText.trim()) {
    return "<p>No summary generated.</p>";
  }

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
/* 🧠 Main Hybrid Chat Summarization Function                                 */
/* -------------------------------------------------------------------------- */
export async function runHybridSummarizationPipeline(
  groupId,
  level = "intermediate",
  modelName = "llama3.1:8b-instruct-q3_K_M",
  { topK = 100, saveReport = false, messages = null } = {}
) {
  console.log(`🔍 [Hybrid Summarization] group=${groupId} | level=${level} | model=${modelName}`);

  let formattedChat = "";

  // 1️⃣ Prepare chat data
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

  // 3️⃣ Generate summary
  let summaryText = "⚠️ No summary generated.";
  const start = performance.now();

  try {
    console.log("🧠 Using Ollama for summarization...");
    const aiSummary = await ollama.chat({
      model: modelName,
      messages: [{ role: "user", content: hybridPrompt }],
    });
    summaryText = aiSummary?.message?.content?.trim() || "⚠️ No summary text returned.";
  } catch (err) {
    console.error("❌ Summarization failed:", err.message);
  }

  const duration = performance.now() - start;
  console.log(`✅ [Hybrid Summarization] completed in ${(duration / 1000).toFixed(2)}s`);

  // 4️⃣ PDF generation (safe + consistent)
  let pdfUrl = null;

  if (saveReport) {
    try {
      const formattedSummaryHtml = formatSummary(summaryText);
      const templatePath = path.resolve("src/templates", "summaryTemplate.hbs");
      const template = await fs.readFile(templatePath, "utf8");
      const compiled = handlebars.compile(template);
      const html = compiled({ summary: formattedSummaryHtml });

      console.log("🔎 HTML LENGTH:", html.length);
      if (html.length < 500) {
        console.warn("⚠️ HTML content is suspiciously short, skipping PDF generation.");
        throw new Error("Empty or invalid HTML content.");
      }

      const outputDir = path.resolve("src/outputs");
      await fs.mkdir(outputDir, { recursive: true });
      const fileName = `summary-hybrid-${level}-${groupId}-${Date.now()}.pdf`;
      const pdfPath = path.join(outputDir, fileName);

      const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      const page = await browser.newPage();

      await page.setContent(html, { waitUntil: "networkidle0" });

      // Wait for at least one <p> or <ul> to appear
      await page.waitForSelector("body p, body ul", { timeout: 5000 }).catch(() =>
        console.warn("⚠️ No visible content detected before rendering PDF.")
      );

      await page.pdf({ path: pdfPath, format: "A4", printBackground: true });
      await browser.close();

      console.log(`📄 [Hybrid Summarization] PDF saved → ${pdfPath}`);
      pdfUrl = `${process.env.BACKEND_URL || ""}/download/${fileName}`;
    } catch (pdfErr) {
      console.error("❌ PDF generation failed:", pdfErr.message);
    }
  }

  return { summary: summaryText, duration, pdfUrl };
}