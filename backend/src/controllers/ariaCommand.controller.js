/**
 * Aria Command Controller
 * ------------------------
 * Handles all AI-related commands starting with "@aria-".
 * Delegates tasks to specialized AI services under /services/ai/
 */

import GroupMessage from "../models/groupMessage.model.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import { asyncHandler } from "./utils.controller.js";

import { runAriaChat } from "../services/ai/ariaService.js";
import { ariaChatAgent } from "../tools/ariaChatAgent.js";
import { runRagQuery, saveGroupMessagesToVectorDB } from "../services/ai/ragService.js";
import { runHybridSummarizationPipeline, runDocumentSummarizationPipeline } from "../services/ai/faissSummarizationService.js";
import { runBenchmarkTest } from "../services/ai/benchmarkService.js"
import { emitPrivateMessage } from "../services/socket/socketEmitter.js";

import { ariaAgent } from "../tools/ariaAgent.js";
import { HumanMessage } from "@langchain/core/messages";

const AI_USER_ID = "67caafa0a72be40d48d87b65";

/* -------------------------------------------------------------------------- */
/* 🧠 Dispatch Incoming @aria-* Commands                                      */
/* -------------------------------------------------------------------------- */
export const handleAriaCommand = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { text } = req.body;
  const senderId = req.user._id;

  try {
    let aiResponseMessage = null;

    /* ─────────────────────────────── @aria-benchmark ─────────────────────────────── */
    // if (text.startsWith("@aria-benchmark")) {
    //   console.log("⚡ Running RAG benchmark...");
    //   // await runBenchmarkTest(groupId);
    //   // await runBenchmarkTest("qwen3:8b", 100);
    //   // await runBenchmarkTestGemini("gemini-2.5-flash-lite", 100);
    //   return res.status(200).json({ ok: true, message: "Benchmark completed. Check logs." });
    // }

    // if (text.startsWith("@aria-benchmark")) {
    //   console.log("⚡ Running RAG benchmark...");
    //   await runBenchmarkTest();
    //   return res.status(200).json({ ok: true, message: "Benchmark completed. Check logs." });
    // }

    if (text.startsWith("@aria-benchmark")) {
      console.log("📊 Running automatic RAG benchmarking...");
      const result = await runBenchmarkTest(groupId);
      aiResponseMessage = result || "⚠️ Benchmark failed.";
    }

    /* ─────────────────────────────── @aria-saved ─────────────────────────────────── */
    if (text.startsWith("@aria-saved")) {
      console.log("💾 Saving group messages to FAISS...");
      const savedCount = await saveGroupMessagesToVectorDB(groupId);
      aiResponseMessage = `✅ Saved ${savedCount} messages into vector DB for this group.`;
    }

    /* ─────────────────────────────── @aria-doc/ ─────────────────────────────────── */
    else if (text.startsWith("@aria-doc/")) {
      const query = text.replace("@aria-doc/", "").trim();
      console.log(`📄 Running DOCUMENT RAG query: ${query}`);

      const ragResult = await runRagQuery(groupId, query, 5, "doc");

      let finalText = "";

      // Case 1: If RAG returned a plain string fallback
      if (typeof ragResult === "string") {
        finalText = ragResult;
      }
      // Case 2: Normal RAG object → use ONLY the answer
      else {
        finalText = ragResult.answer || "⚠️ No answer returned.";
      }

      aiResponseMessage = finalText.trim();
    }


    /* ─────────────────────────────── @aria-chat/ ─────────────────────────────────── */
    else if (text.startsWith("@aria-chat/")) {
      const query = text.replace("@aria-chat/", "").trim();
      console.log(`💬 Running CHAT RAG agent query: ${query}`);

      const answer = await ariaChatAgent.invoke({
        question: query,
        groupId,
      });

      // Agent already returns final, grounded text
      aiResponseMessage = typeof answer === "string"
        ? answer.trim()
        : "⚠️ No valid answer returned.";
    }

    /* ─────────────────────────────── @aria-compile ──────────────────────────────── */
    else if (text.startsWith("@aria-compile")) {
      console.log("📘 Running hybrid summarization (generate PDF mode)...");

      // Detect level dynamically
      const level = text.includes("basic")
        ? "basic"
        : text.includes("advanced")
          ? "advanced"
          : "intermediate";

      // Notify user right away
      res.status(200).json({
        ok: true,
        message: `Hybrid summarization (${level}) started — generating PDF...`,
      });

      // Run summarizer async
      runHybridSummarizationPipeline(groupId, level, undefined, {
        topK: 100,
        saveReport: true
      })
        .then(async (result) => {
          console.log(`✅ ${level} summary PDF done in ${(result.duration / 1000).toFixed(2)}s`);

          // If PDF exists → send private AI message
          if (result.pdfUrl) {
            console.log("📨 Preparing private PDF message...");

            // 1️⃣ Create a private message in DB
            const pdfMessage = new GroupMessage({
              senderId: AI_USER_ID,          // System AI
              groupId,
              text: `The summary is ready.`,
              file: result.pdfUrl,
              fileName: result.pdfUrl.split("/").pop(),
              privateTo: req.user._id  // 👈 PRIVATE MESSAGE
            });

            const saved = await pdfMessage.save();
            const populated = await saved.populate("senderId", "fullName profilePic");

            // 2️⃣ Send private socket message to ONLY requesting user
            emitPrivateMessage(req.user._id, populated);

            console.log("🤖 Sent private PDF link to user:", req.user._id);
          }
        })
        .catch(err => console.error("❌ Hybrid summarization error:", err));

      return; // prevent double response
    }

    /* ─────────────────────────────── @aria-summary-doc ──────────────────────────────── */
    else if (text.startsWith("@aria-doc-summary")) {
      console.log("📘 Running document summarization (PDF mode)...");

      res.status(200).json({
        ok: true,
        message: `Document summarization started — generating PDF...`,
      });

      runDocumentSummarizationPipeline(groupId, {
        topK: 50,
        saveReport: true
      })
        .then(async (result) => {
          console.log(`📄 Document summary PDF done in ${(result.duration / 1000).toFixed(2)}s`);

          if (result.pdfUrl) {
            const pdfMessage = new GroupMessage({
              senderId: AI_USER_ID,
              groupId,
              text: `Your document summary is ready.`,
              file: result.pdfUrl,
              fileName: result.pdfUrl.split("/").pop(),
              privateTo: req.user._id,
            });

            const saved = await pdfMessage.save();
            const populated = await saved.populate("senderId", "fullName profilePic");
            emitPrivateMessage(req.user._id, populated);
          }
        })
        .catch(err => console.error("❌ Document summarization error:", err));

      return;
    }

    // else if (text.startsWith("@aria-compile-gemini")) {
    //   console.log("⚡ Starting Gemini summarization benchmark...");

    //   const testGroupId = "67caa36b805cd40b9665554b";
    //   benchmarkGeminiHybridSummarization(testGroupId, 100, "basic", "gemini-2.5-flash-lite")
    //     .then(() => console.log("✅ Gemini summarization benchmark done."))
    //     .catch(err => console.error("❌ Gemini benchmark error:", err));

    //   return res.status(200).json({
    //     ok: true,
    //     message: "Gemini summarization benchmark started — check server logs.",
    //   });
    // }

    // else if (text.startsWith("@aria-compile")) {
    // console.log("📘 Running hybrid summarization (generate PDF mode)...");

    // // Detect level dynamically
    // const level = text.includes("basic")
    //   ? "basic"
    //   : text.includes("advanced")
    //     ? "advanced"
    //     : "intermediate";

    // // Notify user quickly
    // res.status(200).json({
    //   ok: true,
    //   message: `Hybrid summarization (${level}) started — generating PDF...`,
    // });

    // // Example conversation (you can later replace this with DB data)
    // const messages = [
    //   { sender: "Mark S", text: "Morning team—final build for the launch candidate is up on the staging server." },
    //   { sender: "Helly R", text: "Nice! I’ll start running the smoke tests before noon and log any UI issues." },
    //   { sender: "Irving B", text: "Marketing side is prepped. We’ll push teaser posts once QA signs off." },
    //   { sender: "Dylan G", text: "Remember to verify that the subscription tiering page matches the new pricing matrix." },
    //   { sender: "Mark S", text: "Good catch—pricing JSON was still pointing to last quarter’s values, fixing now." },
    //   { sender: "Helly R", text: "Checkout page passes all tests on Chrome and Edge, still validating Safari." },
    //   { sender: "Irving B", text: "Do we have the final tagline locked? Need it for press materials." },
    //   { sender: "Dylan G", text: "Yep—‘Smart Chat, Local Mind’. Approved yesterday with the execs." },
    //   { sender: "Mark S", text: "Deploy script for the release branch will freeze dependencies at commit a39f6." },
    //   { sender: "Helly R", text: "Heads-up: found a delay on the notification socket when multiple users join simultaneously." },
    //   { sender: "Mark S", text: "I’ll profile that—likely the emit queue; will add debounce on join events." },
    //   { sender: "Irving B", text: "Social posts scheduled for Monday 9 AM KST. Landing page draft is queued for approval." },
    //   { sender: "Dylan G", text: "QA passed on all devices—minor UI overflow on iPhone SE, logged as low priority." },
    //   { sender: "Mark S", text: "Great. Code freeze tonight at 11 PM. No more merges after that." },
    //   { sender: "Irving B", text: "Press release ready for translation. Need final quote from the CEO section." },
    //   { sender: "Helly R", text: "We should test the signup flow again after the dependency freeze, just in case." },
    //   { sender: "Mark S", text: "Sure—run it tonight and post results here before midnight." },
    //   { sender: "Irving B", text: "Got feedback from beta users: they love the speed but want clearer onboarding steps." },
    //   { sender: "Dylan G", text: "We can add a tooltip walkthrough on first login—lightweight and no new routes." },
    //   { sender: "Mark S", text: "Implemented guided tooltips; will be in next minor build." },
    //   { sender: "Helly R", text: "Retesting done, all clear. Preparing final release notes now." },
    //   { sender: "Irving B", text: "Media kit assets uploaded to Drive folder ‘Launch2025’." },
    //   { sender: "Mark S", text: "Build verified, tagging release v1.0.0-local." },
    //   { sender: "Dylan G", text: "🎉 Release candidate deployed successfully to production environment!" },
    //   { sender: "Irving B", text: "Awesome—launch announcement queued for 9 AM Monday. Let’s monitor metrics closely." },
    //   { sender: "Helly R", text: "Tracking signups and latency via Grafana dashboard—will share daily reports." },
    //   { sender: "Mark S", text: "Server CPU stable under 60% load with 200 concurrent users. Looks solid." },
    //   { sender: "Dylan G", text: "Analytics shows peak engagement during 9–11 AM window. Recommend pushing notifications then." },
    //   { sender: "Irving B", text: "Good idea—scheduled campaign messages for those hours. Added hashtags #LocalAI #SmartChat." },
    //   { sender: "Mark S", text: "Issue popped up: delayed push notifications on Android 14. Investigating." },
    //   { sender: "Helly R", text: "Found the cause—Firebase token expiration not handled on reconnect. Pushing patch." },
    //   { sender: "Dylan G", text: "Patched and redeployed. Confirmed instant delivery on test devices." },
    //   { sender: "Irving B", text: "Customer feedback’s rolling in—mostly positive, a few confused about pricing tiers." },
    //   { sender: "Mark S", text: "I’ll simplify the pricing tooltip—add example comparisons." },
    //   { sender: "Helly R", text: "Backend logs are clean. No major errors since last hotfix." },
    //   { sender: "Irving B", text: "Press picked up the story on TechAsia—traffic spiked by 120% this morning!" },
    //   { sender: "Dylan G", text: "That explains the sudden surge in requests—we’ll autoscale to handle load." },
    //   { sender: "Mark S", text: "Server autoscaling rules adjusted—max instances set to 6. Stable again." },
    //   { sender: "Irving B", text: "We should capture user testimonials now while engagement’s high." },
    //   { sender: "Dylan G", text: "Agreed—let’s ask early adopters for short quotes. I’ll prepare the outreach list." },
    //   { sender: "Mark S", text: "Uptime holding steady at 99.96%. Great job everyone—let’s wrap this week strong." },
    //   { sender: "Helly R", text: "👏 Congrats, team. I’ll archive logs and prep metrics report for our Monday review." }
    // ];

    // // ✅ Run hybrid summarization ONCE using your direct messages
    // // runHybridSummarizationPipeline(
    // //   groupId,
    // //   level,
    // //   "mistral:7b",
    // //   { saveReport: false, messages }
    // // )
    // runHybridSummarizationPipeline(
    //   groupId,
    //   level,
    //   "gemini-2.5-flash-lite", // 👈 Use Gemini model here
    //   { saveReport: true, messages }
    // )
    //   .then(result => console.log(`✅ ${level} summary PDF done in ${(result.duration / 1000).toFixed(2)}s`))
    //   .catch(err => console.error("❌ Hybrid summarization error:", err));

    // return; // prevent double response

    // console.log("📘 Running HYBRID summarization benchmark...");
    // res.status(200).json({
    //   ok: true,
    //   message: "Hybrid summarization benchmark started — check logs.",
    // });

    // benchmarkHybridSummarizationModels(groupId, 100)
    //   .then(() => console.log("✅ Hybrid summarization benchmark finished."))
    //   .catch(err => console.error("❌ Hybrid summarization error:", err));
    // return;

    /* ─────────────────────────────── @aria/ (General AI Query) ───────────────────── */
    else if (text.startsWith("@aria/")) {
      const query = text.replace("@aria/", "").trim();
      console.log(`🤖 [ARIA-Agent] Processing query: ${query}`);

      const result = await ariaAgent.invoke([
        new HumanMessage(query),
      ]);

      const finalMessage = result.at(-1);
      aiResponseMessage =
        finalMessage?.text?.trim() || "No response generated.";
    }

    // ⚠️ If none of the above match
    if (!aiResponseMessage) {
      return res.status(400).json({ ok: false, message: "Invalid @aria command" });
    }

    /* -------------------------------------------------------------------------- */
    /* 💬 Create AI Message (private to sender)                                  */
    /* -------------------------------------------------------------------------- */
    const aiMessage = new GroupMessage({
      senderId: AI_USER_ID,
      groupId,
      text: aiResponseMessage,
      privateTo: senderId,
    });

    await aiMessage.save();
    const populatedMessage = await aiMessage.populate("senderId", "fullName profilePic");

    // Send privately to requesting user
    const senderSocketId = getReceiverSocketId(senderId.toString());

    if (senderSocketId) {
      emitPrivateMessage(senderId, populatedMessage);
      console.log(`✅ Private AI response sent to user ${senderId}`);
    }

    return res.status(201).json({
      ok: true,
      message: "AI command executed successfully",
      result: populatedMessage,
    });

  } catch (err) {
    console.error("❌ Aria command error:", err);
    return res.status(500).json({ ok: false, message: err.message });
  }
});