// // /**
// //  * Benchmark Service
// //  * -----------------
// //  * Handles "@aria-benchmark" command.
// //  * Runs a fixed set of RAG queries against the FAISS index to measure latency and stability.
// //  */

// // import ollama from "ollama";
// // import { getEmbedding } from "../embedding/ollamaEmbeddings.js";
// // import { searchFaissIndex } from "../embedding/embedService.js";

// // /* -------------------------------------------------------------------------- */
// // /* 🧪 Query Pool: Example Benchmark Questions                                 */
// // /* -------------------------------------------------------------------------- */
// // const QUERY_POOL = [
// //   "Who is responsible for updating the onboarding materials?",
// //   "What discount did the vendor offer?",
// //   "Which team reported documentation gaps?",
// //   "What was the outcome of the sustainability audit?",
// //   "Who confirmed budget reallocation for Q4?",
// //   "What update was made to the dashboard layout?",
// //   "What is the timeline for internal system migration?",
// //   "Which client meeting was rescheduled?",
// //   "Who is handling encryption protocol review?",
// //   "What’s the start date of the SOC 2 audit?",
// // ];

// // /* -------------------------------------------------------------------------- */
// // /* ⚙️ Utility: Average Calculator                                             */
// // /* -------------------------------------------------------------------------- */
// // function average(values) {
// //   return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
// // }

// // /* -------------------------------------------------------------------------- */
// // /* 🚀 Run Benchmark Test                                                      */
// // /* -------------------------------------------------------------------------- */
// // export async function runBenchmarkTest(groupId, iterations = 20) {
// //   console.log(`⚡ [Benchmark] Running RAG latency test for group ${groupId} (${iterations} queries)`);

// //   const times = [];

// //   for (let i = 0; i < iterations; i++) {
// //     const query = QUERY_POOL[Math.floor(Math.random() * QUERY_POOL.length)];
// //     const start = Date.now();
// //     let ttft = null;

// //     try {
// //       // 1️⃣ Generate query embedding
// //       const questionEmbedding = await getEmbedding(query);

// //       // 2️⃣ Perform FAISS search
// //       const searchResults = await searchFaissIndex(groupId, query, 5);

// //       const context = (searchResults.results || [])
// //         .map((r, idx) => `(${idx + 1}) ${r.metadata?.header || "Unknown"}: ${r.metadata?.text || ""}`)
// //         .join("\n");

// //       // 3️⃣ Build RAG prompt
// //       const ragPrompt = `
// // You are Aria, an AI assistant answering questions about enterprise documents.
// // Use ONLY the provided context to answer the question.
// // If the answer isn't in the context, say "I don’t know based on the provided content."

// // Context:
// // ${context}

// // Question: ${query}
// // Answer:
// // `;

// //       // 4️⃣ Stream response to measure TTFT and TTFR
// //       const stream = await ollama.chat({
// //         model: process.env.ARIA_RAG_MODEL || "llama3.1:8b-instruct-q4_K_M",
// //         messages: [{ role: "user", content: ragPrompt }],
// //         stream: true,
// //       });

// //       for await (const part of stream) {
// //         if (ttft === null) {
// //           ttft = Date.now() - start;
// //           console.log(`#${i + 1} | TTFT: ${ttft} ms | Query: "${query}"`);
// //         }
// //       }

// //       const ttfr = Date.now() - start;
// //       times.push({ ttft, ttfr });
// //       console.log(`#${i + 1} | TTFR: ${ttfr} ms | ✅ Completed`);

// //     } catch (err) {
// //       console.error(`❌ [Benchmark] Query #${i + 1} failed:`, err.message);
// //     }
// //   }

// //   if (!times.length) {
// //     console.warn("⚠️ No successful benchmark results recorded.");
// //     return "⚠️ Benchmark failed or empty.";
// //   }

