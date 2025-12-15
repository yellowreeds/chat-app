import { tool } from "@langchain/core/tools";
import * as z from "zod";

/**
 * Web Search Tool
 * ---------------
 * Retrieves up-to-date information from the public web.
 * Used by the @aria/ agent to reduce hallucination.
 */
export const webSearch = tool(
  async ({ query }) => {
    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}`,
      {
        headers: {
          "X-Subscription-Token": process.env.BRAVE_API_KEY,
        },
      }
    );

    if (!res.ok) {
      throw new Error(`Web search failed: ${res.statusText}`);
    }

    const data = await res.json();

    const results = data.web.results.slice(0, 5).map((r, idx) => ({
      index: idx + 1,
      title: r.title,
      snippet: r.description,
      url: r.url,
    }));

    // 🔑 IMPORTANT: Ollama requires tool output to be a STRING
    return JSON.stringify(results, null, 2);
  },
  {
    name: "web_search",
    description:
      "Search the internet for recent or factual information when needed",
    schema: z.object({
      query: z.string(),
    }),
  }
);