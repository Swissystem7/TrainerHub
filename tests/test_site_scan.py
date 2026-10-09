import json
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

import site_scan  # noqa: E402
from site_scan import scan, validate_images, gemini_request, reply_text  # noqa: E402

WORKER = os.path.join(os.path.dirname(__file__), "..", "worker", "site-scan", "worker.mjs")
IMG = {"mime": "image/jpeg", "data": "QUJD"}
ENV = {"GEMINI_API_KEY": "test-key"}


def body(images):
    return json.dumps({"images": images}).encode("utf-8")


def gemini_reply(text):
    return {"candidates": [{"content": {"parts": [{"text": text}]}}]}


class Recorder:
    def __init__(self, status=200, data=None, error=None):
        self.status, self.data, self.error, self.calls = status, data, error, []

    def __call__(self, url, payload, headers):
        self.calls.append((url, payload, headers))
        if self.error:
            raise self.error
        return self.status, self.data


class ValidateImages(unittest.TestCase):
    def test_one_to_three_images(self):
        self.assertTrue(validate_images([IMG]))
        self.assertTrue(validate_images([IMG] * 3))
        self.assertFalse(validate_images([]))
        self.assertFalse(validate_images([IMG] * 4))

    def test_rejects_bad_entries(self):
        self.assertFalse(validate_images(None))
        self.assertFalse(validate_images([{"mime": "image/gif", "data": "QUJD"}]))
        self.assertFalse(validate_images([{"mime": "image/png", "data": "not base64!"}]))
        self.assertFalse(validate_images([{"mime": "image/png"}]))
        self.assertFalse(validate_images(["QUJD"]))


class Scan(unittest.TestCase):
    def test_no_key_is_503_and_never_calls_gemini(self):
        post = Recorder()
        self.assertEqual(scan(body([IMG]), {}, post), (503, {"error": "not-configured"}))
        self.assertEqual(post.calls, [])

    def test_bad_input(self):
        post = Recorder()
        self.assertEqual(scan(b"{nope", ENV, post), (400, {"error": "bad-json"}))
        self.assertEqual(scan(b"[1,2]", ENV, post), (400, {"error": "images"}))
        self.assertEqual(scan(body([]), ENV, post), (400, {"error": "images"}))
        self.assertEqual(scan(b"x" * (site_scan.MAX_BYTES + 1), ENV, post), (413, {"error": "too-large"}))
        self.assertEqual(post.calls, [])

    def test_success_returns_model_text_and_sends_key_in_header(self):
        reply = '{"width":"narrow","features":["stairs"]}'
        post = Recorder(data=gemini_reply(reply))
        self.assertEqual(scan(body([IMG, IMG]), ENV, post), (200, {"text": reply}))
        url, payload, headers = post.calls[0]
        self.assertIn("gemini-2.5-flash:generateContent", url)
        self.assertNotIn("test-key", url)
        self.assertEqual(headers, {"x-goog-api-key": "test-key"})
        parts = payload["contents"][0]["parts"]
        self.assertEqual(parts[0], {"text": site_scan.PROMPT})
        self.assertEqual(len(parts), 3)

    def test_model_override(self):
        post = Recorder(data=gemini_reply("{}"))
        scan(body([IMG]), dict(ENV, GEMINI_MODEL="gemini-x"), post)
        self.assertIn("/gemini-x:generateContent", post.calls[0][0])

    def test_upstream_failures_are_502(self):
        self.assertEqual(scan(body([IMG]), ENV, Recorder(status=429)), (502, {"error": "upstream", "status": 429}))
        self.assertEqual(scan(body([IMG]), ENV, Recorder(error=OSError("down"))), (502, {"error": "upstream"}))
        self.assertEqual(scan(body([IMG]), ENV, Recorder(data={"candidates": []})), (502, {"error": "empty"}))
        self.assertEqual(scan(body([IMG]), ENV, Recorder(data=None)), (502, {"error": "empty"}))


class Helpers(unittest.TestCase):
    def test_reply_text_joins_parts(self):
        data = {"candidates": [{"content": {"parts": [{"text": '{"a":'}, {"text": "1}"}, {}]}}]}
        self.assertEqual(reply_text(data), '{"a":1}')
        self.assertEqual(reply_text({"candidates": [{"content": {"parts": "x"}}]}), "")

    def test_request_shape(self):
        url, payload = gemini_request([IMG])
        self.assertTrue(url.startswith("https://generativelanguage.googleapis.com/"))
        self.assertEqual(payload["generationConfig"]["responseMimeType"], "application/json")
        self.assertEqual(payload["contents"][0]["parts"][1], {"inline_data": {"mime_type": "image/jpeg", "data": "QUJD"}})


@unittest.skipUnless(os.path.exists(WORKER), "worker/site-scan not on this branch yet")


class SameAsWorker(unittest.TestCase):
    def test_prompt_matches_worker(self):
        with open(WORKER, encoding="utf-8") as f:
            src = f.read()
        block = src[src.index("export const PROMPT"):src.index("].join(")]
        # One single-quoted JS string per line: '...',
        lines = [ln.strip().rstrip(",")[1:-1] for ln in block.splitlines() if ln.strip().startswith("'")]
        self.assertEqual("\n".join(lines), site_scan.PROMPT)
