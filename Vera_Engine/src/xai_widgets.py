"""
xai_widgets.py — Shared Streamlit explainability & accountability UI components.

Used by ALL four architecture pages (NLP, NLI, RAG, OKF).
Each architecture calls these widgets with its own verdict format — the widgets
normalise differences internally so the XAI experience is identical across arches.

Exported helpers:
  render_xai_panel(arch_name, checklist, verdicts, report_text, scoring,
                   auditor_name, session_key_prefix)
    → renders: Explainability tab, Fraud Risk tab, Accountability tab
      (call this inside a st.tabs() block)

  build_arch_explanations(arch_name, checklist, verdicts)
    → returns Dict[item_id, VerdictExplanation] using the shared explainer

  normalise_verdict(raw_verdict, arch_name)
    → normalises arch-specific verdict dict to the common schema expected by
       explainer.py and fraud_detector.py
"""

from __future__ import annotations

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from typing import Dict, List, Any, Optional

from src.explainer import (
    explain_all_verdicts, get_items_needing_review,
    VerdictExplanation,
)
from src.fraud_detector import compute_fraud_risk
from src.audit_trail import (
    create_session, record_override, load_overrides,
    get_escalation_report, build_accountability_report,
    export_accountability_report_json,
)

# ── UI constants ───────────────────────────────────────────────────────────────
STATUS_COLOR = {"C": "🟢", "PC": "🟡", "NC": "🔴", "NA": "⚫"}
CONF_COLOR   = {"High": "🟢", "Medium": "🟡", "Low": "🔴"}
RISK_COLOR   = {"Low": "🟢", "Medium": "🟡", "High": "🔴", "Critical": "🚨"}
STATUS_CSS   = {
    "C":  "background-color:#d4edda;color:#155724;",
    "PC": "background-color:#fff3cd;color:#856404;",
    "NC": "background-color:#f8d7da;color:#721c24;",
    "NA": "background-color:#e2e3e5;color:#383d41;",
}

SIGNAL_LABELS = {
    "contradiction":  "Contradiction Detection",
    "evidence_reuse": "Evidence Reuse / Copy-Paste",
    "all_pass":       "All-Pass Anomaly",
    "sparse_critical":"Sparse Evidence on ★ Critical Items",
    "sim_uniformity": "Similarity Score Uniformity",
    "report_quality": "Report Text Quality",
}


# ── Verdict normalisation (arch-specific → common schema) ─────────────────────

def normalise_verdict(raw: Dict[str, Any], arch_name: str) -> Dict[str, Any]:
    """
    Convert architecture-specific verdict dict to the common schema that
    explainer.py and fraud_detector.py expect:
      { status, evidence, retrieved_chunks, similarity_score, faithful }
    """
    status   = raw.get("status", "NC")
    evidence = raw.get("evidence", "")

    # Arch 1 — Classical NLP: has similarity + matched_sentence
    if arch_name == "nlp":
        sim    = raw.get("similarity", 0.0)
        sent   = raw.get("matched_sentence", "")
        chunks = [sent] if sent else []
        return {
            "status": status, "evidence": evidence,
            "retrieved_chunks": chunks,
            "similarity_score": sim, "faithful": True,
        }

    # Arch 2 — NLI: has confidence + entailment scores
    elif arch_name == "nli":
        conf  = raw.get("confidence", 0.85)
        sent  = raw.get("retrieved_sentence") or raw.get("premise_used") or raw.get("evidence", "")
        chunks = [sent] if sent else []
        return {
            "status": status, "evidence": evidence,
            "retrieved_chunks": chunks,
            "similarity_score": conf,   # use NLI confidence as sim proxy
            "faithful": True,
        }

    # Arch 3 — RAG: already in common schema
    elif arch_name == "rag":
        return {
            "status": status,
            "evidence": evidence,
            "retrieved_chunks": raw.get("retrieved_chunks", []),
            "similarity_score": raw.get("similarity_score", 0.0),
            "faithful": raw.get("faithful", True),
        }

    # Arch 4 — OKF: has traversal_path + okf_score
    elif arch_name == "okf":
        path   = raw.get("traversal_path", "")
        okf_s  = raw.get("okf_score", 0.85)
        chunks = [evidence] if evidence else []
        return {
            "status": status, "evidence": evidence,
            "retrieved_chunks": chunks,
            "similarity_score": min(1.0, okf_s),
            "faithful": True,
        }

    # Fallback
    return {
        "status": status, "evidence": evidence,
        "retrieved_chunks": [], "similarity_score": 0.5, "faithful": True,
    }


