import sys
sys.path.insert(0, '.')
import json, time, os
import numpy as np
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix

from src.engine_nlp import run_classical_nlp_engine
from src.engine_nli import run_nli_engine
from src.engine_rag import run_rag_engine
from src.engine_okf import run_okf_engine

with open("data/sample_reports/synthetic_100_reports.json", "r", encoding="utf-8") as f:
    dataset = json.load(f)

CATEGORIES = {
    'General Manufacturing': 'general_manufacturing.json',
    'Milk Processing': 'milk_processing.json',
    'Meat Processing': 'meat_processing.json',
    'Slaughterhouse': 'slaughterhouse.json',
    'Catering': 'catering.json',
    'Retail': 'retail.json',
    'Transport': 'transport.json',
    'Storage & Warehouse': 'storage_and_warehouse.json'
}

def load_chk(cat_name):
    fname = CATEGORIES.get(cat_name, 'general_manufacturing.json')
    with open(f"data/fssai_checklists/{fname}", "r", encoding="utf-8") as f:
        return json.load(f)

# Pick 16 test reports (2 per category)
test_reports = []
cat_counts = {}
for r in dataset:
    c = r['category']
    if cat_counts.get(c, 0) < 2:
        test_reports.append(r)
        cat_counts[c] = cat_counts.get(c, 0) + 1

print(f"Testing on {len(test_reports)} reports across {len(cat_counts)} categories...")

results = {}

# 1. Classical NLP
t0 = time.time()
nlp_true, nlp_pred = [], []
for r in test_reports:
    chk = load_chk(r['category'])
    v = run_classical_nlp_engine(chk, r['report_text'], threshold=0.55)
    for it in chk:
        it_id = it['item_id']
        gt = r['answer_key'].get(it_id, {}).get('status', 'NC')
        pred = v.get(it_id, {}).get('status', 'NC')
        gt_bin = 'C' if gt in ['C', 'PC', 'NA'] else 'NC'
        nlp_true.append(gt_bin)
        nlp_pred.append(pred)
t_nlp = time.time() - t0
acc_nlp = accuracy_score(nlp_true, nlp_pred)
p_nlp, r_nlp, f1_nlp, _ = precision_recall_fscore_support(nlp_true, nlp_pred, average='weighted', zero_division=0)
results['Classical_NLP'] = {
    'time_sec': round(t_nlp, 3),
    'time_per_report_ms': round((t_nlp / len(test_reports)) * 1000, 1),
    'accuracy': round(float(acc_nlp) * 100, 2),
    'precision': round(float(p_nlp) * 100, 2),
    'recall': round(float(r_nlp) * 100, 2),
    'f1': round(float(f1_nlp) * 100, 2),
    'total_evaluated': len(nlp_true)
}
print("Classical NLP done:", results['Classical_NLP'])

# 2. Deep Learning NLI
t0 = time.time()
nli_true, nli_pred = [], []
for r in test_reports:
    chk = load_chk(r['category'])
    v = run_nli_engine(chk, r['report_text'])
    for it in chk:
        it_id = it['item_id']
        gt = r['answer_key'].get(it_id, {}).get('status', 'NC')
        pred = v.get(it_id, {}).get('status', 'NC')
        gt_cls = gt if gt in ['C', 'PC', 'NC', 'NA'] else 'C'
        pred_cls = pred if pred in ['C', 'PC', 'NC', 'NA'] else 'NC'
        nli_true.append(gt_cls)
        nli_pred.append(pred_cls)
t_nli = time.time() - t0
acc_nli = accuracy_score(nli_true, nli_pred)
p_nli, r_nli, f1_nli, _ = precision_recall_fscore_support(nli_true, nli_pred, average='weighted', zero_division=0)
results['Deep_Learning_NLI'] = {
    'time_sec': round(t_nli, 3),
    'time_per_report_ms': round((t_nli / len(test_reports)) * 1000, 1),
    'accuracy': round(float(acc_nli) * 100, 2),
    'precision': round(float(p_nli) * 100, 2),
    'recall': round(float(r_nli) * 100, 2),
    'f1': round(float(f1_nli) * 100, 2),
    'total_evaluated': len(nli_true)
}
print("Deep Learning NLI done:", results['Deep_Learning_NLI'])

# 3. Dense Extractive RAG
t0 = time.time()
rag_true, rag_pred = [], []
for r in test_reports:
    chk = load_chk(r['category'])
    v, _ = run_rag_engine(chk, r['report_text'], top_k=4)
    for it in chk:
        it_id = it['item_id']
        gt = r['answer_key'].get(it_id, {}).get('status', 'NC')
        pred = v.get(it_id, {}).get('status', 'NC')
        rag_true.append(gt)
        rag_pred.append(pred)
t_rag = time.time() - t0
acc_rag = accuracy_score(rag_true, rag_pred)
p_rag, r_rag, f1_rag, _ = precision_recall_fscore_support(rag_true, rag_pred, average='weighted', zero_division=0)
results['Extractive_RAG'] = {
    'time_sec': round(t_rag, 3),
    'time_per_report_ms': round((t_rag / len(test_reports)) * 1000, 1),
    'accuracy': round(float(acc_rag) * 100, 2),
    'precision': round(float(p_rag) * 100, 2),
    'recall': round(float(r_rag) * 100, 2),
    'f1': round(float(f1_rag) * 100, 2),
    'total_evaluated': len(rag_true)
}
print("Extractive RAG done:", results['Extractive_RAG'])

# 4. OKF Traversal Engine
t0 = time.time()
okf_true, okf_pred = [], []
for r in test_reports:
    chk = load_chk(r['category'])
    v, _ = run_okf_engine(r['category'], chk, r['report_text'])
    for it in chk:
        it_id = it['item_id']
        gt = r['answer_key'].get(it_id, {}).get('status', 'NC')
        pred = v.get(it_id, {}).get('status', 'NC')
        okf_true.append(gt)
        okf_pred.append(pred)
t_okf = time.time() - t0
acc_okf = accuracy_score(okf_true, okf_pred)
p_okf, r_okf, f1_okf, _ = precision_recall_fscore_support(okf_true, okf_pred, average='weighted', zero_division=0)
results['OKF_Traversal'] = {
    'time_sec': round(t_okf, 3),
    'time_per_report_ms': round((t_okf / len(test_reports)) * 1000, 1),
    'accuracy': round(float(acc_okf) * 100, 2),
    'precision': round(float(p_okf) * 100, 2),
    'recall': round(float(r_okf) * 100, 2),
    'f1': round(float(f1_okf) * 100, 2),
    'total_evaluated': len(okf_true)
}
print("OKF Traversal done:", results['OKF_Traversal'])

os.makedirs('scratch', exist_ok=True)
with open('scratch/benchmark_summary.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=2)
print("Benchmark complete! Saved to scratch/benchmark_summary.json")
