import json
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from environment_scan import scan_image  # noqa: E402


class Resp:
    def __init__(self, payload):
        self.payload = payload

    def read(self):
        return json.dumps(self.payload).encode("utf-8")

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


class EnvironmentScan(unittest.TestCase):
    def test_missing_endpoint_asks_the_browser_to_fall_back(self):
        status, body = scan_image(b"img", "image/jpeg", {})
        self.assertEqual(status, 503)
        self.assertTrue(body["fallback"])

    def test_empty_image_is_rejected(self):
        status, body = scan_image(b"", "image/jpeg", {"TH_VISION_ENDPOINT": "https://example.test/see"})
        self.assertEqual(status, 400)
        self.assertTrue(body["fallback"])

    def test_endpoint_json_is_returned_without_keeping_the_image(self):
        seen = {}

        def opener(req, timeout=0):
            seen["url"] = req.full_url
            seen["timeout"] = timeout
            seen["body"] = req.data
            return Resp({
                "detected_environment": {"type": "park", "description_he": "פארק"},
                "available_tags": ["mat"],
                "image": "should-not-pass",
            })

        status, body = scan_image(
            b"jpeg-bytes",
            "image/jpeg",
            {"TH_VISION_ENDPOINT": "https://vision.example/scan"},
            opener,
        )
        self.assertEqual(status, 200)
        self.assertEqual(seen["url"], "https://vision.example/scan")
        self.assertEqual(seen["body"], b"jpeg-bytes")
        self.assertNotIn("image", body)
        self.assertEqual(body["available_tags"], ["mat"])
        self.assertTrue(body["ok"])

    def test_unusable_model_json_falls_back(self):
        def opener(req, timeout=0):
            return Resp({"hello": "no"})

        status, body = scan_image(b"x", "image/jpeg", {"VISION_MODEL_ENDPOINT": "http://127.0.0.1:9/v"}, opener)
        self.assertEqual(status, 502)
        self.assertTrue(body["fallback"])


if __name__ == "__main__":
    unittest.main()
