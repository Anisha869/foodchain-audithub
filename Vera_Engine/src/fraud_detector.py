"""
fraud_detector.py — Audit fraud & anomaly detection for VERA.

Implements the evidence-first, LLM-free checks recommended by the USP
Food Fraud Mitigation framework and Module 4 / Module 5 of the second-party
audit research:

  Signal 1  — Contradiction detection
              NC keywords present in evidence but verdict is C (or vice versa)

  Signal 2  — Evidence reuse / copy-paste
              Same retrieved chunk cited for many different checklist items
              (lazy audit or bot-generated report)

  Signal 3  — Suspicious uniformity (all-pass)
              >85 % of items marked C — statistically rare for real-world audits

  Signal 4  — Sparse evidence on critical items
              Asterisk-critical (★) items with very short or missing evidence

  Signal 5  — Similarity score uniformity
              All items have nearly identical retrieval scores — possible that
              a generic, non-specific report is being force-matched

  Signal 6  — Report text quality
              Extremely short report (too few unique sentences) relative to the
              number of checklist items; high repetition rate in report prose

Each signal produces a 0–100 severity score and a human-readable flag string.
The composite risk score is a configurable weighted sum of signal severities.
"""

from __future__ import annotations

import re
import math
from collections import Counter
from typing import Dict, List, Any, Tuple

# ── Signal weights (must sum to 1.0) ──────────────────────────────────────────
_WEIGHTS = {
    "contradiction":       0.25,
    "evidence_reuse":      0.20,
    "all_pass":            0.20,
    "sparse_critical":     0.20,
    "sim_uniformity":      0.08,
    "report_quality":      0.07,
}

# ── NC / C keyword patterns (shared with engine_rag) ─────────────────────────
_NC_RE = re.compile(
    r'\b(not compliant|non.?compliant|not found|not maintained|absent|missing|'
    r'no record|not available|failed|not provided|lacking|deficient|inadequate|'
    r'violation|not observed|not documented|not present|not done|not checked|'
    r'not tested|not calibrated|not trained|expired|outdated|overdue|'
    r'never|nil|none|zero|no evidence|not followed|not implemented)\b',
    re.IGNORECASE
)
_C_RE = re.compile(
    r'\b(compliant|maintained|present|available|found|recorded|documented|'
    r'observed|verified|confirmed|adequate|satisfactory|proper|correctly|'
    r'fully|complete|done|implemented|followed|certified|valid|up.to.date|'
    r'current|trained|calibrated|clean|hygienic)\b',
    re.IGNORECASE
)


# ═══════════════════════════════════════════════════════════════════════════════
# Signal functions — each returns (severity: 0-100, flags: list[str])
# ═══════════════════════════════════════════════════════════════════════════════

def _signal_contradiction(
    checklist: List[Dict[str, Any]],
    verdicts: Dict[str, Dict[str, Any]],
) -> Tuple[float, List[str]]:
    """
    NC keywords in retrieved evidence but verdict is C → contradiction.
    C keywords in retrieved evidence but verdict is NC → potential over-penalisation.
    """
    contradiction_items: List[str] = []
    for item in checklist:
        iid    = item["item_id"]
        v      = verdicts.get(iid, {})
        status = v.get("status", "NC")
        chunks = v.get("retrieved_chunks", [])
        if not chunks:
            continue

        combined = " ".join(chunks)
        has_nc   = bool(_NC_RE.search(combined))
        has_c    = bool(_C_RE.search(combined))

        if status == "C" and has_nc and not has_c:
            contradiction_items.append(f"[{iid}] Marked C but evidence contains NC language")
        elif status == "NC" and has_c and not has_nc:
            contradiction_items.append(f"[{iid}] Marked NC but evidence contains compliant language")

    severity = min(100.0, len(contradiction_items) * 15.0)
    return severity, contradiction_items