// //   // 🧮 Compute Statistics
// //   const ttftAvg = average(times.map(t => t.ttft));
// //   const ttfrAvg = average(times.map(t => t.ttfr));
// //   const ttftMin = Math.min(...times.map(t => t.ttft));
// //   const ttftMax = Math.max(...times.map(t => t.ttft));
// //   const ttfrMin = Math.min(...times.map(t => t.ttfr));
// //   const ttfrMax = Math.max(...times.map(t => t.ttfr));

// //   console.log("\n📊 [Benchmark Summary]");
// //   console.log(`Total Queries: ${times.length}`);
// //   console.log(`TTFT → Avg: ${ttftAvg.toFixed(2)} ms | Min: ${ttftMin} | Max: ${ttftMax}`);
// //   console.log(`TTFR → Avg: ${ttfrAvg.toFixed(2)} ms | Min: ${ttfrMin} | Max: ${ttfrMax}`);

// //   return {
// //     ok: true,
// //     message: "Benchmark completed successfully",
// //     total: times.length,
// //     stats: {
// //       ttft: { avg: ttftAvg, min: ttftMin, max: ttftMax },
// //       ttfr: { avg: ttfrAvg, min: ttfrMin, max: ttfrMax },
// //     },
// //   };
// // }

// /**
//  * Benchmark Service (Private Query)
//  * ---------------------------------
//  * Handles "@aria-benchmark" command for simple model latency testing.
//  * Measures TTFT and TTFR for random user-like questions (no RAG, no FAISS).
//  */

// // import ollama from "ollama";

// // /* -------------------------------------------------------------------------- */
// // /* 🎯 Example Benchmark Questions                                             */
// // /* -------------------------------------------------------------------------- */
// // const QUERY_POOL = [
// //   "What is the capital of South Korea?",
// //   "Who wrote the novel 1984?",
// //   "Explain the concept of quantum entanglement in simple terms.",
// //   "List three applications of deep learning in healthcare.",
// //   "What are the advantages of using NoSQL databases?",
// //   "How does photosynthesis work?",
// //   "Summarize the causes of climate change.",
// //   "Define machine learning in one sentence.",
// //   "What is the function of mitochondria in a cell?",
// //   "Explain the difference between HTTP and HTTPS."
// // ];

// // /* -------------------------------------------------------------------------- */
// // /* ⚙️ Utility: Average Calculator                                             */
// // /* -------------------------------------------------------------------------- */
// // function average(values) {
// //   return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
// // }

// // /* -------------------------------------------------------------------------- */
// // /* 🚀 Run Private Query Benchmark Test                                        */
// // /* -------------------------------------------------------------------------- */
// // export async function runBenchmarkTest(modelName = "mistral:7b", iterations = 10) {
// //   console.log(`⚡ [Benchmark] Running private query latency test on model: ${modelName} (${iterations} queries)`);

// //   const times = [];

// //   for (let i = 0; i < iterations; i++) {
// //     const query = QUERY_POOL[Math.floor(Math.random() * QUERY_POOL.length)];
// //     const start = Date.now();
// //     let ttft = null;

// //     try {
// //       const prompt = `
// // You are Aria, an AI assistant answering general knowledge questions.
// // Answer concisely and clearly.

// // Question: ${query}
// // Answer:
// // `;

// //       // Stream to capture TTFT and TTFR
// //       const stream = await ollama.chat({
// //         model: modelName,
// //         messages: [{ role: "user", content: prompt }],
// //         stream: true,
// //       });

// //       for await (const part of stream) {
// //         if (ttft === null) {
// //           ttft = Date.now() - start;
// //           console.log(`#${i + 1} | TTFT: ${ttft} ms | Query: "${query}"`);
// //         }
// //       }

// //       const ttfr = Date.now() - start;
// //       times.push({ ttft, ttfr });
// //       console.log(`#${i + 1} | TTFR: ${ttfr} ms | ✅ Completed\n`);
// //     } catch (err) {
// //       console.error(`❌ [Benchmark] Query #${i + 1} failed:`, err.message);
// //     }
// //   }

