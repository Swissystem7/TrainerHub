from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import anthropic
import json
import os
import asyncio

app = FastAPI(title="TrainerHub API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

SYSTEM_PROMPT = """You are a professional fitness workout parser.
Convert any free-text workout description into a structured JSON object.

Return ONLY valid JSON with this exact structure:
{
  "title": "workout title",
  "duration_minutes": number,
  "participants": number or null,
  "equipment": ["list", "of", "equipment"],
  "phases": [
    {
      "name": "Warm-up" | "Main" | "Cool-down",
      "duration_minutes": number,
      "exercises": [
        {
          "name": "exercise name",
          "sets": number or null,
          "reps": number or null,
          "duration_seconds": number or null,
          "rest_seconds": number or null,
          "notes": "any notes" or null
        }
      ]
    }
  ],
  "intensity": "low" | "medium" | "high",
  "tags": ["functional", "strength", "cardio", etc.]
}

If information is missing, use null. Always respond with valid JSON only, no markdown."""

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
                {"name": "מתיחות דינמיות", "duration_seconds": 120, "sets": None, "reps": None, "rest_seconds": None, "notes": None}
            ]
        },
        {
            "name": "Main",
            "duration_minutes": 35,
            "exercises": [
                {"name": "סקוואט עם גומייה", "sets": 3, "reps": 15, "rest_seconds": 45, "duration_seconds": None, "notes": "גומייה על הכתפיים"},
                {"name": "לאנג'ים הליכה", "sets": 3, "reps": None, "duration_seconds": None, "rest_seconds": 45, "notes": "20 מטר הליכה"},
                {"name": "זריקת כדור ולשין לקיר", "sets": 3, "reps": 12, "rest_seconds": 45, "duration_seconds": None, "notes": None},
                {"name": "בורפי", "sets": 3, "reps": 10, "rest_seconds": 45, "duration_seconds": None, "notes": None}
            ]
        },
        {
            "name": "Cool-down",
            "duration_minutes": 5,
            "exercises": [
                {"name": "מתיחות סטטיות", "duration_seconds": 300, "sets": None, "reps": None, "rest_seconds": None, "notes": "כל שריר 30 שניות"}
            ]
        }
    ],
    "intensity": "high",
    "tags": ["functional", "group", "strength", "cardio"]
}

class WorkoutRequest(BaseModel):
    text: str

@app.post("/api/parse-workout")
async def parse_workout(req: WorkoutRequest):
    if not req.text.strip():
        raise HTTPException(400, "No workout text provided")

    api_key = os.environ.get("ANTHROPIC_API_KEY", "")

    if not api_key:
        await asyncio.sleep(1.5)
        return {"success": True, "workout": DEMO_WORKOUT, "demo": True}

    try:
        c = anthropic.Anthropic(api_key=api_key)
        message = c.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2048,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": req.text}]
        )

        raw = message.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]

        workout = json.loads(raw)
        return {"success": True, "workout": workout}

    except json.JSONDecodeError:
        raise HTTPException(500, "AI returned invalid JSON")
    except Exception as e:
        raise HTTPException(500, str(e))
