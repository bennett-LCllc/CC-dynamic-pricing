"""
AirDNA market data client — Corpus Christi STR dynamic pricing.

AirDNA (airdna.co) is a PAID third-party market-intelligence source that exposes
aggregate short-term-rental metrics per market/location:
    - ADR          (average daily rate)
    - occupancy    (occupancy rate, 0-1)
    - RevPAR       (revenue per available room night)
    - demand       (avg booked nights / month, a proxy for market heat)

These are MARKET-level aggregates, NOT exact-listing comps. They enrich the
first-party training features in build_features.py so the model can see "how hot
is the surrounding market" rather than only our own booked nights.

API shape (real AirDNA v1):
    GET https://api.airdna.co/v1/markets/{location_key}
        ?access_token={KEY}&start_date=YYYY-MM&end_date=YYYY-MM&currency=USD
    -> {"status": "success", "data": {"market": [ {month, adr, occupancy_rate,
       revpar, demand}, ... ]}}

This client is transport-injectable so it can be unit-tested with a mocked
response (no network, no API key). The real transport uses httpx when a key is
configured; when no key is set the client raises AirDNAUnavailable instead of
silently returning zeros (callers must degrade gracefully).
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from datetime import date
from typing import Callable, List, Optional

import httpx

API_BASE = "https://api.airdna.co/v1"
DEFAULT_TIMEOUT_S = 15.0


class AirDNAError(Exception):
    """Base error for AirDNA client failures."""


class AirDNAUnavailable(AirDNAError):
    """Raised when no API key is configured or the upstream is unreachable.

    Callers (build_features) should treat this as "skip market features" rather
    than crash the nightly pipeline.
    """


class AirDNABadResponse(AirDNAError):
    """Raised when the upstream returns an unexpected payload."""


@dataclass(frozen=True)
class MarketMetrics:
    """Aggregate monthly market metrics averaged over the requested window."""

    location_key: str
    adr: float
    occupancy_rate: float  # 0-1
    revpar: float
    demand: float  # avg booked nights / month across the window
    num_months: int = field(default=1)

    @property
    def demand_index(self) -> float:
        """Normalized market-heat signal: demand relative to a 30-night month."""
        return round(self.demand / 30.0, 4)

    def as_feature_row(self) -> dict:
        """Feature columns merged into a PricingTrainingExample."""
        return {
            "marketAdr": round(self.adr, 2),
            "marketOccupancyRate": round(self.occupancy_rate, 4),
            "marketRevpar": round(self.revpar, 2),
            "marketDemand": round(self.demand, 2),
            "marketDemandIndex": self.demand_index,
        }


def _resolve_key(api_key: Optional[str]) -> str:
    key = api_key if api_key is not None else os.environ.get("AIRDNA_API_KEY")
    if not key:
        raise AirDNAUnavailable(
            "AIRDNA_API_KEY is not set; market features will be skipped"
        )
    return key


def _httpx_transport(key: str, timeout: float) -> Callable[[str], bytes]:
    def _get(url: str) -> bytes:
        try:
            with httpx.Client(timeout=timeout) as client:
                resp = client.get(url)
        except httpx.HTTPError as exc:  # network/DNS/timeout
            raise AirDNAUnavailable(f"AirDNA request failed: {exc}") from exc
        if resp.status_code != 200:
            raise AirDNABadResponse(
                f"AirDNA returned HTTP {resp.status_code}: {resp.text[:200]}"
            )
        return resp.content

    return _get


def _parse_market_payload(payload: dict, location_key: str) -> MarketMetrics:
    """Parse an AirDNA v1 market response into averaged MarketMetrics."""
    data = payload.get("data")
    if not isinstance(data, dict):
        raise AirDNABadResponse("missing 'data' in AirDNA response")
    series = data.get("market")
    if not isinstance(series, list) or not series:
        raise AirDNABadResponse("missing or empty 'data.market' time series")

    adrs, occs, revpars, demands = [], [], [], []
    for row in series:
        try:
            adrs.append(float(row["adr"]))
            occs.append(float(row["occupancy_rate"]))
            revpars.append(float(row["revpar"]))
            demands.append(float(row["demand"]))
        except (KeyError, TypeError, ValueError) as exc:
            raise AirDNABadResponse(f"malformed market row: {exc}") from exc

    n = len(adrs)
    return MarketMetrics(
        location_key=location_key,
        adr=sum(adrs) / n,
        occupancy_rate=sum(occs) / n,
        revpar=sum(revpars) / n,
        demand=sum(demands) / n,
        num_months=n,
    )


class AirDNAClient:
    """Thin client for AirDNA market metrics with an injectable transport."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        transport: Optional[Callable[[str], bytes]] = None,
        timeout: float = DEFAULT_TIMEOUT_S,
    ) -> None:
        self._key = api_key
        self._timeout = timeout
        self._transport = transport

    def get_market_metrics(
        self,
        location_key: str,
        start_month: str,
        end_month: str,
        currency: str = "USD",
    ) -> MarketMetrics:
        """Fetch and average market metrics for a location over a month range.

        location_key: AirDNA location key (e.g. "tX--qFk2C9" for a market).
        start_month / end_month: "YYYY-MM".
        """
        key = _resolve_key(self._key)
        url = (
            f"{API_BASE}/markets/{location_key}"
            f"?access_token={key}"
            f"&start_date={start_month}&end_date={end_month}"
            f"&currency={currency}"
        )
        raw = self._transport(url) if self._transport else _httpx_transport(key, self._timeout)(url)
        import json

        try:
            payload = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise AirDNABadResponse(f"non-JSON AirDNA response: {exc}") from exc
        if payload.get("status") != "success":
            raise AirDNABadResponse(f"AirDNA status={payload.get('status')}")
        return _parse_market_payload(payload, location_key)


def month_range(start: date, end: date) -> tuple[str, str]:
    """Convert two dates into a (start_month, end_month) "YYYY-MM" pair."""
    return (f"{start.year:04d}-{start.month:02d}", f"{end.year:04d}-{end.month:02d}")
