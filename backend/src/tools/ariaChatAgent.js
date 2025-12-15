import { entrypoint, task, addMessages } from "@langchain/langgraph";
import { SystemMessage } from "@langchain/core/messages";
import { ChatOllama } from "@langchain/ollama";
import { chatRetrievalTool } from "./chatRetrievalTool.js";

/* -------------------------------------------------------------------------- */
/* 🧠 TOOL-ENABLED REASONING MODEL                                             */
/* -------------------------------------------------------------------------- */
const model = new ChatOllama({
  model: process.env.ARIA_RAG_MODEL || "llama3.1:8b-instruct-q4_K_M",
  temperature: 0,
}).bindTools([chatRetrievalTool]);

/* -------------------------------------------------------------------------- */
/* 🧠 TOOL-DISABLED FINAL ANSWER MODEL (FIX)                                   */
/* -------------------------------------------------------------------------- */
const finalModel = new ChatOllama({
  model: process.env.ARIA_RAG_MODEL || "llama3.1:8b-instruct-q4_K_M",
  temperature: 0,
});

/* -------------------------------------------------------------------------- */
/* 🧠 LLM NODE (REASONING + TOOL USE)                                          */
/* -------------------------------------------------------------------------- */
const callLlm = task({ name: "callLlm" }, async (messages) => {
  return model.invoke([
    new SystemMessage(
`You are Aria, a chat-based reasoning agent.

RULES:
1. You MUST call the "chat_retrieval" tool before answering.
2. The "chat_retrieval" tool returns chat text or "NO_RELEVANT_CONTEXT_FOUND".
3. You may ONLY answer using retrieved chat text.
4. If no relevant context exists, say:
   "I don't know based on the chat history."
5. Do NOT answer from prior knowledge.
`
    ),
    ...messages,
  ]);
});

/* -------------------------------------------------------------------------- */
/* 🤖 CHAT-RAG AGENT                                                          */
/* -------------------------------------------------------------------------- */
export const ariaChatAgent = entrypoint(
  { name: "ariaChatAgent" },
  async ({ question, groupId }) => {
    let messages = [{ role: "user", content: question }];
    let response = await callLlm(messages);
    let iterations = 0;
    const MAX_ITERATIONS = 3;

    // 🔄 Tool reasoning loop
    while (response.tool_calls?.length && iterations < MAX_ITERATIONS) {
      const toolResults = await Promise.all(
        response.tool_calls.map(tc => {
          const args = tc.args ?? {};
          return chatRetrievalTool.invoke({
            question: args.question ?? question,
            groupId,
            topK: Number(args.topK) || 5,
          });
        })
      );

      messages = addMessages(messages, [response, ...toolResults]);
      response = await callLlm(messages);
      iterations++;
    }

    /* ---------------------------------------------------------------------- */
    /* 🔑 FINAL SYNTHESIS (TOOL-DISABLED) — THIS IS THE FIX                    */
    /* ---------------------------------------------------------------------- */
    response = await finalModel.invoke([
      new SystemMessage(
`You are Aria.

Answer the user's question using ONLY the retrieved chat context above.
Do NOT mention tools, function calls, or reasoning steps.
Respond with a clean, user-facing answer.
`
      ),
      ...messages,
    ]);

    const finalText =
      typeof response?.content === "string"
        ? response.content
        : Array.isArray(response?.content)
          ? response.content.map(c => c.text).join("")
          : "";

    console.log("🧠 [ariaChatAgent] Final answer:", finalText.slice(0, 120));

    return finalText.trim() || "I don't know based on the chat history.";
  }
);