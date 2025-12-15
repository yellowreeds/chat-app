// src/tools/agentModel.js
import { ChatOllama } from "@langchain/ollama";
import { webSearch } from "./webSearch.js";

/**
 * Agent LLM
 * ---------
 * Ollama-based LLM augmented with tool usage capability.
 * This model acts as the "brain" of the @aria/ agent.
 */
export const model = new ChatOllama({
  model: process.env.ARIA_CHAT_MODEL || "llama3.2:1b",
  temperature: 0.2, // hallucination control
});

/**
 * Tool registry
 */
export const toolsByName = {
  [webSearch.name]: webSearch,
};

/**
 * Tool-augmented model
 */
export const modelWithTools = model.bindTools(
  Object.values(toolsByName)
);