/**
 * Aria Service
 * ------------
 * Handles general AI chat interactions for "@aria/" commands.
 * Uses Ollama locally (default: llama3.2:1b) for quick private reasoning.
 */

import ollama from "ollama";

/* -------------------------------------------------------------------------- */
/* 🧠 Core Function: Run General AI Chat Query                                 */
/* -------------------------------------------------------------------------- */
export async function runAriaChat(prompt) {
  console.log("🧠 [AriaChat] Processing query:", prompt);

  if (!prompt || typeof prompt !== "string") {
    throw new Error("Invalid query prompt");
  }

  try {
    const response = await ollama.chat({
      model: process.env.ARIA_CHAT_MODEL || "llama3.2:1b",
      messages: [
        {
          role: "system",
          content: `You are Aria, a friendly and intelligent assistant. 
Respond in a helpful, concise, and context-aware way. Keep tone professional yet approachable.`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const answer = response?.message?.content?.trim() || "No response generated.";
    console.log("✅ [AriaChat] Response generated.");
    return answer;
  } catch (err) {
    console.error("❌ [AriaChat] Error:", err.message);
    throw new Error("Failed to generate AI response.");
  }
}

/* -------------------------------------------------------------------------- */
/* ⚙️ Optional Future Expansion                                                */
/* -------------------------------------------------------------------------- */
/**
 * - Add streaming support for real-time token output.
 * - Add conversation memory via MongoDB (optional).
 * - Support chat personalities (friendly, formal, technical).
 */