import json
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))

from validate_exercises import validate  # noqa: E402


ROOT = os.path.join(os.path.dirname(__file__), "..")
DATA = os.path.join(ROOT, "data", "exercises.json")


def load():
    with open(DATA, encoding="utf-8") as fh:
        return json.load(fh)


class ExerciseLibrary(unittest.TestCase):
    def test_seed_file_is_the_union_and_stays_unverified(self):
        data = load()
        self.assertEqual(validate(data), [])
        self.assertEqual(len(data["exercises"]), 79)
        self.assertTrue(all(ex["verified"] is False for ex in data["exercises"]))
        ids = {ex["id"] for ex in data["exercises"]}
        self.assertIn("ig-DeO8oVyADue", ids)
        self.assertIn("ig-DdS9ue-knAM", ids)
        missing = [ex for ex in data["exercises"] if ex["id"] in ("ig-DdHOFvtKk9z", "ig-DdI_86lNFfY")]
        self.assertEqual(len(missing), 2)
        self.assertTrue(all(ex["muscle_group"] == "לא ממוין" for ex in missing))
        self.assertTrue(all(ex["name_he"] == "ריל לא ממוין" for ex in missing))

    def test_unspecified_reps_stay_unknown(self):
        data = load()
        unknown = [ex for ex in data["exercises"] if "לא מצוין" in ex["source_sets_reps"]]
        for ex in unknown:
            self.assertEqual(ex["sets_reps"], "לא ממוין")
            self.assertIsNone(ex["sets"])
            self.assertEqual(ex["reps"], "")

    def test_bench_core_reel_keeps_the_mapped_prescription(self):
        data = load()
        bench = next(ex for ex in data["exercises"] if ex["id"] == "ig-DfDEp8PRL3f")
        self.assertEqual(bench["creator"], "coachgiress38")
        self.assertEqual(bench["muscle_group"], "ליבה")
        self.assertEqual(bench["sets"], 3)
        self.assertEqual(bench["reps"], "20")
        self.assertIn("ספסל", bench["equipment"])
        self.assertEqual(bench["steps_he"], ["ברך שמאל/ימין", "פוש-אפ מוגבה", "נגיעת כתף"])
        self.assertEqual(bench["source_url"], "https://www.instagram.com/reel/DfDEp8PRL3f/")
        self.assertFalse(bench["verified"])

    def test_invented_detail_on_an_unmapped_reel_is_rejected(self):
        data = load()
        bare = next(ex for ex in data["exercises"] if ex["id"] == "ig-DdHOFvtKk9z")
        bare["muscle_group"] = "חזה"
        bare["name_he"] = "לחיצת חזה"
        errors = validate(data)
        self.assertTrue(errors)
        self.assertTrue(any("muscle_group" in line or "name_he" in line for line in errors))


if __name__ == "__main__":
    unittest.main()
