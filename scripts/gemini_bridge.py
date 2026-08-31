#!/usr/bin/env python3
"""Minimal Hermes <-> Gemini bridge (no SDK, just the REST endpoint)."""
import json
import os
import sys
import urllib.request

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent"


def ask(prompt: str, model_url: str = GEMINI_URL) -> str:
    key = open(os.path.expanduser("~/.config/gemini/key")).read().strip()
    body = {"contents": [{"role": "user", "parts": [{"text": prompt}]}]}
    req = urllib.request.Request(
        f"{model_url}?key={key}",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.load(resp)
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:600]
        raise RuntimeError(f"Gemini HTTP {e.code}: {body}")


if __name__ == "__main__":
    q = sys.argv[1] if len(sys.argv) > 1 else "Say hello in 5 words."
    print(ask(q))
