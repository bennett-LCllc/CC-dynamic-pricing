"""
Corpus Christi STR — Dynamic Pricing Engine

Calculates optimal nightly rates based on:
  - Seasonal demand patterns (Corpus Christi specific)
  - Day-of-week patterns
  - Local events
  - Upcoming occupancy (urgency-based adjustments)
  - Competitor rate floors/ceilings
  - Custom pricing rules from the database
"""

from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional
from dataclasses import dataclass

# ============================================================
# Corpus Christi Market Data (mirrors shared/constants)
# ============================================================

SEASONAL_MULTIPLIERS: dict[str, Decimal] = {
    "1": Decimal("0.75"),   # January
    "2": Decimal("0.80"),   # February
    "3": Decimal("1.10"),   # March (spring break)
    "4": Decimal("1.00"),   # April
    "5": Decimal("1.15"),   # May
    "6": Decimal("1.25"),   # June
    "7": Decimal("1.30"),   # July (peak)
    "8": Decimal("1.25"),   # August
    "9": Decimal("1.10"),   # September
    "10": Decimal("1.05"),  # October
    "11": Decimal("0.90"),  # November
    "12": Decimal("0.80"),  # December
}

DOW_MULTIPLIERS: dict[int, Decimal] = {
    0: Decimal("0.85"),   # Sunday
    1: Decimal("0.80"),   # Monday
    2: Decimal("0.85"),   # Tuesday
    3: Decimal("0.95"),   # Wednesday
    4: Decimal("1.10"),   # Thursday
    5: Decimal("1.25"),   # Friday
    6: Decimal("1.20"),   # Saturday
}

MAJOR_EVENTS: list[dict] = [
    {"name": "Spring Break", "start_month": 3, "start_day": 1, "end_month": 3, "end_day": 31, "multiplier": Decimal("1.40")},
    {"name": "Memorial Day", "start_month": 5, "start_day": 24, "end_month": 5, "end_day": 27, "multiplier": Decimal("1.35")},
    {"name": "Fourth of July", "start_month": 7, "start_day": 1, "end_month": 7, "end_day": 7, "multiplier": Decimal("1.30")},
    {"name": "Labor Day", "start_month": 9, "start_day": 1, "end_month": 9, "end_day": 5, "multiplier": Decimal("1.30")},
    {"name": "Buccaneer Days", "start_month": 5, "start_day": 1, "end_month": 5, "end_day": 15, "multiplier": Decimal("1.25")},
    {"name": "Christmas/New Year", "start_month": 12, "start_day": 23, "end_month": 1, "end_day": 2, "multiplier": Decimal("1.20")},
]

PRICING_FLOORS: dict[str, dict] = {
    "BEACHFRONT": {"one_bedroom": Decimal("150"), "per_bedroom": Decimal("50")},
    "WATERFRONT": {"one_bedroom": Decimal("120"), "per_bedroom": Decimal("45")},
    "STANDARD": {"one_bedroom": Decimal("80"), "per_bedroom": Decimal("35")},
    "BUDGET": {"one_bedroom": Decimal("60"), "per_bedroom": Decimal("25")},
}


# ============================================================
# Data Classes
# ============================================================

@dataclass
class PricingFactors:
    base_rate: Decimal
    seasonal_multiplier: Decimal
    dow_multiplier: Decimal
    event_multiplier: Decimal
    occupancy_multiplier: Decimal
    calculated_rate: Decimal
    floor: Decimal
    ceiling: Decimal
    final_rate: Decimal


@dataclass
class PricingForecastItem:
    date: str
    rate: float
    is_booked: bool
    factors: dict


# ============================================================
# Core Pricing Engine
# ============================================================

