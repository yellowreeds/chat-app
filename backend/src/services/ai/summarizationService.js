/**
 * Summarization Service
 * ---------------------
 * Handles "@aria-compile" commands.
 * Generates Basic / Intermediate / Advanced chat summaries as PDF reports.
 */

import fs from "fs/promises";
import path from "path";
import handlebars from "handlebars";
import puppeteer from "puppeteer";
import ollama from "ollama";
import GroupMessage from "../../models/groupMessage.model.js";

/* -------------------------------------------------------------------------- */
/* 🔹 Utility: Markdown → HTML Formatter                                       */
/* -------------------------------------------------------------------------- */
function formatSummary(summaryText) {
  const lines = summaryText.split("\n");
  let html = "";
  let inMainList = false;
  let inSubList = false;

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // Section headers (**bold**)
    if (/^\*\*(.*?)\*\*$/.test(line)) {
      if (inSubList) { html += "</ul>"; inSubList = false; }
      if (inMainList) { html += "</ul>"; inMainList = false; }
      html += `<p><strong>${line.replace(/\*\*/g, "")}</strong></p>`;
    }

    // Main bullets (* ...)
    else if (line.startsWith("*")) {
      if (!inMainList) { html += "<ul class='main-list'>"; inMainList = true; }
      if (inSubList) { html += "</ul>"; inSubList = false; }
      html += `<li>➤ ${line.replace(/^\*\s*/, "")}</li>`;
    }

    // Sub bullets (+ ...)
    else if (line.startsWith("+")) {
      if (!inSubList) { html += "<ul class='sub-list'>"; inSubList = true; }
      html += `<li>• ${line.replace(/^\+\s*/, "")}</li>`;
    }

    // Plain paragraph
    else {
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
/* 🧠 Step 1: Build Summarization Prompt                                       */
/* -------------------------------------------------------------------------- */
export function buildSummaryPrompt(level, formattedChat) {
  switch (level) {
    case "basic":
      return `
You are an AI that summarizes group chats for quick overviews.
Generate a **brief, high-level summary** of the following conversation.
Avoid excessive detail. No need to include names unless critical.

Conversation:
${formattedChat}
      `;

    case "intermediate":
      return `
You're an AI summarizer for group chats.
Produce a **moderately detailed** summary including:
- Key decisions
- People involved (if relevant)
- Action items or deadlines
Use bullet points where needed.

Conversation:
${formattedChat}
      `;

    case "advanced":
      return `
You're a **detailed transcription summarizer** for professional group chats.
Generate a **comprehensive summary** that includes:
- Who said what
- Action items
- Scheduled events
- Financial or project references

Format it like a meeting recap:
- Speaker: Summary of their messages
Use bullet points or timestamps if helpful.

Conversation:
${formattedChat}
      `;

    default:
      return `
You're an AI trained to summarize professional group chats.
Read the following messages and generate a clear, detailed meeting summary.
Highlight:
- Key decisions
- Scheduled dates/times
- Action items
- Financial figures
- Client or project names

Conversation:
${formattedChat}
      `;
  }
}

/* -------------------------------------------------------------------------- */
/* 🧾 Step 2: Generate Summarization PDF                                       */
/* -------------------------------------------------------------------------- */
export async function runSummarizationPipeline(groupId, level = "intermediate") {
  console.log(`🗃️ [Summarization] Starting pipeline for group ${groupId} (${level})`);

  // 1️⃣ Load messages
  const allMessages = await GroupMessage.find({ groupId })
    .sort({ createdAt: 1 })
    .populate("senderId", "fullName");

  if (!allMessages.length) {
    throw new Error("No messages found for this group.");
  }

  // 2️⃣ Format conversation
  const formattedChat = allMessages
    .map((msg) => `${msg.senderId?.fullName || "Unknown"}: ${msg.text}`)
    .join("\n");

  // 3️⃣ Build prompt
  const summaryPrompt = buildSummaryPrompt(level, formattedChat);

  // 4️⃣ Generate summary text via Ollama
  let summaryResult = "⚠️ Summarization failed.";
  try {
    const aiSummary = await ollama.chat({
      model: process.env.ARIA_SUMMARY_MODEL || "llama3.1:8b-instruct-q3_K_M",
      messages: [{ role: "user", content: summaryPrompt }],
    });
    summaryResult = aiSummary?.message?.content?.trim() || summaryResult;
  } catch (error) {
    console.error("❌ [Summarization] LLM error:", error.message);
  }

  // 5️⃣ Convert to HTML
  const formattedSummaryHtml = formatSummary(summaryResult);
  const templatePath = path.resolve("src/templates", "summaryTemplate.hbs");
  const outputDir = path.resolve("src/outputs");
  await fs.mkdir(outputDir, { recursive: true });

  const htmlTemplate = await fs.readFile(templatePath, "utf8");
  const compiledTemplate = handlebars.compile(htmlTemplate);
  const htmlContent = compiledTemplate({ summary: formattedSummaryHtml });

  // 6️⃣ Generate PDF
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: "networkidle0" });

  const fileName = `summary-${groupId}-${Date.now()}.pdf`;
  const pdfPath = path.join(outputDir, fileName);
  await page.pdf({ path: pdfPath, format: "A4", printBackground: true });
  await browser.close();

  console.log(`📄 [Summarization] PDF Generated: ${pdfPath}`);

  // 7️⃣ Return result
  return `✅ ${level.charAt(0).toUpperCase() + level.slice(1)} summary complete. PDF saved as ${fileName}.`;
}