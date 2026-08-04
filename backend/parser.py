"""TrainerHub — turning a model's reply into a workout we can trust.

The API asks a language model for JSON. Two things then go wrong in practice,
and both used to be handled inline in the request handler where nothing could
test them:

1. The model wraps its answer in a markdown code fence, sometimes labelled
   ``json``, sometimes ``JSON``, sometimes not labelled at all.
2. The JSON parses, but is not actually a workout — a phase is missing its
   exercises, the durations contradict the stated total, the intensity is a
   word we never asked for. The frontend then renders a broken plan.

Everything here is pure: text in, data out, no network and no framework.
"""

import json

PHASE_NAMES = ("Warm-up", "Main", "Cool-down")
INTENSITIES = ("low", "medium", "high")

# How far the sum of the phases may drift from the stated total before we call
# it a contradiction. Models routinely round each phase, so a couple of minutes
# of slack is normal; ten is a hallucination.
DURATION_TOLERANCE_MINUTES = 5


def strip_code_fence(raw):
    """Return the payload inside a markdown code fence, if there is one.

    Handles ```json, ```JSON and a bare ```. Text that is not fenced is
    returned unchanged apart from surrounding whitespace.
    """
    if not isinstance(raw, str):
        raise TypeError("expected a string")

    text = raw.strip()
    if not text.startswith("```"):
        return text

    # Drop the opening fence and its optional language tag.
    without_open = text[3:]
    newline = without_open.find("\n")
    first_line = (without_open[:newline] if newline != -1 else without_open).strip()
    if first_line.lower() in ("json", ""):
        without_open = without_open[newline + 1:] if newline != -1 else ""

    closing = without_open.rfind("```")
    if closing != -1:
        without_open = without_open[:closing]

    return without_open.strip()


def parse_workout_json(raw):
    """Strip any fence and parse. Raises json.JSONDecodeError like json.loads."""
    return json.loads(strip_code_fence(raw))


def validate_workout(workout):
    """Return a list of human-readable problems. Empty list means it is usable."""
    problems = []

    if not isinstance(workout, dict):
        return ["the workout is not an object"]

    if not str(workout.get("title", "")).strip():
        problems.append("missing title")

    total = workout.get("duration_minutes")
    if not isinstance(total, (int, float)) or isinstance(total, bool) or total <= 0:
        problems.append("duration_minutes must be a positive number")
        total = None

    intensity = workout.get("intensity")
    if intensity not in INTENSITIES:
        problems.append("intensity must be one of %s" % ", ".join(INTENSITIES))

    phases = workout.get("phases")
    if not isinstance(phases, list) or not phases:
        problems.append("a workout needs at least one phase")
        return problems

    phase_total = 0
    for i, phase in enumerate(phases):
        label = "phase %d" % (i + 1)
        if not isinstance(phase, dict):
            problems.append("%s is not an object" % label)
            continue

        name = phase.get("name")
        if name in PHASE_NAMES:
            label = name
        else:
            problems.append("%s has an unknown name: %r" % (label, name))

        minutes = phase.get("duration_minutes")
        if isinstance(minutes, (int, float)) and not isinstance(minutes, bool) and minutes > 0:
            phase_total += minutes
        else:
            problems.append("%s has no usable duration" % label)

        exercises = phase.get("exercises")
        if not isinstance(exercises, list) or not exercises:
            problems.append("%s has no exercises" % label)
            continue

        for j, exercise in enumerate(exercises):
            if not isinstance(exercise, dict) or not str(exercise.get("name", "")).strip():
                problems.append("%s, exercise %d has no name" % (label, j + 1))
                continue
            # An exercise has to say either how many times or for how long.
            if exercise.get("reps") is None and exercise.get("duration_seconds") is None:
                problems.append(
                    "%s, %s has neither reps nor a duration"
                    % (label, exercise.get("name"))
                )

    if total is not None and abs(phase_total - total) > DURATION_TOLERANCE_MINUTES:
        problems.append(
            "the phases add up to %g minutes but the workout claims %g"
            % (phase_total, total)
        )

    return problems


def is_usable(workout):
    return not validate_workout(workout)
