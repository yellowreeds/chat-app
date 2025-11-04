// -----------------------------------------------------------------------------
// 🌎 Environment Setup (Centralized Loader)
// -----------------------------------------------------------------------------
import "./config/env.js"; // ✅ this loads .env and exports `config`
import { warmupModels } from "./lib/ollama.js";

// -----------------------------------------------------------------------------
// 🧱 Core Modules
// -----------------------------------------------------------------------------
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

// -----------------------------------------------------------------------------
// ⚙️ Local Imports
// -----------------------------------------------------------------------------
import { app, server } from "./lib/socket.js";
import { connectDB } from "./lib/db.js";

// 🧩 Routes
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import groupRoutes from "./routes/group.route.js";
import docRoutes from "./routes/doc.route.js";
import embeddingRoutes from "./routes/embedding.route.js";
import queryRoutes from "./routes/query.route.js";
import ragRoutes from "./routes/rag.routes.js";

// -----------------------------------------------------------------------------
// 🚀 Express Middleware
// -----------------------------------------------------------------------------
app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Static file serving (for uploaded docs, images, etc.)
app.use("/uploads", express.static("uploads"));

// -----------------------------------------------------------------------------
// 🌐 CORS Configuration
// -----------------------------------------------------------------------------
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

// -----------------------------------------------------------------------------
// 🧭 API Routes
// -----------------------------------------------------------------------------
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/docs", docRoutes);
app.use("/api/embed", embeddingRoutes);
app.use("/api/query", queryRoutes);
app.use("/api/rag", ragRoutes);

// -----------------------------------------------------------------------------
// 🧩 Health Check Endpoint (Optional)
// -----------------------------------------------------------------------------
app.get("/api/health", (req, res) => {
  res.status(200).json({
    ok: true,
    message: "Backend is running smoothly 🧠",
    time: new Date().toISOString(),
  });
});

// -----------------------------------------------------------------------------
// 🔌 Start Server
// -----------------------------------------------------------------------------
import { config } from "./config/env.js"; // ✅ use centralized config object
const PORT = config.PORT;

server.listen(PORT, async () => {
  console.log("=======================================");
  console.log(`🚀 Server running on port ${PORT}`);
  console.log("=======================================");
  await connectDB();
  warmupModels();
});