def _signal_evidence_reuse(
    verdicts: Dict[str, Dict[str, Any]],
    threshold: int = 3,
) -> Tuple[float, List[str]]:
    """
    If the exact same sentence appears as the top evidence for ≥threshold items,
    it may indicate a copy-pasted report or that a single generic statement is
    being used to justify compliance across many items.
    """
    chunk_usage: Counter = Counter()
    for v in verdicts.values():
        chunks = v.get("retrieved_chunks", [])
        if chunks:
            # Use the first (highest-ranked) chunk as the primary evidence
            key = chunks[0].strip()[:120]   # normalise length
            chunk_usage[key] += 1

    flagged = [(chunk, cnt) for chunk, cnt in chunk_usage.items() if cnt >= threshold]
    flagged_msgs = [
        f'Sentence reused as top evidence for {cnt} items: "{chunk[:80]}…"'
        for chunk, cnt in sorted(flagged, key=lambda x: -x[1])
    ]

    severity = min(100.0, sum(cnt - (threshold - 1) for _, cnt in flagged) * 12.0)
    return severity, flagged_msgs


def _signal_all_pass(
    verdicts: Dict[str, Dict[str, Any]],
    threshold: float = 0.85,
) -> Tuple[float, List[str]]:
    """
    If >threshold fraction of items are C, flag as suspiciously high.
    Real FSSAI audits rarely yield >85 % compliance on a first audit.
    """
    if not verdicts:
        return 0.0, []
    n_c    = sum(1 for v in verdicts.values() if v.get("status") == "C")
    ratio  = n_c / len(verdicts)
    flags: List[str] = []
    if ratio >= threshold:
        flags.append(
            f"{n_c}/{len(verdicts)} items ({ratio*100:.1f}%) marked Compliant — "
            f"statistically rare for a real-world FSSAI audit."
        )
    severity = max(0.0, (ratio - threshold) / (1.0 - threshold) * 100.0)
    return severity, flags


def _signal_sparse_critical(
    checklist: List[Dict[str, Any]],
    verdicts: Dict[str, Dict[str, Any]],
    min_evidence_chars: int = 40,
) -> Tuple[float, List[str]]:
    """
    Asterisk-critical (★) items with very short or absent evidence.
    Short evidence on critical items is a high-risk signal: the auditor cannot
    verify compliance without meaningful supporting text.
    """
    flags: List[str] = []
    for item in checklist:
        if not item.get("asterisk_critical", False):
            continue
        iid      = item["item_id"]
        v        = verdicts.get(iid, {})
        evidence = v.get("evidence", "")
        chunks   = v.get("retrieved_chunks", [])

        evidence_body = evidence.replace("Evidence:", "").replace('"', "").strip()
        if len(evidence_body) < min_evidence_chars and not chunks:
            flags.append(
                f"★ Critical item [{iid}] has sparse/absent evidence: "
                f'"{evidence_body[:60] or "(none)"}"'
            )

    severity = min(100.0, len(flags) * 20.0)
    return severity, flags


def _signal_sim_uniformity(
    verdicts: Dict[str, Dict[str, Any]],
    uniformity_threshold: float = 0.05,
) -> Tuple[float, List[str]]:
    """
    If all retrieval similarity scores are bunched within a narrow band,
    it suggests the report is too generic or does not specifically address
    the checklist topics.
    """
    scores = [
        v.get("similarity_score", 0.0)
        for v in verdicts.values()
        if v.get("similarity_score", 0.0) > 0.0
    ]
    if len(scores) < 4:
        return 0.0, []

    import statistics
    stdev = statistics.stdev(scores)
    flags: List[str] = []
    if stdev < uniformity_threshold:
        flags.append(
            f"Retrieval similarity scores are suspiciously uniform "
            f"(std-dev={stdev:.4f}). The report may be too generic."
        )
    severity = max(0.0, (uniformity_threshold - stdev) / uniformity_threshold * 60.0)
    return severity, flags


