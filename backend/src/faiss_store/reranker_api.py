"""
Reranker API
------------
Provides reranking for retrieved document chunks using
a sentence-transformer model (e.g. bge-reranker-base).
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from sentence_transformers import CrossEncoder
import torch
import logging

# -----------------------------------------------------------------------------
# ⚙️ Setup
# -----------------------------------------------------------------------------
app = FastAPI(title="Reranker API", version="1.0")
MODEL_NAME = "BAAI/bge-reranker-base"
logging.basicConfig(level=logging.INFO, format="[RERANKER] %(message)s")

try:
    device = "cuda" if torch.cuda.is_available() else "cpu"
    reranker = CrossEncoder(MODEL_NAME, device=device)
    logging.info(f"Model loaded successfully on {device}: {MODEL_NAME}")
except Exception as e:
    logging.error(f"❌ Failed to load reranker: {e}")
    reranker = None


# -----------------------------------------------------------------------------
# 🧩 Request / Response Models
# -----------------------------------------------------------------------------
class RerankItem(BaseModel):
    query: str
    texts: List[str]


class RerankResult(BaseModel):
    text: str
    score: float


class RerankResponse(BaseModel):
    ok: bool
    count: int
    results: List[RerankResult]


# -----------------------------------------------------------------------------
# 🚀 Endpoint
# -----------------------------------------------------------------------------
@app.post("/rerank", response_model=RerankResponse)
def rerank_documents(payload: RerankItem):
    """
    Rerank a list of text chunks against a query using a cross-encoder.
    """
    if not reranker:
        raise HTTPException(status_code=500, detail="Reranker model not loaded")

    query = payload.query.strip()
    texts = [t.strip() for t in payload.texts if t.strip()]

    if not query or not texts:
        raise HTTPException(status_code=400, detail="Both query and texts are required")

    logging.info(f"Reranking {len(texts)} items for query: {query[:60]}...")

    try:
        # Prepare pairs for cross-encoder
        pairs = [[query, t] for t in texts]
        scores = reranker.predict(pairs)

        ranked = sorted(zip(texts, scores), key=lambda x: x[1], reverse=True)
        results = [{"text": t, "score": float(s)} for t, s in ranked]

        return {
            "ok": True,
            "count": len(results),
            "results": results,
        }

    except Exception as e:
        logging.error(f"❌ Reranking failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))