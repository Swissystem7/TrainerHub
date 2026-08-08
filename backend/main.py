from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import anthropic
import json
import os
import asyncio

from demo_workout import DEMO_WORKOUT
from parser import parse_workout_json, validate_workout

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

        # Fence stripping and parsing live in parser.py, where they are tested.
        workout = parse_workout_json(message.content[0].text)

    except json.JSONDecodeError:
        raise HTTPException(500, "AI returned invalid JSON")
    except Exception as e:
        raise HTTPException(500, str(e))

    # The JSON parsed, which does not mean it is a workout. Say what is wrong
    # instead of handing the frontend something it renders as blank rows.
    problems = validate_workout(workout)
    if problems:
        raise HTTPException(502, "AI returned an unusable workout: " + "; ".join(problems))

    return {"success": True, "workout": workout}
