"""
explainer.py — Explainability layer for VERA's RAG verdicts.

Implements four complementary explainability techniques, all offline and LLM-free:

  Technique 1 — Decision Trace (rule trace)
    A step-by-step log of every decision branch the classifier took.
    "Retrieved 4 chunks → max similarity 0.61 → found NC keywords [missing, not maintained]
     → no C keywords → verdict: NC"

  Technique 2 — Keyword Attribution (LIME-inspired local explanation)
    Which specific words/phrases in the retrieved evidence triggered the verdict,
    split by polarity (NC-triggering vs C-triggering).
    Includes a per-chunk contribution breakdown.

  Technique 3 — Confidence Calibration
    Multi-factor confidence score (0–1) based on:
      a. Retrieval similarity strength (40 %)
      b. Keyword signal clarity — NC vs C ratio (35 %)
      c. Evidence coverage — chunk count and evidence length (25 %)
    Confidence < 0.45 → item flagged for mandatory human review.

  Technique 4 — Counterfactual Explanation
    Template-based: "This item was marked NC because [X]. If [Y], it would be C."
    Tells auditors exactly what evidence they should look for to verify or overturn.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Tuple

# ── Keyword pattern banks (mirror engine_rag for consistency) ──────────────────
_NC_RE = re.compile(
    r'\b(not compliant|non.?compliant|not found|not maintained|absent|missing|'
    r'no record|not available|failed|not provided|lacking|deficient|inadequate|'
    r'violation|not observed|not documented|not present|not done|not checked|'
    r'not tested|not calibrated|not trained|expired|outdated|overdue|'
    r'never|nil|none|zero|no evidence|not followed|not implemented)\b',
    re.IGNORECASE
)
_PC_RE = re.compile(
    r'\b(partially|some|occasional|not always|insufficient|needs improvement|'
    r'under review|in progress|inconsistent|irregular|sometimes|mostly|'
    r'generally|few|limited|minor gap|minor issue|partly|incomplete)\b',
    re.IGNORECASE
)
_C_RE = re.compile(
    r'\b(compliant|maintained|present|available|found|recorded|documented|'
    r'observed|verified|confirmed|adequate|satisfactory|proper|correctly|'
    r'fully|complete|done|implemented|followed|certified|valid|up.to.date|'
    r'current|trained|calibrated|clean|hygienic)\b',
    re.IGNORECASE
)


# ── Data structures ────────────────────────────────────────────────────────────
@dataclass
class ChunkContribution:
    """Explainability breakdown for a single retrieved chunk."""
    rank: int
    text: str
    similarity: float
    nc_keywords: List[str]
    c_keywords: List[str]
    pc_keywords: List[str]
    polarity: str   # "NC-dominant" | "C-dominant" | "PC-signal" | "Neutral"


@dataclass
class VerdictExplanation:
    """
    Full explainability report for a single checklist item verdict.
    Serialisable to dict for storage / display.
    """
    item_id: str
    question: str
    final_verdict: str                      # C / PC / NC / NA
    confidence: float                       # 0.0 – 1.0
    confidence_label: str                   # "High" | "Medium" | "Low"
    needs_human_review: bool

    # Technique 1 — Decision Trace
    decision_trace: List[str]               # ordered list of reasoning steps

    # Technique 2 — Keyword Attribution
    nc_keywords_found: List[str]
    c_keywords_found: List[str]
    pc_keywords_found: List[str]
    chunk_contributions: List[ChunkContribution]

    # Technique 3 — Confidence breakdown
    similarity_score: float
    sim_confidence: float
    keyword_clarity: float
    coverage_score: float

    # Technique 4 — Counterfactual
    counterfactual: str
    what_would_change: str                  # short actionable phrase for auditor

    # Meta
    uncertainty_reasons: List[str]          # why we're uncertain (if any)


def _extract_keywords(text: str) -> Tuple[List[str], List[str], List[str]]:
    """Return (nc_keywords, c_keywords, pc_keywords) found in text."""
    nc = [m.group().lower() for m in _NC_RE.finditer(text)]
    c  = [m.group().lower() for m in _C_RE.finditer(text)]
    pc = [m.group().lower() for m in _PC_RE.finditer(text)]
    return nc, c, pc


def _chunk_polarity(nc: List[str], c: List[str], pc: List[str]) -> str:
    if nc and not c:
        return "NC-dominant"
    if c and not nc:
        return "C-dominant"
    if pc and not nc and not c:
        return "PC-signal"
    if nc and c:
        return "Contradictory"
    return "Neutral"


# ── Confidence computation (Technique 3) ──────────────────────────────────────
def _compute_confidence(
    sim_score: float,
    nc_count: int,
    c_count: int,
    pc_count: int,
    n_chunks: int,
    evidence_len: int,
) -> Tuple[float, float, float, float]:
    """
    Returns (overall_confidence, sim_conf, keyword_clarity, coverage_score).
    All values in [0, 1].
    """
    # (a) Similarity confidence — sigmoid-like mapping
    sim_conf = min(1.0, sim_score / 0.75)

    # (b) Keyword signal clarity — how unambiguous is the keyword signal?
    total_kw = nc_count + c_count + pc_count
    if total_kw == 0:
        kw_clarity = 0.25   # no signal → low clarity
    else:
        dominant = max(nc_count, c_count)
        kw_clarity = dominant / total_kw   # 1.0 = all same polarity

    # (c) Evidence coverage — more chunks + longer evidence → more confident
    chunk_score   = min(1.0, n_chunks / 4.0)
    length_score  = min(1.0, evidence_len / 300.0)
    coverage      = (chunk_score + length_score) / 2.0

    overall = 0.40 * sim_conf + 0.35 * kw_clarity + 0.25 * coverage
    return round(overall, 3), round(sim_conf, 3), round(kw_clarity, 3), round(coverage, 3)


def _confidence_label(score: float) -> str:
    if score >= 0.70:
        return "High"
    if score >= 0.45:
        return "Medium"
    return "Low"


# ── Decision trace builder (Technique 1) ─────────────────────────────────────
def _build_decision_trace(
    item: Dict[str, Any],
    verdict: Dict[str, Any],
    nc_kw: List[str],
    c_kw: List[str],
    pc_kw: List[str],
    confidence: float,
) -> List[str]:
    sim   = verdict.get("similarity_score", 0.0)
    n_ch  = len(verdict.get("retrieved_chunks", []))
    status = verdict.get("status", "NC")
    is_ast = item.get("asterisk_critical", False)

    trace = []
    trace.append(f"Step 1 — Retrieved {n_ch} relevant chunks from report "
                 f"(max semantic similarity: {sim:.3f})")

    if sim < 0.20:
        trace.append("Step 2 — Similarity below threshold (0.20): topic not addressed in report → NC")
        return trace

    trace.append(f"Step 2 — Keyword scan across retrieved chunks:")
    if nc_kw:
        trace.append(f"         ✗ NC keywords found: {', '.join(set(nc_kw[:6]))}")
    if c_kw:
        trace.append(f"         ✓ C keywords found:  {', '.join(set(c_kw[:6]))}")
    if pc_kw:
        trace.append(f"         ~ PC keywords found: {', '.join(set(pc_kw[:6]))}")
    if not (nc_kw or c_kw or pc_kw):
        trace.append("         No compliance keywords found — conservative NC applied")

    # Decision logic
    if nc_kw and not c_kw:
        trace.append("Step 3 — NC keywords dominate with no C signal → verdict: NC")
    elif c_kw and not nc_kw:
        if pc_kw and not is_ast:
            trace.append("Step 3 — C keywords present but PC signal also found → verdict: PC")
        else:
            trace.append("Step 3 — C keywords present, no NC or PC signal → verdict: C")
    elif nc_kw and c_kw:
        trace.append("Step 3 — Mixed signals (both NC and C keywords found)")
        if len(nc_kw) >= len(c_kw):
            trace.append("         NC count ≥ C count → verdict: NC")
        else:
            trace.append("         C count > NC count → verdict: C")
    else:
        trace.append("Step 3 — No keyword signal; TF-IDF coverage used → conservative NC")

    if is_ast and status == "NC":
        trace.append("Step 4 — ★ Asterisk-critical item: PC → NC rule enforced (critical items cannot be Partial Compliance)")

    trace.append(
        f"Step 5 — Confidence calibration: {_confidence_label(confidence)} "
        f"({confidence*100:.0f}%) based on similarity + keyword clarity + evidence coverage"
    )
    return trace


# ── Counterfactual generator (Technique 4) ────────────────────────────────────
def _build_counterfactual(
    item: Dict[str, Any],
    verdict: Dict[str, Any],
    nc_kw: List[str],
    c_kw: List[str],
) -> Tuple[str, str]:
    """Returns (counterfactual_sentence, what_would_change)."""
    status  = verdict.get("status", "NC")
    q_short = item["question"][:80] + ("…" if len(item["question"]) > 80 else "")
    is_ast  = item.get("asterisk_critical", False)

    if status == "NC":
        if nc_kw:
            nc_examples = ", ".join(set(nc_kw[:3]))
            cf = (
                f'This item was marked **Non-Compliant** because the report contains '
                f'non-compliance language ({nc_examples}). If the audit report instead '
                f'documented clear compliance evidence — such as records maintained, '
                f'procedures verified, or tests completed — this item would be classified as C.'
            )
            change = "Provide documented evidence of compliance (records, logs, or test results)."
        elif not c_kw:
            cf = (
                f'This item was marked **Non-Compliant** because the topic '
                f'"{q_short}" was not addressed in the audit report. '
                f'Including explicit evidence of compliance in the report would change this to C.'
            )
            change = "Include this topic explicitly in the audit report with supporting evidence."
        else:
            cf = (
                f'This item was marked **Non-Compliant** due to insufficient or ambiguous '
                f'evidence. A clearer, more specific compliance statement in the report '
                f'would change this verdict to C.'
            )
            change = "Provide specific, unambiguous evidence of compliance."

    elif status == "PC":
        cf = (
            f'This item was marked **Partially Compliant** because the report indicates '
            f'partial or inconsistent compliance. Complete and consistent compliance '
            f'evidence would change this to C. '
            + ("Note: as this is an asterisk-critical item, PC is automatically collapsed to NC." if is_ast else "")
        )
        change = "Resolve incomplete or inconsistent compliance gaps and document them."

    elif status == "C":
        if nc_kw:
            cf = (
                f'This item is currently **Compliant** but the evidence also contains '
                f'some non-compliance language ({", ".join(set(nc_kw[:2]))}). '
                f'If those concerns are not addressed, re-audit may result in NC.'
            )
            change = "Review and address the minor non-compliance signals found in the evidence."
        else:
            cf = (
                f'This item is **Compliant**. If the compliance evidence '
                f'(e.g., records, verification logs) were missing or disputed, '
                f'it would be reclassified as NC.'
            )
            change = "Maintain current compliance records to preserve this status."
    else:
        cf = "Item marked Not Applicable — not evaluated."
        change = "Confirm this item is genuinely not applicable to this facility type."

    return cf, change


# ── Main public function ──────────────────────────────────────────────────────
def explain_verdict(
    item: Dict[str, Any],
    verdict: Dict[str, Any],
) -> VerdictExplanation:
    """
    Generate a full VerdictExplanation for one checklist item.

    Args:
        item:    One FSSAI checklist item dict (with item_id, question, asterisk_critical…)
        verdict: Output from run_rag_engine for this item_id

    Returns:
        VerdictExplanation dataclass
    """
    it_id   = item["item_id"]
    q_text  = item["question"]
    status  = verdict.get("status", "NC")
    chunks  = verdict.get("retrieved_chunks", [])
    sim     = verdict.get("similarity_score", 0.0)

    # Aggregate keywords across all chunks
    all_nc, all_c, all_pc = [], [], []
    chunk_contributions: List[ChunkContribution] = []

    for rank, chunk in enumerate(chunks, 1):
        nc, c, pc = _extract_keywords(chunk)
        all_nc.extend(nc)
        all_c.extend(c)
        all_pc.extend(pc)
        chunk_contributions.append(ChunkContribution(
            rank=rank,
            text=chunk[:200],
            similarity=sim if rank == 1 else sim * (0.9 ** (rank - 1)),   # approximate decay
            nc_keywords=nc,
            c_keywords=c,
            pc_keywords=pc,
            polarity=_chunk_polarity(nc, c, pc),
        ))

    # Evidence length for coverage score
    evidence_text = verdict.get("evidence", "")
    evidence_len  = len(evidence_text.replace("Evidence:", "").strip())

    # Confidence
    conf, sim_conf, kw_clarity, coverage = _compute_confidence(
        sim, len(all_nc), len(all_c), len(all_pc), len(chunks), evidence_len
    )
    conf_label = _confidence_label(conf)

    # Uncertainty reasons
    uncertainty_reasons: List[str] = []
    if sim < 0.35:
        uncertainty_reasons.append(f"Low retrieval similarity ({sim:.3f}) — relevant text may be sparse")
    if all_nc and all_c:
        uncertainty_reasons.append("Mixed NC and C keywords — the report contains contradictory evidence")
    if kw_clarity < 0.50:
        uncertainty_reasons.append("Weak keyword signal — no clear compliance or non-compliance language")
    if len(chunks) < 2:
        uncertainty_reasons.append("Only 1 chunk retrieved — verdict based on limited context")

    needs_review = conf < 0.45 or bool(all_nc and all_c) or (item.get("asterisk_critical") and conf < 0.65)

    # Decision trace
    trace = _build_decision_trace(item, verdict, all_nc, all_c, all_pc, conf)

    # Counterfactual
    counterfactual, what_would_change = _build_counterfactual(item, verdict, all_nc, all_c)

    return VerdictExplanation(
        item_id=it_id,
        question=q_text,
        final_verdict=status,
        confidence=conf,
        confidence_label=conf_label,
        needs_human_review=needs_review,
        decision_trace=trace,
        nc_keywords_found=list(set(all_nc)),
        c_keywords_found=list(set(all_c)),
        pc_keywords_found=list(set(all_pc)),
        chunk_contributions=chunk_contributions,
        similarity_score=sim,
        sim_confidence=sim_conf,
        keyword_clarity=kw_clarity,
        coverage_score=coverage,
        counterfactual=counterfactual,
        what_would_change=what_would_change,
        uncertainty_reasons=uncertainty_reasons,
    )


def explain_all_verdicts(
    checklist: List[Dict[str, Any]],
    verdicts: Dict[str, Dict[str, Any]],
) -> Dict[str, VerdictExplanation]:
    """Run explain_verdict for every item. Returns {item_id → VerdictExplanation}."""
    return {
        item["item_id"]: explain_verdict(item, verdicts.get(item["item_id"], {"status": "NC"}))
        for item in checklist
    }


def get_items_needing_review(
    explanations: Dict[str, "VerdictExplanation"]
) -> List["VerdictExplanation"]:
    """Returns explanations where the system is uncertain and a human must review."""
    return [exp for exp in explanations.values() if exp.needs_human_review]
