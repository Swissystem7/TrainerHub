#!/usr/bin/env python3
"""Validate data/exercises.json.

Same rules as js/reel-library.js validateLibrary and the README section
«איך מוסיפים תרגיל». Run after appending an exercise:

    python scripts/validate_exercises.py
    python scripts/validate_exercises.py path/to/exercises.json
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

MUSCLE_GROUPS = [
    "ליבה",
    "חזה",
    "גב",
    "רגליים/ישבן",
    "גוף מלא/HIIT",
    "מוביליטי",
    "אחר",
    "לא ממוין",
]
UNKNOWN_MUSCLE = "לא ממוין"
UNKNOWN_SETS = "לא ממוין"
UNCLASSIFIED_NAME = "ריל לא ממוין"
REQUIRED_KEYS = [
    "id",
    "name_he",
    "muscle_group",
    "secondary_group",
    "muscle_detail",
    "sets",
    "reps",
    "sets_reps",
    "equipment",
    "steps_he",
    "source_url",
    "creator",
    "poster",
    "verified",
    "source_title",
    "source_muscle_group",
    "source_muscle_label",
    "source_sets_reps",
    "source_notes",
]
ID_RE = re.compile(r"^ig-([A-Za-z0-9_-]+)$")
POSTER_SCHEME = re.compile(r"^([a-z]+:|/)", re.I)


def validate(data):
    errors = []

    def err(path, message):
        errors.append(f"{path}: {message}")

    if not isinstance(data, dict):
        err("$", "הקובץ חייב להיות אובייקט")
        return errors
    if data.get("schema_version") != 1:
        err("schema_version", "חייב להיות 1")
    groups = data.get("muscle_groups")
    if not isinstance(groups, list):
        err("muscle_groups", "חייב להיות מערך")
    else:
        for group in MUSCLE_GROUPS:
            if group not in groups:
                err("muscle_groups", f"חסרה קבוצה «{group}»")
    if data.get("unknown_muscle_group") != UNKNOWN_MUSCLE:
        err("unknown_muscle_group", f"חייב להיות «{UNKNOWN_MUSCLE}»")
    if data.get("unknown_sets_reps") != UNKNOWN_SETS:
        err("unknown_sets_reps", f"חייב להיות «{UNKNOWN_SETS}»")
    if data.get("unclassified_name_he") != UNCLASSIFIED_NAME:
        err("unclassified_name_he", f"חייב להיות «{UNCLASSIFIED_NAME}»")
    exercises = data.get("exercises")
    if not isinstance(exercises, list) or not exercises:
        err("exercises", "חייב להיות מערך לא ריק")
        return errors

    seen = set()
    for i, ex in enumerate(exercises):
        path = f"exercises[{i}]"
        if not isinstance(ex, dict):
            err(path, "חייב להיות אובייקט")
            continue
        for key in REQUIRED_KEYS:
            if key not in ex:
                err(f"{path}.{key}", "שדה חסר")
        match = ID_RE.match(str(ex.get("id") or ""))
        code = match.group(1) if match else ""
        if not code:
            err(f"{path}.id", "מזהה חייב להיות ig-<shortcode>")
        elif ex.get("id") in seen:
            err(f"{path}.id", f"מזהה כפול {ex.get('id')}")
        else:
            seen.add(ex.get("id"))
        reel_url = f"https://www.instagram.com/reel/{code}/"
        post_url = f"https://www.instagram.com/p/{code}/"
        if code and ex.get("source_url") not in (reel_url, post_url):
            err(f"{path}.source_url", f"חייב להיות {reel_url} או {post_url}")
        creator = ex.get("creator")
        if (
            not isinstance(creator, str)
            or not creator.strip()
            or creator.startswith("@")
            or any(ch.isspace() for ch in creator)
        ):
            err(f"{path}.creator", "שם משתמש בלי @ ובלי רווחים")
        if ex.get("muscle_group") not in MUSCLE_GROUPS:
            err(f"{path}.muscle_group", "קבוצה לא מוכרת")
        secondary = ex.get("secondary_group")
        if not isinstance(secondary, str):
            err(f"{path}.secondary_group", "מחרוזת")
        elif secondary:
            for part in secondary.split(" · "):
                if part not in MUSCLE_GROUPS:
                    err(f"{path}.secondary_group", f"קבוצה לא מוכרת «{part}»")
                if part == ex.get("muscle_group"):
                    err(f"{path}.secondary_group", "חוזר על קבוצת השריר הראשית")
        if not isinstance(ex.get("muscle_detail"), str):
            err(f"{path}.muscle_detail", "מחרוזת")
        if not isinstance(ex.get("source_muscle_label"), str):
            err(f"{path}.source_muscle_label", "מחרוזת")
        sets = ex.get("sets")
        if sets is not None and (not isinstance(sets, int) or isinstance(sets, bool) or sets < 1):
            err(f"{path}.sets", "מספר שלם חיובי או null")
        if not isinstance(ex.get("reps"), str):
            err(f"{path}.reps", "מחרוזת")
        sets_reps = ex.get("sets_reps")
        if not isinstance(sets_reps, str) or not sets_reps.strip():
            err(f"{path}.sets_reps", "מחרוזת לא ריקה")
        if not isinstance(ex.get("equipment"), str):
            err(f"{path}.equipment", "מחרוזת")
        name = ex.get("name_he")
        if not isinstance(name, str) or not name.strip():
            err(f"{path}.name_he", "שם בעברית")
        steps = ex.get("steps_he")
        if not isinstance(steps, list) or any(not isinstance(step, str) or not step.strip() for step in steps):
            err(f"{path}.steps_he", "מערך מחרוזות לא ריקות")
        poster = ex.get("poster")
        if not isinstance(poster, str) or ".." in poster or POSTER_SCHEME.match(poster or ""):
            err(f"{path}.poster", "נתיב יחסי בתוך המאגר, או ריק")
        if not isinstance(ex.get("verified"), bool):
            err(f"{path}.verified", "בוליאני")
        for key in ("source_title", "source_muscle_group", "source_sets_reps", "source_notes"):
            if not isinstance(ex.get(key), str):
                err(f"{path}.{key}", "מחרוזת")
        if isinstance(ex.get("source_sets_reps"), str) and "לא מצוין" in ex.get("source_sets_reps"):
            if ex.get("sets") is not None:
                err(f"{path}.sets", "«לא מצוין» נשאר בלי סטים")
            if ex.get("reps") != "":
                err(f"{path}.reps", "«לא מצוין» נשאר בלי חזרות")
            if ex.get("sets_reps") != UNKNOWN_SETS:
                err(f"{path}.sets_reps", f"«לא מצוין» מוצג כ«{UNKNOWN_SETS}»")
        if not ex.get("source_title"):
            if ex.get("name_he") != UNCLASSIFIED_NAME:
                err(f"{path}.name_he", f"בלי מקור השם נשאר «{UNCLASSIFIED_NAME}»")
            if ex.get("muscle_group") != UNKNOWN_MUSCLE:
                err(f"{path}.muscle_group", f"בלי מקור הקבוצה נשארת «{UNKNOWN_MUSCLE}»")
            if (
                ex.get("sets") is not None
                or ex.get("reps") != ""
                or ex.get("sets_reps") != UNKNOWN_SETS
                or ex.get("equipment") != ""
                or steps
            ):
                err(path, "בלי מקור לא ממלאים סטים, ציוד או שלבים")
        if ex.get("verified") is True and (ex.get("name_he") == UNCLASSIFIED_NAME or not ex.get("source_title")):
            err(f"{path}.verified", "אימות דורש שם ומקור")
    return errors


def main(argv):
    root = Path(__file__).resolve().parents[1]
    file = Path(argv[1]) if len(argv) > 1 else root / "data" / "exercises.json"
    try:
        data = json.loads(file.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"{file}: {exc}", file=sys.stderr)
        return 1
    errors = validate(data)
    if errors:
        print("\n".join(errors), file=sys.stderr)
        print(f"{len(errors)} שגיאות ב־{file}", file=sys.stderr)
        return 1
    verified = sum(1 for ex in data["exercises"] if ex.get("verified"))
    print(f"ok {len(data['exercises'])} exercises ({verified} verified) {file}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
