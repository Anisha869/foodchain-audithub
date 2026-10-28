"""
engine_nli.py — Deep Learning NLI (Natural Language Inference) Engine for VERA.

Architecture (Cross-Encoder):
  1. RETRIEVE PHASE  — Build a TF-IDF index over the audit report sentences and
     retrieve the top-k most relevant sentences for each checklist item (same as
     the classical NLP baseline, so no GPU memory is wasted on retrieval).

  2. CLASSIFY PHASE  — For each retrieved chunk, run a cross-encoder NLI model
     (cross-encoder/nli-deberta-v3-small, ~180 MB, CPU-friendly) to get
     entailment / contradiction / neutral scores.

     Verdict logic:
       • If any chunk returns contradiction score > 0.50  → NC (non-compliant)
       • If best chunk returns entailment score > 0.55    → C  (compliant)
       • Otherwise                                        → PC (partially compliant)
     Asterisk-critical items collapse PC → NC.

  3. FALLBACK — If the cross-encoder model is not installed / cannot be loaded,
     the engine falls back to the same heuristic phrase-matching used in the NLP
     engine so the system never crashes.

Dependencies (optional — falls back gracefully if missing):
  pip install sentence-transformers   # provides CrossEncoder
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Tuple

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity as sk_cosine

from src.report_ingestion import segment_report


# ── Lazy cross-encoder loader ─────────────────────────────────────────────────
_CROSS_ENCODER = None
_CE_AVAILABLE = None          # None = not checked yet; True / False after first call


def _get_cross_encoder():
    """
    Load (and cache) the NLI cross-encoder.
    Returns the model on success, or None if the dependency is missing.
    """
    global _CROSS_ENCODER, _CE_AVAILABLE
    if _CE_AVAILABLE is not None:
        return _CROSS_ENCODER if _CE_AVAILABLE else None

    try:
        from sentence_transformers import CrossEncoder
        _CROSS_ENCODER = CrossEncoder("cross-encoder/nli-deberta-v3-small")
        _CE_AVAILABLE = True
    except Exception:
        _CROSS_ENCODER = None
        _CE_AVAILABLE = False

    return _CROSS_ENCODER


# ── Heuristic fallback (mirrors engine_nlp.py phrase banks) ──────────────────
_NEGATIVE_PHRASES = [
    "failed to", "critical non-compliance", "lacked active", "marked nc",
    "deficiency noted", "deficiency found", "violation found",
    "pest infestation", "flaking paint", "unhygienic",
    "not maintained", "not available", "not provided", "not verified",
    "was absent", "were absent", "no records", "no documentation",
    "no license", "no calibration", "expired license",
    "not compliant", "non-compliant", "missing", "absent", "failed",
    "lacking", "deficient", "inadequate", "violation", "not found",
]

_PARTIAL_PHRASES = [
    "partial implementation", "procedural gaps", "minor deficiency",
    "minor gap", "partially documented", "pending review", "in progress",
    "partially", "inconsistent", "sometimes", "limited", "needs improvement",
    "partly", "incomplete",
]


def _heuristic_classify(text: str, is_asterisk: bool) -> Tuple[str, float]:
    """Return (status, confidence) using plain phrase matching."""
    lower = text.lower()
    for phrase in _NEGATIVE_PHRASES:
        if phrase in lower:
            return "NC", 0.88
    for phrase in _PARTIAL_PHRASES:
        if phrase in lower:
            return "NC" if is_asterisk else "PC", 0.78
    return "C", 0.65


# ── TF-IDF retrieval (same approach as NLP engine) ───────────────────────────
def _retrieve_tfidf(
    question: str,
    sentences: List[str],
    vectorizer: TfidfVectorizer,
    report_vectors,
    top_k: int,
) -> Tuple[List[str], float]:
    """Retrieve top-k sentences for a question using TF-IDF cosine similarity."""
    try:
        q_vec = vectorizer.transform([question])
        sims = sk_cosine(q_vec, report_vectors)[0]
        top_idx = sims.argsort()[::-1][:top_k]
        top_chunks = [(sentences[i], float(sims[i])) for i in top_idx if sims[i] >= 0.05]
        max_sim = top_chunks[0][1] if top_chunks else 0.0
        return [t for t, _ in top_chunks], max_sim
    except Exception:
        return [], 0.0


# ── Cross-encoder NLI classification ─────────────────────────────────────────
def _nli_classify(
    question: str,
    chunks: List[str],
    model,
    is_asterisk: bool,
) -> Tuple[str, float, str]:
    """
    Run the NLI model for each chunk and aggregate verdicts.

    Returns (status, confidence, explanation_type).
    """
    best_entail = 0.0
    best_contra = 0.0
    best_neutral = 0.0

    for chunk in chunks[:4]:              # cap at 4 chunks to stay fast
        try:
            # CrossEncoder predicts [contradiction, entailment, neutral] scores
            scores = model.predict([(question, chunk)])[0]
            # DeBERTa NLI label order: contradiction=0, entailment=1, neutral=2
            contradiction = float(scores[0])
            entailment = float(scores[1])
            neutral = float(scores[2])

            if contradiction > best_contra:
                best_contra = contradiction
            if entailment > best_entail:
                best_entail = entailment
            if neutral > best_neutral:
                best_neutral = neutral
        except Exception:
            continue

    # Verdict decision tree
    if best_contra >= 0.50:
        status = "NC"
        confidence = best_contra
        ev_type = "Contradiction / Non-compliance (cross-encoder)"
    elif best_entail >= 0.55:
        if best_contra >= 0.20 and not is_asterisk:
            status = "PC"
            confidence = (best_entail + 1.0 - best_contra) / 2.0
            ev_type = "Partial entailment with minor contradiction"
        else:
            status = "C"
            confidence = best_entail
            ev_type = "Entailment / Compliance confirmed (cross-encoder)"
    elif best_neutral >= 0.50:
        status = "NC"
        confidence = best_neutral * 0.75   # neutral → low-confidence NC
        ev_type = "Neutral — topic present but no compliance signal"
    else:
        status = "NC"
        confidence = 0.50
        ev_type = "No clear NLI signal — conservative NC"

    # Asterisk-critical rule: PC → NC
    if is_asterisk and status == "PC":
        status = "NC"
        ev_type += " [asterisk-critical: PC → NC]"

    return status, round(confidence, 3), ev_type


# ── Main NLI engine ───────────────────────────────────────────────────────────
def run_nli_engine(
    checklist: List[Dict[str, Any]],
    report_text: str,
    top_k: int = 4,
) -> Dict[str, Any]:
    """
    NLI verification engine.

    Tries the cross-encoder model first; falls back to heuristic phrase matching
    if the model is unavailable (missing sentence-transformers dependency).

    Returns the same shape as engine_nlp.run_nlp_engine for UI compatibility.
    """
    model = _get_cross_encoder()
    using_model = model is not None
    engine_name = "deep_learning_nli" if using_model else "nli_heuristic_fallback"

    segments = segment_report(report_text)
    sentences = [s["text"] for s in segments]

    if not sentences:
        return {
            "success": True,
            "engine": engine_name,
            "model_available": using_model,
            "verdicts": {
                str(item.get("item_id") or item.get("itemId") or idx + 1): {
                    "status": "NC",
                    "evidence": "No report text.",
                    "faithful": True,
                    "retrieved_chunks": [],
                    "similarity_score": 0.0,
                    "confidence": 0.0,
                    "evidence_type": "Empty report",
                }
                for idx, item in enumerate(checklist)
            },
            "diagnostics": {
                "total_evaluated": len(checklist),
                "total_C": 0,
                "total_PC": 0,
                "total_NC": len(checklist),
                "total_NA": 0,
                "method": engine_name,
            },
            "advisory": "No report text was provided — all items marked NC.",
        }

    # Build TF-IDF index for retrieval
    try:
        vectorizer = TfidfVectorizer(stop_words="english", max_features=8000)
        report_vectors = vectorizer.fit_transform(sentences)
        has_tfidf = True
    except Exception:
        has_tfidf = False
        vectorizer = None
        report_vectors = None

    verdicts: Dict[str, Dict[str, Any]] = {}
    totals = {"C": 0, "PC": 0, "NC": 0, "NA": 0}

    for idx, item in enumerate(checklist):
        item_id = str(item.get("item_id") or item.get("itemId") or item.get("id") or idx + 1)
        question = str(item.get("question") or item.get("text") or "").strip()
        is_asterisk = bool(item.get("asterisk_critical") or item.get("is_asterisk"))

        if not question:
            verdicts[item_id] = {
                "status": "NC",
                "evidence": "Checklist item has no question text.",
                "faithful": True,
                "retrieved_chunks": [],
                "similarity_score": 0.0,
                "confidence": 0.0,
                "evidence_type": "No question",
            }
            totals["NC"] += 1
            continue

        # ── Retrieval ─────────────────────────────────────────────────────────
        if has_tfidf:
            top_chunks, max_sim = _retrieve_tfidf(
                question, sentences, vectorizer, report_vectors, top_k
            )
        else:
            top_chunks, max_sim = [], 0.0

        if not top_chunks or max_sim < 0.10:
            verdicts[item_id] = {
                "status": "NC",
                "evidence": "Not mentioned in the report.",
                "faithful": True,
                "retrieved_chunks": [],
                "similarity_score": round(max_sim, 3),
                "confidence": 0.30,
                "evidence_type": "Below retrieval threshold",
            }
            totals["NC"] += 1
            continue

        # ── Classification ────────────────────────────────────────────────────
        if using_model:
            status, confidence, ev_type = _nli_classify(question, top_chunks, model, is_asterisk)
        else:
            combined = " ".join(top_chunks)
            status, confidence = _heuristic_classify(combined, is_asterisk)
            ev_type = "Heuristic phrase matching (NLI model not installed)"

        evidence_text = top_chunks[0] if top_chunks else "No evidence retrieved."
        totals[status] += 1

        verdicts[item_id] = {
            "status": status,
            "evidence": f'Evidence: "{evidence_text[:400]}"',
            "faithful": True,
            "retrieved_chunks": top_chunks,
            "similarity_score": round(max_sim, 3),
            "confidence": confidence,
            "evidence_type": ev_type,
            "confidence_type": "cross_encoder_nli" if using_model else "heuristic_fallback",
        }

    return {
        "success": True,
        "engine": engine_name,
        "model_available": using_model,
        "verdicts": verdicts,
        "diagnostics": {
            "total_evaluated": len(checklist),
            "total_C": totals["C"],
            "total_PC": totals["PC"],
            "total_NC": totals["NC"],
            "total_NA": totals["NA"],
            "method": (
                "cross-encoder/nli-deberta-v3-small (Deep Learning NLI)"
                if using_model
                else "Heuristic phrase matching (install sentence-transformers for NLI)"
            ),
        },
        "advisory": (
            "Cross-encoder NLI scores are probabilities, not calibrated probabilities. "
            "Treat results as advisory; a human reviewer must verify all findings."
            if using_model
            else
            "⚠️  NLI model (cross-encoder/nli-deberta-v3-small) is not installed. "
            "Results use heuristic phrase matching — install sentence-transformers "
            "for full deep-learning NLI capability: pip install sentence-transformers"
        ),
    }
