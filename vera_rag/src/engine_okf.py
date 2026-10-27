"""Experimental FSSAI checklist traversal over the bundled JSON knowledge files."""

import json
import re
from difflib import SequenceMatcher
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from src.engine_nlp import run_nlp_engine


_DATA_DIR = Path(__file__).resolve().parents[1] / "data" / "fssai_checklists"
_CATEGORY_FILES = {
    "general manufacturing": "general_manufacturing.json",
    "milk processing": "milk_processing.json",
    "milk and milk product processing": "milk_processing.json",
    "meat processing": "meat_processing.json",
    "slaughterhouse": "slaughterhouse.json",
    "catering": "catering.json",
    "retail": "retail.json",
    "transport": "transport.json",
    "storage warehouse": "storage_and_warehouse.json",
    "storage and warehouse": "storage_and_warehouse.json",
}


def _normalize(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


@lru_cache(maxsize=8)
def _load_items(filename: str) -> List[Dict[str, Any]]:
    with (_DATA_DIR / filename).open(encoding="utf-8") as file:
        items = json.load(file)
    if not isinstance(items, list):
        raise ValueError(f"FSSAI knowledge file has an invalid shape: {filename}")
    return items


def _find_source_item(item: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    category = _normalize(str(item.get("category") or ""))
    filename = _CATEGORY_FILES.get(category)
    if not filename:
        return None, None

    candidates = _load_items(filename)
    item_id = str(item.get("item_id") or item.get("itemId") or item.get("id") or "")
    exact = next((candidate for candidate in candidates if str(candidate.get("item_id")) == item_id), None)
    if exact:
        return exact, filename

    question = _normalize(str(item.get("question") or ""))
    candidate = max(
        candidates,
        key=lambda entry: SequenceMatcher(
            None,
            question,
            _normalize(str(entry.get("question") or "")),
        ).ratio(),
        default=None,
    )
    if candidate and SequenceMatcher(
        None,
        question,
        _normalize(str(candidate.get("question") or "")),
    ).ratio() >= 0.35:
        return candidate, filename
    return None, filename


def run_okf_engine(
    checklist: List[Dict[str, Any]],
    report_text: str,
    top_k: int = 4,
) -> Dict[str, Any]:
    verdicts: Dict[str, Dict[str, Any]] = {}
    evaluated_items: List[Dict[str, Any]] = []
    item_sources: Dict[str, Tuple[Dict[str, Any], str]] = {}
    unmapped = 0

    for index, item in enumerate(checklist):
        item_id = str(item.get("item_id") or item.get("itemId") or item.get("id") or index + 1)
        source_item, filename = _find_source_item(item)
        if not source_item or not filename:
            verdicts[item_id] = {
                "status": "UNMAPPED",
                "evidence": "No sufficiently similar official item was found in the selected FSSAI category.",
                "faithful": True,
                "retrieved_chunks": [],
                "similarity_score": 0.0,
                "traversal_path": ["checklists_index.json", str(item.get("category") or "unmapped"), "no matching item"],
            }
            unmapped += 1
            continue

        evaluated_items.append({
            "item_id": item_id,
            "question": source_item.get("question", ""),
            "category": source_item.get("category", item.get("category", "")),
            "asterisk_critical": bool(source_item.get("asterisk_critical")),
        })
        item_sources[item_id] = (source_item, filename)

    baseline = run_nlp_engine(evaluated_items, report_text, top_k=top_k)
    for item_id, verdict in baseline["verdicts"].items():
        source_item, filename = item_sources[item_id]
        verdicts[item_id] = {
            **verdict,
            "source_item": source_item,
            "traversal_path": [
                "checklists_index.json",
                filename,
                str(source_item.get("item_id", "")),
            ],
        }

    statuses = [result["status"] for result in verdicts.values()]
    evaluated_paths = [
        result["traversal_path"]
        for result in verdicts.values()
        if result["status"] != "UNMAPPED"
    ]
    return {
        "success": True,
        "engine": "okf",
        "verdicts": verdicts,
        "diagnostics": {
            "total_evaluated": len(evaluated_items),
            "total_items": len(checklist),
            "total_C": statuses.count("C"),
            "total_PC": statuses.count("PC"),
            "total_NC": statuses.count("NC"),
            "total_NA": statuses.count("NA"),
            "unmapped": unmapped,
            "average_hops": (
                sum(len(path) - 1 for path in evaluated_paths) / len(evaluated_paths)
                if evaluated_paths else None
            ),
        },
        "advisory": "Experimental knowledge-file traversal. The bundled checklist transcription is not verified against the source manual and must not be treated as authoritative scoring guidance.",
    }
