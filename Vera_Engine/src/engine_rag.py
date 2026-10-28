"""
engine_rag.py  — Fully offline RAG engine (no LLM / no Ollama).

Architecture:
  1. INDEX PHASE  — Build a semantic index over the audit report sentences
     using sentence-transformers (all-MiniLM-L6-v2).  Batch-encoded once.

  2. RETRIEVE PHASE — For each FSSAI checklist item, retrieve the top-k most
     semantically similar sentences from the report.

  3. CLASSIFY PHASE — Determine C / PC / NC / NA from the retrieved evidence
     using a two-stage heuristic:
       a. Keyword-NC / Keyword-PC pattern matching (fast, high precision)
       b. TF-IDF weighted cosine as a coverage score to detect "partial"

  4. Q&A BOT — Extractive: returns the top-3 most relevant sentences from
     the report as the answer (no hallucination possible).
"""

from __future__ import annotations

import re
import numpy as np
from typing import Dict, List, Any, Tuple, Optional

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity as sk_cosine

from src.embeddings import batch_get_embeddings, cosine_similarity
from src.report_ingestion import segment_report


# ── Tunables ──────────────────────────────────────────────────────────────────
_TOP_K_DEFAULT      = 4      # chunks retrieved per checklist item
_HIGH_SIM_THRESH    = 0.55   # above this → strong evidence → classify from keywords
_LOW_SIM_THRESH     = 0.20   # below this → item not mentioned → NC directly
_CONTEXT_CHAR_LIM   = 400    # truncate each chunk for display


# ── Keyword pattern banks ─────────────────────────────────────────────────────
_NC_PATTERNS = re.compile(
    r'\b(not compliant|non.?compliant|not found|not maintained|absent|missing|'
    r'no record|not available|failed|not provided|lacking|deficient|inadequate|'
    r'violation|not observed|not documented|not present|not done|not checked|'
    r'not tested|not calibrated|not trained|expired|outdated|overdue|'
    r'never|nil|none|zero|no evidence|not followed|not implemented)\b',
    re.IGNORECASE
)

_PC_PATTERNS = re.compile(
    r'\b(partially|some|occasional|not always|insufficient|needs improvement|'
    r'under review|in progress|inconsistent|irregular|sometimes|mostly|'
    r'generally|few|limited|minor gap|minor issue|partly|incomplete)\b',
    re.IGNORECASE
)

_C_PATTERNS = re.compile(
    r'\b(compliant|maintained|present|available|found|recorded|documented|'
    r'observed|verified|confirmed|adequate|satisfactory|proper|correctly|'
    r'fully|complete|done|implemented|followed|certified|valid|up to date|'
    r'current|trained|calibrated|clean|hygienic)\b',
    re.IGNORECASE
)


def _keyword_classify(chunks: List[str], is_asterisk: bool) -> str:
    """
    Classify C / PC / NC from keyword patterns across retrieved chunks.
    Priority: NC keywords override → PC keywords → C keywords → NC (safe default).
    Asterisk-critical items cannot be PC → collapse to NC.
    """
    combined = " ".join(chunks).lower()

    nc_hits = len(_NC_PATTERNS.findall(combined))
    pc_hits = len(_PC_PATTERNS.findall(combined))
    c_hits  = len(_C_PATTERNS.findall(combined))

    # Decision tree
    if nc_hits > 0 and nc_hits >= c_hits:
        return "NC"
    if c_hits > 0 and c_hits > nc_hits:
        if pc_hits > 0 and not is_asterisk:
            return "PC"
        return "C"
    if pc_hits > 0 and not is_asterisk:
        return "PC"

    # No clear signal → conservative NC
    return "NC"


def _tfidf_coverage(q_text: str, chunks: List[str]) -> float:
    """
    Returns a TF-IDF cosine score between the checklist question and its top chunks.
    Used as a secondary signal for PC detection.
    """
    try:
        corpus = chunks + [q_text]
        vec = TfidfVectorizer(stop_words="english", max_features=3000)
        mat = vec.fit_transform(corpus)
        scores = sk_cosine(mat[-1], mat[:-1])[0]
        return float(np.max(scores))
    except Exception:
        return 0.0


# ── Build semantic index ───────────────────────────────────────────────────────
def _build_index(sentences: List[str]) -> Tuple[List[Optional[List[float]]], Any, bool]:
    """
    Encode all report sentences at once (batch) and build a TF-IDF matrix.
    Returns (sentence_embeddings, tfidf_vectorizer, tfidf_matrix, has_tfidf).
    """
    embs = batch_get_embeddings(sentences)

    tfidf_vec = None
    tfidf_mat = None
    has_tfidf = False
    try:
        tfidf_vec = TfidfVectorizer(stop_words="english", max_features=8000)
        tfidf_mat = tfidf_vec.fit_transform(sentences)
        has_tfidf = True
    except Exception:
        pass

    return embs, tfidf_vec, tfidf_mat, has_tfidf


