import ollama from "ollama";

export async function llmGenerate(model, prompt, options = {}) {
  return ollama.generate({
    model,
    prompt,
    options: { temperature: 0.2, ...options },
  });
}

export async function warmupModels() {
  const models = [
    "llama3.1:8b-instruct-q3_K_M",
    "llama3.1:8b-instruct-q4_K_M",
  ];
  for (const m of models) {
    try {
      await llmGenerate(m, "ok", { num_predict: 1 });
      console.log(`[LLM] Warmed: ${m}`);
    } catch (e) {
      console.error(`[LLM] Warmup failed: ${m}`, e.message);
    }
  }
}