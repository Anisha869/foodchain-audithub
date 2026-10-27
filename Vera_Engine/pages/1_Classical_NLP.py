"""
pages/1_Classical_NLP.py — Architecture 1 with Explainability & Accountability
"""
import streamlit as st
import json, os
import pandas as pd
import plotly.express as px
from sklearn.metrics import accuracy_score, precision_recall_fscore_support

from src.file_converter import normalize_to_excel
from src.engine_nlp import run_classical_nlp_engine
from src.scoring import compute_fssai_scores
from src.excel_export import export_audit_to_excel
from src.xai_widgets import (
    compute_and_store_xai,
    render_explainability_tab,
    render_fraud_tab,
    render_accountability_tab,
)

st.set_page_config(page_title="Architecture 1 | Classical NLP", page_icon="⚙️", layout="wide")
st.title("⚙️ Architecture 1 — Classical NLP (TF-IDF Cosine Similarity)")
st.caption("TF-IDF n-gram cosine matching + phrase-level negative detection. Binary C/NC only.")

CATEGORIES = {
    "General Manufacturing": "general_manufacturing.json",
    "Milk Processing": "milk_processing.json",
    "Meat Processing": "meat_processing.json",
    "Slaughterhouse": "slaughterhouse.json",
    "Catering": "catering.json",
    "Retail": "retail.json",
    "Transport": "transport.json",
    "Storage & Warehouse": "storage_and_warehouse.json",
}
STATUS_CSS = {
    "C":  "background-color:#d4edda;color:#155724;",
    "PC": "background-color:#fff3cd;color:#856404;",
    "NC": "background-color:#f8d7da;color:#721c24;",
    "NA": "background-color:#e2e3e5;color:#383d41;",
}

@st.cache_data
def load_checklist(cat_name):
    fname = CATEGORIES[cat_name]
    with open(os.path.join("data", "fssai_checklists", fname), "r", encoding="utf-8") as f:
        return json.load(f)

@st.cache_data
def load_dataset():
    path = "data/sample_reports/synthetic_100_reports.json"
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

def cat_to_label(cat_str):
    norm = cat_str.lower().replace(' & ', '_and_').replace('&', 'and').replace(' ', '_')
    for k, v in CATEGORIES.items():
        if v.replace('.json', '') == norm:
            return k
    return None

# ── Session state init ────────────────────────────────────────────────────────
for k, d in [
    ("nlp_verdicts", {}), ("nlp_scoring", {}), ("nlp_norm_df", None),
    ("nlp_report_text", ""), ("nlp_checklist", []),
    ("nlp_explanations", {}), ("nlp_fraud", {}), ("nlp_session", None),
]:
    if k not in st.session_state:
        st.session_state[k] = d