// //   if (!times.length) {
// //     console.warn("⚠️ No successful benchmark results recorded.");
// //     return { ok: false, message: "Benchmark failed or empty." };
// //   }

// //   // 🧮 Compute Statistics
// //   const ttftAvg = average(times.map(t => t.ttft));
// //   const ttfrAvg = average(times.map(t => t.ttfr));
// //   const ttftMin = Math.min(...times.map(t => t.ttft));
// //   const ttftMax = Math.max(...times.map(t => t.ttft));
// //   const ttfrMin = Math.min(...times.map(t => t.ttfr));
// //   const ttfrMax = Math.max(...times.map(t => t.ttfr));

// //   console.log("\n📊 [Benchmark Summary]");
// //   console.log(`Total Queries: ${times.length}`);
// //   console.log(`TTFT → Avg: ${ttftAvg.toFixed(2)} ms | Min: ${ttftMin} | Max: ${ttftMax}`);
// //   console.log(`TTFR → Avg: ${ttfrAvg.toFixed(2)} ms | Min: ${ttfrMin} | Max: ${ttfrMax}`);

// //   return {
// //     ok: true,
// //     model: modelName,
// //     total: times.length,
// //     stats: {
// //       ttft: { avg: ttftAvg, min: ttftMin, max: ttftMax },
// //       ttfr: { avg: ttfrAvg, min: ttfrMin, max: ttfrMax },
// //     },
// //   };
// // }



// // /**
// //  * Benchmark Summarization Models
// //  * -------------------------------
// //  * Runs multiple summarizations using different models (100x each)
// //  * and measures execution time.
// //  */

// // import { GoogleGenerativeAI } from "@google/generative-ai";
// // import { performance } from "perf_hooks";
// // import dotenv from "dotenv";
// // import { searchFaissIndexFromMessages } from "../embedding/embedService.js";
// // import { buildSummaryPrompt } from "./summarizationService.js";
// // dotenv.config();

// // const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// // /**
// //  * 🧠 Gemini Hybrid Summarization Benchmark
// //  * ----------------------------------------
// //  * Runs summarization N times using Gemini and measures latency.
// //  */
// // export async function benchmarkGeminiHybridSummarization(
// //   groupId,
// //   iterations = 100,
// //   level = "basic",
// //   modelName = "gemini-2.5-flash-lite",
// //   { topK = 30 } = {}
// // ) {
// //   console.log(`\n🚀 Benchmarking Gemini summarization (${modelName}) | level=${level} | ${iterations} runs\n`);

// //   const times = [];
// //   let model;

// //   try {
// //     model = genAI.getGenerativeModel({ model: modelName });
// //   } catch (err) {
// //     console.error(`❌ Gemini model init failed: ${err.message}`);
// //     return;
// //   }

// //   // Preload top-K FAISS context once
// //   const searchResults = await searchFaissIndexFromMessages(groupId, "conversation summary", topK);
// //   const results = searchResults?.results || [];
// //   if (!results.length) throw new Error("No FAISS chunks found for this group.");

// //   const formattedChat = results
// //     .map((r, i) => `${i + 1}. ${r.metadata?.sender || "User"}: ${r.metadata?.text || ""}`)
// //     .join("\n");

// //   const summaryPrompt = buildSummaryPrompt(level, formattedChat);
// //   const hybridPrompt = `
// // You are given ${results.length} representative excerpts from a longer group conversation.
// // Use them as context to summarize the *entire* discussion at a "${level}" detail level.

// // ${summaryPrompt}
// // `;

// //   for (let i = 1; i <= iterations; i++) {
// //     try {
// //       const start = performance.now();
// //       const result = await model.generateContent(hybridPrompt);
// //       const duration = performance.now() - start;

// //       const text = result.response?.text() || "⚠️ No output";
// //       console.log(`#${i.toString().padStart(3, "0")} | ${(duration / 1000).toFixed(2)} s | ${text.slice(0, 60)}...`);

