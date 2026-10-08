"""Site scan ("סריקת שטח") for local dev: photos -> Gemini vision -> model JSON.

Same contract and prompt as worker/site-scan/worker.mjs, so the page can point
TH_SITE_SCAN_ENDPOINT at http://localhost:8000/api/site-scan instead of the
Worker. The key comes from GEMINI_API_KEY in the environment and is never sent
to the browser. Images are forwarded and never stored. Standard library only,
so the tests run without fastapi installed.
"""

import json
import re
import urllib.error
import urllib.request

PROMPT = "\n".join([
    "You look at 1-3 photos of an outdoor training location for a group fitness coach.",
    "Reply with ONE JSON object and nothing else, using only these keys and values:",
    '{"width":"narrow|medium|wide","approxMeters":number,"surface":["asphalt","grass","turf","sand","dirt","tiles","rubber"],',
    '"features":["stairs","bench","wall","railing","pole","slope","grass","court","playground"],',
    '"hazards":["cars","uneven","slippery","glass","dark","crowd","water","heat"],"shade":true|false,',
    '"confidence":{"<any key above>":0..1}}',
    "width = usable free space for running drills: narrow < 6 m, medium 6-20 m, wide > 20 m. approxMeters = that width.",
    "List only what is clearly visible. When unsure, leave it out and give a low confidence. Never identify people.",
])

MAX_IMAGES = 3
MAX_BYTES = 4 * 1024 * 1024
MIME = ("image/jpeg", "image/png", "image/webp")
BASE64 = re.compile(r"^[A-Za-z0-9+/=]+$")
DEFAULT_MODEL = "gemini-2.5-flash"
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


def validate_images(images):
    """True when images is a list of 1-3 {mime, data(base64)} dicts the Worker would accept."""
    if not isinstance(images, list) or not 1 <= len(images) <= MAX_IMAGES:
        return False
    for im in images:
        if not isinstance(im, dict) or im.get("mime") not in MIME:
            return False
        data = im.get("data")
        if not isinstance(data, str) or not BASE64.match(data):
            return False
    return True


def gemini_request(images, model=DEFAULT_MODEL):
    """(url, body) for Gemini generateContent with the prompt first and the photos inline."""
    parts = [{"text": PROMPT}] + [
        {"inline_data": {"mime_type": im["mime"], "data": im["data"]}} for im in images
    ]
    body = {
        "contents": [{"parts": parts}],
        "generationConfig": {"responseMimeType": "application/json", "temperature": 0.2},
    }
    return GEMINI_URL.format(model=model), body


def reply_text(data):
    """Joined text of the first candidate, or '' when the reply has none."""
    try:
        parts = data["candidates"][0]["content"]["parts"]
    except (KeyError, IndexError, TypeError):
        return ""
    if not isinstance(parts, list):
        return ""
    return "".join(p.get("text") or "" for p in parts if isinstance(p, dict))


def post_json(url, body, headers, timeout=30):
    """Default transport: POST JSON with urllib -> (status, parsed body or None)."""
    req = urllib.request.Request(
        url, data=json.dumps(body).encode("utf-8"), method="POST",
        headers=dict(headers, **{"Content-Type": "application/json"}),
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            return res.status, json.loads(res.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, None


def scan(raw, env, post=post_json):
    """Request body (bytes/str) + env -> (status, body). Mirrors the Worker's errors.

    200 {text} | 400 bad-json / images | 413 too-large | 502 upstream / empty | 503 not-configured.
    The browser validates and clamps text with THSiteProfile.parseAiResponse, and
    falls back to the manual checklist on any non-200.
    """
    key = env.get("GEMINI_API_KEY", "")
    if not key:
        return 503, {"error": "not-configured"}
    if len(raw) > MAX_BYTES:
        return 413, {"error": "too-large"}
    try:
        payload = json.loads(raw)
    except (ValueError, UnicodeDecodeError):
        return 400, {"error": "bad-json"}
    images = payload.get("images") if isinstance(payload, dict) else None
    if not validate_images(images):
        return 400, {"error": "images"}

    url, body = gemini_request(images, env.get("GEMINI_MODEL") or DEFAULT_MODEL)
    try:
        status, data = post(url, body, {"x-goog-api-key": key})
    except Exception:
        return 502, {"error": "upstream"}
    if status != 200:
        return 502, {"error": "upstream", "status": status}
    text = reply_text(data)
    if not text:
        return 502, {"error": "empty"}
    return 200, {"text": text}
