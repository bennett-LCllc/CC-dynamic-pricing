"""
TDD for the AirDNA client + market feature merge.

Runs OFFLINE: no API key, no network, no DB. The client is exercised through an
injected mock transport that returns a canned AirDNA v1 payload.
"""

import json

import pytest

from src.ml.airdna_client import (
    AirDNAClient,
    AirDNAUnavailable,
    AirDNABadResponse,
    MarketMetrics,
    _parse_market_payload,
)
from src.ml.market_features import (
    apply_market_features,
    location_key_for_zip,
    DictSnapshotCache,
    month_of,
)


# ---- Canned AirDNA v1 response (two months averaged) ----
AIRDNA_PAYLOAD = {
    "status": "success",
    "data": {
        "market": [
            {"month": "2026-06", "adr": 210.0, "occupancy_rate": 0.62, "revpar": 130.2, "demand": 18.6},
            {"month": "2026-07", "adr": 235.0, "occupancy_rate": 0.71, "revpar": 166.85, "demand": 21.3},
        ]
    },
}


def _mock_transport(payload: dict):
    raw = json.dumps(payload).encode()

    def _t(url: str) -> bytes:
        # Assert the URL is well-formed and carries the access token + window.
        assert "access_token=" in url
        assert "start_date=" in url and "end_date=" in url
        return raw

    return _t


# --- Parsing ---

def test_parse_market_payload_averages_months():
    m = _parse_market_payload(AIRDNA_PAYLOAD, "tX--qFk2C9")
    assert isinstance(m, MarketMetrics)
    assert m.num_months == 2
    assert m.adr == pytest.approx(222.5)          # (210+235)/2
    assert m.occupancy_rate == pytest.approx(0.665)
    assert m.revpar == pytest.approx(148.525)
    assert m.demand == pytest.approx(19.95)


def test_parse_rejects_non_success():
    bad = {"status": "error", "message": "nope"}
    with pytest.raises(AirDNABadResponse):
        _parse_market_payload(bad, "k")


def test_parse_rejects_missing_market_series():
    with pytest.raises(AirDNABadResponse):
        _parse_market_payload({"status": "success", "data": {}}, "k")


# --- Client with injected transport ---

def test_client_get_market_metrics_happy_path():
    client = AirDNAClient(api_key="TESTKEY", transport=_mock_transport(AIRDNA_PAYLOAD))
    m = client.get_market_metrics("tX--qFk2C9", "2026-06", "2026-07")
    assert m.adr == pytest.approx(222.5)
    assert m.demand_index == pytest.approx(19.95 / 30.0, rel=1e-3)


def test_client_raises_unavailable_without_key():
    client = AirDNAClient(api_key=None)
    with pytest.raises(AirDNAUnavailable):
        client.get_market_metrics("k", "2026-06", "2026-07")


def test_client_propagates_transport_failure_as_unavailable():
    def boom(url: str) -> bytes:
        raise AirDNAUnavailable("network down")

    client = AirDNAClient(api_key="K", transport=boom)
    with pytest.raises(AirDNAUnavailable):
        client.get_market_metrics("k", "2026-06", "2026-07")


# --- Market feature merge (pure) ---

def test_apply_market_features_merges_columns():
    example = {"propertyId": "p1"}
    m = MarketMetrics("k", adr=222.5, occupancy_rate=0.665, revpar=148.525, demand=19.95, num_months=2)
    out = apply_market_features(example, m)
    assert out["marketAdr"] == 222.5
    assert out["marketOccupancyRate"] == 0.665
    assert out["marketRevpar"] == 148.53  # rounded to 2 dp by as_feature_row
    assert out["marketDemand"] == 19.95
    assert out["marketDemandIndex"] == pytest.approx(19.95 / 30.0, rel=1e-3)
    assert out["marketDataAvailable"] is True


def test_apply_market_features_none_is_graceful():
    example = {"propertyId": "p1"}
    out = apply_market_features(example, None)
    assert out["marketAdr"] is None
    assert out["marketDataAvailable"] is False


# --- ZIP bridge + cache ---

def test_location_key_for_zip_known():
    assert location_key_for_zip("78412") == "tX--qFk2C9"


def test_location_key_for_zip_unknown_returns_none():
    assert location_key_for_zip("99999") is None


def test_dict_cache_put_get():
    cache = DictSnapshotCache()
    m = MarketMetrics("k", adr=1, occupancy_rate=0.5, revpar=1, demand=10)
    assert cache.get("k", "all") is None
    cache.put("k", "all", m)
    assert cache.get("k", "all") is m


def test_month_of():
    from datetime import date

    assert month_of(date(2026, 3, 15)) == "2026-03"
