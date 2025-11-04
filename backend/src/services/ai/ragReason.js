import fs from "fs";
import path from "path";
import Mustache from "mustache";
import { llmGenerate } from "../../lib/ollama.js";

const REASON_MODEL = "llama3.1:8b-instruct-q4_K_M";

export async function runReasoning({ query, context }) {
  try {
    // 🧠 Load the reasoning prompt template
    // const promptPath = path.resolve("src/templates/reason_prompt.txt");
    const promptPath = path.resolve("templates/reason_prompt.txt");
    const tmpl = fs.readFileSync(promptPath, "utf-8");
    const prompt = Mustache.render(tmpl, { query, context });

    console.log(`[Reason] Using model ${REASON_MODEL} for query: ${query}`);

    // 🔥 Generate answer with reasoning model
    const resp = await llmGenerate(REASON_MODEL, prompt, { num_predict: 800 });
    const text = resp?.response || "";

    console.log(`[Reason] Response length: ${text.length} chars`);

    // 🧩 Parse citations from the model output (if any)
    const match = text.match(/Citations:\s*\[([^\]]+)\]/i);
    const citations = match
      ? match[1].split(",").map(s => s.trim()).filter(Boolean)
      : [];

    return { text, citations };
  } catch (err) {
    console.error("[Reason] Error:", err);
    return { text: "⚠️ Reasoning error occurred.", citations: [] };
  }
}