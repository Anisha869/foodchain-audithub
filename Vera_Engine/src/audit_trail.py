"""
audit_trail.py — Accountability and responsibility layer for VERA.

Implements:
  1. Session Provenance    — every verification run is stamped with a
                             unique session ID, timestamp, input hash,
                             model version and full configuration.

  2. Auditor Override Log  — an auditor can change a system verdict with a
                             mandatory justification. All overrides are
                             immutably appended to a JSONL log file.
                             Original system verdict is always preserved.

  3. Uncertainty Escalation — items flagged by the explainer as low-confidence
                              are logged for mandatory supervisor review.

  4. Accountability Report  — a structured JSON/text export of the full
                              decision chain: provenance → verdicts →
                              explanations → overrides → fraud signals.
                              Suitable for inclusion in the audit dossier.
"""

from __future__ import annotations

import json
import os
import hashlib
import datetime
import uuid
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Any, Optional


# ── Constants ─────────────────────────────────────────────────────────────────
_LOG_DIR       = "audit_logs"
_OVERRIDE_LOG  = os.path.join(_LOG_DIR, "overrides.jsonl")
_SESSION_LOG   = os.path.join(_LOG_DIR, "sessions.jsonl")
_VERA_VERSION  = "2.0.0-offline-rag"


# ── Data structures ────────────────────────────────────────────────────────────
@dataclass
class OverrideRecord:
    """Immutable record of an auditor overriding a system verdict."""
    override_id:     str
    session_id:      str
    timestamp:       str
    item_id:         str
    question:        str
    system_verdict:  str          # original system output (preserved)
    auditor_verdict: str          # human-set verdict
    justification:   str          # mandatory free-text reason
    auditor_name:    str
    auditor_role:    str          # e.g. "Lead Auditor", "Supervisor"


@dataclass
class SessionRecord:
    """Provenance record for a single verification run."""
    session_id:       str
    timestamp:        str
    vera_version:     str
    category:         str
    top_k:            int
    report_hash:      str         # SHA-256 of report text
    report_length:    int
    n_checklist_items: int
    n_verdicts:       int
    n_c:              int
    n_pc:             int
    n_nc:             int
    n_na:             int
    fraud_risk_score: float
    fraud_risk_level: str
    n_items_for_review: int
    config:           Dict[str, Any] = field(default_factory=dict)


# ── Helper functions ───────────────────────────────────────────────────────────
def _sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _now_iso() -> str:
    return datetime.datetime.now().isoformat(timespec="seconds")


def _ensure_log_dir():
    os.makedirs(_LOG_DIR, exist_ok=True)


def _append_jsonl(path: str, record: dict):
    _ensure_log_dir()
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")


# ═══════════════════════════════════════════════════════════════════════════════
# 1. Session Provenance
# ═══════════════════════════════════════════════════════════════════════════════

def create_session(
    category: str,
    report_text: str,
    checklist: List[Dict[str, Any]],
    verdicts: Dict[str, Dict[str, Any]],
    fraud_result: Dict[str, Any],
    explanations: Dict[str, Any],    # Dict[str, VerdictExplanation] from explainer
    top_k: int = 4,
    extra_config: Optional[Dict[str, Any]] = None,
) -> SessionRecord:
    """Create and persist a provenance record for this verification run."""
    statuses = [v.get("status", "NC") for v in verdicts.values()]
    n_review = sum(1 for exp in explanations.values() if getattr(exp, "needs_human_review", False))

    record = SessionRecord(
        session_id        = str(uuid.uuid4()),
        timestamp         = _now_iso(),
        vera_version      = _VERA_VERSION,
        category          = category,
        top_k             = top_k,
        report_hash       = _sha256(report_text),
        report_length     = len(report_text),
        n_checklist_items = len(checklist),
        n_verdicts        = len(verdicts),
        n_c               = statuses.count("C"),
        n_pc              = statuses.count("PC"),
        n_nc              = statuses.count("NC"),
        n_na              = statuses.count("NA"),
        fraud_risk_score  = fraud_result.get("composite_score", 0.0),
        fraud_risk_level  = fraud_result.get("risk_level", "Unknown"),
        n_items_for_review= n_review,
        config            = extra_config or {},
    )
    _append_jsonl(_SESSION_LOG, asdict(record))
    return record


# ═══════════════════════════════════════════════════════════════════════════════
# 2. Auditor Override Log
# ═══════════════════════════════════════════════════════════════════════════════

def record_override(
    session_id:      str,
    item_id:         str,
    question:        str,
    system_verdict:  str,
    auditor_verdict: str,
    justification:   str,
    auditor_name:    str,
    auditor_role:    str = "Auditor",
) -> OverrideRecord:
    """
    Immutably log an auditor's override of a system verdict.
    The system verdict is always preserved — it is never deleted or rewritten.
    """
    if not justification.strip():
        raise ValueError("Justification is mandatory for every override.")
    if auditor_verdict not in ("C", "PC", "NC", "NA"):
        raise ValueError(f"Invalid verdict: {auditor_verdict}. Must be C, PC, NC, or NA.")

    rec = OverrideRecord(
        override_id    = str(uuid.uuid4()),
        session_id     = session_id,
        timestamp      = _now_iso(),
        item_id        = item_id,
        question       = question,
        system_verdict = system_verdict,
        auditor_verdict= auditor_verdict,
        justification  = justification.strip(),
        auditor_name   = auditor_name.strip() or "Anonymous",
        auditor_role   = auditor_role.strip() or "Auditor",
    )
    _append_jsonl(_OVERRIDE_LOG, asdict(rec))
    return rec


