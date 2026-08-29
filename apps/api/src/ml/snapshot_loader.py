"""Load a Path-A AirDNA snapshot file into the market-feature pipeline.

`scripts/pull_airdna.py` (the non-enterprise, browser-session explorer flow)
emits a MarketSnapshot-shaped JSON. This module adapts that file into the
`MarketMetrics` objects the training pipeline (`build_features.py`) already
consumes via `MarketSnapshotCache`. This is the bridge that lets a normal
AirDNA account (no enterprise `AIRDNA_API_KEY`) feed market features into MLOps.
"""

from __future__ import annotations

import json
import os
from typing import Optional

from src.ml.airdna_client import MarketMetrics
from src.ml.market_features import DictSnapshotCache, MarketSnapshotCache

# Default location of the snapshot produced by scripts/pull_airdna.py
DEFAULT_SNAPSHOT_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "scripts",
    "airdna_cc_snapshot.json",
)


def load_snapshot_file(path: str) -> Optional[MarketMetrics]:
    """Read a Path-A snapshot JSON and return MarketMetrics, or None if missing/invalid.

    Tolerant: a missing or malformed file yields None (pipeline skips market
    features for that property rather than crashing the nightly build).
    """
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r") as f:
            data = json.load(f)
    except (OSError, json.JSONDecodeError):
        return None

    try:
        return MarketMetrics(
            location_key=data["locationKey"],
            adr=float(data["adr"]),
            occupancy_rate=float(data["occupancyRate"]),
            revpar=float(data["revpar"]),
            demand=float(data["demand"]),
            num_months=int(data.get("numMonths", 1)),
        )
    except (KeyError, TypeError, ValueError):
        return None


def build_cache_from_snapshot(
    path: Optional[str] = None,
) -> "tuple[MarketSnapshotCache, bool]":
    """Build a MarketSnapshotCache pre-populated from the snapshot file.

    Returns (cache, enabled). enabled=True means market features are available
    from the snapshot (no enterprise API key required). When the file is absent
    or invalid, returns an empty cache with enabled=False so the pipeline
    gracefully skips market features.
    """
    path = path or os.environ.get("AIRDNA_SNAPSHOT_PATH") or DEFAULT_SNAPSHOT_PATH
    metrics = load_snapshot_file(path)
    cache: MarketSnapshotCache = DictSnapshotCache()
    if metrics is None:
        return cache, False
    cache.put(metrics.location_key, "all", metrics)
    return cache, True
