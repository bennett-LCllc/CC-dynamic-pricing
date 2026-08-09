#!/usr/bin/env bash
set -euo pipefail

###############################################
# Resolve repo root
###############################################
ROOT="$(git rev-parse --show-toplevel)"
OUT="$ROOT/agent-context"

mkdir -p "$OUT"
mkdir -p "$OUT/codegraph"

echo "==> Building unified context bundle..."
echo "Output directory: $OUT"
echo

###############################################
# 1. CodeGraph-based repo map (using `files`)
###############################################
echo "[1/10] Generating repo-map from CodeGraph..."

# Index the repository
if ! codegraph index "$ROOT"; then
  echo "❌ CodeGraph index failed"
  exit 1
fi

# Extract file structure
if ! codegraph files > "$OUT/repo-map.txt"; then
  echo "❌ CodeGraph files command failed"
  exit 1
fi

echo "✓ repo-map.txt generated"
echo

###############################################
# 2. CodeGraph MCP server install info
###############################################
echo "[2/10] Capturing CodeGraph status..."

codegraph status "$ROOT" > "$OUT/codegraph-status.txt" || true

echo "✓ codegraph-status.txt generated"
echo

###############################################
# 3. grepai index
###############################################
echo "[3/10] Building grepai index..."

grepai index "$ROOT" --out "$OUT/grepai-index.json" >/dev/null 2>&1 || true

echo "✓ grepai index generated"
echo

###############################################
# 4. ctags
###############################################
echo "[4/10] Generating ctags..."

ctags -R -f "$OUT/tags" "$ROOT" || true

echo "✓ tags generated"
echo

# 6. Semgrep findings
###############################################
echo "[6/10] Running Semgrep..."

semgrep scan "$ROOT" \
  --config auto \
  --json \
  > "$OUT/semgrep.json" || true

echo "✓ semgrep.json generated"
echo

###############################################
# 7. architecture.md
###############################################
echo "[7/10] Generating architecture.md..."

{
  echo "# Architecture Overview"
  echo
  echo "Generated: $(date)"
  echo
  echo "## Repository Structure"
  echo
  cat "$OUT/repo-map.txt"
} > "$OUT/architecture.md"

echo "✓ architecture.md generated"
echo

###############################################
# 8. context.md
###############################################
echo "[8/10] Generating context.md..."

{
  echo "# Project Context"
  echo
  echo "Generated: $(date)"
  echo
  echo "## CodeGraph Status"
  echo
  cat "$OUT/codegraph-status.txt"
} > "$OUT/context.md"

echo "✓ context.md generated"
echo

###############################################
# 9. Copy key project files
###############################################
echo "[9/10] Copying key project files..."

cp "$ROOT"/README* "$OUT" 2>/dev/null || true
cp "$ROOT"/package.json "$OUT" 2>/dev/null || true
cp "$ROOT"/pyproject.toml "$OUT" 2>/dev/null || true
cp "$ROOT"/requirements.txt "$OUT" 2>/dev/null || true

echo "✓ key files copied"
echo

###############################################
# 10. Final summary
###############################################
echo "[10/10] Unified context bundle complete!"
echo
echo "Artifacts generated in: $OUT"
echo
ls -1 "$OUT"
echo

