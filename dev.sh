#!/bin/bash
# ===============================================================
# 🧠 Aria Chat — MacOS Multi-Tab Dev Launcher (fixed version)
# Opens each service in a new Terminal tab safely
# ===============================================================

# Path setup (adjust if needed)
PROJECT_ROOT="$(pwd)"
BACKEND_PATH="$PROJECT_ROOT/backend"
FRONTEND_PATH="$PROJECT_ROOT/frontend"
FAISS_PATH="$PROJECT_ROOT/backend/src/faiss_store"

# Kill previous dev processes
echo "🧹 Cleaning up old processes..."
pkill -f "uvicorn" 2>/dev/null
pkill -f "node" 2>/dev/null

# Function to open a new terminal tab and run a command
function new_tab() {
  local title="$1"
  local cmd="$2"
  osascript <<EOF
    tell application "Terminal"
      activate
      tell application "System Events" to keystroke "t" using command down
      delay 0.5
      do script "echo '🚀 $title'; cd '$PROJECT_ROOT'; $cmd" in front window
    end tell
EOF
}

echo "🎬 Launching Aria Dev Environment in separate Terminal tabs..."

# ---- Open tabs ----
new_tab "Backend" "cd '$BACKEND_PATH' && npm run dev"
sleep 2
new_tab "Frontend" "cd '$FRONTEND_PATH' && npm run dev"
sleep 2
new_tab "FAISS Vector API" "cd '$FAISS_PATH' && uvicorn vector_api:app --reload --port 8000"
sleep 2
new_tab "Reranker API" "cd '$FAISS_PATH' && uvicorn reranker_api:app --reload --port 8001"

echo "=============================================="
echo "🔥 All services launching in separate tabs!"
echo "Backend:     http://localhost:5001"
echo "Frontend:    http://localhost:5173"
echo "FAISS API:   http://localhost:8000"
echo "Reranker:    http://localhost:8001"
echo "=============================================="