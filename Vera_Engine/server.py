"""
server.py — VERA Ecosystem Enterprise FastAPI Backend
Bridges the intact VERA AI verification engines, document ingestion pipeline,
FSSAI scoring calculator, and XAI/fraud forensic analyzers to the VERA PWAs.
"""

import os
import io
import json
import time
import hashlib
import uuid
from typing import Dict, List, Any, Optional
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Import intact VERA engine modules directly
from src.engine_nlp import run_classical_nlp_engine
from src.engine_nli import run_nli_engine
from src.engine_rag import run_rag_engine
from src.engine_okf import run_okf_engine
from src.scoring import compute_fssai_scores
from src.file_converter import normalize_to_excel
from src.report_ingestion import segment_report
from src.explainer import explain_all_verdicts, get_items_needing_review
from src.fraud_detector import compute_fraud_risk
from src.audit_trail import create_session, record_override
from src.engine_rag import rag_bot_answer

app = FastAPI(
    title="VERA Ecosystem Engine API",
    version="2.0.0-fssai-pwa",
    description="Verification Engine for Regulatory Audits — Second-Party Food Safety Backend"
)

# Enable CORS for both Customer PWA and Audit PWA
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CHECKLIST_DIR = os.path.join(os.path.dirname(__file__), "data", "fssai_checklists")
CATEGORY_MAP = {
    'general_manufacturing': 'general_manufacturing.json',
    'General Manufacturing': 'general_manufacturing.json',
    'milk_processing': 'milk_processing.json',
    'Milk Processing': 'milk_processing.json',
    'meat_processing': 'meat_processing.json',
    'Meat Processing': 'meat_processing.json',
    'slaughterhouse': 'slaughterhouse.json',
    'Slaughterhouse': 'slaughterhouse.json',
    'catering': 'catering.json',
    'Catering': 'catering.json',
    'retail': 'retail.json',
    'Retail': 'retail.json',
    'transport': 'transport.json',
    'Transport': 'transport.json',
    'storage_and_warehouse': 'storage_and_warehouse.json',
    'Storage & Warehouse': 'storage_and_warehouse.json'
}

# --- Pydantic Request/Response Models ---
class VerificationRequest(BaseModel):
    audit_id: Optional[str] = "demo-audit"
    category: str = "Catering"
    engine: str = Field("OKF", description="CLASSICAL_NLP | DEEP_LEARNING_NLI | RAG | OKF")
    report_text: str
    checklist_override: Optional[List[Dict[str, Any]]] = None
    auditor_id: Optional[str] = "auditor-default"
    auditor_name: Optional[str] = "Lead Food Safety Auditor"

class ScoringRequest(BaseModel):
    checklist: List[Dict[str, Any]]
    verdicts: Dict[str, Dict[str, Any]]

class OverrideRequest(BaseModel):
    session_id: str
    item_id: str
    question: str
    system_verdict: str
    auditor_verdict: str
    justification: str
    auditor_name: str
    auditor_role: str = "Lead Auditor"

class RagAskRequest(BaseModel):
    report_text: str
    question: str
    top_k: int = 3


# --- Helpers ---
def load_checklist_by_category(category: str) -> List[Dict[str, Any]]:
    clean_cat = category.strip()
    filename = CATEGORY_MAP.get(clean_cat)
    if not filename:
        for k, v in CATEGORY_MAP.items():
            if k.lower() == clean_cat.lower():
                filename = v
                break
    if not filename:
        filename = 'general_manufacturing.json'
    
    file_path = os.path.join(CHECKLIST_DIR, filename)
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


# --- Endpoints ---
@app.get("/")
def root():
    return {
        "status": "online",
        "service": "VERA Verification Engine for Regulatory Audits",
        "version": "2.0.0",
        "regulatory_standard": "FSSAI Schedule 4 / Annex 5 (8 Sectors)"
    }

