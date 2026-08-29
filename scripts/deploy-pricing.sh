#!/usr/bin/env bash
# Deploy the FastAPI pricing engine to Fly.io with a git-SHA release tag.
#
# The release tag flows into Sentry (apps/api/src/sentry_setup.py reads the
# RELEASE env var) so production errors can be traced back to a commit.
#
# Usage: ./scripts/deploy-pricing.sh
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT/apps/api"

RELEASE="cc-ops-pricing@$(git rev-parse --short HEAD)"
echo "Deploying pricing engine as $RELEASE"

# Fly secrets are env vars at runtime; sentry_setup reads RELEASE from the env.
fly secrets set RELEASE="$RELEASE" --app cc-ops-pricing

fly deploy --app cc-ops-pricing --config fly.toml
