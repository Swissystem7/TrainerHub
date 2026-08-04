import json
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from parser import (  # noqa: E402
    strip_code_fence,
    parse_workout_json,
    validate_workout,
    is_usable,
    DURATION_TOLERANCE_MINUTES,
)


def workout(**overrides):
    base = {
        "title": "Functional group session",
        "duration_minutes": 50,
        "intensity": "high",
        "phases": [
            {"name": "Warm-up", "duration_minutes": 10,
             "exercises": [{"name": "Easy jog", "duration_seconds": 180}]},
            {"name": "Main", "duration_minutes": 35,
             "exercises": [{"name": "Squat", "reps": 15}]},
            {"name": "Cool-down", "duration_minutes": 5,
             "exercises": [{"name": "Stretching", "duration_seconds": 300}]},
        ],
    }
    base.update(overrides)
    return base


class StripCodeFence(unittest.TestCase):
    def test_plain_json_is_untouched(self):
        self.assertEqual(strip_code_fence('{"a":1}'), '{"a":1}')

    def test_lowercase_json_fence(self):
        self.assertEqual(strip_code_fence('```json\n{"a":1}\n```'), '{"a":1}')

    # The original inline code only matched a lowercase tag, so an uppercase
    # one left "JSON" glued to the payload and the parse blew up.
    def test_uppercase_json_fence(self):
        self.assertEqual(strip_code_fence('```JSON\n{"a":1}\n```'), '{"a":1}')

    def test_unlabelled_fence(self):
        self.assertEqual(strip_code_fence('```\n{"a":1}\n```'), '{"a":1}')

    def test_unclosed_fence(self):
        self.assertEqual(strip_code_fence('```json\n{"a":1}'), '{"a":1}')

    def test_surrounding_whitespace(self):
        self.assertEqual(strip_code_fence('  \n```json\n{"a":1}\n```  \n'), '{"a":1}')

    def test_a_lone_fence_yields_nothing_rather_than_crashing(self):
        self.assertEqual(strip_code_fence("```"), "")

    def test_non_string_input_is_rejected(self):
        with self.assertRaises(TypeError):
            strip_code_fence({"a": 1})

    def test_round_trip_through_the_parser(self):
        self.assertEqual(parse_workout_json('```json\n{"a": 1}\n```'), {"a": 1})

    def test_invalid_json_still_raises(self):
        with self.assertRaises(json.JSONDecodeError):
            parse_workout_json("```json\nnot json\n```")


class ValidateWorkout(unittest.TestCase):
    def test_a_good_workout_has_no_problems(self):
        self.assertEqual(validate_workout(workout()), [])
        self.assertTrue(is_usable(workout()))

    def test_a_non_object_is_rejected(self):
        self.assertEqual(validate_workout([1, 2, 3]), ["the workout is not an object"])

    def test_missing_title(self):
        self.assertIn("missing title", validate_workout(workout(title="   ")))

    def test_duration_must_be_a_positive_number(self):
        for bad in (0, -10, "50", None, True):
            self.assertFalse(is_usable(workout(duration_minutes=bad)), repr(bad))

    def test_unknown_intensity_is_rejected(self):
        self.assertFalse(is_usable(workout(intensity="extreme")))

    def test_a_workout_needs_phases(self):
        self.assertFalse(is_usable(workout(phases=[])))
        self.assertFalse(is_usable(workout(phases="Warm-up")))

    def test_a_phase_needs_exercises(self):
        broken = workout()
        broken["phases"][1]["exercises"] = []
        self.assertIn("Main has no exercises", validate_workout(broken))

    def test_an_exercise_needs_a_name(self):
        broken = workout()
        broken["phases"][1]["exercises"] = [{"reps": 10}]
        self.assertTrue(any("has no name" in p for p in validate_workout(broken)))

    # An exercise that says neither "how many" nor "for how long" renders as an
    # empty row in the app, which is worse than an obvious error.
    def test_an_exercise_needs_reps_or_a_duration(self):
        broken = workout()
        broken["phases"][1]["exercises"] = [{"name": "Squat"}]
        self.assertTrue(any("neither reps nor a duration" in p for p in validate_workout(broken)))

    def test_an_unknown_phase_name_is_reported(self):
        broken = workout()
        broken["phases"][0]["name"] = "Stretching block"
        self.assertTrue(any("unknown name" in p for p in validate_workout(broken)))

    def test_small_rounding_between_phases_and_total_is_tolerated(self):
        drifted = workout(duration_minutes=50 + DURATION_TOLERANCE_MINUTES)
        self.assertTrue(is_usable(drifted))

    def test_a_contradictory_total_is_caught(self):
        drifted = workout(duration_minutes=50 + DURATION_TOLERANCE_MINUTES + 1)
        self.assertTrue(any("add up to" in p for p in validate_workout(drifted)))

    def test_every_problem_is_reported_not_just_the_first(self):
        broken = workout(title="", intensity="extreme")
        self.assertGreaterEqual(len(validate_workout(broken)), 2)

    def test_the_shipped_demo_workout_is_valid(self):
        # If the fallback shown to every visitor without an API key is broken,
        # the whole demo is broken.
        from demo_workout import DEMO_WORKOUT  # noqa: WPS433
        self.assertEqual(validate_workout(DEMO_WORKOUT), [])


if __name__ == "__main__":
    unittest.main()