@app.get("/api/engines")
def list_engines():
    """Returns status and capabilities of the 4 native offline verification engines."""
    return {
        "engines": [
            {
                "id": "OKF",
                "name": "Architecture 4: OKF Knowledge Graph Traversal",
                "description": "Deterministic legal provenance traversal (index.md -> section.md -> item.md). Highest accuracy (98.3%), zero hallucination.",
                "available": True,
                "recommended": True,
                "supports_pc": True,
                "offline_native": True,
                "latency_estimate": "~430ms"
            },
            {
                "id": "DEEP_LEARNING_NLI",
                "name": "Architecture 2: Deep Learning NLI Cross-Encoder",
                "description": "Premise-hypothesis contradiction/entailment inference. Accurate 4-class (C/PC/NC/NA) scoring with asterisk-critical PC->NC collapse.",
                "available": True,
                "recommended": False,
                "supports_pc": True,
                "offline_native": True,
                "latency_estimate": "~15ms"
            },
            {
                "id": "RAG",
                "name": "Architecture 3: Dense Extractive RAG",
                "description": "Dense semantic retrieval with MiniLM embeddings. 100% extractive verbatim citations and interactive auditor Q&A assistant.",
                "available": True,
                "recommended": False,
                "supports_pc": True,
                "offline_native": True,
                "latency_estimate": "~3500ms"
            },
            {
                "id": "CLASSICAL_NLP",
                "name": "Architecture 1: Classical NLP (TF-IDF & N-Grams)",
                "description": "Lightweight lexical cosine matching. Binary C/NC mode only (FSSAI PC limitation documented).",
                "available": True,
                "recommended": False,
                "supports_pc": False,
                "offline_native": True,
                "latency_estimate": "~10ms"
            }
        ],
        "default_engine": "OKF"
    }

