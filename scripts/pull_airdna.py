#!/usr/bin/env python3
"""
Pull AirDNA market metrics for Corpus Christi (and other markets) and emit a
MarketSnapshot-ready JSON.

Auth flow (decoded from a captured HAR, 2026-08):
  The explorer API is NOT public. It requires a session established via:
    1. POST /auth/v1/fetch_id_token  {refresh_token, client_id}
         -> {id_token, refresh_token}
    2. POST /auth/v1/fetch_app_token {impersonate_id:null, ingress_params:null}
         -> {token, ...}  AND sets a session cookie
  The explorer calls then ride on that session cookie (no Bearer header).

  - `client_id` is a PUBLIC constant baked into the AirDNA web app.
  - `refresh_token` is YOUR bearer, read from a local file at runtime
    (default ~/.config/airdna/bearer). It is NEVER printed or logged.
  - The token is only held in memory for the duration of this process.

Output matches the MarketSnapshot Prisma model columns:
    locationKey, monthRangeStart, monthRangeEnd,
    adr, occupancyRate, revpar, demand, numMonths

`demand` is a proxy: mean monthly occupancy * 30 (booked nights / listing-month),
since the free endpoint does not expose raw demand. Documented as such.

Run:
    python3 scripts/pull_airdna.py --print
    python3 scripts/pull_airdna.py --out scripts/airdna_cc_snapshot.json
"""

from __future__ import annotations

import argparse
import json
import os
import urllib.request
import http.cookiejar
from datetime import date

API_BASE = "https://api.airdna.co/api/explorer/v1/market"
AUTH_BASE = "https://api.airdna.co/auth/v1"
# Public web-app client id (baked into app.airdna.co; not a secret).
CLIENT_ID = "5f040464-0aef-48a1-a1d1-daa9fbf81415"
DEFAULT_BEARER_FILE = os.path.expanduser("~/.config/airdna/bearer")

# Market -> AirDNA explorer location id (CC = airdna-609, from HAR).
LOCATION_BY_NAME = {
    "corpus-christi": "airdna-609",
    "amarillo": "airdna-133",
}
DEFAULT_LOCATION_ID = "airdna-609"

METRICS = {
    "adr": ("avg_daily_rate", False),   # field, is_percentage
    "occupancy": ("rate", True),         # rate is a percent (50.6 -> 0.506)
    "revpar": ("revpar", False),
}

POST_BODY = {
    "filters": [{"type": "range", "field": "bedrooms", "value": [0, 3]}],
    "currency": "usd",
    "granularity": "monthly",
    "period": 12,
}

BROWSER_HEADERS = {
    "content-type": "application/json",
    "accept": "application/json",
    "user-agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
    ),
    "origin": "https://app.airdna.co",
    "referer": "https://app.airdna.co/",
}


def _bearer() -> str:
    path = os.environ.get("AIRDNA_BEARER_FILE", DEFAULT_BEARER_FILE)
    with open(path, "r") as f:
        return f.read().strip()


def _make_authed_opener() -> urllib.request.OpenerDirector:
    """Run the token exchange and return an opener carrying the session cookie."""
    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

    def post(url: str, obj: dict):
        req = urllib.request.Request(
            url, data=json.dumps(obj).encode(),
            headers=BROWSER_HEADERS, method="POST",
        )
        with opener.open(req, timeout=20) as resp:
            return json.loads(resp.read().decode())

    bearer = _bearer()
    post(f"{AUTH_BASE}/fetch_id_token",
         {"refresh_token": bearer, "client_id": CLIENT_ID})
    post(f"{AUTH_BASE}/fetch_app_token",
         {"impersonate_id": None, "ingress_params": None})
    # Session cookie is now in cj; explorer calls reuse this opener.
    return opener


def _post(opener, location_id: str, metric: str) -> list[dict]:
    url = f"{API_BASE}/{location_id}/metrics/{metric}"
    req = urllib.request.Request(
        url, data=json.dumps(POST_BODY).encode(),
        headers=BROWSER_HEADERS, method="POST",
    )
    with opener.open(req, timeout=20) as resp:
        return json.loads(resp.read().decode())["payload"]["metrics"]


def pull_market(location_id: str, period: int = 12) -> dict:
    opener = _make_authed_opener()
    series = {name: _post(opener, location_id, name) for name in METRICS}

    def avg(name: str) -> float:
        field, is_pct = METRICS[name]
        vals = [row[field] for row in series[name] if field in row]
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
        "numMonths": len(dates) or period,
    }


def main() -> None:
    ap = argparse.ArgumentParser(description="Pull AirDNA market snapshot (authed)")
    ap.add_argument("--market", default="corpus-christi",
                    help="market name key (corpus-christi, amarillo) or raw location id")
    ap.add_argument("--period", type=int, default=12)
    ap.add_argument("--out", help="write snapshot JSON to this path")
    ap.add_argument("--print", action="store_true", default=True,
                    help="print snapshot JSON to stdout (default)")
    args = ap.parse_args()

    location_id = LOCATION_BY_NAME.get(args.market.lower(), args.market)
    snapshot = pull_market(location_id, period=args.period)

    if args.out:
        with open(args.out, "w") as f:
            json.dump(snapshot, f, indent=2)
        print(f"wrote {args.out}")
    if args.print:
        print(json.dumps(snapshot, indent=2))


if __name__ == "__main__":
    main()
