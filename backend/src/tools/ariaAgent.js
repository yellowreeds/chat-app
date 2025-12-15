// src/aria/ariaAgent.js

import { entrypoint, task, addMessages } from "@langchain/langgraph";
import { SystemMessage } from "@langchain/core/messages";
import { modelWithTools, toolsByName } from "./agentModel.js";

/* -------------------------------------------------------------------------- */
/* 🔍 VERIFICATION GATE                                                        */
/* -------------------------------------------------------------------------- */
/**
 * Determines whether a query requires mandatory external verification.
 * This is used to enforce tool usage for hallucination-prone queries.
 */
function requiresVerification(text) {
  return /(antitrust|ruling|lawsuit|court|legal|election|president|government|apple|google|meta|microsoft|2024|2025)/i.test(
    text
  );
}

/* -------------------------------------------------------------------------- */
/* 🧠 LLM NODE                                                                 */
/* -------------------------------------------------------------------------- */
/**
 * Calls the tool-augmented LLM.
 * This node decides whether to answer directly or invoke a tool.
 */
const callLlm = task({ name: "callLlm" }, async (messages) => {
  return modelWithTools.invoke([
    new SystemMessage(
      `You are Aria, an LLM-based agent.
You may use tools when factual, recent, or verifiable information is required.
Prefer tool usage over guessing.
Respond concisely and professionally.`
    ),
    ...messages,
  ]);
});

/* -------------------------------------------------------------------------- */
/* 🔧 TOOL NODE                                                                */
/* -------------------------------------------------------------------------- */
/**
 * Executes tool calls issued by the LLM.
 */
const callTool = task({ name: "callTool" }, async (toolCall) => {
  const tool = toolsByName[toolCall.name];
  if (!tool) {
    throw new Error(`Unknown tool: ${toolCall.name}`);
  }
  return tool.invoke(toolCall);
});

/* -------------------------------------------------------------------------- */
/* 🤖 AGENT LOOP (ReAct-style with ENFORCED verification)                       */
/* -------------------------------------------------------------------------- */
/**
 * Main agent entrypoint.
 * Iteratively alternates between reasoning (LLM) and acting (tools).
 */
export const ariaAgent = entrypoint(
  { name: "ariaAgent" },
  async (messages) => {
    const userQuery = messages.at(-1)?.content || "";

    // First reasoning pass
    let response = await callLlm(messages);

    let iterations = 0;
    const MAX_ITERATIONS = 3;

    /**
     * 🔒 ENFORCED TOOL EXECUTION
     * If this is a high-risk query and the model did not call a tool,
     * we directly execute the tool and inject the observation.
     */
    if (
      requiresVerification(userQuery) &&
      !response.tool_calls?.length
    ) {
      const forcedResult = await toolsByName.web_search.invoke({
        query: userQuery,
      });

      messages = addMessages(messages, [
        response,
        forcedResult,
      ]);

      response = await callLlm(messages);
    }

    while (response.tool_calls?.length && iterations < MAX_ITERATIONS) {
      const toolResults = await Promise.all(
        response.tool_calls.map((toolCall) => callTool(toolCall))
      );

      messages = addMessages(messages, [response, ...toolResults]);
      response = await callLlm(messages);
      iterations++;
    }

    /* ---------------------------------------------------------------------- */
    /* 🔑 FINAL SYNTHESIS (ALWAYS)                                             */
    /* ---------------------------------------------------------------------- */
    /**
     * Tools are internal observations.
     * We ALWAYS perform one final LLM call to generate a user-facing answer.
     */
    response = await callLlm(messages);
    messages = addMessages(messages, [response]);

    return messages;
  }
);