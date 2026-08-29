"""
Market feature merge for the CC STR pricing pipeline.

Keeps the AirDNA integration as a pure, testable layer:
- `apply_market_features` merges MarketMetrics into a training-example dict.
- `MarketSnapshotCache` is a small protocol for caching AirDNA snapshots per
  (property, month) so we don't re-hit the paid API every night. The build
  pipeline injects a real cache (backed by the MarketSnapshot Prisma model);
  tests inject a dict-based fake.

This module has NO network or DB imports — it is safe to unit test offline.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Dict, Optional, Protocol

from src.ml.airdna_client import MarketMetrics


# Location key lookup by ZIP. AirDNA keys markets by its own location id in the
# public explorer API (e.g. Corpus Christi = airdna-609, discovered from HAR).
# Unknown ZIPs => no market features (caller skips), never a crash.
ZIP_TO_LOCATION_KEY: Dict[str, str] = {
    "78401": "airdna-609",  # Corpus Christi downtown
    "78402": "airdna-609",
    "78403": "airdna-609",
    "78404": "airdna-609",
    "78405": "airdna-609",
    "78406": "airdna-609",
    "78407": "airdna-609",
    "78408": "airdna-609",
    "78409": "airdna-609",
    "78410": "airdna-609",
    "78411": "airdna-609",  # bay area
    "78412": "airdna-609",  # Padre Island / beach
    "78413": "airdna-609",
    "78414": "airdna-609",
    "78415": "airdna-609",
    "78416": "airdna-609",
    "78417": "airdna-609",
    "78418": "airdna-609",  # Padre Island
    "78419": "airdna-609",
    "78373": "airdna-609",  # Port Aransas (adjacent coastal market)
}


def location_key_for_zip(zip_code: str) -> Optional[str]:
    return ZIP_TO_LOCATION_KEY.get(zip_code)


class MarketSnapshotCache(Protocol):
    """Cache contract for AirDNA market snapshots keyed by (location_key, month)."""

    def get(self, location_key: str, month: str) -> Optional[MarketMetrics]: ...

    def put(self, location_key: str, month: str, metrics: MarketMetrics) -> None: ...


@dataclass
class DictSnapshotCache:
    """In-memory cache used for tests and the single-run build default."""

    _store: Dict[tuple[str, str], MarketMetrics] = field(default_factory=dict)

    def get(self, location_key: str, month: str) -> Optional[MarketMetrics]:
        return self._store.get((location_key, month))

    def put(self, location_key: str, month: str, metrics: MarketMetrics) -> None:
        self._store[(location_key, month)] = metrics


def apply_market_features(
    example: dict,
    metrics: Optional[MarketMetrics],
) -> dict:
    """Merge market features into a training example.

    When metrics is None (no key / unreachable / unknown ZIP), the market
    columns are set to None so the row still trains on first-party features
    and the model can learn the "no market signal" case. Returns the same dict.
    """
    if metrics is None:
        example["marketAdr"] = None
        example["marketOccupancyRate"] = None
        example["marketRevpar"] = None
        example["marketDemand"] = None
        example["marketDemandIndex"] = None
        example["marketDataAvailable"] = False
        return example

    example.update(metrics.as_feature_row())
    example["marketDataAvailable"] = True
    return example


def month_of(d: date) -> str:
    return f"{d.year:04d}-{d.month:02d}"
