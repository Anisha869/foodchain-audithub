import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.engine_nlp import run_nlp_engine
from src.engine_okf import run_okf_engine


class EngineTests(unittest.TestCase):
    def test_nlp_matches_report_evidence_and_marks_unmentioned_items(self):
        result = run_nlp_engine(
            [
                {"item_id": "water", "question": "Potable water is tested for quality."},
                {"item_id": "pest", "question": "Pest control logs are reviewed."},
            ],
            "Potable water is tested for quality every six months.",
        )

        self.assertIn(result["verdicts"]["water"]["status"], {"C", "PC", "NC"})
        self.assertTrue(result["verdicts"]["water"]["retrieved_chunks"])
        self.assertTrue(result["verdicts"]["pest"]["missing_evidence"])
        self.assertEqual(result["diagnostics"]["total_evaluated"], 2)

    def test_okf_traverses_known_item_and_does_not_invent_unmapped_verdicts(self):
        result = run_okf_engine(
            [
                {
                    "item_id": "GM_13",
                    "question": "Potable water is tested every six months.",
                    "category": "General Manufacturing",
                },
                {
                    "item_id": "custom",
                    "question": "Cold storage remains below four degrees.",
                    "category": "Cold Storage",
                },
            ],
            "Potable water is tested every six months.",
        )

        mapped = result["verdicts"]["GM_13"]
        self.assertEqual(mapped["source_item"]["item_id"], "GM_13")
        self.assertEqual(mapped["traversal_path"][-1], "GM_13")
        self.assertEqual(result["verdicts"]["custom"]["status"], "UNMAPPED")
        self.assertEqual(result["diagnostics"]["unmapped"], 1)


if __name__ == "__main__":
    unittest.main()
