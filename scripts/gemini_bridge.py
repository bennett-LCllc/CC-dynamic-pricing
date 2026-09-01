#!/usr/bin/env python3
"""Minimal Hermes <-> Gemini bridge (no SDK, just the REST endpoint).

Uses the cheaper flash tier by default. Override with GEMINI_MODEL env var
(e.g. GEMINI_MODEL=gemini-flash-latest for the cheapest, or gemini-3.6-flash
for the latest). Key is read from GEMINI_API_KEY env, falling back to
~/.config/gemini/key (never hardcoded).
"""
import json
import os
import sys
import urllib.error
import urllib.request

# Cheapest stable flash tier alias. Override via GEMINI_MODEL env if needed.
DEFAULT_MODEL = os.environ.get("GEMINI_MODEL", "gemini-flash-latest")


def _endpoint(model: str) -> str:
    return (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent"
    )


def _load_key() -> str:
    key = os.environ.get("GEMINI_API_KEY")
    if key:
        return key.strip()
    path = os.path.expanduser("~/.config/gemini/key")
    try:
        with open(path) as f:
            return f.read().strip()
    except FileNotFoundError:
        raise RuntimeError(
            "No Gemini key found: set GEMINI_API_KEY or ~/.config/gemini/key"
        )


def ask(prompt: str, model: str = None) -> str:
    model_url = _endpoint(model or DEFAULT_MODEL)
    key = _load_key()
    body = {"contents": [{"role": "user", "parts": [{"text": prompt}]}]}
    req = urllib.request.Request(
        model_url,
        data=json.dumps(body).encode(),
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": key,  # header, not URL query — keeps key out of logs
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.load(resp)
    except urllib.error.HTTPError as e:
        detail = e.read().decode()[:600]
        raise RuntimeError(f"Gemini HTTP {e.code}: {detail}")
    except (urllib.error.URLError, TimeoutError) as e:
        raise RuntimeError(f"Gemini request failed: {e}")

    # Defensive: responses can be empty (safety-blocked / filtered) with no candidates.
    candidates = data.get("candidates")
    if not candidates:
        feedback = data.get("promptFeedback", {})
        raise RuntimeError(f"Gemini returned no candidates: {feedback or data}")
    parts = candidates[0].get("content", {}).get("parts")
    if not parts:
        raise RuntimeError(f"Gemini response missing content parts: {candidates[0]}")
    return parts[0].get("text", "")


if __name__ == "__main__":
    q = sys.argv[1] if len(sys.argv) > 1 else "Say hello in 5 words."
    print(ask(q))
