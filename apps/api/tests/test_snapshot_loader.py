"""Tests for the Path-A AirDNA snapshot bridge into the MLOps pipeline.

These prove a normal AirDNA account (no enterprise AIRDNA_API_KEY) can still
feed market features: pull_airdna.py's JSON snapshot is loaded into the same
MarketSnapshotCache the training loop already reads.
"""

import json

from src.ml.snapshot_loader import (
    load_snapshot_file,
    build_cache_from_snapshot,
)
from src.ml.airdna_client import MarketMetrics


SNAPSHOT = {
    "locationKey": "airdna-609",
    "monthRangeStart": "2025-08",
    "monthRangeEnd": "2026-08",
    "adr": 185.5,
    "occupancyRate": 0.62,
    "revpar": 114.91,
    "demand": 18.6,
    "numMonths": 12,
}


def test_load_snapshot_file_parses_metrics(tmp_path):
    p = tmp_path / "snap.json"
    p.write_text(json.dumps(SNAPSHOT))
    m = load_snapshot_file(str(p))
    assert isinstance(m, MarketMetrics)
    assert m.location_key == "airdna-609"
    assert m.adr == 185.5
    assert m.occupancy_rate == 0.62


def test_load_snapshot_file_missing_returns_none(tmp_path):
    assert load_snapshot_file(str(tmp_path / "nope.json")) is None


def test_load_snapshot_file_malformed_returns_none(tmp_path):
    p = tmp_path / "bad.json"
    p.write_text("{not valid json")
    assert load_snapshot_file(str(p)) is None


def test_build_cache_populates_from_snapshot(tmp_path):
    p = tmp_path / "snap.json"
    p.write_text(json.dumps(SNAPSHOT))
    cache, enabled = build_cache_from_snapshot(str(p))
    assert enabled is True
    # Pipeline reads cache.get(loc_key, "all") — must hit the snapshot.
    m = cache.get("airdna-609", "all")
    assert isinstance(m, MarketMetrics)
    assert m.as_feature_row()["marketAdr"] == 185.5


def test_build_cache_disabled_when_snapshot_missing(tmp_path):
    cache, enabled = build_cache_from_snapshot(str(tmp_path / "nope.json"))
    assert enabled is False
    assert cache.get("airdna-609", "all") is None


def test_make_market_client_uses_snapshot_without_api_key(tmp_path, monkeypatch):
    # Simulate a normal AirDNA account: no enterprise AIRDNA_API_KEY, but a
    # Path-A snapshot file exists. The pipeline must enable market features
    # from the snapshot (not the dead REST client).
    snap = tmp_path / "snap.json"
    snap.write_text(json.dumps(SNAPSHOT))

    monkeypatch.delenv("AIRDNA_API_KEY", raising=False)
    monkeypatch.setenv("AIRDNA_SNAPSHOT_PATH", str(snap))

    # _make_market_client reads AIRDNA_SNAPSHOT_PATH at call time, so no reload
    # is needed (reload re-runs the module-level Prisma registration and blows up).
    from src.ml import build_features as bf

    client, cache, enabled = bf._make_market_client()
    assert enabled is True
    m = cache.get("airdna-609", "all")
    assert isinstance(m, MarketMetrics)
    assert m.adr == 185.5