// //       times.push(duration);
// //       await new Promise(r => setTimeout(r, 2200)); // ⏳ respect rate limit
// //     } catch (err) {
// //       console.error(`❌ Run ${i} failed: ${err.message}`);
// //       await new Promise(r => setTimeout(r, 5000)); // wait if quota hit
// //     }
// //   }

// //   if (!times.length) return console.warn("⚠️ No successful benchmark results.");

// //   const avg = times.reduce((a, b) => a + b, 0) / times.length;
// //   const min = Math.min(...times);
// //   const max = Math.max(...times);

// //   console.log("\n📊 [Gemini Benchmark Summary]");
// //   console.log(`Model: ${modelName}`);
// //   console.log(`Total runs: ${times.length}`);
// //   console.log(`Avg: ${(avg / 1000).toFixed(2)} s | Min: ${(min / 1000).toFixed(2)} | Max: ${(max / 1000).toFixed(2)}`);

// //   return { modelName, level, runs: times.length, avg, min, max };
// // }



// // import { GoogleGenerativeAI } from "@google/generative-ai";
// // import dotenv from "dotenv";
// // dotenv.config();

// // const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// // /* Example questions */
// // const QUERY_POOL = [
// //   "What is the capital of South Korea?",
// //   "Who wrote the novel 1984?",
// //   "Explain the concept of quantum entanglement in simple terms.",
// //   "List three applications of deep learning in healthcare.",
// //   "What are the advantages of using NoSQL databases?",
// //   "How does photosynthesis work?",
// //   "Summarize the causes of climate change.",
// //   "Define machine learning in one sentence.",
// //   "What is the function of mitochondria in a cell?",
// //   "Explain the difference between HTTP and HTTPS.",
// // ];

// // /* Helper utilities */
// // function average(values) {
// //   return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
// // }
// // const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// // /* 🚀 Gemini Streaming Benchmark with TTFT + TTFR */
// // export async function runBenchmarkTestGemini(
// //   modelName = "gemini-1.5-flash",
// //   iterations = 10
// // ) {
// //   console.log(`⚡ [Benchmark] Streaming Gemini test (${modelName}) – ${iterations} runs\n`);

// //   const model = genAI.getGenerativeModel({ model: modelName });
// //   const times = [];

// //   for (let i = 0; i < iterations; i++) {
// //     const query = QUERY_POOL[Math.floor(Math.random() * QUERY_POOL.length)];
// //     const prompt = `
// // You are Aria, an AI assistant answering general knowledge questions.
// // Answer concisely and clearly.

// // Question: ${query}
// // Answer:
// // `;

// //     try {
// //       const start = Date.now();
// //       const stream = await model.generateContentStream(prompt);

// //       let firstTokenTime = null;
// //       let output = "";

// //       for await (const chunk of stream.stream) {
// //         if (!firstTokenTime) {
// //           firstTokenTime = Date.now();
// //           const ttft = firstTokenTime - start;
// //           console.log(`#${i + 1} | TTFT: ${ttft} ms | Query: "${query}"`);
// //         }
// //         output += chunk.text();
// //       }

// //       const ttfr = Date.now() - start;
// //       times.push({ ttft: firstTokenTime - start, ttfr });
// //       console.log(`#${i + 1} | TTFR: ${ttfr} ms | ✅ Completed\n`);

// //       await sleep(3000);
// //     } catch (err) {
// //       console.error(`❌ [Gemini] Query #${i + 1} failed:`, err.message);
// //     }
// //   }

// //   if (!times.length) {
// //     console.warn("⚠️ No successful benchmark results recorded.");
// //     return { ok: false };
// //   }