def build_arch_explanations(
    arch_name: str,
    checklist: List[Dict[str, Any]],
    verdicts: Dict[str, Dict[str, Any]],
) -> Dict[str, VerdictExplanation]:
    """
    Normalise verdicts to common schema, then run explain_all_verdicts.
    Returns {item_id → VerdictExplanation}.
    """
    normalised = {
        iid: normalise_verdict(v, arch_name)
        for iid, v in verdicts.items()
    }
    return explain_all_verdicts(checklist, normalised)


# ═══════════════════════════════════════════════════════════════════════════════
# EXPLAINABILITY PANEL
# ═══════════════════════════════════════════════════════════════════════════════

def render_explainability_tab(
    explanations: Dict[str, VerdictExplanation],
    verdicts: Dict[str, Dict[str, Any]],
    arch_name: str,
):
    """Render the full per-item explainability panel inside a tab."""
    if not explanations:
        st.info("Run a verification first to see explanations.")
        return

    # ── Confidence overview ───────────────────────────────────────────────────
    conf_data = pd.DataFrame([
        {"Item": e.item_id, "Confidence": e.confidence,
         "Label": e.confidence_label, "Verdict": e.final_verdict}
        for e in explanations.values()
    ])

    col1, col2 = st.columns(2)
    with col1:
        fig_hist = px.histogram(
            conf_data, x="Confidence", color="Label", nbins=15,
            color_discrete_map={"High":"#2ecc71","Medium":"#f39c12","Low":"#e74c3c"},
            title="Confidence Score Distribution",
        )
        st.plotly_chart(fig_hist, use_container_width=True)
    with col2:
        fig_sc = px.scatter(
            conf_data, x="Confidence", y="Item",
            color="Verdict",
            color_discrete_map={"C":"#2ecc71","PC":"#f39c12","NC":"#e74c3c","NA":"#95a5a6"},
            title="Confidence by Item & Verdict",
        )
        fig_sc.update_layout(yaxis={"visible": False})
        st.plotly_chart(fig_sc, use_container_width=True)

    # Human review flag
    review_items = get_items_needing_review(explanations)
    if review_items:
        st.warning(
            f"⚠️ **{len(review_items)} item(s) flagged for mandatory human review** "
            f"(confidence < 45% or contradictory evidence signals)."
        )
    else:
        st.success("✅ All items have sufficient confidence — no mandatory escalations.")

    # ── Per-item drill-down ───────────────────────────────────────────────────
    st.markdown("### 🔎 Item Drill-Down")
    all_ids = list(explanations.keys())
    sel_id  = st.selectbox(
        "Select a checklist item:", all_ids,
        key=f"xai_select_{arch_name}"
    )

    if sel_id:
        exp = explanations[sel_id]
        raw_vrd = verdicts.get(sel_id, {})

        h1, h2, h3 = st.columns(3)
        h1.metric("Verdict", f"{STATUS_COLOR.get(exp.final_verdict,'')} {exp.final_verdict}")
        h2.metric("Confidence", f"{CONF_COLOR.get(exp.confidence_label,'')} {exp.confidence_label} ({exp.confidence:.0%})")
        h3.metric("Similarity", f"{exp.similarity_score:.3f}")
        st.markdown(f"**Question:** {exp.question}")

        # Confidence breakdown
        with st.expander("📊 Confidence Breakdown (3-factor model)", expanded=True):
            cb1, cb2, cb3 = st.columns(3)
            cb1.metric("Similarity", f"{exp.sim_confidence:.0%}", help="Semantic relevance of retrieved evidence (40%)")
            cb2.metric("Keyword Clarity", f"{exp.keyword_clarity:.0%}", help="Clarity of NC/C keyword signal (35%)")
            cb3.metric("Coverage", f"{exp.coverage_score:.0%}", help="Evidence breadth and length (25%)")

            fig_radar = go.Figure(go.Scatterpolar(
                r=[exp.sim_confidence, exp.keyword_clarity, exp.coverage_score, exp.sim_confidence],
                theta=["Similarity (40%)", "Keyword Clarity (35%)", "Coverage (25%)", "Similarity (40%)"],
                fill="toself", name="Confidence",
                line_color="#2980b9",
            ))
            fig_radar.update_layout(
                polar=dict(radialaxis=dict(visible=True, range=[0,1])),
                height=260, margin=dict(t=10, b=10)
            )
            st.plotly_chart(fig_radar, use_container_width=True)

        # Decision trace
        with st.expander("🔗 Decision Trace (step-by-step reasoning)", expanded=True):
            for step in exp.decision_trace:
                st.markdown(f"- {step}")

        # Keyword attribution
        with st.expander("🔑 Keyword Attribution", expanded=True):
            k1, k2, k3 = st.columns(3)
            with k1:
                st.markdown("**🔴 NC keywords:**")
                for kw in (exp.nc_keywords_found or ["None"]):
                    st.code(kw, language=None)
            with k2:
                st.markdown("**🟢 C keywords:**")
                for kw in (exp.c_keywords_found or ["None"]):
                    st.code(kw, language=None)
            with k3:
                st.markdown("**🟡 PC keywords:**")
                for kw in (exp.pc_keywords_found or ["None"]):
                    st.code(kw, language=None)

            if exp.chunk_contributions:
                st.markdown("**Chunk-level polarity:**")
                for cc in exp.chunk_contributions:
                    pol_icon = {"NC-dominant":"🔴","C-dominant":"🟢","PC-signal":"🟡",
                                "Contradictory":"⚡","Neutral":"⚫"}.get(cc.polarity,"⚫")
                    st.markdown(f"**#{cc.rank}** {pol_icon} `{cc.polarity}` — _{cc.text[:150]}_")

        # Counterfactual
        with st.expander("🔄 Counterfactual Explanation", expanded=True):
            st.markdown(exp.counterfactual)
            st.info(f"💡 **To change this verdict:** {exp.what_would_change}")

        # Uncertainty
        if exp.uncertainty_reasons:
            with st.expander("⚠️ Uncertainty Signals", expanded=True):
                for r in exp.uncertainty_reasons:
                    st.warning(r)
        else:
            st.success("✅ No uncertainty signals — decision is reliable.")

        # Raw evidence
        norm_vrd = normalise_verdict(raw_vrd, arch_name)
        with st.expander("📄 Retrieved Evidence", expanded=False):
            chunks = norm_vrd.get("retrieved_chunks", [])
            if chunks:
                for i, ch in enumerate(chunks, 1):
                    st.markdown(f"**{i}.** {ch}")
            else:
                st.caption("No evidence chunks available for this item.")


