"""
Vector API
----------
Exposes endpoints for adding and searching FAISS vector indexes.
Uses vector_store.py as backend for storage and retrieval.
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
import logging
from vector_store import add_to_index, search_index

# -----------------------------------------------------------------------------
# ⚙️ Setup
# -----------------------------------------------------------------------------
app = FastAPI(title="FAISS Vector API", version="1.0")
logging.basicConfig(level=logging.INFO, format="[VECTOR_API] %(message)s")


# -----------------------------------------------------------------------------
# 🧩 Request / Response Models
# -----------------------------------------------------------------------------
class AddVectorsRequest(BaseModel):
    group_id: str
    vectors: List[List[float]]
    metadata: List[Dict[str, Any]]


class SearchRequest(BaseModel):
    group_id: str
    vector: List[float]
    k: int = 5


# -----------------------------------------------------------------------------
# 🚀 Endpoints
# -----------------------------------------------------------------------------
@app.post("/add")
def add_vectors(req: AddVectorsRequest):
    """Add new vectors to FAISS index for a specific group."""
    try:
        count = add_to_index(req.group_id, req.vectors, req.metadata)
        logging.info(f"Added {count} vectors for group {req.group_id}")
        return {"ok": True, "group_id": req.group_id, "count": count}
    except Exception as e:
        logging.error(f"❌ Add failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/search")
def search_vectors(req: SearchRequest):
    """Search top-k vectors in FAISS index for a given query vector."""
    try:
        results = search_index(req.group_id, req.vector, req.k)
        logging.info(f"Search complete for group {req.group_id} | topK={req.k}")
        return {"ok": True, "results": results}
    except Exception as e:
        logging.error(f"❌ Search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))