// //   const ttftAvg = average(times.map((t) => t.ttft));
// //   const ttfrAvg = average(times.map((t) => t.ttfr));
// //   console.log("\n📊 [Gemini Streaming Benchmark Summary]");
// //   console.log(
// //     `TTFT → Avg: ${ttftAvg.toFixed(1)} ms | TTFR → Avg: ${ttfrAvg.toFixed(1)} ms`
// //   );

// //   return {
// //     ok: true,
// //     model: modelName,
// //     total: times.length,
// //     stats: {
// //       ttft: { avg: ttftAvg },
// //       ttfr: { avg: ttfrAvg },
// //     },
// //   };
// // }

// /**
//  * Benchmark Suite for Aria Chat RAG System
//  * ----------------------------------------
//  * Tests:
//  *   1️⃣ Embedding throughput
//  *   2️⃣ FAISS search latency
//  *   3️⃣ LLM inference concurrency
//  *
//  * Run manually:
//  *   node src/benchmark/benchmarkService.js
//  *
//  * Or trigger via:
//  *   @aria-benchmark
//  */

// // import { getEmbedding } from "../embedding/ollamaEmbeddings.js";
// // import { buildFaissIndexFromMessages, searchFaissIndexFromMessages } from "../embedding/embedService.js";
// // import axios from "axios";
// // import { performance } from "perf_hooks";
// // import dotenv from "dotenv";
// // dotenv.config({ path: "./.env" });

// // const BASE_GROUP_ID = "benchmark_group";
// // const OLLAMA_MODEL = process.env.ARIA_RAG_MODEL || "llama3.1:8b-instruct-q4_K_M";

// // /* -------------------------------------------------------------------------- */
// // /* 🧪 1️⃣ Generate Synthetic Chat Messages                                     */
// // /* -------------------------------------------------------------------------- */
// // function generateMessages(count) {
// //   const base = [
// //     "Let's discuss the new feature roadmap.",
// //     "Reminder: deploy new release before Monday.",
// //     "Our final tagline is 'Smart Chat, Local Mind'.",
// //     "Customer feedback shows a 12% engagement boost.",
// //     "We need to fix the login bug before the launch event.",
// //   ];

// //   const messages = [];
// //   for (let i = 0; i < count; i++) {
// //     const msg = `${base[i % base.length]} [msg#${i}]`;
// //     messages.push({ text: msg, sender: `user${i % 5}` });
// //   }
// //   return messages;
// // }

// // /* -------------------------------------------------------------------------- */
// // /* 🧠 2️⃣ Embedding Throughput Test                                            */
// // /* -------------------------------------------------------------------------- */
// // async function testEmbeddingSpeed(messages) {
// //   console.log(`\n⚙️ [Benchmark] Embedding ${messages.length} messages...`);
// //   const start = performance.now();
// //   const vectors = [];

// //   for (const msg of messages) {
// //     try {
// //       const v = await getEmbedding(msg.text);
// //       vectors.push(v);
// //     } catch (err) {
// //       console.warn(`⚠️ [Embedding Error] Skipped "${msg.text.slice(0, 40)}..."`);
// //     }
// //   }

// //   const duration = (performance.now() - start) / 1000;
// //   const speed = (messages.length / duration).toFixed(2);
// //   console.log(`✅ Completed in ${duration.toFixed(2)}s (${speed} msg/sec)`);
// //   return vectors;
// // }

// // /* -------------------------------------------------------------------------- */
// // /* 🔍 3️⃣ FAISS Search Latency Test                                            */
// // /* -------------------------------------------------------------------------- */
// // async function testFaissRetrieval(groupId, sampleQueries = ["feature roadmap", "final tagline"]) {
// //   console.log(`\n🔎 [Benchmark] Running FAISS retrieval test for ${groupId}...`);
// //   const results = [];

// //   for (const q of sampleQueries) {
// //     const qStart = performance.now();
// //     const res = await searchFaissIndexFromMessages(groupId, q, 5);
// //     const latency = performance.now() - qStart;

// //     results.push({
// //       query: q,
// //       latency: latency.toFixed(2),
// //       hits: res?.results?.length || 0,
// //     });
// //   }