# ═══════════════════════════════════════════════════════════════════════════════
# FRAUD RISK PANEL
# ═══════════════════════════════════════════════════════════════════════════════

def render_fraud_tab(fraud_result: Dict[str, Any]):
    """Render the fraud/anomaly risk panel inside a tab."""
    if not fraud_result:
        st.info("Run a verification first to see fraud analysis.")
        return

    risk_lv = fraud_result.get("risk_level", "Unknown")
    score   = fraud_result.get("composite_score", 0.0)
    em      = RISK_COLOR.get(risk_lv, "")

    f1, f2, f3 = st.columns(3)
    f1.metric("Composite Risk Score", f"{score:.1f} / 100")
    f2.metric("Risk Level", f"{em} {risk_lv}")
    f3.metric("Active Flags", len(fraud_result.get("all_flags", [])))

    rec = fraud_result.get("recommendation", "")
    (st.error if risk_lv == "Critical" else
     st.warning if risk_lv in ("High", "Medium") else st.success)(rec)

    # Signal breakdown
    st.markdown("### Signal Breakdown")
    signals = fraud_result.get("signals", {})
    sig_df = pd.DataFrame([
        {"Signal": SIGNAL_LABELS.get(k, k), "Severity": v["severity"],
         "Flags": len(v["flags"])}
        for k, v in signals.items()
    ])
    fig = px.bar(
        sig_df, x="Signal", y="Severity", text="Severity",
        color="Severity",
        color_continuous_scale=["#2ecc71", "#f39c12", "#e74c3c"],
        range_color=[0, 100],
        title="Fraud Signal Severities (0–100)",
    )
    fig.update_traces(texttemplate="%{text:.0f}", textposition="outside")
    fig.update_layout(xaxis_tickangle=-25, yaxis_range=[0,115], coloraxis_showscale=False)
    st.plotly_chart(fig, use_container_width=True)

    st.markdown("### 🚩 Active Flags")
    for flag in (fraud_result.get("all_flags") or ["No flags raised."]):
        (st.warning if flag != "No flags raised." else st.success)(f"• {flag}")

    st.markdown("### Signal Details")
    for k, v in signals.items():
        sev   = v.get("severity", 0)
        flags = v.get("flags", [])
        em2   = "🟢" if sev < 20 else ("🟡" if sev < 50 else "🔴")
        with st.expander(f"{em2} {SIGNAL_LABELS.get(k,k)} — {sev:.0f}/100", expanded=sev > 30):
            if flags:
                for f in flags:
                    st.markdown(f"• {f}")
            else:
                st.success("No issues for this signal.")


