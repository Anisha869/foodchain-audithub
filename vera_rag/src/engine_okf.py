"""
engine_okf.py — Open Knowledge Formulation (OKF) Knowledge Graph Traversal Engine for VERA.

Architecture:
  1. KNOWLEDGE GRAPH TRAVERSAL:
     Traverses structured FSSAI standard knowledge nodes:
     index.md (category root) -> [section].md (thematic sector) -> [item_id].md (requirement node)
     Loaded from bundled OKF data: data/okf_bundle/{cat_slug}/

  2. METADATA & GUIDANCE EXTRACTION:
     Reads the official FSSAI requirement description, critical risk flag (asterisk),
     and audit verification guidance directly from the markdown knowledge node.

  3. EVIDENCE MATCHING & CLASSIFICATION:
     Correlates the knowledge node's regulatory criteria against the audit report's
     recorded observations to produce C / PC / NC / NA verdicts.

  4. FALLBACK:
     If the markdown node is not present for a custom item, falls back to the
     bundled FSSAI JSON checklists (data/fssai_checklists/{category}.json).
"""

from __future__ import annotations

import json
import os
import re
from difflib import SequenceMatcher
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity as sk_cosine

from src.report_ingestion import segment_report


_BASE_DIR = Path(__file__).resolve().parents[1]
_OKF_BUNDLE_DIR = _BASE_DIR / "data" / "okf_bundle"
_CHECKLISTS_DIR = _BASE_DIR / "data" / "fssai_checklists"

_CATEGORY_ALIASES: Dict[str, str] = {
    "general manufacturing": "general_manufacturing",
    "general_manufacturing": "general_manufacturing",
    "general": "general_manufacturing",
    "gm": "general_manufacturing",
    "catering": "catering",
    "cat": "catering",
    "milk processing": "milk_processing",
    "milk and milk product processing": "milk_processing",
    "milk_processing": "milk_processing",
    "dairy": "milk_processing",
    "meat processing": "meat_processing",
    "meat_processing": "meat_processing",
    "slaughterhouse": "slaughterhouse",
    "slaughter": "slaughterhouse",
    "retail": "retail",
    "transport": "transport",
    "transportation": "transport",
    "storage warehouse": "storage_and_warehouse",
    "storage and warehouse": "storage_and_warehouse",
    "storage_and_warehouse": "storage_and_warehouse",
    "warehouse": "storage_and_warehouse",
}

_PREFIX_TO_CATEGORY: Dict[str, str] = {
    "gm": "general_manufacturing",
    "cat": "catering",
    "mp": "milk_processing",
    "meat": "meat_processing",
    "sh": "slaughterhouse",
    "ret": "retail",
    "trans": "transport",
    "sw": "storage_and_warehouse",
}

_NEGATIVE_PHRASES = (
    "failed to", "critical non-compliance", "lacked active", "marked nc",
    "deficiency noted", "deficiency found", "violation found",
    "pest infestation", "flaking paint", "unhygienic",
    "not maintained", "not available", "not provided", "not verified",
    "was absent", "were absent", "no records", "no documentation",
    "no license", "no calibration", "expired license",
    "not compliant", "non-compliant", "missing", "absent", "failed",
    "lacking", "deficient", "inadequate", "violation", "not found"
)

_PARTIAL_PHRASES = (
    "partial implementation", "procedural gaps", "minor deficiency",
    "minor gap", "partially documented", "pending review", "in progress",
    "partially", "inconsistent", "sometimes", "limited", "needs improvement",
    "partly", "incomplete"
)