// //   const avgLatency = (
// //     results.reduce((a, b) => a + parseFloat(b.latency), 0) / results.length
// //   ).toFixed(2);

// //   console.table(results);
// //   console.log(`⚡ Avg Retrieval Latency: ${avgLatency} ms`);
// // }

// // /* -------------------------------------------------------------------------- */
// // /* 🤖 4️⃣ LLM Concurrency Test                                                 */
// // /* -------------------------------------------------------------------------- */
// // import pidusage from "pidusage";

// // /* -------------------------------------------------------------------------- */
// // /* 🤖 4️⃣ Enhanced LLM Concurrency + Resource Benchmark                       */
// // /* -------------------------------------------------------------------------- */
// // async function testLLMConcurrencyEnhanced(concurrent = 5) {
// //   console.log(`\n🧩 [Benchmark] Testing ${concurrent} concurrent RAG /document queries (with CPU & RAM)...`);

// //   const queries = Array(concurrent).fill(
// //     "Summarize the document's main objectives and guiding principles."
// //   );

// //   const start = performance.now();
// //   const usageStats = [];
// //   let completed = 0;

// //   // 🧩 Background system monitor
// //   const monitor = setInterval(async () => {
// //     const stats = await pidusage(process.pid);
// //     usageStats.push({
// //       cpu: stats.cpu,
// //       memory: stats.memory / (1024 * 1024 * 1024), // bytes → GB
// //     });
// //   }, 500);

// //   // 🚀 Run concurrent RAG requests
// //   const results = await Promise.allSettled(
// //     queries.map(async (_, i) => {
// //       const qStart = performance.now();
// //       try {
// //         await axios.post("http://localhost:5001/api/rag/document", {
// //           groupId: "67caa36b805cd40b9665554b",
// //           query: "Summarize the document's main objectives and guiding principles.",
// //           k: 8,
// //           token_budget: 6000,
// //         });
// //         completed++;
// //         const qEnd = performance.now();
// //         return (qEnd - qStart) / 1000;
// //       } catch (err) {
// //         console.warn(`   → ⚠️ Query ${i + 1} failed: ${err.response?.status || err.message}`);
// //         return null;
// //       }
// //     })
// //   );

// //   clearInterval(monitor);

// //   const durations = results
// //     .filter((r) => r.status === "fulfilled" && r.value)
// //     .map((r) => r.value);

// //   const avgResponse = durations.reduce((a, b) => a + b, 0) / durations.length;
// //   const elapsed = (performance.now() - start) / 1000;

// //   // 📊 System averages
// //   const avgCPU =
// //     usageStats.reduce((a, b) => a + b.cpu, 0) / usageStats.length;
// //   const avgRAM =
// //     usageStats.reduce((a, b) => a + b.memory, 0) / usageStats.length;
// //   const peakRAM = Math.max(...usageStats.map((s) => s.memory));

// //   console.log(`
// //   ✅ [RAG Load Test Results]
// //   • Total Queries: ${concurrent}
// //   • Completed: ${completed}
// //   • Avg Response Time: ${avgResponse.toFixed(2)} s/query
// //   • Total Duration: ${elapsed.toFixed(2)} s
// //   • CPU Usage: ${avgCPU.toFixed(1)} %
// //   • Memory Usage: ${avgRAM.toFixed(2)} GB (Peak ${peakRAM.toFixed(2)} GB)
// //   `);

// //   return {
// //     concurrent,
// //     avgResponse,
// //     avgCPU,
// //     avgRAM,
// //     peakRAM,
// //     success: completed,
// //   };
// // }

// // /* -------------------------------------------------------------------------- */
// // /* 🚀 5️⃣ Full Benchmark Runner                                                */
// // /* -------------------------------------------------------------------------- */
// // export async function runBenchmarkTest() {
// //   console.log("\n🏁 [BENCHMARK] Starting full RAG system benchmark...");