def _signal_report_quality(
    report_text: str,
    n_checklist_items: int,
) -> Tuple[float, List[str]]:
    """
    Report quality checks:
      a. Too short relative to the number of checklist items.
      b. High intra-report sentence repetition (copy-paste prose).
    """
    flags: List[str] = []

    sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', report_text) if len(s.strip()) > 10]
    unique    = set(s.lower()[:80] for s in sentences)

    # a. Sparse report
    words_per_item = len(report_text.split()) / max(n_checklist_items, 1)
    if words_per_item < 8:
        flags.append(
            f"Report is very sparse: ~{words_per_item:.1f} words per checklist item "
            f"({len(report_text.split())} words total for {n_checklist_items} items)."
        )

    # b. High repetition
    if sentences:
        repetition_rate = 1.0 - (len(unique) / len(sentences))
        if repetition_rate > 0.40:
            flags.append(
                f"High sentence repetition in report ({repetition_rate*100:.1f}%). "
                f"Possible copy-paste content."
            )

    severity = min(100.0, len(flags) * 35.0)
    return severity, flags


# ═══════════════════════════════════════════════════════════════════════════════
# Public API
# ═══════════════════════════════════════════════════════════════════════════════

def compute_fraud_risk(
    checklist: List[Dict[str, Any]],
    verdicts: Dict[str, Dict[str, Any]],
    report_text: str,
) -> Dict[str, Any]:
    """
    Run all six fraud/anomaly signals and combine into a composite risk report.

    Returns a dict:
        {
          "composite_score": float,       # 0–100
          "risk_level": str,              # "Low" | "Medium" | "High" | "Critical"
          "signals": {
            "<signal_name>": {
              "severity": float,
              "flags": [str, …]
            },
            …
          },
          "all_flags": [str, …],          # flat list of all flag messages
          "recommendation": str,
        }
    """
    signals = {}

    sev1, flags1 = _signal_contradiction(checklist, verdicts)
    signals["contradiction"] = {"severity": sev1, "flags": flags1}

    sev2, flags2 = _signal_evidence_reuse(verdicts)
    signals["evidence_reuse"] = {"severity": sev2, "flags": flags2}

    sev3, flags3 = _signal_all_pass(verdicts)
    signals["all_pass"] = {"severity": sev3, "flags": flags3}

    sev4, flags4 = _signal_sparse_critical(checklist, verdicts)
    signals["sparse_critical"] = {"severity": sev4, "flags": flags4}

    sev5, flags5 = _signal_sim_uniformity(verdicts)
    signals["sim_uniformity"] = {"severity": sev5, "flags": flags5}

    sev6, flags6 = _signal_report_quality(report_text, len(checklist))
    signals["report_quality"] = {"severity": sev6, "flags": flags6}

    composite = sum(
        _WEIGHTS[name] * info["severity"]
        for name, info in signals.items()
    )
    composite = round(min(100.0, composite), 1)

    if composite >= 70:
        risk_level    = "Critical"
        recommendation = (
            "🚨 Escalate immediately for independent on-site re-inspection. "
            "Do not accept this audit report without supervisor review and additional evidence."
        )
    elif composite >= 45:
        risk_level    = "High"
        recommendation = (
            "⚠️ Request supplementary evidence for flagged items. "
            "Consider a targeted re-audit of high-risk sections before accepting compliance."
        )
    elif composite >= 20:
        risk_level    = "Medium"
        recommendation = (
            "🔶 Verify flagged items with the auditor. "
            "Some inconsistencies detected — routine follow-up recommended."
        )
    else:
        risk_level    = "Low"
        recommendation = (
            "✅ No major anomalies detected. "
            "Standard audit review process can proceed."
        )

    all_flags = [f for info in signals.values() for f in info["flags"]]

    return {
        "composite_score": composite,
        "risk_level": risk_level,
        "signals": signals,
        "all_flags": all_flags,
        "recommendation": recommendation,
    }
