"""The workout shown to anyone visiting without an API key.

Kept apart from main.py deliberately: this is data, it imports nothing, and the
test suite checks it against the same validator the model's output goes
through. If the fallback every visitor sees were malformed, the demo would be
broken for everyone.
"""

DEMO_WORKOUT = {
    "title": "אימון פונקציונלי — קבוצה",
    "duration_minutes": 50,
    "participants": 12,
    "equipment": ["גומיות", "כדורי ולשין"],
    "phases": [
        {
            "name": "Warm-up",
            "duration_minutes": 10,
            "exercises": [
                {"name": "ריצה קלה", "duration_seconds": 180, "sets": None, "reps": None, "rest_seconds": None, "notes": None},
                {"name": "הליכה בצד", "duration_seconds": 60, "sets": None, "reps": None, "rest_seconds": None, "notes": None},
                {"name": "מתיחות דינמיות", "duration_seconds": 120, "sets": None, "reps": None, "rest_seconds": None, "notes": None},
            ],
        },
        {
            "name": "Main",
            "duration_minutes": 35,
            "exercises": [
                {"name": "סקוואט עם גומייה", "sets": 3, "reps": 15, "rest_seconds": 45, "duration_seconds": None, "notes": "גומייה על הכתפיים"},
                {"name": "לאנג'ים הליכה", "sets": 3, "reps": None, "duration_seconds": 90, "rest_seconds": 45, "notes": "20 מטר הליכה"},
                {"name": "זריקת כדור ולשין לקיר", "sets": 3, "reps": 12, "rest_seconds": 45, "duration_seconds": None, "notes": None},
                {"name": "בורפי", "sets": 3, "reps": 10, "rest_seconds": 45, "duration_seconds": None, "notes": None},
            ],
        },
        {
            "name": "Cool-down",
            "duration_minutes": 5,
            "exercises": [
                {"name": "מתיחות סטטיות", "duration_seconds": 300, "sets": None, "reps": None, "rest_seconds": None, "notes": "כל שריר 30 שניות"},
            ],
        },
    ],
    "intensity": "high",
    "tags": ["functional", "group", "strength", "cardio"],
}
