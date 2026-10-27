#!/usr/bin/env python3
"""
rag_bridge.py — CLI and API Bridge for VERA's Extracted Offline RAG ML Engine.
Allows the Node.js Express server to execute VERA RAG verification and Q&A.
"""

import sys
import os
import json
from dataclasses import asdict

# Ensure vera_rag directory is on sys.path
CURR_DIR = os.path.dirname(os.path.abspath(__file__))
if CURR_DIR not in sys.path:
    sys.path.insert(0, CURR_DIR)

from src.engine_rag import run_rag_engine, rag_bot_answer
from src.engine_nlp import run_nlp_engine
from src.engine_okf import run_okf_engine
from src.explainer import explain_all_verdicts
from src.fraud_detector import compute_fraud_risk


def handle_verify(payload):
    checklist = payload.get("checklist", [])
    report_text = payload.get("report_text", "")
    top_k = payload.get("top_k", 4)
    if not isinstance(checklist, list) or not isinstance(report_text, str):
        raise ValueError("checklist must be a list and report_text must be a string")

    # Standardize checklist items
    formatted_chk = []
    for idx, item in enumerate(checklist):
        formatted_chk.append({
            "item_id": str(item.get("item_id") or item.get("itemId") or item.get("id") or item.get("_id") or idx + 1),
            "question": item.get("question") or item.get("text") or "",
            "category": item.get("category") or "General",
            "asterisk_critical": bool(item.get("asterisk_critical") or item.get("is_asterisk") or False)
        })

    verdicts, diagnostics = run_rag_engine(formatted_chk, report_text, top_k=top_k)

    explanations = {
        item_id: asdict(explanation)
        for item_id, explanation in explain_all_verdicts(formatted_chk, verdicts).items()
    }
    fraud_report = compute_fraud_risk(formatted_chk, verdicts, report_text)

    return {
        "success": True,
        "engine": "rag",
        "verdicts": verdicts,
        "diagnostics": diagnostics,
        "explanations": explanations,
        "fraud_report": fraud_report,
        "advisory": "Offline retrieval and heuristic classification; no LLM is used. Confidence is not calibrated."
    }


def handle_nlp(payload):
    checklist = payload.get("checklist", [])
    report_text = payload.get("report_text", "")
    top_k = payload.get("top_k", 4)
    if not isinstance(checklist, list) or not isinstance(report_text, str):
        raise ValueError("checklist must be a list and report_text must be a string")
    return run_nlp_engine(checklist, report_text, top_k=top_k)


def handle_okf(payload):
    checklist = payload.get("checklist", [])
    report_text = payload.get("report_text", "")
    top_k = payload.get("top_k", 4)
    if not isinstance(checklist, list) or not isinstance(report_text, str):
        raise ValueError("checklist must be a list and report_text must be a string")
    return run_okf_engine(checklist, report_text, top_k=top_k)


def handle_compare(payload):
    nlp_result = handle_nlp(payload)
    rag_result = handle_verify(payload)
    okf_result = handle_okf(payload)
    nlp_verdicts = nlp_result["verdicts"]
    rag_verdicts = rag_result["verdicts"]
    okf_verdicts = okf_result["verdicts"]
    disagreements = []
    for item_id in sorted(set(nlp_verdicts).intersection(rag_verdicts)):
        statuses = {
            "nlp": nlp_verdicts[item_id]["status"],
            "rag": rag_verdicts[item_id]["status"],
        }
        if okf_verdicts[item_id]["status"] != "UNMAPPED":
            statuses["okf"] = okf_verdicts[item_id]["status"]
        if len(set(statuses.values())) > 1:
            disagreements.append({"item_id": item_id, "statuses": statuses})
    return {
        "success": True,
        "engine": "compare",
        "engines": {"nlp": nlp_result, "rag": rag_result, "okf": okf_result},
        "disagreements": disagreements,
        "diagnostics": {
            "total_evaluated": len(nlp_verdicts),
            "disagreements": len(disagreements),
            "needs_human_review": len(disagreements),
        },
        "advisory": "Comparison is advisory. Neither engine is a calibrated probability model; a qualified reviewer must decide.",
    }


def handle_ask(payload):
    question = payload.get("question", "")
    report_text = payload.get("report_text", "")
    top_k = payload.get("top_k", 4)

    answer = rag_bot_answer(question, report_text, top_k=top_k)
    return {
        "success": True,
        "answer": answer
    }


def main():
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        print("VERA RAG Bridge is operational.")
        sys.exit(0)

    try:
        raw_input = sys.stdin.read()
        if not raw_input.strip():
            print(json.dumps({"error": "Empty input payload"}))
            sys.exit(1)

        data = json.loads(raw_input)
        action = data.get("action", "verify")

        if action == "verify":
            res = handle_verify(data)
        elif action == "nlp":
            res = handle_nlp(data)
        elif action == "okf":
            res = handle_okf(data)
        elif action == "compare":
            res = handle_compare(data)
        elif action == "nli":
            res = {
                "success": False,
                "available": False,
                "engine": "nli",
                "message": "NLI is not installed or configured in this workspace. Install a tested local Transformers model before enabling it.",
            }
        elif action == "ask":
            res = handle_ask(data)
        else:
            raise ValueError(f"Unknown action: {action}")

        print(json.dumps(res))
        sys.exit(0)
    except Exception as err:
        print(json.dumps({"error": str(err)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