# ── Tabs ──────────────────────────────────────────────────────────────────────
tab_app, tab_xai, tab_fraud, tab_acc, tab_perf, tab_example, tab_howto = st.tabs([
    "🚀 Verification", "🧠 Explainability", "🚨 Fraud Risk",
    "📋 Accountability", "📈 Performance", "📖 Example", "ℹ️ How It Works",
])

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 1 — VERIFICATION
# ═══════════════════════════════════════════════════════════════════════════════
with tab_app:
    st.sidebar.header("⚙️ Audit Setup — Arch 1")
    selected_cat   = st.sidebar.radio("FSSAI Category", list(CATEGORIES.keys()), key="nlp_cat")
    threshold_val  = st.sidebar.slider("Cosine Similarity Threshold", 0.30, 0.85, 0.72, 0.02, key="nlp_thresh")
    auditor_name   = st.sidebar.text_input("Auditor Name", placeholder="Enter your name", key="nlp_auditor")
    uploaded_file  = st.sidebar.file_uploader("📎 Upload Audit Report", type=["pdf","docx","xlsx","txt"], key="nlp_upload")
    run_btn        = st.sidebar.button("▶ Run Verification", type="primary", key="nlp_run")
    st.sidebar.warning("⚠️ **Architecture Limit**: Classical NLP supports C/NC only — no Partial Compliance (PC).")

    checklist_data = load_checklist(selected_cat)

    if run_btn:
        if not uploaded_file:
            st.error("Please upload an audit report.")
        else:
            with st.spinner("Normalizing document…"):
                norm_df, _ = normalize_to_excel(uploaded_file)
            report_text = " ".join(norm_df.astype(str).values.flatten())
            st.session_state.nlp_norm_df     = norm_df
            st.session_state.nlp_report_text  = report_text
            st.session_state.nlp_checklist    = checklist_data

            with st.spinner("Running TF-IDF cosine engine…"):
                verdicts = run_classical_nlp_engine(checklist_data, report_text, threshold=threshold_val)
                scoring  = compute_fssai_scores(checklist_data, verdicts)
            st.session_state.nlp_verdicts = verdicts
            st.session_state.nlp_scoring  = scoring

            with st.spinner("Computing explainability & fraud signals…"):
                compute_and_store_xai(
                    arch_name    = "nlp",
                    checklist    = checklist_data,
                    verdicts     = verdicts,
                    report_text  = report_text,
                    scoring      = scoring,
                    top_k        = 1,
                    auditor_name = auditor_name,
                    category     = selected_cat,
                    prefix       = "nlp",
                )
            st.success("✅ Verification complete! Check the tabs above.")

    if st.session_state.nlp_scoring:
        scoring = st.session_state.nlp_scoring
        c1, c2, c3, c4 = st.columns(4)
        c1.metric("Score", f"{scoring['total_awarded']} / {scoring['total_max']}")
        c2.metric("Percentage", f"{scoring['percentage']}%")
        c3.metric("Grade", scoring['grade'])
        c4.metric("Status", scoring['status_label'])

        sec_df = pd.DataFrame([
            {"Section": s, "Awarded": d["awarded"], "Max": d["max"]}
            for s, d in scoring["section_breakdown"].items()
        ])
        fig = px.bar(sec_df, x="Section", y=["Awarded","Max"], barmode="group",
                     title="Section Scores", color_discrete_sequence=["#2ecc71","#bdc3c7"])
        fig.update_layout(xaxis_tickangle=-30)
        st.plotly_chart(fig, use_container_width=True)

        res_df = pd.DataFrame(scoring["scored_items"])
        res_df["Similarity"] = res_df["item_id"].apply(
            lambda iid: st.session_state.nlp_verdicts.get(iid, {}).get("similarity", 0.0)
        )
        styled = res_df.style.applymap(lambda v: STATUS_CSS.get(str(v).upper(),""), subset=["status"])
        st.dataframe(styled, use_container_width=True, height=400)

        chk_df = pd.DataFrame(st.session_state.nlp_checklist)
        norm_df = st.session_state.nlp_norm_df if st.session_state.nlp_norm_df is not None else pd.DataFrame()
        excel_bytes = export_audit_to_excel(chk_df, norm_df, res_df, scoring)
        st.download_button("📥 Download Results (Excel)", excel_bytes,
                           file_name=f"VERA_NLP_{selected_cat.replace(' ','_')}.xlsx",
                           mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    else:
        st.info("👈 Upload a report and click **Run Verification** to begin.")

# ═══════════════════════════════════════════════════════════════════════════════
# TABS 2-4: XAI / FRAUD / ACCOUNTABILITY (shared widgets)
# ═══════════════════════════════════════════════════════════════════════════════
with tab_xai:
    st.subheader("🧠 Explainability — Architecture 1")
    render_explainability_tab(
        st.session_state.nlp_explanations,
        st.session_state.nlp_verdicts,
        arch_name="nlp",
    )

with tab_fraud:
    st.subheader("🚨 Fraud & Anomaly Detection — Architecture 1")
    render_fraud_tab(st.session_state.nlp_fraud)

with tab_acc:
    st.subheader("📋 Accountability & Override — Architecture 1")
    render_accountability_tab(
        session          = st.session_state.nlp_session,
        checklist        = st.session_state.nlp_checklist,
        verdicts         = st.session_state.nlp_verdicts,
        explanations     = st.session_state.nlp_explanations,
        fraud_result     = st.session_state.nlp_fraud,
        scoring          = st.session_state.nlp_scoring,
        arch_name        = "nlp",
        auditor_name_key = "nlp_auditor",
    )

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 5 — PERFORMANCE
# ═══════════════════════════════════════════════════════════════════════════════
with tab_perf:
    st.subheader("Classical NLP Benchmark Performance")
    st.markdown("Evaluated on **16 ground-truth reports** (2 per category). Binary C/NC evaluation.")

    @st.cache_data(show_spinner=False)
    def run_perf_benchmark():
        dataset = load_dataset()
        if not dataset:
            return [], [], [], {}
        per_cat = {}
        for rep in dataset:
            cat = rep['category']
            if cat not in per_cat: per_cat[cat] = []
            if len(per_cat[cat]) < 2: per_cat[cat].append(rep)
        test_reports = [r for v in per_cat.values() for r in v]
        thresholds   = [0.45, 0.55, 0.65, 0.72, 0.80]
        sweep, y_true_main, y_pred_main, per_cat_acc = [], [], [], {}
        for th in thresholds:
            all_t, all_p = [], []
            for rep in test_reports:
                cat_name = cat_to_label(rep['category'])
                if not cat_name: continue
                try: chk = load_checklist(cat_name)
                except: continue
                vds = run_classical_nlp_engine(chk, rep['report_text'], threshold=th)
                for it in chk:
                    iid = it['item_id']
                    gt  = rep['answer_key'].get(iid, {}).get('status', 'NC')
                    p   = vds.get(iid, {}).get('status', 'NC')
                    gt_b = 'C' if gt in ['C','PC','NA'] else 'NC'
                    all_t.append(gt_b); all_p.append(p)
                    if th == 0.72:
                        y_true_main.append(gt_b); y_pred_main.append(p)
                        cat = rep['category']
                        if cat not in per_cat_acc: per_cat_acc[cat] = {'t':[], 'p':[]}
                        per_cat_acc[cat]['t'].append(gt_b); per_cat_acc[cat]['p'].append(p)
            acc = accuracy_score(all_t, all_p) if all_t else 0.0
            sweep.append({'Threshold': th, 'Accuracy': round(acc*100, 1)})
        cat_rows = [{'Category': c.replace('_',' ').title(), 'Accuracy (%)': round(accuracy_score(d['t'],d['p'])*100,1)}
                    for c, d in per_cat_acc.items()]
        return y_true_main, y_pred_main, sweep, cat_rows

    with st.spinner("Computing benchmark metrics…"):
        y_true, y_pred, sweep_data, cat_acc_rows = run_perf_benchmark()

    if y_true:
        p, r, f1, _ = precision_recall_fscore_support(y_true, y_pred, average='weighted', zero_division=0)
        acc = accuracy_score(y_true, y_pred)
        m1, m2, m3, m4 = st.columns(4)
        m1.metric("Accuracy @ 0.72", f"{acc*100:.1f}%")
        m2.metric("Weighted Precision", f"{p*100:.1f}%")
        m3.metric("Weighted Recall", f"{r*100:.1f}%")
        m4.metric("Weighted F1", f"{f1*100:.1f}%")

        sweep_df = pd.DataFrame(sweep_data)
        fig_sw = px.line(sweep_df, x='Threshold', y='Accuracy', markers=True,
                         title="Accuracy vs. Cosine Threshold Sweep",
                         color_discrete_sequence=['#2ecc71'])
        fig_sw.add_vline(x=0.72, line_dash="dash", line_color="red", annotation_text="Chosen (0.72)")
        fig_sw.update_layout(yaxis_range=[50,100])
        st.plotly_chart(fig_sw, use_container_width=True)

        if cat_acc_rows:
            cat_df = pd.DataFrame(cat_acc_rows).sort_values('Accuracy (%)', ascending=False)
            fig_cat = px.bar(cat_df, x='Category', y='Accuracy (%)', text='Accuracy (%)',
                             color='Accuracy (%)', color_continuous_scale='RdYlGn',
                             title="Per-Category Accuracy @ 0.72")
            fig_cat.update_traces(texttemplate='%{text:.1f}%', textposition='outside')
            fig_cat.update_layout(yaxis_range=[0,105], coloraxis_showscale=False)
            st.plotly_chart(fig_cat, use_container_width=True)

        st.info("⚠️ **Architecture Limitation**: Binary C/NC only. Items that should be PC may be misclassified.")
    else:
        st.warning("Dataset not found.")

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 6 — EXAMPLE
# ═══════════════════════════════════════════════════════════════════════════════
with tab_example:
    st.subheader("Pre-Loaded Example — Report_001 | General Manufacturing | Clean")
    dataset = load_dataset()
    if dataset:
        ex_rep = dataset[0]
        ex_chk = load_checklist("General Manufacturing")
        with st.spinner("Running Classical NLP on example…"):
            ex_vds   = run_classical_nlp_engine(ex_chk, ex_rep['report_text'], threshold=0.55)
            ex_score = compute_fssai_scores(ex_chk, ex_vds)
        c1, c2, c3, c4 = st.columns(4)
        c1.metric("Predicted Score", f"{ex_score['total_awarded']} / {ex_score['total_max']}")
        c2.metric("Predicted %", f"{ex_score['percentage']}%")
        c3.metric("Predicted Grade", ex_score['grade'])
        c4.metric("Ground Truth %", f"{ex_rep['percentage']}%",
                  delta=f"{round(ex_score['percentage']-ex_rep['percentage'],1)}% vs GT")
        st.info(ex_rep['report_text'][:600] + "…")
        res_df = pd.DataFrame(ex_score['scored_items'])
        res_df['GT'] = res_df['item_id'].apply(lambda x: ex_rep['answer_key'].get(x,{}).get('status','?'))
        res_df['Match'] = res_df.apply(
            lambda r: '✅' if r['status']==r['GT'] or (r['GT'] in ['C','PC','NA'] and r['status']=='C') else '❌', axis=1
        )
        styled = res_df[['item_id','question','section','status','GT','Match','evidence']].style\
            .applymap(lambda v: STATUS_CSS.get(str(v).upper(),""), subset=['status','GT'])
        st.dataframe(styled, use_container_width=True)

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 7 — HOW IT WORKS
# ═══════════════════════════════════════════════════════════════════════════════
with tab_howto:
    st.subheader("ℹ️ Architecture 1 — How Classical NLP Works")
    st.markdown("""
    ### Pipeline Architecture: TF-IDF Cosine Similarity Matching

    Architecture 1 evaluates FSSAI inspection checklists using classical statistical Natural Language Processing (no neural networks or generative LLMs required):

    | Step | Component | Method | Output |
    |---|---|---|---|
    | **1. Document Ingestion** | Normalization Pipeline | `file_converter.py` (docx/pdf/xlsx) | Plain text & structured tables |
    | **2. Segmentation** | Sentence Segmenter | `report_ingestion.py` | Observation sentences (excluding header metadata) |
    | **3. Vectorization** | `TfidfVectorizer` | Word n-grams (1, 2) + English stopword filter | High-dimensional sparse TF-IDF vectors |
    | **4. Similarity Matching** | Cosine Similarity | $\\cos(\\theta) = \\frac{\\mathbf{q} \\cdot \\mathbf{s}}{\\|\\mathbf{q}\\| \\|\\mathbf{s}\\|}$ | Cosine match score $\\in [0.0, 1.0]$ |
    | **5. Deficiency Filter** | Phrase Rule Classifier | Negative dictionary lookup (*'failed to'*, *'deficiency'*, *'no records'*) | Force **NC** if deficiency keywords detected |
    | **6. Threshold Gating** | Decision Boundary | Cosine threshold $\\ge 0.72$ | Binary verdict: **C** or **NC** |
    | **7. Trustworthy AI** | Explainer & Fraud Detector | 3-factor confidence radar + 6 forensic anomaly signals | Item explanations & fraud report |

    ### Decision Logic & The Binary Limitation
    1. **Sentence Matching**: For each checklist requirement $Q_i$, the engine computes cosine similarity against all report sentences $S_j$. The sentence with the highest cosine score is selected as candidate evidence.
    2. **Negative Marker Detection**: If the matched sentence contains explicit deficiency keywords (e.g., *'failed to'*, *'deficiency noted'*, *'violation found'*, *'unhygienic'*, *'no calibration'*, *'was absent'*), the verdict is immediately assigned **NC**.
    3. **Threshold Gate**: If similarity $< 0.72$, the requirement is considered not evidenced in the facility report $\\to$ **NC**. Otherwise $\\to$ **C**.
    4. **Architecture Limitation**: Classical TF-IDF cannot perform nuanced semantic entailment. It cannot natively classify **Partial Compliance (PC)**, marking partial implementations as NC or full C depending on phrasing.
    """)