def load_overrides(session_id: Optional[str] = None) -> List[OverrideRecord]:
    """Load all overrides, optionally filtered to a session."""
    if not os.path.exists(_OVERRIDE_LOG):
        return []
    records = []
    with open(_OVERRIDE_LOG, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                d = json.loads(line)
                if session_id is None or d.get("session_id") == session_id:
                    records.append(OverrideRecord(**d))
            except Exception:
                pass
    return records


# ═══════════════════════════════════════════════════════════════════════════════
# 3. Uncertainty Escalation
# ═══════════════════════════════════════════════════════════════════════════════

def get_escalation_report(
    explanations: Dict[str, Any],   # Dict[str, VerdictExplanation]
    overrides: List[OverrideRecord],
) -> Dict[str, Any]:
    """
    Produces a structured escalation report:
    - Items that still need human review (not yet overridden)
    - Items that have been resolved via override
    """
    overridden_ids = {o.item_id for o in overrides}
    pending = [
        {
            "item_id": exp.item_id,
            "question": exp.question[:100],
            "system_verdict": exp.final_verdict,
            "confidence": exp.confidence,
            "confidence_label": exp.confidence_label,
            "uncertainty_reasons": exp.uncertainty_reasons,
        }
        for exp in explanations.values()
        if getattr(exp, "needs_human_review", False) and exp.item_id not in overridden_ids
    ]

    resolved = [
        {
            "item_id": o.item_id,
            "system_verdict": o.system_verdict,
            "auditor_verdict": o.auditor_verdict,
            "auditor_name": o.auditor_name,
            "justification": o.justification,
            "timestamp": o.timestamp,
        }
        for o in overrides
    ]

    return {
        "total_flagged": len(pending) + len(resolved),
        "pending_review": pending,
        "resolved_by_override": resolved,
        "escalation_complete": len(pending) == 0,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 4. Accountability Report
# ═══════════════════════════════════════════════════════════════════════════════

def build_accountability_report(
    session: SessionRecord,
    checklist: List[Dict[str, Any]],
    verdicts: Dict[str, Dict[str, Any]],
    explanations: Dict[str, Any],
    fraud_result: Dict[str, Any],
    overrides: List[OverrideRecord],
    scoring: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Build a complete, structured accountability report for this verification run.
    This is the full audit dossier — every decision is traceable.

    Structure:
      provenance → configuration → scoring_summary → fraud_analysis →
      item_decisions (verdict + explanation + override if any) → escalations
    """
    override_map = {o.item_id: o for o in overrides}

    item_decisions = []
    for item in checklist:
        iid  = item["item_id"]
        v    = verdicts.get(iid, {"status": "NC"})
        exp  = explanations.get(iid)
        ovr  = override_map.get(iid)

        effective_verdict = ovr.auditor_verdict if ovr else v.get("status", "NC")

        decision = {
            "item_id":          iid,
            "section":          item.get("section", ""),
            "question":         item["question"],
            "asterisk_critical":item.get("asterisk_critical", False),
            "weight":           item.get("weight", 2),
            "system_verdict":   v.get("status", "NC"),
            "effective_verdict":effective_verdict,
            "evidence_cited":   v.get("evidence", ""),
            "similarity_score": v.get("similarity_score", 0.0),
        }

        if exp:
            decision["confidence"]         = exp.confidence
            decision["confidence_label"]   = exp.confidence_label
            decision["needs_human_review"] = exp.needs_human_review
            decision["decision_trace"]     = exp.decision_trace
            decision["nc_keywords"]        = exp.nc_keywords_found
            decision["c_keywords"]         = exp.c_keywords_found
            decision["counterfactual"]     = exp.counterfactual
            decision["what_would_change"]  = exp.what_would_change
            decision["uncertainty_reasons"]= exp.uncertainty_reasons

        if ovr:
            decision["override"] = {
                "auditor_name":    ovr.auditor_name,
                "auditor_role":    ovr.auditor_role,
                "auditor_verdict": ovr.auditor_verdict,
                "justification":   ovr.justification,
                "timestamp":       ovr.timestamp,
            }

        item_decisions.append(decision)

    return {
        "report_metadata": {
            "title":      "VERA Audit Accountability Report",
            "vera_version": session.vera_version,
            "generated_at": _now_iso(),
        },
        "provenance": asdict(session),
        "scoring_summary": {
            "total_awarded":   scoring.get("total_awarded"),
            "total_max":       scoring.get("total_max"),
            "percentage":      scoring.get("percentage"),
            "grade":           scoring.get("grade"),
            "status_label":    scoring.get("status_label"),
            "asterisk_failures": scoring.get("asterisk_failures", []),
        },
        "fraud_analysis": {
            "composite_score": fraud_result.get("composite_score"),
            "risk_level":      fraud_result.get("risk_level"),
            "recommendation":  fraud_result.get("recommendation"),
            "flags":           fraud_result.get("all_flags", []),
        },
        "item_decisions": item_decisions,
        "total_overrides": len(overrides),
        "items_still_pending_review": sum(
            1 for d in item_decisions
            if d.get("needs_human_review") and "override" not in d
        ),
    }


def export_accountability_report_json(report: Dict[str, Any]) -> str:
    """Serialize accountability report to a pretty-printed JSON string."""
    return json.dumps(report, indent=2, ensure_ascii=False, default=str)