def calculate_nightly_rate(
    base_rate: Decimal,
    target_date: date,
    property_type: str = "STANDARD",
    bedrooms: int = 2,
    upcoming_occupancy_rate: float = 0.5,
    custom_rules: Optional[list[dict]] = None,
) -> PricingFactors:
    """
    Calculate the optimal nightly rate for a property on a given date.

    Args:
        base_rate: The property's base nightly rate
        target_date: The date to calculate pricing for
        property_type: BEACHFRONT, WATERFRONT, STANDARD, or BUDGET
        bedrooms: Number of bedrooms
        upcoming_occupancy_rate: 0.0-1.0, occupancy rate for next 14 days
        custom_rules: Optional list of custom pricing rules from the database

    Returns:
        PricingFactors with all multipliers and the final rate
    """
    # 1. Seasonal multiplier
    month_key = str(target_date.month)
    seasonal_mult = SEASONAL_MULTIPLIERS.get(month_key, Decimal("1.0"))

    # 2. Day-of-week multiplier
    dow_mult = DOW_MULTIPLIERS.get(target_date.weekday(), Decimal("1.0"))

    # 3. Event multiplier
    event_mult = Decimal("1.0")
    for event in MAJOR_EVENTS:
        start = date(target_date.year, event["start_month"], event["start_day"])
        end_month = event["end_month"]
        end_day = event["end_day"]
        # Handle year wrap (e.g., Christmas -> New Year)
        if end_month < event["start_month"]:
            end = date(target_date.year + 1, end_month, end_day)
        else:
            end = date(target_date.year, end_month, end_day)
        if start <= target_date <= end:
            event_mult = max(event_mult, event["multiplier"])

    # 4. Occupancy urgency
    occ_rate = upcoming_occupancy_rate
    if occ_rate >= 0.9:
        occ_mult = Decimal("1.30")
    elif occ_rate >= 0.8:
        occ_mult = Decimal("1.15")
    elif occ_rate >= 0.5:
        occ_mult = Decimal("1.0")
    elif occ_rate >= 0.3:
        occ_mult = Decimal("0.90")
    else:
        occ_mult = Decimal("0.80")

    # 5. Calculate pre-adjustment rate
    calculated = base_rate * seasonal_mult * dow_mult * event_mult * occ_mult

    # 6. Apply custom rules (from database)
    if custom_rules:
        for rule in sorted(custom_rules, key=lambda r: r.get("priority", 0), reverse=True):
            if not rule.get("is_active", True):
                continue
            # Check date range
            if rule.get("start_date") and target_date < rule["start_date"]:
                continue
            if rule.get("end_date") and target_date > rule["end_date"]:
                continue
            # Check day of week
            if rule.get("day_of_week") and target_date.weekday() not in rule["day_of_week"]:
                continue

            adj_type = rule.get("adjustment_type", "PERCENTAGE")
            adj_value = Decimal(str(rule.get("adjustment_value", 0)))

            if adj_type == "PERCENTAGE":
                calculated = calculated * (Decimal("1") + adj_value / Decimal("100"))
            elif adj_type == "FIXED":
                calculated = calculated + adj_value
            elif adj_type == "FLAT_RATE":
                calculated = adj_value

    # 7. Apply floor/ceiling
    floor_config = PRICING_FLOORS.get(property_type, PRICING_FLOORS["STANDARD"])
    floor = floor_config["one_bedroom"] + (bedrooms - 1) * floor_config["per_bedroom"]
    ceiling = floor * Decimal("3.5")

    final = min(max(calculated, floor), ceiling)

    # Round to nearest $10
    final = (final / Decimal("10")).quantize(Decimal("1"), rounding=ROUND_HALF_UP) * Decimal("10")

    return PricingFactors(
        base_rate=base_rate,
        seasonal_multiplier=seasonal_mult,
        dow_multiplier=dow_mult,
        event_multiplier=event_mult,
        occupancy_multiplier=occ_mult,
        calculated_rate=calculated.quantize(Decimal("0.01")),
        floor=floor,
        ceiling=ceiling,
        final_rate=final,
    )


def generate_forecast(
    base_rate: Decimal,
    property_type: str = "STANDARD",
    bedrooms: int = 2,
    start_date: Optional[date] = None,
    days: int = 30,
    existing_bookings: Optional[list[dict]] = None,
    custom_rules: Optional[list[dict]] = None,
) -> list[PricingForecastItem]:
    """
    Generate a pricing forecast for the next N days.

    Args:
        base_rate: Property's base nightly rate
        property_type: BEACHFRONT, WATERFRONT, STANDARD, or BUDGET
        bedrooms: Number of bedrooms
        start_date: Start date (defaults to today)
        days: Number of days to forecast
        existing_bookings: List of {check_in, check_out} dicts
        custom_rules: Optional custom pricing rules

    Returns:
        List of PricingForecastItem with date, rate, and factors
    """
    if start_date is None:
        start_date = date.today()

    if existing_bookings is None:
        existing_bookings = []

    forecast: list[PricingForecastItem] = []

    for i in range(days):
        target = start_date + timedelta(days=i)

        # Check if booked
        is_booked = any(
            b["check_in"] <= target < b["check_out"]
            for b in existing_bookings
        )

        # Calculate upcoming occupancy (next 14 days from target)
        next_14_booked = 0
        for j in range(14):
            check = target + timedelta(days=j)
            if any(b["check_in"] <= check < b["check_out"] for b in existing_bookings):
                next_14_booked += 1
        upcoming_occ = next_14_booked / 14 if not is_booked else 1.0

        factors = calculate_nightly_rate(
            base_rate=base_rate,
            target_date=target,
            property_type=property_type,
            bedrooms=bedrooms,
            upcoming_occupancy_rate=upcoming_occ,
            custom_rules=custom_rules,
        )

        forecast.append(PricingForecastItem(
            date=target.isoformat(),
            rate=float(factors.final_rate) if not is_booked else 0,
            is_booked=is_booked,
            factors={
                "base_rate": float(factors.base_rate),
                "seasonal": float(factors.seasonal_multiplier),
                "dow": float(factors.dow_multiplier),
                "event": float(factors.event_multiplier),
                "occupancy": float(factors.occupancy_multiplier),
                "floor": float(factors.floor),
                "ceiling": float(factors.ceiling),
            },
        ))

    return forecast