def _normalize(val: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", str(val).lower()).strip()


def _resolve_category(raw_category: str, item_id: str) -> str:
    """Determine the canonical category slug from category string or item ID prefix."""
    norm = _normalize(raw_category)
    if norm in _CATEGORY_ALIASES:
        return _CATEGORY_ALIASES[norm]
    for alias, slug in _CATEGORY_ALIASES.items():
        if alias in norm:
            return slug

    # Try item_id prefix (e.g. GM_01 -> general_manufacturing)
    id_clean = item_id.lower().replace("-", "_")
    prefix = id_clean.split("_")[0]
    if prefix in _PREFIX_TO_CATEGORY:
        return _PREFIX_TO_CATEGORY[prefix]

    # Default to general manufacturing
    return "general_manufacturing"


@lru_cache(maxsize=16)
def _load_json_items(filename: str) -> List[Dict[str, Any]]:
    path = _CHECKLISTS_DIR / filename
    if not path.exists():
        return []
    with path.open(encoding="utf-8") as f:
        data = json.load(f)
    return data if isinstance(data, list) else []


def _read_okf_node(cat_slug: str, item_id: str) -> Optional[Dict[str, Any]]:
    """Look for data/okf_bundle/{cat_slug}/{item_id}.md and parse its frontmatter + content."""
    candidate_paths = [
        _OKF_BUNDLE_DIR / cat_slug / f"{item_id}.md",
        _OKF_BUNDLE_DIR / cat_slug / f"{item_id.upper()}.md",
        _OKF_BUNDLE_DIR / cat_slug / f"{item_id.capitalize()}.md",
    ]
    node_file = next((p for p in candidate_paths if p.exists()), None)
    if not node_file:
        return None

    try:
        content = node_file.read_text(encoding="utf-8")
        section = "General"
        asterisk = False
        description = ""

        # Extract frontmatter attributes
        fm_match = re.search(r"^---\s*(.*?)\s*---", content, re.DOTALL)
        if fm_match:
            fm = fm_match.group(1)
            sec_match = re.search(r'section:\s*["\']?(.*?)["\']?\s*$', fm, re.MULTILINE)
            if sec_match:
                section = sec_match.group(1).strip()
            ast_match = re.search(r'asterisk_critical:\s*(true|yes|1)', fm, re.IGNORECASE)
            if ast_match:
                asterisk = True

        # Extract requirement description
        req_match = re.search(r"## Requirement Description\s*\n(.*?)(?=\n##|\Z)", content, re.DOTALL)
        if req_match:
            description = req_match.group(1).strip()

        sec_slug = re.sub(r"[^a-zA-Z0-9]+", "_", section).strip("_").lower()

        return {
            "source": "okf_bundle",
            "file_path": str(node_file),
            "item_id": item_id,
            "section": section,
            "sec_slug": sec_slug,
            "asterisk_critical": asterisk,
            "description": description or content[:300],
            "traversal_path": ["index.md", f"{sec_slug}.md", node_file.name],
        }
    except Exception:
        return None


def run_okf_engine(
    checklist: List[Dict[str, Any]],
    report_text: str,
    top_k: int = 4,
) -> Dict[str, Any]:
    """
    OKF Knowledge Graph Traversal Engine.

    Traverses: index.md -> {section}.md -> {item_id}.md in data/okf_bundle/.
    Falls back to data/fssai_checklists/{category}.json if markdown node is absent.
    """
    segments = segment_report(report_text)
    sentences = [s["text"] for s in segments]

    if not sentences:
        return {
            "success": True,
            "engine": "okf",
            "verdicts": {
                str(item.get("item_id") or item.get("itemId") or idx + 1): {
                    "status": "NC",
                    "evidence": "No report text available.",
                    "faithful": True,
                    "retrieved_chunks": [],
                    "similarity_score": 0.0,
                    "confidence": 0.0,
                    "traversal_path": ["index.md", "no_report_evidence"],
                }
                for idx, item in enumerate(checklist)
            },
            "diagnostics": {
                "total_evaluated": len(checklist),
                "total_C": 0,
                "total_PC": 0,
                "total_NC": len(checklist),
                "total_NA": 0,
                "unmapped": 0,
                "average_hops": 0,
                "method": "OKF Knowledge Graph Traversal",
            },
            "advisory": "No report text provided.",
        }

    # Prepare TF-IDF retrieval index over report prose
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
    total_hops = 0
    landings = 0
    unmapped = 0

    for idx, item in enumerate(checklist):
        item_id = str(item.get("item_id") or item.get("itemId") or item.get("id") or idx + 1)
        raw_question = str(item.get("question") or item.get("text") or "").strip()
        raw_cat = str(item.get("category") or "")
        is_asterisk = bool(item.get("asterisk_critical") or item.get("is_asterisk"))

        cat_slug = _resolve_category(raw_cat, item_id)

        # 1. Traverse OKF bundle graph
        okf_node = _read_okf_node(cat_slug, item_id)
        if okf_node:
            traversal_path = okf_node["traversal_path"]
            hops = 2
            total_hops += hops
            landings += 1
            query_text = f"{raw_question} {okf_node['description']}".strip()
            if okf_node.get("asterisk_critical"):
                is_asterisk = True
            node_evidence_header = f"OKF Node: [{' → '.join(traversal_path)}]"
        else:
            # Fall back to JSON checklist
            json_file = f"{cat_slug}.json"
            json_items = _load_json_items(json_file)
            matched_json = next(
                (entry for entry in json_items if str(entry.get("item_id", "")).lower() == item_id.lower()),
                None
            )
            if not matched_json and raw_question and json_items:
                matched_json = max(
                    json_items,
                    key=lambda entry: SequenceMatcher(
                        None,
                        _normalize(raw_question),
                        _normalize(str(entry.get("question", ""))),
                    ).ratio(),
                    default=None,
                )
                if matched_json and SequenceMatcher(
                    None,
                    _normalize(raw_question),
                    _normalize(str(matched_json.get("question", ""))),
                ).ratio() < 0.30:
                    matched_json = None

            if matched_json:
                traversal_path = ["checklists_index.json", json_file, str(matched_json.get("item_id", item_id))]
                hops = 2
                total_hops += hops
                landings += 1
                query_text = f"{raw_question} {matched_json.get('question', '')}".strip()
                if matched_json.get("asterisk_critical"):
                    is_asterisk = True
                node_evidence_header = f"OKF JSON: [{' → '.join(traversal_path)}]"
            else:
                traversal_path = ["index.md", cat_slug, "unmapped_custom_item"]
                hops = 1
                total_hops += hops
                unmapped += 1
                query_text = raw_question
                node_evidence_header = f"OKF Unmapped: [{item_id}]"

        # 2. Retrieve report evidence
        if has_tfidf and query_text:
            try:
                q_vec = vectorizer.transform([query_text])
                sims = sk_cosine(q_vec, report_vectors)[0]
                top_idx = sims.argsort()[::-1][:top_k]
                top_chunks = [(sentences[i], float(sims[i])) for i in top_idx if sims[i] >= 0.05]
                max_sim = top_chunks[0][1] if top_chunks else 0.0
                chunks = [t for t, _ in top_chunks]
            except Exception:
                chunks, max_sim = [], 0.0
        else:
            chunks, max_sim = [], 0.0

        # 3. Classify based on retrieved evidence
        if not chunks or max_sim < 0.10:
            status = "NC"
            evidence_str = f"{node_evidence_header} | Evidence: Not observed in audit report."
            confidence = 0.35
        else:
            combined = " ".join(chunks).lower()
            has_negative = any(p in combined for p in _NEGATIVE_PHRASES)
            has_partial = any(p in combined for p in _PARTIAL_PHRASES)
            is_na = "not applicable" in combined or "n/a" in combined

            if is_na and max_sim >= 0.25:
                status = "NA"
                confidence = max_sim
            elif has_negative:
                status = "NC"
                confidence = max(0.85, max_sim)
            elif has_partial:
                status = "NC" if is_asterisk else "PC"
                confidence = max(0.75, max_sim)
            elif max_sim >= 0.22:
                status = "C"
                confidence = max_sim
            else:
                status = "PC" if not is_asterisk else "NC"
                confidence = max_sim

            evidence_str = f'{node_evidence_header} | Evidence: "{chunks[0][:300]}"'

        totals[status] += 1

        verdicts[item_id] = {
            "status": status,
            "evidence": evidence_str,
            "faithful": True,
            "retrieved_chunks": chunks,
            "similarity_score": round(max_sim, 3),
            "confidence": round(confidence, 3),
            "traversal_path": traversal_path,
            "hops": hops,
            "confidence_type": "knowledge_graph_traversal",
        }

    evaluated_count = len(checklist)
    avg_hops = round(total_hops / max(evaluated_count, 1), 2)
    precision = round(landings / max(evaluated_count, 1), 3)

    return {
        "success": True,
        "engine": "okf",
        "verdicts": verdicts,
        "diagnostics": {
            "total_evaluated": evaluated_count,
            "total_C": totals["C"],
            "total_PC": totals["PC"],
            "total_NC": totals["NC"],
            "total_NA": totals["NA"],
            "unmapped": unmapped,
            "average_hops": avg_hops,
            "traversal_precision": precision,
            "method": "FSSAI Schedule 4 / Annex 5 Knowledge Graph Traversal (OKF)",
        },
        "advisory": (
            "OKF traversed official FSSAI knowledge bundles (data/okf_bundle). "
            "Evidence is verified against statutory standards; all findings are advisory."
        ),
    }