// //   const messageCounts = [10000];

// //   for (const count of messageCounts) {
// //     const groupId = `${BASE_GROUP_ID}_${count}`;
// //     console.log(`\n📦 [Phase] Testing group ${groupId}`);

// //     const msgs = generateMessages(count);
// //     const vectors = await testEmbeddingSpeed(msgs);

// //     const metadata = msgs.map((m, i) => ({
// //       sender: m.sender,
// //       text: m.text,
// //       timestamp: new Date(),
// //       partIndex: i,
// //     }));

// //     await buildFaissIndexFromMessages(`${groupId}_run${Date.now()}`, vectors, metadata);
// //     await testFaissRetrieval(groupId);
// //   }

// //   const res10 = await testLLMConcurrencyEnhanced(10);
// //   console.table([res10]);
// //   console.log("\n✅ [BENCHMARK COMPLETE] All tests finished successfully.");
// // }

// // /* -------------------------------------------------------------------------- */
// // /* 🧩 Optional — Run directly via Node                                        */
// // /* -------------------------------------------------------------------------- */
// // if (process.argv[1].includes("benchmarkService.js")) {
// //   runBenchmarkTest()
// //     .then(() => console.log("✅ Benchmark completed (manual mode)."))
// //     .catch((err) => console.error("💥 Benchmark failed:", err.message));
// // }

// // import { runHybridSummarizationPipeline } from "./faissSummarizationService.js";

// // export async function benchmarkHybridSummarizationModels(groupId, iterations = 50) {
// //   const models = ["qwen3:8b", "mistral:7b", "llama3.1:8b-instruct-q4_K_M"];

// //   for (const model of models) {
// //     console.log(`\n🚀 Benchmarking HYBRID summarization: ${model}`);
// //     const times = [];

// //     for (let i = 1; i <= iterations; i++) {
// //       try {
// //         const { duration } = await runHybridSummarizationPipeline(groupId, "intermediate", model, {
// //           topK: 30,
// //           saveReport: false,
// //         });
// //         times.push(duration);
// //         console.log(`#${i} → ${(duration / 1000).toFixed(2)} s`);
// //       } catch (err) {
// //         console.error(`❌ Run ${i} failed:`, err.message);
// //       }
// //     }

// //     const avg = times.reduce((a, b) => a + b, 0) / times.length;
// //     console.log(`📊 ${model}: Avg ${(avg / 1000).toFixed(2)} s (${times.length} runs)`);
// //   }

// //   console.log("\n🏁 Hybrid summarization benchmarks done.");
// // }

// // ============================================================
// // 🧠 benchmarkService.js
// // ------------------------------------------------------------
// // Runs RAG benchmark for multiple models
// // using questions from aria_chat_qa_questions.json
// // Logs: question, generated answer, retrieved chunks
// // ============================================================

// import fs from "fs";
// import path from "path";
// import { fileURLToPath } from "url";
// import { runRagQuery } from "./ragService.js";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// const DATA_PATH = path.join(__dirname, "aria_chat_qa_questions.json");

// // Models to benchmark
// const MODELS = [
//   { id: "llama3.1:8b-instruct-q4_K_M", label: "Llama" },
//   { id: "qwen3:8b", label: "Qwen" },
//   { id: "mistral:7b", label: "Mistral" },
// ];

// // ============================================================
// // 🧩 Load questions
// // ============================================================
// function loadQuestions() {
//   const raw = fs.readFileSync(DATA_PATH, "utf-8");
//   const data = JSON.parse(raw);
//   console.log(`📘 Loaded ${data.length} questions`);
//   return data;
// }

// // ============================================================
// // 🧩 Run single model benchmark
// // ============================================================
// export async function runBenchmarkForModel(modelId, label) {
//   const questions = loadQuestions();
//   const results = [];

