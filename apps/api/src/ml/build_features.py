"""
Feature Builder — Corpus Christi STR Dynamic Pricing

Transforms historical bookings into ML training examples (PricingTrainingExample).
Run nightly to materialize the latest booking outcomes for model retraining.
"""

import os
import asyncio
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Optional, List, Dict, Any
import json
import hashlib

import numpy as np
import pandas as pd
from prisma import Prisma

# Add project root to path for shared constants
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

# Import pricing constants from the engine (or duplicate here)
from src.pricing.engine import (
    SEASONAL_MULTIPLIERS,
    DOW_MULTIPLIERS,
    MAJOR_EVENTS,
    PRICING_FLOORS,
)
from src.ml.airdna_client import AirDNAClient, AirDNAUnavailable
from src.ml.market_features import (
    MarketSnapshotCache,
    DictSnapshotCache,
    apply_market_features,
    location_key_for_zip,
    month_of,
)
from src.ml.snapshot_loader import build_cache_from_snapshot

# Initialize Prisma client
prisma = Prisma(auto_register=True)


def _make_market_client() -> "tuple[AirDNAClient, MarketSnapshotCache, bool]":
    """Build a market client + cache. Returns (client, cache, enabled).

    enabled=False means no API key is configured: the pipeline will skip market
    features per-property instead of erroring. AirDNA is a paid API, so this is
    the expected default in dev/test.
    """
    import os

    cache: MarketSnapshotCache = DictSnapshotCache()
    api_key = os.environ.get("AIRDNA_API_KEY")
    if api_key:
        # Enterprise path: live REST client keyed by AIRDNA_API_KEY.
        return AirDNAClient(api_key=api_key), cache, True
    # Non-enterprise path: load a Path-A snapshot file (scripts/pull_airdna.py
    # output) into the cache so the training loop still gets market features
    # from a normal AirDNA account. No key required.
    snapshot_cache, snapshot_enabled = build_cache_from_snapshot()
    return AirDNAClient(api_key=None), snapshot_cache, snapshot_enabled


def get_property_type(property_obj) -> str:
    """Map Property model to pricing engine property types.

    Property.type is a PropertyType enum (HOUSE/CONDO/TOWNHOUSE/...);
    surface it as a string for downstream floor/ceiling lookups.
    """
    ptype = getattr(property_obj, "type", None)
    if ptype is None:
        return "STANDARD"
    return str(ptype)


def calculate_event_multiplier(target_date: date) -> Decimal:
    """Calculate event multiplier for a given date (mirrors engine logic)."""
    event_mult = Decimal("1.0")
    for event in MAJOR_EVENTS:
        start = date(target_date.year, event["start_month"], event["start_day"])
        end_month = event["end_month"]
        end_day = event["end_day"]
        if end_month < event["start_month"]:
            end = date(target_date.year + 1, end_month, end_day)
        else:
            end = date(target_date.year, end_month, end_day)
        if start <= target_date <= end:
            event_mult = max(event_mult, event["multiplier"])
    return event_mult


def calculate_occupancy_rate(
    bookings: List[Any],
    target_date: date,
    property_id: str,
    window_days: int = 14
) -> Decimal:
    """Calculate occupancy rate for the next N days from target_date."""
    booked_nights = 0
    for j in range(window_days):
        check_date = target_date + timedelta(days=j)
        is_booked = any(
            b.checkIn.date() <= check_date < b.checkOut.date()
            for b in bookings
            if b.propertyId == property_id
        )
        if is_booked:
            booked_nights += 1
    return Decimal(str(booked_nights / window_days)).quantize(Decimal("0.01"))


def get_active_rules_for_date(property_id: str, target_date: date) -> List[Dict]:
    """Fetch active custom pricing rules for a property on a given date."""
    # This would query PricingRule model - simplified for now
    return []


