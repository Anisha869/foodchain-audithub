"""
embeddings.py — Pure sentence-transformers embeddings (no Ollama, no API needed).
Uses all-MiniLM-L6-v2 which is tiny (80MB), fast on CPU, and high quality for
semantic similarity tasks.
"""

import numpy as np
from typing import List, Optional
from functools import lru_cache

# ── Lazy model loader (loaded once, cached) ───────────────────────────────────
_model = None

def _get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


# ── In-memory embedding cache (text → vector) ─────────────────────────────────
_EMBED_CACHE: dict = {}


def get_embedding(text: str) -> Optional[List[float]]:
    """
    Returns a 384-dim embedding vector for the given text.
    Results are cached in-memory for the session.
    """
    key = text.strip()
    if key in _EMBED_CACHE:
        return _EMBED_CACHE[key]
    try:
        model = _get_model()
        vec = model.encode(key, normalize_embeddings=True).tolist()
        _EMBED_CACHE[key] = vec
        return vec
    except Exception:
        return None


def batch_get_embeddings(texts: List[str]) -> List[Optional[List[float]]]:
    """
    Batch-encode a list of texts. Much faster than calling get_embedding one by one
    because sentence-transformers can batch on GPU or use optimized CPU BLAS.
    """
    # Split into cached vs. uncached
    uncached_idx = [i for i, t in enumerate(texts) if t.strip() not in _EMBED_CACHE]
    uncached_texts = [texts[i] for i in uncached_idx]

    if uncached_texts:
        try:
            model = _get_model()
            vecs = model.encode(uncached_texts, normalize_embeddings=True, batch_size=32)
            for idx, vec in zip(uncached_idx, vecs):
                _EMBED_CACHE[texts[idx].strip()] = vec.tolist()
        except Exception:
            pass  # leave as None in cache-miss → fallback handled by caller

    return [_EMBED_CACHE.get(t.strip()) for t in texts]


def cosine_similarity(v1: Optional[List[float]], v2: Optional[List[float]]) -> float:
    """Cosine similarity between two vectors. Returns 0.0 on bad input."""
    if not v1 or not v2:
        return 0.0
    a = np.array(v1, dtype=np.float32)
    b = np.array(v2, dtype=np.float32)
    # Vectors from sentence-transformers are already L2-normalized,
    # so dot product == cosine similarity. Keep the general formula for safety.
    na, nb = np.linalg.norm(a), np.linalg.norm(b)
    if na == 0 or nb == 0:
        return 0.0
    return float(np.dot(a, b) / (na * nb))


# ── Backwards-compat shim (old code called get_ollama_embedding) ──────────────
def get_ollama_embedding(text: str, model: str = None) -> Optional[List[float]]:
    """Deprecated shim — now routes to get_embedding (sentence-transformers)."""
    return get_embedding(text)
