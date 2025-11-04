import fs from "fs";
import path from "path";
import Mustache from "mustache";
import { llmGenerate } from "../../lib/ollama.js";

const COMPRESS_MODEL = "llama3.1:8b-instruct-q3_K_M";

// Rough word→token estimate (~1.33 factor)
function estimateTokens(text) {
  return Math.ceil(text.split(/\s+/).length * 1.33);
}

export async function runCompressionIfNeeded({ query, chunks, tokenBudget = 6000 }) {
  try {
    // Combine all retrieved text chunks
    const joined = chunks.map(c => `[${c.chunk_id}] ${c.text}`).join("\n");
    const tokenEstimate = estimateTokens(joined);

    // ✅ Skip compression if under budget
    if (tokenEstimate <= tokenBudget) {
      console.log(`[Compress] Skipped (${tokenEstimate} tokens under budget)`);
      return { context: joined, compressor_used: false, compressed_tokens: tokenEstimate };
    }

    // 🔧 Load compression prompt template
    const promptPath = path.resolve("src/templates/compress_prompt.txt");
    const tmpl = fs.readFileSync(promptPath, "utf-8");
    const prompt = Mustache.render(tmpl, { query, chunks });

    console.log(`[Compress] Triggered (input ≈ ${tokenEstimate} tokens)`);

    // 🔥 Call Ollama for compression
    const resp = await llmGenerate(COMPRESS_MODEL, prompt, { num_predict: 800 });
    const compressed = resp?.response || "";

    const compressedTokens = estimateTokens(compressed);
    console.log(`[Compress] Done → ${compressedTokens} tokens`);

    return {
      context: compressed,
      compressor_used: true,
      compressed_tokens: compressedTokens,
    };
  } catch (err) {
    console.error("[Compress] Error:", err);
    // Fallback: return original joined text
    const joined = chunks.map(c => `[${c.chunk_id}] ${c.text}`).join("\n");
    return { context: joined, compressor_used: false, compressed_tokens: estimateTokens(joined) };
  }
}