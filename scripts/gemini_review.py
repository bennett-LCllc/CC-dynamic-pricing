#!/usr/bin/env python3
"""Cross-model code review via the Gemini bridge.

Reviews a git diff (commit, range, or uncommitted working tree) by sending the
diff plus a focused rubric to Gemini's flash tier and returning a structured
review. Useful as a second-opinion pass independent of the local model.

The point: catch what one model misses. Gemini sees the raw diff and a tight
rubric; you get prioritized findings, not a wall of praise.

Usage:
    python3 scripts/gemini_review.py            # reviews HEAD (last commit)
    python3 scripts/gemini_review.py HEAD~3..   # reviews last 3 commits
    python3 scripts/gemini_review.py --staged   # reviews git staged changes
    python3 scripts/gemini_review.py <sha>      # reviews a single commit
    GEMINI_MODEL=gemini-3.6-flash python3 scripts/gemini_review.py  # use a bigger model

Key is read from ~/.config/gemini/key (never hardcoded). Diffs are sent as-is
but large diffs are truncated to keep within token limits.
"""
import argparse
import os
import subprocess
import sys

from gemini_bridge import ask

MAX_DIFF_CHARS = 28_000  # keep well under flash context so the review stays focused


def get_diff(target: str) -> str:
    if target == "--staged":
        out = subprocess.run(
            ["git", "diff", "--cached", "--unified=3"],
            capture_output=True, text=True,
        )
        return out.stdout or "(no staged changes)"
    # Single commit vs its parent, or a range.
    if ".." in target or target in ("", "HEAD"):
        ref = target or "HEAD"
        cmd = ["git", "diff", f"{ref}~1", ref] if ref != "HEAD~1" else ["git", "diff", "HEAD~1"]
        out = subprocess.run(cmd, capture_output=True, text=True)
        diff = out.stdout
        if not diff and ref == "HEAD":
            # Fall back to the commit's own diff (works for the very first commit too).
            diff = subprocess.run(
                ["git", "show", "--unified=3", "HEAD"], capture_output=True, text=True
            ).stdout
        return diff or "(no diff found)"
    # Treat as a single commit sha.
    out = subprocess.run(
        ["git", "show", "--unified=3", target], capture_output=True, text=True
    )
    return out.stdout or f"(could not resolve {target})"


RUBRIC = """You are a senior code reviewer doing a focused second-opinion pass on a git diff.
Be concise and skeptical. Do NOT praise the code. Only report real issues.

Review for:
1. Correctness bugs (off-by-one, null/undefined, wrong branch, async races).
2. Security (injection, secrets logged, unvalidated input, authz gaps).
3. Error handling (swallowed exceptions, silent failures, missing edge cases).
4. Performance (N+1, unbounded loops, unnecessary work in hot paths).
5. Maintainability (dead code, misleading names, fragile logic).

For each finding give: SEVERITY (blocker/major/minor/nit), FILE:LINE if known,
and a one-line fix suggestion. If the diff is clean, say "LGTM - no issues found"
and stop. Cap at 10 findings, most severe first. Use plain text, no markdown fences."""


def review(target: str) -> str:
    diff = get_diff(target)
    if len(diff) > MAX_DIFF_CHARS:
        diff = diff[:MAX_DIFF_CHARS] + "\n... [diff truncated] ..."
    prompt = f"{RUBRIC}\n\n=== DIFF ({target}) ===\n{diff}"
    return ask(prompt)


def main() -> int:
    ap = argparse.ArgumentParser(description="Cross-model code review via Gemini.")
    ap.add_argument(
        "target", nargs="?", default="HEAD",
        help="commit sha, range like HEAD~3.., or --staged",
    )
    args = ap.parse_args()

    try:
        print(review(args.target))
    except RuntimeError as e:
        print(f"REVIEW FAILED: {e}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