async def build_training_examples(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    property_ids: Optional[List[str]] = None,
    batch_size: int = 1000,
    market_client: Optional[AirDNAClient] = None,
    market_cache: Optional[MarketSnapshotCache] = None,
) -> Dict[str, Any]:
    """
    Build PricingTrainingExample records from historical bookings.

    For each property and each night in the date range:
    - If booked: create example with was_booked=True, final_rate=actual rate
    - If not booked: create example with was_booked=False (negative example)

    This gives us both positive (booked) and negative (available but not booked) samples.

    market_client / market_cache: inject to override the default AirDNA client
    (built from AIRDNA_API_KEY). When omitted and no key is set, market features
    are skipped gracefully per-property.
    """
    await prisma.connect()

    # Market enrichment setup (AirDNA). If no client passed, build the default
    # one from env; skip market features when no API key is configured.
    if market_client is None or market_cache is None:
        built_client, built_cache, _enabled = _make_market_client()
        market_client = market_client or built_client
        market_cache = market_cache or built_cache

    try:
        # Default to last 2 years of data
        if end_date is None:
            end_date = date.today()
        if start_date is None:
            start_date = end_date - timedelta(days=730)  # 2 years
        
        print(f"Building training examples from {start_date} to {end_date}")
        
        # Fetch all bookings in range
        bookings = await prisma.booking.find_many(
            where={
                "checkIn": {"gte": datetime.combine(start_date, datetime.min.time())},
                "checkOut": {"lte": datetime.combine(end_date, datetime.max.time())},
                "status": {"in": ["CONFIRMED", "ACTIVE", "COMPLETED"]},
                **({"propertyId": {"in": property_ids}} if property_ids else {}),
            },
            include={
                "property": True,
            },
            order={"checkIn": "asc"},
        )
        
        print(f"Found {len(bookings)} bookings")
        
        # Group bookings by property
        bookings_by_property: Dict[str, List] = {}
        for b in bookings:
            if b.propertyId not in bookings_by_property:
                bookings_by_property[b.propertyId] = []
            bookings_by_property[b.propertyId].append(b)
        
        # Fetch all properties in scope
        properties = await prisma.property.find_many(
            where={
                "id": {"in": list(bookings_by_property.keys())} if property_ids is None else {"in": property_ids},
                "status": "ACTIVE",
            }
        )
        
        # Create a set of booked nights for quick lookup
        booked_nights = set()
        for b in bookings:
            current = b.checkIn.date()
            while current < b.checkOut.date():
                booked_nights.add((b.propertyId, current))
                current += timedelta(days=1)
        
        # Build training examples
        examples_to_create = []
        
        for prop in properties:
            prop_bookings = bookings_by_property.get(prop.id, [])
            prop_type = get_property_type(prop)

            # Resolve market metrics for this property (once per property).
            # AirDNA keys markets by location key; we bridge from ZIP. On any
            # failure or missing key, metrics stays None and every example for
            # this property gets marketDataAvailable=False (pipeline continues).
            prop_metrics = None
            loc_key = location_key_for_zip(getattr(prop, "zipCode", "") or "")
            if loc_key is not None:
                try:
                    # One snapshot per property across the whole build window
                    # (cheap + cacheable; monthly averages don't vary per night).
                    snap = market_cache.get(loc_key, "all")
                    if snap is None:
                        start_month = f"{start_date.year:04d}-{start_date.month:02d}"
                        end_month = f"{end_date.year:04d}-{end_date.month:02d}"
                        snap = market_client.get_market_metrics(
                            loc_key, start_month, end_month
                        )
                        market_cache.put(loc_key, "all", snap)
                    prop_metrics = snap
                except AirDNAUnavailable:
                    prop_metrics = None
                except Exception:
                    # Any upstream/auth error must not kill the nightly build.
                    prop_metrics = None

            # Iterate through each night in the date range for this property
            current_date = start_date
            while current_date <= end_date:
                is_booked = (prop.id, current_date) in booked_nights
                
                # Find the booking for this night (if booked)
                booking_for_night = None
                final_rate = None
                if is_booked:
                    for b in prop_bookings:
                        if b.checkIn.date() <= current_date < b.checkOut.date():
                            booking_for_night = b
                            final_rate = b.nightlyRate
                            break
                
                # Calculate features
                seasonal_mult = SEASONAL_MULTIPLIERS.get(str(current_date.month), Decimal("1.0"))
                dow_mult = DOW_MULTIPLIERS.get(current_date.weekday(), Decimal("1.0"))
                event_mult = calculate_event_multiplier(current_date)
                occ_rate = calculate_occupancy_rate(bookings, current_date, prop.id)
                
                # Determine property type string for floor/ceiling
                floor_config = PRICING_FLOORS.get(prop_type, PRICING_FLOORS["STANDARD"])
                floor = floor_config["one_bedroom"] + (prop.bedrooms - 1) * floor_config["per_bedroom"]
                ceiling = floor * Decimal("3.5")
                
                # Active rules
                active_rules = get_active_rules_for_date(prop.id, current_date)

                # Create training example
                example_data = {
                    "bookingId": booking_for_night.id if booking_for_night else None,
                    "propertyId": prop.id,
                    "propertyType": prop_type,
                    "bedrooms": prop.bedrooms,
                    "baseRate": prop.baseRate,
                    "stayDate": datetime.combine(current_date, datetime.min.time()),
                    "dayOfWeek": current_date.weekday(),
                    "month": current_date.month,
                    "isHoliday": event_mult > Decimal("1.0"),
                    "eventMultiplier": event_mult,
                    "occupancyRate14d": occ_rate,
                    "competitorAvgRate": None,  # Would need external data
                    "wasBooked": is_booked,
                    "finalRate": final_rate,
                    "revenue": final_rate * Decimal(str((booking_for_night.checkOut - booking_for_night.checkIn).days)) if booking_for_night and final_rate else None,
                    "dataSource": "ACTUAL",
                    "weight": Decimal("1.0"),
                }
                # prisma-client-py rejects explicit None on optional Json fields;
                # only include activeRules when there are actual rules.
                if active_rules:
                    example_data["activeRules"] = active_rules

                # Merge AirDNA market features (graceful: None => marketDataAvailable=False)
                apply_market_features(example_data, prop_metrics)
                
                examples_to_create.append(example_data)
                
                # Batch insert
                if len(examples_to_create) >= batch_size:
                    await _bulk_insert_examples(examples_to_create)
                    examples_to_create = []
                
                current_date += timedelta(days=1)
        
        # Insert remaining
        if examples_to_create:
            await _bulk_insert_examples(examples_to_create)
        
        # Return summary
        total = await prisma.pricingtrainingexample.count()
        return {"status": "success", "total_examples": total}
        
    finally:
        await prisma.disconnect()


