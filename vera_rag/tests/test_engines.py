import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.engine_nlp import run_nlp_engine
from src.engine_rag import run_rag_engine, rag_bot_answer
from src.engine_nli import run_nli_engine
from src.engine_okf import run_okf_engine
from src.explainer import explain_all_verdicts
from src.fraud_detector import compute_fraud_risk
from rag_bridge import handle_verify, handle_nlp, handle_okf, handle_nli, handle_compare, handle_ask


class VeraEngineSuiteTests(unittest.TestCase):
    def setUp(self):
        self.sample_checklist = [
            {
                "item_id": "GM_01",
                "question": "Food establishment has an updated FSSAI license and is displayed prominently.",
                "category": "General Manufacturing",
                "asterisk_critical": False,
            },
            {
                "item_id": "GM_02",
                "question": "Adequate natural or artificial lighting is provided in all food preparation areas.",
                "category": "General Manufacturing",
                "asterisk_critical": False,
            },
            {
                "item_id": "GM_03",
                "question": "Pest control program is active, verified, and documented.",
                "category": "General Manufacturing",
                "asterisk_critical": True,
            },
        ]
        self.sample_report = (
            "Food establishment has an updated FSSAI license and is displayed prominently at the entrance. "
            "Lighting in food preparation areas was found partially adequate, but some fixtures were broken. "
            "Pest control program was absent with no records found on-site."
        )

    # 1. Classical NLP Engine Tests
    def test_nlp_engine(self):
        result = run_nlp_engine(self.sample_checklist, self.sample_report, top_k=3)
        self.assertTrue(result["success"])
        self.assertEqual(result["engine"], "classical_nlp")
        verdicts = result["verdicts"]
        self.assertIn(verdicts["GM_01"]["status"], {"C", "PC"})
        self.assertEqual(verdicts["GM_03"]["status"], "NC")
        self.assertEqual(result["diagnostics"]["total_evaluated"], 3)

    # 2. Offline RAG Engine Tests
    def test_rag_engine_and_qa_bot(self):
        verdicts, diagnostics = run_rag_engine(self.sample_checklist, self.sample_report, top_k=3)
        self.assertIn("GM_01", verdicts)
        self.assertIn(verdicts["GM_01"]["status"], {"C", "PC"})
        self.assertEqual(verdicts["GM_03"]["status"], "NC")
        self.assertEqual(diagnostics["total_evaluated"], 3)
        self.assertEqual(diagnostics["faithfulness_rate"], 1.0)

        # Test RAG Extractive Bot
        answer = rag_bot_answer("Is FSSAI license displayed?", self.sample_report, top_k=2)
        self.assertIn("FSSAI license", answer)
        self.assertIn("Relevant excerpts", answer)

    # 3. Deep Learning NLI Engine Tests
    def test_nli_engine(self):
        result = run_nli_engine(self.sample_checklist, self.sample_report, top_k=3)
        self.assertTrue(result["success"])
        self.assertIn(result["engine"], {"deep_learning_nli", "nli_heuristic_fallback"})
        verdicts = result["verdicts"]
        self.assertIn(verdicts["GM_01"]["status"], {"C", "PC"})
        self.assertEqual(verdicts["GM_03"]["status"], "NC")

    # 4. OKF Knowledge Graph Traversal Tests
    def test_okf_engine_traversal(self):
        result = run_okf_engine(self.sample_checklist, self.sample_report, top_k=3)
        self.assertTrue(result["success"])
        self.assertEqual(result["engine"], "okf")
        gm1 = result["verdicts"]["GM_01"]
        self.assertIn(gm1["status"], {"C", "PC"})
        # Verify graph breadcrumb path
        self.assertEqual(gm1["traversal_path"][0], "index.md")
        self.assertEqual(gm1["traversal_path"][-1], "GM_01.md")
        self.assertGreaterEqual(result["diagnostics"]["traversal_precision"], 0.6)

    # 5. Bridge Handlers (Verify, NLP, OKF, NLI, Compare, Ask)
    def test_bridge_compare_all_four_engines(self):
        payload = {
            "checklist": self.sample_checklist,
            "report_text": self.sample_report,
            "top_k": 3,
        }
        comp = handle_compare(payload)
        self.assertTrue(comp["success"])
        self.assertEqual(comp["engine"], "compare")
        self.assertIn("nlp", comp["engines"])
        self.assertIn("rag", comp["engines"])
        self.assertIn("okf", comp["engines"])
        self.assertIn("nli", comp["engines"])
        self.assertEqual(comp["diagnostics"]["total_evaluated"], 3)

    # 6. Explainer & Fraud Detector
    def test_explainer_and_fraud_detector(self):
        verdicts, _ = run_rag_engine(self.sample_checklist, self.sample_report, top_k=3)
        explanations = explain_all_verdicts(self.sample_checklist, verdicts)
        self.assertEqual(len(explanations), 3)
        self.assertIn(explanations["GM_01"].confidence_label, {"High", "Medium", "Low"})

        fraud = compute_fraud_risk(self.sample_checklist, verdicts, self.sample_report)
        self.assertIn(fraud["risk_level"], {"Low", "Medium", "High", "Critical"})
        self.assertIn("signals", fraud)


if __name__ == "__main__":
    unittest.main()