//   for (let i = 0; i < questions.length; i++) {
//     const q = questions[i].question || questions[i];
//     console.log(`\n[${label}] (${i + 1}/${questions.length}) ❓ ${q}`);

//     try {
//       // call your main RAG system
//       const output = await runRagQuery("67caa36b805cd40b9665554b", q, 5, "chat", modelId);

//       results.push({
//         id: i + 1,
//         question: q,
//         generated_answer: output.answer || output,
//         retrieved_chunks: output.retrievedChunks || [],
//       });
//     } catch (err) {
//       console.error(`[${label}] ❌ Error on question ${i + 1}:`, err.message);
//       results.push({ id: i + 1, question: q, error: err.message });
//     }
//   }

//   // save output
//   const outFile = path.join(__dirname, `rag_results_${label.toLowerCase()}.json`);
//   fs.writeFileSync(outFile, JSON.stringify(results, null, 2), "utf-8");
//   console.log(`\n✅ [${label}] Benchmark completed. Saved → ${outFile}`);
// }

// // ============================================================
// // 🧩 Entry point: runBenchmarkTest()
// // ============================================================
// export async function runBenchmarkTest() {
//   console.log("⚡ Starting multi-model RAG benchmark...");
//   for (const model of MODELS) {
//     await runBenchmarkForModel(model.id, model.label);
//   }
//   console.log("🏁 All benchmarks finished.");
// }

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { runRagQuery } from "./ragService.js";

/* ============================================================
   Resolve __dirname for ES modules
   ============================================================ */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ============================================================
   Cosine Similarity + Embedding (inline)
   ============================================================ */
import ollama from "ollama";

function cosineSimilarity(vecA, vecB) {
  const dot = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dot / (magA * magB);
}

async function embed(text) {
  const model = process.env.ARIA_EMBED_MODEL || "nomic-embed-text";

  try {
    const response = await ollama.embeddings({
      model,
      prompt: text
    });

    return response.embedding;
  } catch (err) {
    console.error("❌ Embedding error:", err);
    return [];
  }
}

/* ============================================================
   📊 Benchmark Test (fixed path)
   ============================================================ */

export async function runBenchmarkTest(groupId) {

  // 🔥 FIXED: reliably load qa_dataset.json from same folder
  const datasetPath = path.join(__dirname, "qa_dataset.json");
  const dataset = JSON.parse(fs.readFileSync(datasetPath, "utf8"));

  let total = dataset.length;
  let hit = 0;

  console.log(`📘 Loaded ${total} evaluation items.`);

  for (const item of dataset) {
    const { id, question, answer: gt_answer } = item;

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🔍 [${id}] Query: ${question}`);

    const result = await runRagQuery(groupId, question, 5, "doc");

    const retrievedText = result?.retrievedChunks?.join(" ") || "";
    if (!retrievedText) {
      console.log("❌ MISS — No retrieved chunks");
      continue;
    }

    // ====== SEMANTIC MATCHING START ======
    const emb_gt = await embed(gt_answer);
    const emb_ret = await embed(retrievedText);

    if (!emb_gt.length || !emb_ret.length) {
      console.log("⚠️ Embedding failed, marking as MISS");
      continue;
    }

    const similarity = cosineSimilarity(emb_gt, emb_ret);
    console.log(`🔎 Similarity Score: ${similarity.toFixed(3)}`);

    const match = similarity > 0.55;
    // ====== SEMANTIC MATCHING END ======

    if (match) {
      hit++;
      console.log(`✅ HIT`);
    } else {
      console.log(`❌ MISS`);
    }
  }

  const recall = hit / total;

  console.log(`\n📊 Benchmark Finished`);
  console.log(`✔ Total: ${total}`);
  console.log(`✔ Retrieved Correctly: ${hit}`);
  console.log(`✔ Recall: ${recall.toFixed(3)}`);

  return `📊 Benchmark Results\n- Total: ${total}\n- Hits: ${hit}\n- Recall: ${recall.toFixed(3)}`;
}