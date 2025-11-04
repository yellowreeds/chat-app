"""
Vector Store
------------
Handles FAISS index management:
 - Loading and saving indexes
 - Adding new vectors
 - Performing nearest-neighbor searches
 - Maintaining metadata consistency
"""

import os
import json
import faiss
import numpy as np
import logging
from typing import List, Dict, Any

# -----------------------------------------------------------------------------
# ⚙️ Configuration
# -----------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STORE_DIR = os.path.join(BASE_DIR, "faiss_store")

os.makedirs(STORE_DIR, exist_ok=True)
logging.basicConfig(level=logging.INFO, format="[VECTOR_STORE] %(message)s")


# -----------------------------------------------------------------------------
# 🧩 Utility Functions
# -----------------------------------------------------------------------------
def _paths(group_id: str):
    """Return index and metadata file paths for a group."""
    return (
        os.path.join(STORE_DIR, f"{group_id}.index"),
        os.path.join(STORE_DIR, f"{group_id}_meta.json"),
    )


def _save_metadata(path: str, metadata: List[Dict[str, Any]]):
    """Save metadata to JSON file."""
    with open(path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)


def _load_metadata(path: str):
    """Load metadata from JSON file."""
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


# -----------------------------------------------------------------------------
# 🧠 Core Functions
# -----------------------------------------------------------------------------
def add_to_index(group_id: str, vectors: List[List[float]], metadata: List[Dict[str, Any]]):
    """Add new vectors + metadata to FAISS index."""
    index_path, meta_path = _paths(group_id)

    vectors_np = np.array(vectors).astype("float32")
    dim = vectors_np.shape[1]

    if os.path.exists(index_path):
        index = faiss.read_index(index_path)
        if index.d != dim:
            raise ValueError(f"Vector dimension mismatch: existing={index.d}, new={dim}")
    else:
        index = faiss.IndexFlatL2(dim)

    index.add(vectors_np)
    faiss.write_index(index, index_path)

    existing_meta = _load_metadata(meta_path)
    existing_meta.extend(metadata)
    _save_metadata(meta_path, existing_meta)

    logging.info(f"Indexed {len(vectors_np)} vectors for group {group_id}")
    return len(vectors_np)


def search_index(group_id: str, query_vector: List[float], k: int = 5):
    """Search FAISS index and return metadata for nearest neighbors."""
    index_path, meta_path = _paths(group_id)

    if not os.path.exists(index_path):
        raise FileNotFoundError(f"No index found for group {group_id}")

    index = faiss.read_index(index_path)
    metadata = _load_metadata(meta_path)

    query = np.array([query_vector]).astype("float32")
    distances, indices = index.search(query, k)

    results = []
    for dist, idx in zip(distances[0], indices[0]):
        if idx < len(metadata):
            results.append({
                "metadata": metadata[idx],
                "distance": float(dist),
            })

    return results