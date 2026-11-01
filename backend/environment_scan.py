"""Pluggable vision call for environment scan.

GitHub Pages never runs this. When TH_VISION_ENDPOINT is set, the image is
forwarded to that model and the JSON is returned. Without it, the browser
uses the on-device detector and the manual equipment chips.
The image is not stored.
"""

from __future__ import annotations

import json
from urllib import request as urlrequest
from urllib.error import URLError


def _endpoint(env):
    env = env or {}
    return (env.get("TH_VISION_ENDPOINT") or env.get("VISION_MODEL_ENDPOINT") or "").strip()


def _usable(payload):
    if not isinstance(payload, dict):
        return False
    env = payload.get("detected_environment")
    tags = payload.get("available_tags")
    return isinstance(env, dict) and isinstance(tags, list)


def scan_image(content, content_type, env, opener=None):
    endpoint = _endpoint(env)
    if not endpoint:
        return 503, {
            "ok": False,
            "fallback": True,
            "reason_he": "אין נקודת קצה לראייה. הדפדפן יזהה מקומית או לפי הציוד שתסמנו.",
        }
    if not content:
        return 400, {"ok": False, "fallback": True, "reason_he": "לא התקבלה תמונה."}
    scheme = endpoint.split(":", 1)[0].lower()
    if scheme not in ("http", "https"):
        return 400, {"ok": False, "fallback": True, "reason_he": "נקודת הקצה לראייה חייבת להיות כתובת http או https."}

    data = content if isinstance(content, bytes) else bytes(content)
    req = urlrequest.Request(
        endpoint,
        data=data,
        headers={"Content-Type": content_type or "application/octet-stream"},
        method="POST",
    )
    post = opener or urlrequest.urlopen
    try:
        with post(req, timeout=20) as res:
            raw = res.read()
    except URLError:
        return 502, {"ok": False, "fallback": True, "reason_he": "נקודת הקצה לראייה לא ענתה."}
    except Exception:
        return 502, {"ok": False, "fallback": True, "reason_he": "נקודת הקצה לראייה לא ענתה."}
    try:
        payload = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return 502, {"ok": False, "fallback": True, "reason_he": "תשובת הראייה אינה JSON."}
    if not _usable(payload):
        return 502, {"ok": False, "fallback": True, "reason_he": "תשובת הראייה חסרה סביבה או תגיות."}
    payload.pop("image", None)
    payload["ok"] = True
    return 200, payload
