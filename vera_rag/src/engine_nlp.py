"""Classical TF-IDF baseline for checklist evidence matching."""

from typing import Any, Dict, List

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from src.report_ingestion import segment_report


def run_nlp_engine(
    checklist: List[Dict[str, Any]],
    report_text: str,
    top_k: int = 4,
) -> Dict[str, Any]:
    segments = segment_report(report_text)
    sentences = [segment["text"] for segment in segments]
    if not sentences:
        return {
            "success": True,
            "engine": "classical_nlp",
            "verdicts": {
                str(item.get("item_id") or item.get("itemId") or index + 1): {
                    "status": "NC",
                    "evidence": "No report text.",
                    "faithful": True,
                    "retrieved_chunks": [],
                    "similarity_score": 0.0,
                    "missing_evidence": True,
                }
                for index, item in enumerate(checklist)
            },
            "diagnostics": {
                "total_evaluated": len(checklist),
                "total_C": 0,
                "total_PC": 0,
                "total_NC": len(checklist),
                "total_NA": 0,
                "method": "TF-IDF cosine similarity and lexical indicators",
            },
        }

    vectorizer = TfidfVectorizer(stop_words="english", max_features=8000)
    try:
        report_vectors = vectorizer.fit_transform(sentences)
    except ValueError:
        vectorizer = TfidfVectorizer(
            analyzer="char_wb",
            ngram_range=(2, 4),
            max_features=8000,
        )
        report_vectors = vectorizer.fit_transform(sentences)
    verdicts: Dict[str, Dict[str, Any]] = {}
    totals = {"C": 0, "PC": 0, "NC": 0, "NA": 0}

    for index, item in enumerate(checklist):
        item_id = str(item.get("item_id") or item.get("itemId") or item.get("id") or index + 1)
        question = str(item.get("question") or item.get("text") or "").strip()
        if not question:
            verdicts[item_id] = {
                "status": "NC",
                "evidence": "Checklist item has no question text.",
                "faithful": True,
                "retrieved_chunks": [],
                "similarity_score": 0.0,
                "missing_evidence": True,
            }
            totals["NC"] += 1
            continue

        question_vector = vectorizer.transform([question])
        similarities = cosine_similarity(question_vector, report_vectors)[0]
        selected_indices = similarities.argsort()[::-1][:top_k]
        selected = [
            (sentences[index], float(similarities[index]))
            for index in selected_indices
            if similarities[index] >= 0.08
        ]
        top_similarity = selected[0][1] if selected else 0.0
        evidence = [text for text, _ in selected]
        combined = " ".join(evidence).lower()
        has_negative = any(
            phrase in combined
            for phrase in ("not compliant", "non-compliant", "not maintained", "missing", "failed", "not available", "not found")
        )
        has_partial = any(
            phrase in combined
            for phrase in ("partially", "inconsistent", "sometimes", "limited", "in progress", "needs improvement")
        )

        if not evidence or top_similarity < 0.12:
            status = "NC"
        elif has_negative:
            status = "NC"
        elif has_partial:
            status = "PC"
        else:
            status = "C" if top_similarity >= 0.25 else "PC"

        verdicts[item_id] = {
            "status": status,
            "evidence": f'Evidence: "{evidence[0]}"' if evidence else "No directly matched report evidence.",
            "faithful": True,
            "retrieved_chunks": evidence,
            "similarity_score": round(top_similarity, 3),
            "missing_evidence": not bool(evidence),
            "confidence": round(top_similarity, 3),
            "confidence_type": "uncalibrated_similarity",
        }
        totals[status] += 1

    return {
        "success": True,
        "engine": "classical_nlp",
        "verdicts": verdicts,
        "diagnostics": {
            "total_evaluated": len(checklist),
            "total_C": totals["C"],
            "total_PC": totals["PC"],
            "total_NC": totals["NC"],
            "total_NA": totals["NA"],
            "method": "TF-IDF cosine similarity and lexical indicators",
        },
        "advisory": "Baseline only. Similarity and confidence are uncalibrated; verify all evidence manually.",
    }