# ── Retrieve top-k chunks for a query ─────────────────────────────────────────
def _retrieve(
    q_text: str,
    sentences: List[str],
    sent_embs: List[Optional[List[float]]],
    tfidf_vec,
    tfidf_mat,
    has_tfidf: bool,
    top_k: int,
) -> Tuple[List[str], float]:
    """
    Returns (top_chunks, max_similarity_score).
    Uses dense embeddings first; falls back to TF-IDF if embeddings unavailable.
    """
    q_emb = batch_get_embeddings([q_text])[0]

    max_sim = 0.0
    top_chunks: List[str] = []

    if q_emb and any(e is not None for e in sent_embs):
        sims = np.array([
            cosine_similarity(q_emb, e) if e is not None else 0.0
            for e in sent_embs
        ])
        max_sim = float(np.max(sims))
        top_idx = np.argsort(sims)[::-1][:top_k]
        top_chunks = [sentences[i] for i in top_idx if sims[i] > 0.05]

    # TF-IDF fallback
    if not top_chunks and has_tfidf:
        try:
            q_mat = tfidf_vec.transform([q_text])
            t_sims = sk_cosine(q_mat, tfidf_mat)[0]
            t_top = np.argsort(t_sims)[::-1][:top_k]
            top_chunks = [sentences[i] for i in t_top if t_sims[i] > 0.05]
            max_sim = float(np.max(t_sims)) if len(t_sims) else 0.0
        except Exception:
            pass

    return top_chunks, max_sim


# ── Main RAG engine ────────────────────────────────────────────────────────────
def run_rag_engine(
    checklist: List[Dict[str, Any]],
    report_text: str,
    top_k: int = _TOP_K_DEFAULT,
) -> Tuple[Dict[str, Dict[str, Any]], Dict[str, Any]]:
    """
    Offline RAG engine — no LLM required.

    Returns:
        verdicts  : {item_id → {status, evidence, faithful, retrieved_chunks}}
        diagnostics: summary stats
    """
    segments = segment_report(report_text)
    if not segments:
        return (
            {it["item_id"]: {"status": "NC", "evidence": "No report text", "faithful": True}
             for it in checklist},
            {}
        )

    sentences = [s["text"] for s in segments]

    # ── Phase 1: Build index ONCE ─────────────────────────────────────────────
    sent_embs, tfidf_vec, tfidf_mat, has_tfidf = _build_index(sentences)

    verdicts: Dict[str, Dict[str, Any]] = {}
    total_c = total_pc = total_nc = total_na = 0

    for item in checklist:
        it_id   = item["item_id"]
        q_text  = item["question"]
        is_ast  = item.get("asterisk_critical", False)

        # ── Phase 2: Retrieve ─────────────────────────────────────────────────
        top_chunks, max_sim = _retrieve(
            q_text, sentences, sent_embs,
            tfidf_vec, tfidf_mat, has_tfidf, top_k
        )

        # Item not mentioned at all
        if not top_chunks or max_sim < _LOW_SIM_THRESH:
            verdicts[it_id] = {
                "status": "NC",
                "evidence": "Not mentioned in the report.",
                "faithful": True,
                "retrieved_chunks": [],
                "similarity_score": round(max_sim, 3),
            }
            total_nc += 1
            continue

        # ── Phase 3: Classify ────────────────────────────────────────────────
        status = _keyword_classify(top_chunks, is_ast)

        # For borderline high-similarity cases with no NC/C signal, look at coverage
        if status == "NC" and max_sim >= _HIGH_SIM_THRESH:
            cov = _tfidf_coverage(q_text, top_chunks)
            if cov > 0.35:
                status = "PC" if not is_ast else "NC"

        # Asterisk rule: PC → NC
        if is_ast and status == "PC":
            status = "NC"

        evidence_text = top_chunks[0][:_CONTEXT_CHAR_LIM]

        if status == "C":
            total_c += 1
        elif status == "PC":
            total_pc += 1
        elif status == "NC":
            total_nc += 1
        else:
            total_na += 1

        verdicts[it_id] = {
            "status": status,
            "evidence": f'Evidence: "{evidence_text}"',
            "faithful": True,          # extractive → always faithful
            "retrieved_chunks": top_chunks,
            "similarity_score": round(max_sim, 3),
        }

    total = len(checklist)
    diagnostics = {
        "total_evaluated": total,
        "total_C": total_c,
        "total_PC": total_pc,
        "total_NC": total_nc,
        "total_NA": total_na,
        "faithfulness_rate": 1.0,     # extractive RAG cannot hallucinate
        "top_k": top_k,
    }
    return verdicts, diagnostics


# ── Extractive RAG Q&A Bot ────────────────────────────────────────────────────
def rag_bot_answer(question: str, report_text: str, top_k: int = 4) -> str:
    """
    Fully extractive Q&A bot — no LLM.
    Retrieves the top-k most semantically relevant sentences from the report
    and returns them as a formatted answer with confidence scores.
    No hallucination possible since output is verbatim from the source.
    """
    segments = segment_report(report_text)
    if not segments:
        return "⚠️ No audit report content is loaded. Please run verification first."

    sentences   = [s["text"] for s in segments]
    sent_embs, tfidf_vec, tfidf_mat, has_tfidf = _build_index(sentences)

    top_chunks, max_sim = _retrieve(
        question, sentences, sent_embs,
        tfidf_vec, tfidf_mat, has_tfidf, top_k
    )

    if not top_chunks or max_sim < 0.10:
        return (
            "🔍 No directly relevant content found in the report for this question. "
            "The topic may not have been covered in the audit report."
        )

    # Format as a structured extractive answer
    lines = [
        f"**Relevant excerpts from the audit report** *(similarity: {max_sim:.2f})*\n"
    ]
    for i, chunk in enumerate(top_chunks[:top_k], 1):
        lines.append(f"**{i}.** {chunk}")

    lines.append(
        "\n---\n*Answer extracted directly from the report — no AI generation involved.*"
    )
    return "\n\n".join(lines)
