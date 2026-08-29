#!/usr/bin/env python3
"""
Extract an AirDNA MarketSnapshot from a captured HAR file (no network, no auth).

The live explorer API requires a short-lived web session (your bearer expired ->
403). But a HAR captured while browsing the market page already contains the
full 12-month metric series. This pulls that data locally and emits a
MarketSnapshot-ready JSON matching the Prisma model columns.

Run (in your own terminal):
    python3 scripts/extract_airdna_from_har.py \
        --har ~/Downloads/airdna_corpus_christi.har \
        --out scripts/airdna_cc_snapshot.json
"""

from __future__ import annotations

import argparse
import json
from datetime import date

# Field inside each metric's payload.metrics[]. For occupancy, the value is a
# percent (50.6) and must be divided by 100.
METRIC_FIELD = {
    "adr": ("avg_daily_rate", False),
    "occupancy": ("rate", True),
    "revpar": ("revpar", False),
}


def _find_series(har: dict, location_id: str, metric: str) -> list[dict]:
    for e in har["log"]["entries"]:
        url = e["request"]["url"]
        if f"/market/{location_id}/metrics/{metric}" in url:
            try:
                body = json.loads(e["response"]["content"]["text"])
                return body["payload"]["metrics"]
            except Exception:
                continue
    raise ValueError(f"no HAR entry for {location_id}/metrics/{metric}")


def extract(har_path: str, location_id: str = "airdna-609") -> dict:
    har = json.load(open(har_path))
    series = {m: _find_series(har, location_id, m) for m in METRIC_FIELD}

    def avg(metric: str) -> float:
        field, is_pct = METRIC_FIELD[metric]
        vals = [row[field] for row in series[metric] if field in row]
        mean = sum(vals) / len(vals) if vals else 0.0
        return mean / 100.0 if is_pct else mean

    adr = avg("adr")
    occ = avg("occupancy")
    revpar = avg("revpar")
    demand = occ * 30.0  # booked nights / listing-month proxy

    dates = [row["date"] for row in series["adr"] if "date" in row]
    start = dates[0] if dates else f"{date.today().year - 1}-01-01"
    end = dates[-1] if dates else f"{date.today().year}-12-01"

    return {
        "locationKey": location_id,
        "monthRangeStart": start[:7],
        "monthRangeEnd": end[:7],
        "adr": round(adr, 2),
        "occupancyRate": round(occ, 4),
        "revpar": round(revpar, 2),
        "demand": round(demand, 2),
        "numMonths": len(dates) or 12,
        "_source": "HAR extraction (bearer expired; live pull pending fresh token)",
        "_series": {m: series[m] for m in series},  # full monthly detail for audit
    }


def main() -> None:
    ap = argparse.ArgumentParser(description="Extract AirDNA snapshot from HAR")
    ap.add_argument("--har", default="~/Downloads/airdna_corpus_christi.har")
    ap.add_argument("--location-id", default="airdna-609")
    ap.add_argument("--out", help="write snapshot JSON here")
    ap.add_argument("--print", action="store_true", default=True)
    args = ap.parse_args()

    snap = extract(args.har, args.location_id)
    if args.out:
        with open(args.out, "w") as f:
            json.dump(snap, f, indent=2)
        print(f"wrote {args.out}")
    if args.print:
        print(json.dumps({k: v for k, v in snap.items() if k != "_series"}, indent=2))
        print(f"\nseries points per metric: "
              f"{ {m: len(snap['_series'][m]) for m in snap['_series']} }")


if __name__ == "__main__":
    main()