# ═══════════════════════════════════════════════════════════════════════════════
# ACCOUNTABILITY PANEL
# ═══════════════════════════════════════════════════════════════════════════════

def render_accountability_tab(
    session,
    checklist: List[Dict[str, Any]],
    verdicts: Dict[str, Dict[str, Any]],
    explanations: Dict[str, VerdictExplanation],
    fraud_result: Dict[str, Any],
    scoring: Dict[str, Any],
    arch_name: str,
    auditor_name_key: str,
):
    """Render the full accountability panel inside a tab."""
    if not session:
        st.info("Run a verification first to access accountability features.")
        return

    override_key = f"overrides_{arch_name}"
    if override_key not in st.session_state:
        st.session_state[override_key] = []
    overrides = st.session_state[override_key]

    # ── Provenance ────────────────────────────────────────────────────────────
    with st.expander("🔐 Session Provenance", expanded=True):
        p1, p2 = st.columns(2)
        with p1:
            st.markdown(f"**Session ID:** `{session.session_id}`")
            st.markdown(f"**Timestamp:** `{session.timestamp}`")
            st.markdown(f"**VERA Version:** `{session.vera_version}`")
        with p2:
            st.markdown(f"**Report SHA-256:** `{session.report_hash[:32]}…`")
            st.markdown(f"**Report Length:** {session.report_length} chars")
            st.markdown(f"**Checklist Items:** {session.n_checklist_items}")

    # ── Escalation ────────────────────────────────────────────────────────────
    escalation = get_escalation_report(explanations, overrides)
    e1, e2, e3 = st.columns(3)
    e1.metric("Total Flagged", escalation["total_flagged"])
    e2.metric("Pending Review", len(escalation["pending_review"]))
    e3.metric("Resolved (Override)", len(escalation["resolved_by_override"]))

    if escalation["escalation_complete"]:
        st.success("✅ All flagged items have been reviewed or overridden.")
    elif escalation["pending_review"]:
        st.warning(f"⚠️ {len(escalation['pending_review'])} item(s) still require human review.")
        pend_df = pd.DataFrame(escalation["pending_review"])
        st.dataframe(pend_df, use_container_width=True)

    # ── Override panel ────────────────────────────────────────────────────────
    st.markdown("---")
    st.markdown("### ✏️ Auditor Override")
    st.caption(
        "Override a system verdict. A **mandatory justification** is required. "
        "The original system verdict is always preserved in the log."
    )

    if verdicts:
        o1, o2 = st.columns(2)
        with o1:
            ov_item = st.selectbox(
                "Select item to override:",
                list(verdicts.keys()),
                key=f"override_item_{arch_name}"
            )
            if ov_item:
                cur = verdicts.get(ov_item, {}).get("status", "NC")
                exp_i = explanations.get(ov_item)
                st.markdown(f"**System Verdict:** {STATUS_COLOR.get(cur,'')} `{cur}`")
                if exp_i:
                    st.markdown(f"**Confidence:** {exp_i.confidence_label} ({exp_i.confidence:.0%})")
                q_text = next(
                    (i["question"] for i in checklist if i["item_id"] == ov_item), ""
                )
                st.markdown(f"**Question:** {q_text[:120]}")

        with o2:
            new_v = st.selectbox(
                "New verdict:", ["C", "PC", "NC", "NA"],
                key=f"override_v_{arch_name}"
            )
            ov_role = st.selectbox(
                "Your role:", ["Lead Auditor", "Supervisor", "Senior Auditor", "Auditor"],
                key=f"override_role_{arch_name}"
            )
            justif = st.text_area(
                "Justification (mandatory):",
                placeholder="Explain the basis for your override decision…",
                key=f"override_just_{arch_name}", height=110
            )

        if st.button("💾 Submit Override", type="primary", key=f"submit_ovr_{arch_name}"):
            auditor = st.session_state.get(auditor_name_key, "").strip()
            if not justif.strip():
                st.error("Justification is mandatory.")
            elif not auditor:
                st.error("Please enter your auditor name in the sidebar.")
            else:
                try:
                    ovr = record_override(
                        session_id     = session.session_id,
                        item_id        = ov_item,
                        question       = q_text,
                        system_verdict = cur,
                        auditor_verdict= new_v,
                        justification  = justif,
                        auditor_name   = auditor,
                        auditor_role   = ov_role,
                    )
                    st.session_state[override_key].append(ovr)
                    st.success(
                        f"✅ Override logged: [{ov_item}] `{cur}` → `{new_v}` "
                        f"by **{ovr.auditor_name}** (ID: `{ovr.override_id[:8]}…`)"
                    )
                except ValueError as err:
                    st.error(str(err))

    # Override history
    if overrides:
        st.markdown("### 📜 Override History")
        ov_rows = [
            {"Item": o.item_id, "System": o.system_verdict, "Auditor": o.auditor_verdict,
             "By": o.auditor_name, "Role": o.auditor_role,
             "Time": o.timestamp, "Justification": o.justification[:80]}
            for o in overrides
        ]
        st.dataframe(pd.DataFrame(ov_rows), use_container_width=True)

    # Export
    st.markdown("---")
    st.markdown("### 📤 Export Accountability Report")
    if st.button("Generate Full Accountability Report (JSON)", key=f"gen_acc_{arch_name}"):
        report = build_accountability_report(
            session      = session,
            checklist    = checklist,
            verdicts     = {
                iid: normalise_verdict(v, arch_name)
                for iid, v in verdicts.items()
            },
            explanations = explanations,
            fraud_result = fraud_result,
            overrides    = overrides,
            scoring      = scoring,
        )
        report_json = export_accountability_report_json(report)
        st.download_button(
            "📥 Download Accountability Report (JSON)",
            data=report_json,
            file_name=f"VERA_{arch_name.upper()}_Accountability_{session.session_id[:8]}.json",
            mime="application/json",
        )
        with st.expander("Preview", expanded=False):
            st.json(report, expanded=2)


