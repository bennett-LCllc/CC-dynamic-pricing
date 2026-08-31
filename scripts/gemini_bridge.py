#!/usr/bin/env python3
"""Minimal Hermes <-> Gemini bridge (no SDK, just the REST endpoint).

Uses the cheaper flash tier by default. Override with GEMINI_MODEL env var
(e.g. GEMINI_MODEL=gemini-flash-latest for the cheapest, or gemini-3.6-flash
for the latest). Key is read from ~/.config/gemini/key (never hardcoded).
"""
import json
import os
import sys
import urllib.request

# Cheapest stable flash tier. Override via GEMINI_MODEL env if needed.
GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    f"{os.environ.get('GEMINI_MODEL', 'gemini-flash-latest')}:generateContent"
)


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