async def _bulk_insert_examples(examples: List[Dict]) -> int:
    """Bulk insert training examples, skipping true duplicates."""
    created = 0
    for ex in examples:
        try:
            await prisma.pricingtrainingexample.create(data=ex)
            created += 1
        except Exception as e:
            # Surface the error instead of silently swallowing it.
            # (Genuine unique-constraint duplicates would be caught here too,
            # but masking all errors has hidden real failures.)
            import sys as _sys
            print(f"[bulk_insert] FAILED on propertyId={ex.get('propertyId')} stayDate={ex.get('stayDate')}: {type(e).__name__}: {e}", file=_sys.stderr)
    return created


async def main():
    """CLI entry point."""
    import argparse
    parser = argparse.ArgumentParser(description="Build ML training examples from bookings")
    parser.add_argument("--start-date", type=str, help="Start date (YYYY-MM-DD)")
    parser.add_argument("--end-date", type=str, help="End date (YYYY-MM-DD)")
    parser.add_argument("--property-ids", type=str, help="Comma-separated property IDs")
    parser.add_argument("--batch-size", type=int, default=1000)
    args = parser.parse_args()
    
    start = datetime.strptime(args.start_date, "%Y-%m-%d").date() if args.start_date else None
    end = datetime.strptime(args.end_date, "%Y-%m-%d").date() if args.end_date else None
    prop_ids = args.property_ids.split(",") if args.property_ids else None
    
    result = await build_training_examples(start, end, prop_ids, args.batch_size)
    print(f"Result: {result}")


if __name__ == "__main__":
    asyncio.run(main())