# ═══════════════════════════════════════════════════════════════════════════════
# TOP-LEVEL RENDER FUNCTION (call from each arch page)
# ═══════════════════════════════════════════════════════════════════════════════

def compute_and_store_xai(
    arch_name: str,
    checklist: List[Dict[str, Any]],
    verdicts: Dict[str, Dict[str, Any]],
    report_text: str,
    scoring: Dict[str, Any],
    top_k: int,
    auditor_name: str,
    category: str,
    prefix: str,
):
    """
    Run explainability + fraud detection + session provenance.
    Stores results in st.session_state under keys prefixed with `prefix`.
    Call this immediately after the engine returns verdicts.
    """
    normalised = {
        iid: normalise_verdict(v, arch_name)
        for iid, v in verdicts.items()
    }
    expls   = explain_all_verdicts(checklist, normalised)
    fraud   = compute_fraud_risk(checklist, normalised, report_text)
    session = create_session(
        category          = category,
        report_text       = report_text,
        checklist         = checklist,
        verdicts          = normalised,
        fraud_result      = fraud,
        explanations      = expls,
        top_k             = top_k,
        extra_config      = {"architecture": arch_name, "auditor": auditor_name or "Anonymous"},
    )

    st.session_state[f"{prefix}_explanations"] = expls
    st.session_state[f"{prefix}_fraud"]        = fraud
    st.session_state[f"{prefix}_session"]      = session