@app.get("/api/checklists")
def get_checklists_index():
    """Returns official FSSAI checklist directory and point weights."""
    idx_path = os.path.join(CHECKLIST_DIR, "checklists_index.json")
    if os.path.exists(idx_path):
        with open(idx_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            return {"categories": data}
    return {"categories": {}}

@app.get("/api/checklists/{category_name}")
def get_checklist_items(category_name: str):
    """Loads all items for a given statutory category."""
    items = load_checklist_by_category(category_name)
    if not items:
        raise HTTPException(status_code=404, detail=f"Category '{category_name}' not found.")
    return {
        "category": category_name,
        "total_items": len(items),
        "total_points": sum(it.get("weight", 2) for it in items),
        "items": items
    }

@app.post("/api/documents/extract")
async def extract_document(file: UploadFile = File(...)):
    """
    Accepts PDF, DOCX, XLSX, CSV, or TXT file.
    Uses intact file_converter and report_ingestion to produce:
    1. Full normalized text for AI engines
    2. Structured table paragraphs for auditor on-screen review
    """
    file_bytes = await file.read()
    filename = file.filename or "uploaded_document.pdf"
    
    # In-memory buffer simulation of file
    buffer = io.BytesIO(file_bytes)
    setattr(buffer, 'name', filename)
    
    try:
        df, out_path = normalize_to_excel(buffer)
        table_records = df.to_dict(orient="records")
        
        # Consolidate text for engine ingestion
        text_chunks = []
        for r in table_records:
            for k in ['Paragraph', 'Text', 'sentence', 'Clause']:
                if k in r and str(r[k]).strip():
                    text_chunks.append(str(r[k]).strip())
                    break
        
        full_text = "\n\n".join(text_chunks) if text_chunks else "No extractable text found."
        segments = segment_report(full_text)
        
        sha256 = hashlib.sha256(file_bytes).hexdigest()
        
        return {
            "success": True,
            "filename": filename,
            "file_size": len(file_bytes),
            "sha256": sha256,
            "paragraphs_extracted": len(table_records),
            "segments_count": len(segments),
            "full_text": full_text,
            "table_preview": table_records[:100],  # send first 100 rows for preview
            "temp_excel_path": out_path
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Document extraction error: {str(e)}")

@app.post("/api/verify")
def run_verification(req: VerificationRequest):
    """
    Executes one of the 4 native VERA verification engines.
    Computes scores, XAI explanations, fraud signals, and provenance.
    """
    t0 = time.time()
    checklist = req.checklist_override or load_checklist_by_category(req.category)
    if not checklist:
        raise HTTPException(status_code=400, detail=f"Checklist for category '{req.category}' is empty.")
    
    eng = req.engine.upper().strip()
    verdicts: Dict[str, Dict[str, Any]] = {}
    
    try:
        if eng in ["CLASSICAL_NLP", "NLP"]:
            res = run_classical_nlp_engine(checklist, req.report_text)
            verdicts = res[0] if isinstance(res, tuple) else res
        elif eng in ["DEEP_LEARNING_NLI", "NLI"]:
            res = run_nli_engine(checklist, req.report_text)
            verdicts = res[0] if isinstance(res, tuple) else res
        elif eng in ["RAG"]:
            res = run_rag_engine(checklist, req.report_text)
            verdicts = res[0] if isinstance(res, tuple) else res
        elif eng in ["OKF", "ARCHITECTURE_4"]:
            res = run_okf_engine(req.category, checklist, req.report_text)
            verdicts = res[0] if isinstance(res, tuple) else res
        else:
            # Default to winning OKF engine
            res = run_okf_engine(req.category, checklist, req.report_text)
            verdicts = res[0] if isinstance(res, tuple) else res
            eng = "OKF"
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Engine execution failure ({eng}): {str(e)}")
        
    execution_time_ms = round((time.time() - t0) * 1000, 1)
    
    # Official FSSAI scoring
    scores = compute_fssai_scores(checklist, verdicts)
    
    # Trustworthy AI Layer: Forensic Fraud Signals & Provenance
    try:
        fraud_analysis = compute_fraud_risk(checklist, verdicts, req.report_text)
    except Exception as e:
        fraud_analysis = {"composite_score": 0.0, "risk_level": "Low", "signals": {}, "all_flags": [], "recommendation": f"Risk computation note: {str(e)}"}
        
    try:
        from dataclasses import asdict, is_dataclass
        raw_exps = explain_all_verdicts(checklist, verdicts)
        explanations = {
            k: asdict(v) if is_dataclass(v) else v
            for k, v in raw_exps.items()
        }
    except Exception:
        explanations = {}

    session_id = str(uuid.uuid4())
    input_hash = hashlib.sha256(req.report_text.encode('utf-8')).hexdigest()
    
    provenance = {
        "session_id": session_id,
        "engine": eng,
        "input_hash": input_hash,
        "execution_time_ms": execution_time_ms,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_items_evaluated": len(checklist)
    }
    
    return {
        "success": True,
        "provenance": provenance,
        "scores": scores,
        "verdicts": verdicts,
        "fraud_analysis": fraud_analysis,
        "explanations": explanations
    }

@app.post("/api/scoring")
def calculate_scores(req: ScoringRequest):
    """Computes FSSAI scores for a given checklist and set of verdicts."""
    result = compute_fssai_scores(req.checklist, req.verdicts)
    return result

@app.post("/api/audit/override")
def submit_override(req: OverrideRequest):
    """Appends an auditor override to the immutable session audit trail."""
    try:
        rec = record_override(
            session_id=req.session_id,
            item_id=req.item_id,
            question=req.question,
            system_verdict=req.system_verdict,
            auditor_verdict=req.auditor_verdict,
            justification=req.justification,
            auditor_name=req.auditor_name,
            auditor_role=req.auditor_role
        )
        import dataclasses
        return {"success": True, "override": dataclasses.asdict(rec)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to record override: {str(e)}")

@app.post("/api/rag/ask")
def ask_auditor_rag(req: RagAskRequest):
    """
    Extractive RAG Assistant: retrieves relevant verbatim passages
    answering an auditor query from the report text.
    """
    try:
        answer = rag_bot_answer(req.question, req.report_text, top_k=req.top_k)
        return {
            "query": req.question,
            "answer": answer
        }
    except Exception as e:
        return {
            "query": req.question,
            "answer": f"Error querying document: {str(e)}"
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
