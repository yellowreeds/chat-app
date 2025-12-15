// src/aria/tools/chatRetrievalTool.js
import { tool } from "@langchain/core/tools";
import * as z from "zod";
import { searchFaissIndexFromMessages } from "../services/embedding/embedService.js";
import { rerankChunks } from "../services/retrieval/rerankerHelper.js";

export const chatRetrievalTool = tool(
  async ({ question, groupId, topK }) => {
    const searchResults = await searchFaissIndexFromMessages(
      groupId,
      question,
      topK * 2
    );

    const retrieved = searchResults?.results || [];
    if (!retrieved.length) {
      return "NO_RELEVANT_CONTEXT_FOUND";
    }

    const flatChunks = retrieved.map(r => ({
      text: r.metadata?.text || "",
      header: r.metadata?.sender || "User",
    }));

    const reranked = await rerankChunks(question, flatChunks);

    const context = reranked
      .slice(0, topK)
      .map(
        (r, i) => `(${i + 1}) [${r.header}]\n${r.text.slice(0, 600)}`
      )
      .join("\n\n");

    return context;
  },
  {
    name: "chat_retrieval",
    description: "Retrieve relevant chat messages from group conversation history",
    schema: z.object({
      question: z.string(),
      groupId: z.string(),
      topK: z.number().default(5),
    }),
  }
);